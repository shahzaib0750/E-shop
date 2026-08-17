from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.cart import Cart
from app.models.order_Item import OrderItem
from app.models.orders import Order
from app.models.product import Product
from app.models.user import User
from app.schemas.order import OrderCreate, OrderStatusUpdate


router = APIRouter()


@router.post("/orders")
def create_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "customer":
        raise HTTPException(
            status_code=403,
            detail="Only customer accounts can place orders.",
        )

    try:
        cart_items = (
            db.query(Cart, Product)
            .join(Product, Cart.product_id == Product.id)
            .filter(Cart.user_id == current_user.id)
            .with_for_update()
            .all()
        )

        if not cart_items:
            raise HTTPException(
                status_code=400,
                detail="Cart is empty.",
            )

        total_amount = Decimal("0.00")

        locked_products = []

        for cart, product in cart_items:
            locked_product = (
                db.query(Product)
                .filter(Product.id == product.id)
                .with_for_update()
                .first()
            )

            if not locked_product:
                raise HTTPException(
                    status_code=404,
                    detail=f"Product {product.id} not found.",
                )

            if cart.quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid quantity for {locked_product.name}.",
                )

            if cart.quantity > locked_product.stock:
                raise HTTPException(
                    status_code=400,
                    detail=f"Not enough stock for {locked_product.name}.",
                )

            total_amount += (
                Decimal(str(locked_product.price))
                * cart.quantity
            )

            locked_products.append(
                (cart, locked_product)
            )

        new_order = Order(
            user_id=current_user.id,
            total_amount=total_amount,
            status="pending",
            shipping_address=order_data.shipping_address.strip(),
        )

        db.add(new_order)
        db.flush()

        for cart, product in locked_products:
            order_item = OrderItem(
                order_id=new_order.id,
                product_id=product.id,
                quantity=cart.quantity,
                price=product.price,
            )

            db.add(order_item)

            product.stock -= cart.quantity

            db.delete(cart)

        db.commit()
        db.refresh(new_order)

        return {
            "message": "Order created successfully",
            "order_id": new_order.id,
            "total_amount": float(new_order.total_amount),
            "status": new_order.status,
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()

        print("ORDER CREATION ERROR:", repr(error))

        raise HTTPException(
            status_code=500,
            detail="Unable to create order.",
        )


@router.get("/orders")
def get_my_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "customer":
        raise HTTPException(
            status_code=403,
            detail="Only customer accounts can view orders.",
        )

    orders = (
        db.query(Order)
        .filter(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
        .all()
    )

    return [
        {
            "order_id": order.id,
            "total_amount": float(order.total_amount),
            "status": order.status,
            "shipping_address": order.shipping_address,
            "created_at": order.created_at,
        }
        for order in orders
    ]


@router.get("/orders/details/{order_id}")
def get_order_details(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = (
        db.query(Order)
        .filter(
            Order.id == order_id,
            Order.user_id == current_user.id,
        )
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found.",
        )

    order_items = (
        db.query(OrderItem, Product)
        .join(
            Product,
            OrderItem.product_id == Product.id,
        )
        .filter(OrderItem.order_id == order_id)
        .all()
    )

    items = [
        {
            "product_id": product.id,
            "name": product.name,
            "brand": product.brand,
            "image": product.image,
            "price": float(item.price),
            "quantity": item.quantity,
            "subtotal": float(
                item.price * item.quantity
            ),
        }
        for item, product in order_items
    ]

    return {
        "order_id": order.id,
        "status": order.status,
        "total_amount": float(order.total_amount),
        "shipping_address": order.shipping_address,
        "created_at": order.created_at,
        "items": items,
    }


@router.delete("/orders/{order_id}")
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = (
        db.query(Order)
        .filter(
            Order.id == order_id,
            Order.user_id == current_user.id,
        )
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found.",
        )

    if order.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Only pending orders can be cancelled.",
        )

    try:
        order_items = (
            db.query(OrderItem)
            .filter(OrderItem.order_id == order_id)
            .with_for_update()
            .all()
        )

        for item in order_items:
            product = (
                db.query(Product)
                .filter(Product.id == item.product_id)
                .with_for_update()
                .first()
            )

            if product:
                product.stock += item.quantity

        order.status = "cancelled"

        db.commit()

    except Exception as error:
        db.rollback()

        print("ORDER CANCELLATION ERROR:", repr(error))

        raise HTTPException(
            status_code=500,
            detail="Unable to cancel order.",
        )

    return {
        "message": "Order cancelled successfully.",
    }


@router.get("/seller/orders")
def seller_view_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "seller":
        raise HTTPException(
            status_code=403,
            detail="Only sellers can access seller orders.",
        )

    orders = (
        db.query(Order, OrderItem, Product)
        .join(
            OrderItem,
            Order.id == OrderItem.order_id,
        )
        .join(
            Product,
            Product.id == OrderItem.product_id,
        )
        .filter(
            Product.seller_id == current_user.id,
        )
        .order_by(Order.created_at.desc())
        .all()
    )

    return [
        {
            "order_id": order.id,
            "customer_id": order.user_id,
            "product_id": product.id,
            "product_name": product.name,
            "image": product.image,
            "quantity": item.quantity,
            "price": float(item.price),
            "total": float(
                item.price * item.quantity
            ),
            "status": order.status,
            "created_at": order.created_at,
        }
        for order, item, product in orders
    ]


@router.put("/seller/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    status_data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "seller":
        raise HTTPException(
            status_code=403,
            detail="Only sellers can update order status.",
        )

    allowed_status = {
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
    }

    new_status = status_data.status.strip().lower()

    if new_status not in allowed_status:
        raise HTTPException(
            status_code=400,
            detail="Invalid order status.",
        )

    order = (
        db.query(Order)
        .join(
            OrderItem,
            Order.id == OrderItem.order_id,
        )
        .join(
            Product,
            Product.id == OrderItem.product_id,
        )
        .filter(
            Order.id == order_id,
            Product.seller_id == current_user.id,
        )
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found.",
        )

    try:
        order.status = new_status

        db.commit()
        db.refresh(order)

    except Exception as error:
        db.rollback()

        print("ORDER STATUS ERROR:", repr(error))

        raise HTTPException(
            status_code=500,
            detail="Unable to update order status.",
        )

    return {
        "message": "Order status updated successfully.",
        "order_id": order.id,
        "status": order.status,
    }