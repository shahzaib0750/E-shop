from pydantic import BaseModel
from typing import Optional


class ProductCreate(BaseModel):
    name: str
    description: str
    category_id: int
    brand: str
    price: float
    stock: int
    image: str
    seller_id: int


class ProductResponse(BaseModel):
    id: int
    name: str
    description: str
    category_id: int
    brand: str
    price: float
    stock: int
    image: str
    seller_id: int

    class Config:
        from_attributes = True


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    brand: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    image: Optional[str] = None