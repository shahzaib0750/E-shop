from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine

# Import Routers
from app.routes.account import router as account_router
from app.routes.product import router as product_router
from app.routes.cart import router as cart_router
from app.routes.orders import router as orders_router
from app.routes.chatbot import router as chatbot_router
from app.routes import categories

app = FastAPI(
    title="E-Shop API",
    version="1.0.0"
)

# Create Database Tables
Base.metadata.create_all(bind=engine)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(account_router)
app.include_router(product_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(chatbot_router)
app.include_router(categories.router)


@app.get("/")
def home():
    return {
        "message": "E-Shop API Running"
    }