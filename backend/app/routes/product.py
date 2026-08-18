from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.product import Product
from app.models.user import User
from app.models.categories import Category
from app.models.order_item import OrderItem
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
)
from app.dependencies import get_current_user


router = APIRouter()


@router.post("/products")
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "seller":
        raise HTTPException(
            status_code=403,
            detail="Only sellers can create products",
        )

    category = (
        db.query(Category)
        .filter(Category.id == product.category_id)
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found",
        )

    if product.stock < 0:
        raise HTTPException(
            status_code=400,
            detail="Stock cannot be negative",
        )

    new_product = Product(
        name=product.name.strip(),
        description=product.description.strip(),
        category_id=product.category_id,
        brand=product.brand.strip(),
        price=product.price,
        stock=product.stock,
        image=product.image.strip(),
        seller_id=current_user.id,
    )

    db.add(new_product)

    try:
        db.commit()
        db.refresh(new_product)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Unable to create product",
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to create product",
        )

    return {
        "message": "Product created successfully",
        "product_id": new_product.id,
    }


@router.get(
    "/products",
    response_model=List[ProductResponse],
)
def get_products(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * limit

    return (
        db.query(Product)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/products/count")
def get_products_count(
    db: Session = Depends(get_db),
):
    total = db.query(Product).count()

    return {
        "total": total,
    }


@router.get("/products/search")
def search_products(
    keyword: str = Query(
        ...,
        min_length=1,
        max_length=100,
    ),
    db: Session = Depends(get_db),
):
    keyword = keyword.strip()

    if not keyword:
        raise HTTPException(
            status_code=400,
            detail="Search keyword cannot be empty",
        )

    return (
        db.query(Product)
        .filter(
            Product.name.ilike(f"%{keyword}%")
        )
        .all()
    )


@router.get(
    "/products/{product_id}",
    response_model=ProductResponse,
)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    return product


@router.put("/products/{product_id}")
def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "seller":
        raise HTTPException(
            status_code=403,
            detail="Only sellers can update products",
        )

    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    if product.seller_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to modify this product",
        )

    update_data = product_data.model_dump(
        exclude_unset=True
    )

    if "category_id" in update_data:
        category = (
            db.query(Category)
            .filter(
                Category.id == update_data["category_id"]
            )
            .first()
        )

        if not category:
            raise HTTPException(
                status_code=404,
                detail="Category not found",
            )

    if "name" in update_data:
        update_data["name"] = update_data["name"].strip()

        if not update_data["name"]:
            raise HTTPException(
                status_code=400,
                detail="Product name cannot be empty",
            )

    if "description" in update_data:
        update_data["description"] = (
            update_data["description"].strip()
        )

    if "brand" in update_data:
        update_data["brand"] = (
            update_data["brand"].strip()
        )

    if "image" in update_data:
        update_data["image"] = (
            update_data["image"].strip()
        )

    if "stock" in update_data:
        if update_data["stock"] < 0:
            raise HTTPException(
                status_code=400,
                detail="Stock cannot be negative",
            )

    for key, value in update_data.items():
        setattr(product, key, value)

    try:
        db.commit()
        db.refresh(product)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Unable to update product",
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to update product",
        )

    return {
        "message": "Product updated successfully",
        "product": product,
    }


@router.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "seller":
        raise HTTPException(
            status_code=403,
            detail="Only sellers can delete products",
        )

    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    if product.seller_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to delete this product",
        )

    order_history = (
        db.query(OrderItem.id)
        .filter(OrderItem.product_id == product.id)
        .first()
    )

    if order_history:
        raise HTTPException(
            status_code=409,
            detail=(
                "This product cannot be deleted because it has "
                "existing order history. You can update the "
                "product or set its stock to 0 instead."
            ),
        )

    try:
        db.delete(product)
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "This product cannot be deleted because it is "
                "used by existing records."
            ),
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to delete product",
        )

    return {
        "message": "Product deleted successfully",
    }


@router.get("/seller/products")
def get_my_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "seller":
        raise HTTPException(
            status_code=403,
            detail="Only sellers can access seller products",
        )

    return (
        db.query(Product)
        .filter(
            Product.seller_id == current_user.id
        )
        .order_by(Product.id.desc())
        .all()
    )