from pydantic import BaseModel
from datetime import datetime


class OrderCreate(BaseModel):
    user_id: int


class OrderResponse(BaseModel):
    order_id: int
    total_amount: float
    status: str
    created_at: datetime

    

from pydantic import BaseModel

class OrderStatusUpdate(BaseModel):
    status: str    