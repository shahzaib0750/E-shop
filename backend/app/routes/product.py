from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.product import Product
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
)

router = APIRouter()


# ---------------- CREATE PRODUCT ----------------

@router.post("/products")
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db)
):

    new_product = Product(
        name=product.name,
        description=product.description,
        category_id=product.category_id,
        brand=product.brand,
        price=product.price,
        stock=product.stock,
        image=product.image,
        seller_id=product.seller_id,
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    return {
        "message": "Product Created Successfully",
        "product_id": new_product.id,
    }


# ---------------- GET ALL PRODUCTS ----------------

from fastapi import Query

@router.get("/products", response_model=List[ProductResponse])
def get_products(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1),
    db: Session = Depends(get_db)
):

    skip = (page - 1) * limit

    products = (
        db.query(Product)
        .offset(skip)
        .limit(limit)
        .all()
    )

    return products



@router.get("/products/count")
def get_products_count(db: Session = Depends(get_db)):
    total = db.query(Product).count()
    return {
        "total": total
    }

# ---------------- SEARCH PRODUCTS ----------------

@router.get("/products/search")
def search_products(
    keyword: str = Query(...),
    db: Session = Depends(get_db)
):

    products = (
        db.query(Product)
        .filter(
            Product.name.ilike(f"%{keyword}%")
        )
        .all()
    )

    return products


# ---------------- GET SINGLE PRODUCT ----------------

@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db)
):

    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return product


# ---------------- UPDATE PRODUCT ----------------

@router.put("/products/{product_id}")
def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db)
):

    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    update_data = product_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)

    return {
        "message": "Product updated successfully",
        "product": product
    }


# ---------------- DELETE PRODUCT ----------------

@router.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db)
):

    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    db.delete(product)
    db.commit()

    return {
        "message": "Product deleted successfully"
    }


# ---------------- SELLER PRODUCTS ----------------

@router.get("/seller/products/{seller_id}")
def get_seller_products(
    seller_id: int,
    db: Session = Depends(get_db)
):

    products = (
        db.query(Product)
        .filter(Product.seller_id == seller_id)
        .all()
    )

    return products

