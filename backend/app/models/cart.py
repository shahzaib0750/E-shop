from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint

from app.database import Base


class Cart(Base):
    __tablename__ = "cart"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)

    quantity = Column(Integer, default=1, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "product_id",
            name="uq_cart_user_product",
        ),
    )