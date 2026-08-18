from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.categories import Category
from app.models.product import Product
from app.models.user import User
from app.schemas.categories import CategoryCreate

router = APIRouter()


# ---------------- CREATE CATEGORY ----------------

@router.post("/categories")
def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "seller":
        raise HTTPException(
            status_code=403,
            detail="Only sellers can create categories"
        )

    existing = (
        db.query(Category)
        .filter(Category.name == category.name)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Category already exists"
        )

    new_category = Category(
        name=category.name
    )

    db.add(new_category)

    try:
        db.commit()
        db.refresh(new_category)

    except IntegrityError:
        # Lost the race against a concurrent create of the same name.
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Category already exists"
        )

    return new_category


# ---------------- GET ALL CATEGORIES ----------------

@router.get("/categories")
def get_categories(
    db: Session = Depends(get_db)
):

    return db.query(Category).all()


# ---------------- GET SINGLE CATEGORY ----------------

@router.get("/categories/{category_id}")
def get_category(
    category_id: int,
    db: Session = Depends(get_db)
):

    category = (
        db.query(Category)
        .filter(Category.id == category_id)
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    return category


# ---------------- GET PRODUCTS BY CATEGORY ----------------

@router.get("/categories/{category_id}/products")
def get_products_by_category(
    category_id: int,
    db: Session = Depends(get_db)
):

    category = (
        db.query(Category)
        .filter(Category.id == category_id)
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    products = (
        db.query(Product)
        .filter(Product.category_id == category_id)
        .all()
    )

    return products