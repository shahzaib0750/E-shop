from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.product import Product
from app.models.wishlist import WishlistItem


router = APIRouter(
    prefix="/wishlist",
    tags=["Wishlist"]
)


def verify_customer(current_user: User):
    if current_user.role != "customer":
        raise HTTPException(
            status_code=403,
            detail="Only customers can use wishlist"
        )


@router.get("")
def get_wishlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_customer(current_user)

    items = (
        db.query(WishlistItem)
        .options(
            joinedload(WishlistItem.product)
        )
        .filter(
            WishlistItem.user_id == current_user.id
        )
        .order_by(WishlistItem.created_at.desc())
        .all()
    )

    return [
        {
            "id": item.id,
            "product_id": item.product.id,
            "name": item.product.name,
            "description": item.product.description,
            "category_id": item.product.category_id,
            "brand": item.product.brand,
            "price": item.product.price,
            "stock": item.product.stock,
            "image": item.product.image,
            "created_at": item.created_at,
        }
        for item in items
    ]


@router.post("/{product_id}")
def add_to_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_customer(current_user)

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

    existing_item = (
        db.query(WishlistItem)
        .filter(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == product_id
        )
        .first()
    )

    if existing_item:
        return {
            "message": "Product is already in wishlist",
            "wishlist_id": existing_item.id
        }

    wishlist_item = WishlistItem(
        user_id=current_user.id,
        product_id=product_id
    )

    db.add(wishlist_item)

    try:
        db.commit()
        db.refresh(wishlist_item)

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to add product to wishlist"
        )

    return {
        "message": "Product added to wishlist",
        "wishlist_id": wishlist_item.id
    }


@router.delete("/{product_id}")
def remove_from_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_customer(current_user)

    item = (
        db.query(WishlistItem)
        .filter(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == product_id
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Product is not in wishlist"
        )

    db.delete(item)

    try:
        db.commit()

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to remove product from wishlist"
        )

    return {
        "message": "Product removed from wishlist"
    }


@router.get("/check/{product_id}")
def check_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_customer(current_user)

    item = (
        db.query(WishlistItem)
        .filter(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == product_id
        )
        .first()
    )

    return {
        "in_wishlist": item is not None
    }