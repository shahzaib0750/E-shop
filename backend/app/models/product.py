from sqlalchemy import (
    CheckConstraint,
    Column,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(150),
        nullable=False
    )

    description = Column(
        Text,
        nullable=False
    )

    category_id = Column(
        Integer,
        ForeignKey("categories.id"),
        nullable=False
    )

    brand = Column(
        String(100),
        nullable=False
    )

    price = Column(
        Numeric(12, 2),
        nullable=False
    )

    stock = Column(
        Integer,
        nullable=False,
        default=0
    )

    image = Column(
        String(500),
        nullable=False
    )

    seller_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    category = relationship(
        "Category",
        back_populates="products"
    )

    seller = relationship(
        "User",
        back_populates="products"
    )

    wishlist_items = relationship(
        "WishlistItem",
        back_populates="product",
        cascade="all, delete-orphan"
    )

    order_items = relationship(
        "OrderItem",
        back_populates="product"
    )

    __table_args__ = (
        CheckConstraint(
            "price > 0",
            name="check_product_price_positive"
        ),
        CheckConstraint(
            "stock >= 0",
            name="check_product_stock_non_negative"
        ),
    )