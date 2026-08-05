from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.chatbot_service import ask_ai, search_products

router = APIRouter(
    prefix="/chatbot",
    tags=["ChatBot"],
)


class ChatRequest(BaseModel):
    message: str


@router.post("")
def chatbot(request: ChatRequest, db: Session = Depends(get_db)):

    products = search_products(db, request.message)

    reply = ask_ai(request.message, products)

    return {
        "reply": reply
    }