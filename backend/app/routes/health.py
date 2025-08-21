from fastapi import APIRouter
from app.core.config import NOTEBOOK_PATH

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok", "notebook": NOTEBOOK_PATH}
