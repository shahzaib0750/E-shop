from sqlalchemy import Column, Integer, String, Float, Text

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(255), nullable=False)

    description = Column(Text)

    category = Column(String(100))

    brand = Column(String(100))

    price = Column(Float, nullable=False)

    stock = Column(Integer, default=0)

    image = Column(String(255))

    seller_id = Column(Integer)