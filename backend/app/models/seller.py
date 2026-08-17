
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Seller(Base):
    __tablename__ = "sellers"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=False
    )

    full_name = Column(
        String(100),
        nullable=False
    )

    business_name = Column(
        String(150),
        nullable=False
    )

    business_type = Column(
        String(100),
        nullable=False
    )

    category = Column(
        String(100),
        nullable=False
    )

    cnic = Column(
        String(20),
        nullable=False
    )

    user = relationship(
        "User",
        back_populates="seller_profile"
    )
