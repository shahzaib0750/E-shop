import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.customer import Customer
from app.models.seller import Seller


def test_signup_creates_role_specific_profile_rows():
    client = TestClient(app)
    unique = uuid.uuid4().hex[:8]

    customer_payload = {
        "full_name": "Customer Test",
        "email": f"customer-{unique}@example.com",
        "phone": "03123456789",
        "password": "Passw0rd!",
        "role": "customer",
    }

    seller_payload = {
        "full_name": "Seller Test",
        "email": f"seller-{unique}@example.com",
        "phone": "03123456788",
        "password": "Passw0rd!",
        "role": "seller",
        "business_name": "Test Store",
        "business_type": "LLC",
        "category": "Electronics",
        "documents": "DOC-123",
    }

    customer_response = client.post("/signup", json=customer_payload)
    seller_response = client.post("/signup", json=seller_payload)

    assert customer_response.status_code == 201
    assert seller_response.status_code == 201

    db = SessionLocal()
    try:
        created_customer_user = db.query(User).filter(User.email == customer_payload["email"]).first()
        created_seller_user = db.query(User).filter(User.email == seller_payload["email"]).first()

        assert created_customer_user is not None
        assert created_seller_user is not None
        assert db.query(Customer).filter(Customer.user_id == created_customer_user.id).first() is not None
        assert db.query(Seller).filter(Seller.user_id == created_seller_user.id).first() is not None
    finally:
        db.close()
