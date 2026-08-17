from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


# Product validation
class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., min_length=5, max_length=2000)
    category_id: int = Field(..., gt=0)
    brand: str = Field(..., min_length=2, max_length=100)
    price: float = Field(..., gt=0)
    stock: int = Field(..., ge=0)
    image: str = Field(..., min_length=1, max_length=500)


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

    model_config = ConfigDict(from_attributes=True)


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=150
    )

    description: Optional[str] = Field(
        default=None,
        min_length=5,
        max_length=2000
    )

    category_id: Optional[int] = Field(
        default=None,
        gt=0
    )

    brand: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=100
    )

    price: Optional[float] = Field(
        default=None,
        gt=0
    )

    stock: Optional[int] = Field(
        default=None,
        ge=0
    )

    image: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=500
    )