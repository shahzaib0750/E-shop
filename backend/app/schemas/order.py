from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class OrderCreate(BaseModel):
    shipping_address: str = Field(
        ...,
        min_length=10,
        max_length=500,
    )


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_id: int
    total_amount: Decimal
    status: str
    shipping_address: str
    created_at: datetime


class OrderStatusUpdate(BaseModel):
    status: str = Field(
        ...,
        min_length=1,
        max_length=50,
    )