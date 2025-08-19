import { useEffect, useState } from "react";
import { API } from "@/lib/api";

export function useOverview(ticker) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await API(`/overview/${ticker}`);
      if (!res.ok) throw new Error("overview request failed");
      setData(await res.json());
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticker) load();
  }, [ticker]);

  return { data, err, loading, reload: load };
}
