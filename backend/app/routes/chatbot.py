from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.chatbot_service import (
    ask_ai,
    search_products,
    get_store_information,
)

router = APIRouter(prefix="/chatbot", tags=["ChatBot"])


class ChatRequest(BaseModel):
    message: str


@router.post("")
def chatbot(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    store_information = get_store_information(
        db,
        request.message
    )

    if store_information:
        return {"reply": store_information}

    products = search_products(
        db,
        request.message
    )

    reply = ask_ai(
        request.message,
        products
    )

    return {"reply": reply}
