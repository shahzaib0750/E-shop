from pydantic import BaseModel


class CartCreate(BaseModel):
    user_id: int
    product_id: int
    quantity: int = 1

class CartItemResponse(BaseModel):
    cart_id: int
    product_id: int
    name: str
    brand: str
    price: float
    image: str
    quantity: int

class CartUpdate(BaseModel):
    quantity: int