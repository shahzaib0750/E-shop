from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User

from app.services.chatbot_service import (
    ask_ai,
    search_products,
    get_store_information,
    detect_action,
)

from app.services.chatbot_actions import (
    add_to_cart_action,
    remove_from_cart_action,
    update_cart_action,
    get_cart_action,
    place_order_action,
    get_orders_action,
    get_order_details_action,
    cancel_order_action,
    add_to_wishlist_action,
    remove_from_wishlist_action,
    get_wishlist_action,
    reorder_action,
)


router = APIRouter(
    prefix="/chatbot",
    tags=["ChatBot"],
)


class ChatRequest(BaseModel):
    message: str


@router.post("")
def chatbot(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = request.message.strip()

    if not message:
        return {"reply": "Please enter a message."}

    action = detect_action(message)

    if action == "add_cart":
        return {"reply": add_to_cart_action(db, current_user, message)}

    if action == "remove_cart":
        return {"reply": remove_from_cart_action(db, current_user, message)}

    if action == "update_cart":
        return {"reply": update_cart_action(db, current_user, message)}

    if action == "view_cart":
        return {"reply": get_cart_action(db, current_user)}

    if action == "place_order":
        return {"reply": place_order_action(db, current_user, message)}

    if action == "orders":
        return {"reply": get_orders_action(db, current_user)}

    if action == "order_details":
        return {"reply": get_order_details_action(db, current_user, message)}

    if action == "cancel_order":
        return {"reply": cancel_order_action(db, current_user, message)}

    if action == "add_wishlist":
        return {"reply": add_to_wishlist_action(db, current_user, message)}

    if action == "remove_wishlist":
        return {"reply": remove_from_wishlist_action(db, current_user, message)}

    if action == "wishlist":
        return {"reply": get_wishlist_action(db, current_user)}

    if action == "reorder":
        return {"reply": reorder_action(db, current_user, message)}

    store_information = get_store_information(
        db,
        message,
    )

    if store_information:
        return {"reply": store_information}

    products = search_products(
        db,
        message,
    )

    reply = ask_ai(
        message,
        products,
    )

    return {"reply": reply}