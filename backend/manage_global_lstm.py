#!/usr/bin/env python3
import os, json, argparse, pathlib, datetime as dt
from typing import Dict, List
import numpy as np, pandas as pd
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL","2")
import yfinance as yf
from tqdm import tqdm
from joblib import dump, load
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import tensorflow as tf
from tensorflow.keras import layers as KL, Model, callbacks as KCB, optimizers as KOPT

DATA_DIR = pathlib.Path("./data"); ARTIFACTS_DIR = pathlib.Path("./artifacts")
DATA_DIR.mkdir(parents=True, exist_ok=True); ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
MAX_SYMBOLS=10000; WINDOW_L=120; HORIZON_H=24; PERIOD="2y"; INTERVAL="1d"
BATCH_SIZE=128; EPOCHS_INIT=25; EPOCHS_TUNE=8; LR=1e-3
MODEL_PATH=ARTIFACTS_DIR/"global_lstm_keras.h5"
SCALER_PATH=ARTIFACTS_DIR/"feature_scaler.joblib"
REGISTRY_PATH=ARTIFACTS_DIR/"symbol_index.json"
TRAIN_LOG_PATH=ARTIFACTS_DIR/"train_history.json"
tf.keras.utils.set_random_seed(42)

def load_registry():
    if REGISTRY_PATH.exists():
        return json.loads(REGISTRY_PATH.read_text())
    return {"symbol_to_id":{}, "id_to_symbol":{}}

def save_registry(reg): REGISTRY_PATH.write_text(json.dumps(reg,indent=2))

def ensure_symbol_id(symbol:str, reg:dict)->int:
    s=symbol.upper().strip()
    if s in reg["symbol_to_id"]: return reg["symbol_to_id"][s]
    used=set(reg["symbol_to_id"].values()); nxt=0
    while nxt in used: nxt+=1
    if nxt>=MAX_SYMBOLS: raise RuntimeError("Increase MAX_SYMBOLS")
    reg["symbol_to_id"][s]=nxt; reg["id_to_symbol"][str(nxt)]=s; save_registry(reg); return nxt

def fetch_ohlcv(symbols:List[str], period:str=PERIOD, interval:str=INTERVAL)->Dict[str,pd.DataFrame]:
    out={}
    for s in tqdm(symbols, desc="YF download"):
        try:
            df=yf.download(s, period=period, interval=interval, auto_adjust=True, progress=False, timeout=30)
            if df is None or df.empty: continue
            df=df.copy()
            df.columns=[str(c).title() for c in df.columns]
            if "Close" not in df.columns and "Adj Close" in df.columns:
                df["Close"]=df["Adj Close"]
            if "Close" not in df.columns: continue
            use=[c for c in ["Open","High","Low","Close","Volume"] if c in df.columns]
            df=df.dropna(subset=["Close"])
            out[s]=df[use].copy()
        except Exception as e:
            print(f"[WARN] {s}: {e}")
    return out

def rsi(x:pd.Series,p=14):
    d=x.diff(); up=d.clip(lower=0); dn=-1*d.clip(upper=0)
    ma_u=up.ewm(com=p-1,adjust=False).mean(); ma_d=dn.ewm(com=p-1,adjust=False).mean()
    rs=ma_u/(ma_d+1e-9); return 100-(100/(1+rs))

def macd(x:pd.Series,fast=12,slow=26,signal=9):
    ef=x.ewm(span=fast,adjust=False).mean(); es=x.ewm(span=slow,adjust=False).mean()
    m=ef-es; s=m.ewm(span=signal,adjust=False).mean(); return m,s

def bbp(x:pd.Series,win=20,std=2.0):
    ma=x.rolling(win).mean(); sd=x.rolling(win).std(ddof=0)
    up=ma+std*sd; lo=ma-std*sd; return (x-lo)/(up-lo+1e-9)

FEATS=["ret1","ret5","rsi14","macd","macd_sig","bbp","vol_z"]; TARGET="target_ret"

def make_features(df:pd.DataFrame)->pd.DataFrame:
    out=pd.DataFrame(index=df.index)
    c=df["Close"]
    v=df["Volume"].fillna(0.0) if "Volume" in df.columns else pd.Series(0.0,index=df.index)
    out["ret1"]=c.pct_change().fillna(0)
    out["ret5"]=c.pct_change(5).fillna(0)
    out["rsi14"]=rsi(c).fillna(50)/100
    m,ms=macd(c); out["macd"]=m.fillna(0); out["macd_sig"]=ms.fillna(0)
    out["bbp"]=bbp(c).fillna(0.5)
    logv=np.log1p(v); out["vol_z"]=(logv-logv.rolling(20).mean())/(logv.rolling(20).std(ddof=0)+1e-9)
    out["vol_z"]=out["vol_z"].replace([np.inf,-np.inf],0).fillna(0)
    out[TARGET]=out["ret1"].shift(-1).fillna(0)
    return out

def slice_windows(feat:pd.DataFrame,L:int,H:int):
    Xs,ys=[],[]
    arr=feat[FEATS+[TARGET]].values
    for i in range(L,len(arr)-H+1):
        Xs.append(arr[i-L:i,:-1]); ys.append(np.sum(arr[i:i+H,-1]))
    if not Xs: return np.empty((0,L,len(FEATS))), np.empty((0,))
    return np.array(Xs,dtype="float32"), np.array(ys,dtype="float32")

class Dataset:
    def __init__(self,X,y,sids): self.X=X; self.y=y; self.sids=sids

def build_dataset(prices:Dict[str,pd.DataFrame], reg:dict, L=WINDOW_L, H=HORIZON_H)->Dataset:
    Xs,ys,sids=[],[],[]
    for sym,df in prices.items():
        if len(df)<(L+H+30): continue
        feat=make_features(df); X,y=slice_windows(feat,L,H)
        if len(X)==0: continue
        sid=ensure_symbol_id(sym,reg); Xs.append(X); ys.append(y); sids.append(np.full((len(X),),sid,dtype="int32"))
    if not Xs: raise RuntimeError("No training samples; check tickers/period/interval.")
    X=np.concatenate(Xs,0); y=np.concatenate(ys,0); sids=np.concatenate(sids,0)
    return Dataset(X,y,sids)

def fit_scaler(X): N,L,F=X.shape; flat=X.reshape(N*L,F); return StandardScaler().fit(flat)
def apply_scaler(X,sc): N,L,F=X.shape; flat=sc.transform(X.reshape(N*L,F)); return flat.reshape(N,L,F)

def build_model(max_sym=MAX_SYMBOLS,L=WINDOW_L,F=len(FEATS))->Model:
    ts=KL.Input(shape=(L,F),name="ts_in"); sid=KL.Input(shape=(),dtype="int32",name="sid_in")
    emb=KL.Embedding(max_sym,16,name="sym_emb")(sid); emb_r=KL.RepeatVector(L)(emb)
    x=KL.Concatenate()([ts,emb_r]); x=KL.Masking()(x)
    x=KL.LSTM(64,return_sequences=True)(x); x=KL.LSTM(64)(x)
    x=KL.Dense(64,activation="relu")(x); x=KL.Concatenate()([x,KL.Flatten()(emb)])
    base=KL.Dense(1,name="base_return")(x)
    calib=KL.Embedding(max_sym,2,name="calibrator")(sid)
    scale=KL.Lambda(lambda t:t[..., :1])(calib); bias=KL.Lambda(lambda t:t[..., 1:])(calib)
    y=KL.Add(name="y_cum_return")([KL.Multiply()([base,scale]),bias])
    m=Model(inputs=[ts,sid],outputs=y,name="global_lstm_multiasset"); m.compile(optimizer=KOPT.Adam(LR),loss="mse"); return m

def freeze_to_calibrator(m:Model):
    for lyr in m.layers: lyr.trainable=("calibrator" in lyr.name)
    m.compile(optimizer=KOPT.Adam(1e-3),loss="mse")

def unfreeze_all(m:Model):
    for lyr in m.layers: lyr.trainable=True
    m.compile(optimizer=KOPT.Adam(LR),loss="mse")

def train_global(prices:Dict[str,pd.DataFrame], epochs=EPOCHS_INIT):
    reg=load_registry(); ds=build_dataset(prices,reg,WINDOW_L,HORIZON_H)
    sc=fit_scaler(ds.X); Xs=apply_scaler(ds.X,sc)
    Xtr,Xva,ytr,yva,sidtr,sidva=train_test_split(Xs,ds.y,ds.sids,test_size=0.15,random_state=42,shuffle=True)
    m=build_model(MAX_SYMBOLS,WINDOW_L,Xs.shape[-1])
    cbs=[KCB.EarlyStopping(monitor="val_loss",patience=5,restore_best_weights=True),
         KCB.ReduceLROnPlateau(monitor="val_loss",factor=0.5,patience=3,min_lr=1e-5),
         KCB.ModelCheckpoint(filepath=str(MODEL_PATH),monitor="val_loss",save_best_only=True)]
    m.fit({"ts_in":Xtr,"sid_in":sidtr}, ytr, validation_data=({"ts_in":Xva,"sid_in":sidva},yva),
               epochs=epochs,batch_size=BATCH_SIZE,verbose=1,callbacks=cbs)
    m.save(MODEL_PATH); dump(sc,SCALER_PATH); save_registry(reg)
    TRAIN_LOG_PATH.write_text(json.dumps({"val_loss":float(m.evaluate({"ts_in":Xva,"sid_in":sidva},yva,verbose=0))},indent=2))
    return m,sc,reg

def finetune_calibrator(symbol:str, period=PERIOD, interval=INTERVAL, epochs=EPOCHS_TUNE):
    reg=load_registry(); sid=ensure_symbol_id(symbol,reg)
    prices=fetch_ohlcv([symbol], period=period, interval=interval)
    if symbol not in prices or prices[symbol].empty: raise RuntimeError(f"No data for {symbol}")
    ds=build_dataset(prices,reg,WINDOW_L,HORIZON_H)
    m=tf.keras.models.load_model(MODEL_PATH); sc=load(SCALER_PATH)
    X=apply_scaler(ds.X,sc); freeze_to_calibrator(m)
    m.fit({"ts_in":X,"sid_in":ds.sids}, ds.y, epochs=max(1,epochs), batch_size=BATCH_SIZE, verbose=0)
    m.save(MODEL_PATH)

def load_all():
    if not MODEL_PATH.exists(): raise RuntimeError("Model not found; run build first.")
    return tf.keras.models.load_model(MODEL_PATH), load(SCALER_PATH), load_registry()

def support_resistance(close:pd.Series, lookback:int=60):
    w=close[-lookback:]; return float(np.percentile(w,15)), float(np.percentile(w,85))

def classify(x,lo,hi,labels=("Low","Medium","High")):
    return labels[0] if x<=lo else labels[2] if x>=hi else labels[1]

def infer_symbol(symbol:str, horizon:int=HORIZON_H, period:str=PERIOD, interval:str=INTERVAL)->dict:
    m,sc,reg=load_all(); sid=ensure_symbol_id(symbol,reg)
    prices=fetch_ohlcv([symbol], period=period, interval=interval); df=prices.get(symbol)
    if df is None or df.empty: raise RuntimeError(f"No data for {symbol}")
    feat=make_features(df); X,_=slice_windows(feat,WINDOW_L,horizon)
    if len(X)==0: raise RuntimeError("Insufficient data for prediction window.")
    Xs=apply_scaler(X[-1:,:,:], sc)
    y=float(m.predict({"ts_in":Xs,"sid_in":np.array([sid])}, verbose=0)[0][0])
    last=float(df["Close"].iloc[-1]); pred=last*(1.0+y)
    trend="Bullish" if y>0.002 else "Bearish" if y<-0.002 else "Neutral"
    vol=float(np.std(feat["ret1"].tail(48))); risk=classify(vol,0.003,0.015)
    if "Volume" in df.columns:
        vr=(float(df["Volume"].tail(1).values[0])+1e-9)/(float(df["Volume"].tail(20).mean())+1e-9)
    else:
        vr=1.0
    vol_lbl=classify(vr,0.7,1.3,("Low","Medium","High"))
    sup,res=support_resistance(df["Close"])
    conf=float(np.clip(1.0/(1.0+50.0*vol),0.1,0.9))
    return {"ticker":symbol.upper(),"interval":interval,"horizon_steps":horizon,
            "last_close":last,"pred_close":pred,"predicted_cum_return":y,
            "trend":trend,"signal":("Buy" if trend=="Bullish" else "Sell" if trend=="Bearish" else "Hold"),
            "risk_level":risk,"volume_level":vol_lbl,"support":sup,"resistance":res,
            "confidence":conf,"timestamp":dt.datetime.utcnow().isoformat()+"Z"}

def weekly_retrain(tickers:List[str], period: str=PERIOD, interval:str=INTERVAL):
    prices=fetch_ohlcv(tickers,period=period,interval=interval)
    if MODEL_PATH.exists():
        m=tf.keras.models.load_model(MODEL_PATH); reg=load_registry()
        ds=build_dataset(prices,reg,WINDOW_L,HORIZON_H); sc=load(SCALER_PATH); Xs=apply_scaler(ds.X,sc)
        unfreeze_all(m)
        cbs=[KCB.EarlyStopping(monitor="val_loss",patience=4,restore_best_weights=True),
             KCB.ReduceLROnPlateau(monitor="val_loss",factor=0.5,patience=2,min_lr=1e-5),
             KCB.ModelCheckpoint(filepath=str(MODEL_PATH),monitor="val_loss",save_best_only=True)]
        Xtr,Xva,ytr,yva,sidtr,sidva=train_test_split(Xs,ds.y,ds.sids,test_size=0.15,random_state=42,shuffle=True)
        m.fit({"ts_in":Xtr,"sid_in":sidtr}, ytr, validation_data=({"ts_in":Xva,"sid_in":sidva},yva),
              epochs=10,batch_size=BATCH_SIZE,verbose=1,callbacks=cbs)
        m.save(MODEL_PATH)
    else:
        train_global(prices)

def read_tickers(path:str)->List[str]:
    if not path:
        if REGISTRY_PATH.exists(): return sorted(load_registry()["symbol_to_id"].keys())
        raise SystemExit("No --tickers file provided and no registry found.")
    return [line.strip() for line in open(path) if line.strip()]

def main():
    ap=argparse.ArgumentParser(description="Global LSTM manager")
    sub=ap.add_subparsers(dest="cmd",required=True)
    p=sub.add_parser("build"); p.add_argument("--tickers"); p.add_argument("--period",default=PERIOD); p.add_argument("--interval",default=INTERVAL); p.add_argument("--epochs",type=int,default=EPOCHS_INIT)
    p=sub.add_parser("init-calibrators"); p.add_argument("--tickers")
    p=sub.add_parser("tune-all"); p.add_argument("--tickers"); p.add_argument("--period",default=PERIOD); p.add_argument("--interval",default=INTERVAL); p.add_argument("--epochs",type=int,default=EPOCHS_TUNE); p.add_argument("--max",type=int,default=None)
    p=sub.add_parser("weekly-retrain"); p.add_argument("--tickers"); p.add_argument("--period",default=PERIOD); p.add_argument("--interval",default=INTERVAL)
    p=sub.add_parser("infer"); p.add_argument("symbol"); p.add_argument("--h",type=int,default=HORIZON_H); p.add_argument("--period",default=PERIOD); p.add_argument("--interval",default=INTERVAL)
    args=ap.parse_args()
    period=getattr(args,"period",PERIOD)
    interval=getattr(args,"interval",INTERVAL)
    horizon=getattr(args,"h",HORIZON_H)
    if args.cmd=="build":
        t=read_tickers(args.tickers); prices=fetch_ohlcv(t,period=period,interval=interval); train_global(prices,epochs=args.epochs)
    elif args.cmd=="init-calibrators":
        t=read_tickers(args.tickers); reg=load_registry(); [ensure_symbol_id(s,reg) for s in t]; save_registry(reg); print(len(t))
    elif args.cmd=="tune-all":
        t=read_tickers(args.tickers); done=0
        for s in tqdm(t,desc="Calibrator tuning"):
            if args.max is not None and done>=args.max: break
            try: finetune_calibrator(s,period=period,interval=interval,epochs=args.epochs); done+=1
            except Exception as e: print(f"[skip] {s}: {e}")
        print(done)
    elif args.cmd=="weekly-retrain":
        t=read_tickers(args.tickers); weekly_retrain(t,period=period,interval=interval)
    elif args.cmd=="infer":
        out=infer_symbol(args.symbol,horizon=horizon,period=period,interval=interval); print(json.dumps(out,indent=2))

if __name__=="__main__": main()
