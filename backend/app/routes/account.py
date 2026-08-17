from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.customer import Customer
from app.models.seller import Seller
from app.schemas.user import UserSignup, UserLogin
from app.auth.security import hash_password, verify_password
from app.auth.jwt_handler import create_access_token

router = APIRouter()


@router.post(
    "/signup",
    status_code=status.HTTP_201_CREATED
)
def signup(
    user: UserSignup,
    db: Session = Depends(get_db)
):
    full_name = user.full_name.strip()
    phone = user.phone.strip()
    email = str(user.email).strip().lower()

    if not full_name:
        raise HTTPException(
            status_code=422,
            detail="Full name cannot be empty."
        )

    if not phone:
        raise HTTPException(
            status_code=422,
            detail="Phone number cannot be empty."
        )

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already exists."
        )

    requested_role = user.role.lower().strip()

    if requested_role not in {"customer", "seller"}:
        raise HTTPException(
            status_code=422,
            detail="Role must be either customer or seller."
        )

    new_user = User(
        full_name=full_name,
        email=email,
        phone=phone,
        password=hash_password(user.password),
        role=requested_role,
    )

    if requested_role == "customer":
        new_user.customer_profile = Customer(
            full_name=full_name,
            email=email,
            phone=phone,
        )

    elif requested_role == "seller":
        if not user.business_name:
            raise HTTPException(
                status_code=422,
                detail="Business name is required."
            )

        if not user.business_type:
            raise HTTPException(
                status_code=422,
                detail="Business type is required."
            )

        if not user.category:
            raise HTTPException(
                status_code=422,
                detail="Business category is required."
            )

        if not user.cnic:
            raise HTTPException(
                status_code=422,
                detail="CNIC is required."
            )

        new_user.seller_profile = Seller(
            full_name=full_name,
            business_name=user.business_name.strip(),
            business_type=user.business_type.strip(),
            category=user.category.strip(),
            cnic=user.cnic.strip(),
        )

    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Unable to create account. Email or phone may already exist."
        )

    except Exception as e:
        db.rollback()

        print("❌ SIGNUP ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    return {
        "message": "Account created successfully",
        "user_id": new_user.id,
        "role": new_user.role,
    }


@router.post("/login")
def login(
    user: UserLogin,
    db: Session = Depends(get_db)
):
    email = str(user.email).strip().lower()

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    try:
        password_valid = verify_password(
            user.password,
            existing_user.password
        )

    except Exception:
        password_valid = False

    if not password_valid:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token(
        {
            "user_id": existing_user.id,
            "email": existing_user.email,
            "role": existing_user.role,
        }
    )

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": existing_user.id,
            "full_name": existing_user.full_name,
            "email": existing_user.email,
            "role": existing_user.role,
        }
    }
