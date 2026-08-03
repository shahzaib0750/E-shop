from pydantic import BaseModel
from typing import Optional


class ProductCreate(BaseModel):
    name: str
    description: str
    category: str
    brand: str
    price: float
    stock: int
    image: str
    seller_id: int

class ProductResponse(BaseModel):
    id: int
    name: str
    description: str
    category: str
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
    category: Optional[str] = None
    brand: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    image: Optional[str] = None    