from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.database import Base, engine

# Models
from app.models.user import User
from app.models.product import Product
from app.models.cart import Cart
from app.models.orders import Order
from app.models.order_item import OrderItem
from app.models.categories import Category
from app.models.customer import Customer
from app.models.seller import Seller
from app.models.wishlist import WishlistItem

# Routes
from app.routes.account import router as account_router
from app.routes.product import router as product_router
from app.routes.cart import router as cart_router
from app.routes.orders import router as orders_router
from app.routes.chatbot import router as chatbot_router
from app.routes.categories import router as categories_router
from app.routes.wishlist import router as wishlist_router


app = FastAPI(
    title="E-Shop API",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    account_router,
    tags=["account"]
)

app.include_router(
    product_router,
    tags=["products"]
)

app.include_router(
    cart_router,
    tags=["cart"]
)

app.include_router(
    orders_router,
    tags=["orders"]
)

app.include_router(
    chatbot_router,
    tags=["chatbot"]
)

app.include_router(
    categories_router,
    tags=["categories"]
)

app.include_router(
    wishlist_router,
    tags=["wishlist"]
)


Base.metadata.create_all(bind=engine)