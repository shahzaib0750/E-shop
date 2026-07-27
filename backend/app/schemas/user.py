from pydantic import BaseModel, EmailStr


class UserSignup(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str
    role: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str