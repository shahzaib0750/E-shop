from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    full_name = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(100),
        unique=True,
        nullable=False
    )

    phone = Column(
        String(20),
        unique=True,
        nullable=True
    )

    password = Column(
        String(255),
        nullable=False
    )

    role = Column(
        String(20),
        nullable=False,
        default="customer"
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    products = relationship(
        "Product",
        back_populates="seller"
    )

    orders = relationship(
        "Order",
        back_populates="user"
    )

    customer_profile = relationship(
        "Customer",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )

    seller_profile = relationship(
        "Seller",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )

    wishlist_items = relationship(
        "WishlistItem",
        back_populates="user",
        cascade="all, delete-orphan"
    )