from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.cart import Cart
from app.models.product import Product
from app.models.user import User
from app.schemas.cart import CartCreate, CartUpdate
from app.dependencies import get_current_user


router = APIRouter()


# Cart

@router.post("/cart")
def add_to_cart(
    cart: CartCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "customer":
        raise HTTPException(
            status_code=403,
            detail="Only customer accounts can add items to cart.",
        )

    product = (
        db.query(Product)
        .filter(Product.id == cart.product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    if cart.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than 0",
        )

    if cart.quantity > product.stock:
        raise HTTPException(
            status_code=400,
            detail="Not enough stock available",
        )

    existing_item = (
        db.query(Cart)
        .filter(
            Cart.user_id == current_user.id,
            Cart.product_id == cart.product_id,
        )
        .first()
    )

    if existing_item:
        new_quantity = existing_item.quantity + cart.quantity

        if new_quantity > product.stock:
            raise HTTPException(
                status_code=400,
                detail="Not enough stock available",
            )

        existing_item.quantity = new_quantity

        try:
            db.commit()
            db.refresh(existing_item)
        except Exception:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Unable to update cart",
            )

        return {
            "message": "Cart quantity updated",
            "cart_id": existing_item.id,
        }

    new_cart = Cart(
        user_id=current_user.id,
        product_id=cart.product_id,
        quantity=cart.quantity,
    )

    db.add(new_cart)

    try:
        db.commit()
        db.refresh(new_cart)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to add product to cart",
        )

    return {
        "message": "Product added to cart",
        "cart_id": new_cart.id,
    }


@router.get("/cart")
def get_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "customer":
        raise HTTPException(
            status_code=403,
            detail="Only customer accounts can view cart items.",
        )

    cart_items = (
        db.query(Cart, Product)
        .join(Product, Cart.product_id == Product.id)
        .filter(Cart.user_id == current_user.id)
        .all()
    )

    result = []

    for cart, product in cart_items:
        result.append({
            "cart_id": cart.id,
            "product_id": product.id,
            "name": product.name,
            "brand": product.brand,
            "price": product.price,
            "image": product.image,
            "quantity": cart.quantity,
        })

    return result


@router.put("/cart/{cart_id}")
def update_cart_quantity(
    cart_id: int,
    cart: CartUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cart_item = (
        db.query(Cart)
        .filter(
            Cart.id == cart_id,
            Cart.user_id == current_user.id,
        )
        .first()
    )

    if not cart_item:
        raise HTTPException(
            status_code=404,
            detail="Cart item not found",
        )

    if cart.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than 0",
        )

    product = (
        db.query(Product)
        .filter(Product.id == cart_item.product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    if cart.quantity > product.stock:
        raise HTTPException(
            status_code=400,
            detail="Not enough stock available",
        )

    cart_item.quantity = cart.quantity

    try:
        db.commit()
        db.refresh(cart_item)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update cart",
        )

    return {
        "message": "Cart updated",
        "quantity": cart_item.quantity,
    }


@router.delete("/cart/{cart_id}")
def remove_from_cart(
    cart_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cart_item = (
        db.query(Cart)
        .filter(
            Cart.id == cart_id,
            Cart.user_id == current_user.id,
        )
        .first()
    )

    if not cart_item:
        raise HTTPException(
            status_code=404,
            detail="Cart item not found",
        )

    try:
        db.delete(cart_item)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to remove product from cart",
        )

    return {
        "message": "Product removed successfully",
    }


@router.get("/cart/count")
def get_cart_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "customer":
        raise HTTPException(
            status_code=403,
            detail="Only customer accounts can access cart count.",
        )

    total_items = (
        db.query(Cart)
        .filter(Cart.user_id == current_user.id)
        .all()
    )

    count = sum(item.quantity for item in total_items)

    return {
        "count": count,
    }