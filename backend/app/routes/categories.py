from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.categories import Category
from app.models.product import Product
from app.schemas.categories import CategoryCreate

router = APIRouter()


# ---------------- CREATE CATEGORY ----------------

@router.post("/categories")
def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db)
):

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
    db.commit()
    db.refresh(new_category)

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