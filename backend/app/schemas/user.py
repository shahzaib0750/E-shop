from pydantic import BaseModel, EmailStr, Field
from typing import Literal


class UserSignup(BaseModel):

    full_name: str = Field(
        min_length=2,
        max_length=100
    )

    email: EmailStr

    phone: str = Field(
        min_length=11,
        max_length=15
    )

    password: str = Field(
        min_length=8,
        max_length=128
    )

    role: Literal["customer", "seller"] = "customer"

    business_name: str | None = Field(
        default=None,
        max_length=150
    )

    business_type: str | None = Field(
        default=None,
        max_length=100
    )

    category: str | None = Field(
        default=None,
        max_length=100
    )

    cnic: str | None = Field(
        default=None,
        max_length=20
    )

    customer_type: str | None = Field(
        default="standard",
        max_length=30
    )


class UserLogin(BaseModel):

    email: EmailStr

    password: str = Field(
        min_length=1,
        max_length=128
    )
