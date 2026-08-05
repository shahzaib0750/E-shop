from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.cart import Cart
from app.models.product import Product
from app.schemas.cart import CartCreate, CartUpdate

router = APIRouter()


# ADD TO CART
@router.post("/cart")
def add_to_cart(
    cart: CartCreate,
    db: Session = Depends(get_db)
):

    product = db.query(Product).filter(
        Product.id == cart.product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    if cart.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than 0"
        )

    if cart.quantity > product.stock:
        raise HTTPException(
            status_code=400,
            detail="Not enough stock available"
        )

    existing_item = db.query(Cart).filter(
        Cart.user_id == cart.user_id,
        Cart.product_id == cart.product_id
    ).first()

    if existing_item:

        existing_item.quantity += cart.quantity

        db.commit()
        db.refresh(existing_item)

        return {
            "message": "Cart quantity updated",
            "cart_id": existing_item.id
        }

    new_cart = Cart(
        user_id=cart.user_id,
        product_id=cart.product_id,
        quantity=cart.quantity
    )

    db.add(new_cart)
    db.commit()
    db.refresh(new_cart)

    return {
        "message": "Product added to cart",
        "cart_id": new_cart.id
    }


# GET CART
@router.get("/cart/{user_id}")
def get_cart(
    user_id: int,
    db: Session = Depends(get_db)
):

    cart_items = db.query(Cart, Product).join(
        Product,
        Cart.product_id == Product.id
    ).filter(
        Cart.user_id == user_id
    ).all()

    print("Found:", cart_items)
    result = []

    for cart, product in cart_items:

        result.append({
            "cart_id": cart.id,
            "product_id": product.id,
            "name": product.name,
            "brand": product.brand,
            "price": product.price,
            "image": product.image,
            "quantity": cart.quantity
        })

    return result


# UPDATE CART QUANTITY
@router.put("/cart/{cart_id}")
def update_cart_quantity(
    cart_id: int,
    cart: CartUpdate,
    db: Session = Depends(get_db)
):

    # Find cart item
    cart_item = db.query(Cart).filter(
        Cart.id == cart_id
    ).first()

    if not cart_item:
        raise HTTPException(
            status_code=404,
            detail="Cart item not found"
        )

    # Quantity must be greater than 0
    if cart.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than 0"
        )

    # Find product
    product = db.query(Product).filter(
        Product.id == cart_item.product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    # Check stock
    if cart.quantity > product.stock:
        raise HTTPException(
            status_code=400,
            detail="Not enough stock available"
        )

    # Update quantity
    cart_item.quantity = cart.quantity

    db.commit()
    db.refresh(cart_item)

    return {
        "message": "Cart quantity updated successfully",
        "cart_id": cart_item.id,
        "quantity": cart_item.quantity
    }

@router.delete("/cart/{cart_id}")
def remove_from_cart(
    cart_id: int,
    db: Session = Depends(get_db)
):

    cart_item = db.query(Cart).filter(
        Cart.id == cart_id
    ).first()

    if not cart_item:
        raise HTTPException(
            status_code=404,
            detail="Cart item not found"
        )

    db.delete(cart_item)

    db.commit()

    return {
        "message": "Product removed from cart",
        "cart_id": cart_id
    }

    # GET CART COUNT
@router.get("/cart/count/{user_id}")
def get_cart_count(
    user_id: int,
    db: Session = Depends(get_db)
):

    total_items = db.query(Cart).filter(
        Cart.user_id == user_id
    ).all()


    count = sum(
        item.quantity for item in total_items
    )


    return {
        "count": count
    }