from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.orders import Order
from app.models.order_Item import OrderItem
from app.models.cart import Cart
from app.models.product import Product

from app.schemas.order import OrderCreate,OrderStatusUpdate
router = APIRouter()


@router.post("/orders")
def create_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db)
):

    cart_items = db.query(Cart, Product).join(
        Product,
        Cart.product_id == Product.id
    ).filter(
        Cart.user_id == order_data.user_id
    ).all()

    if not cart_items:
        raise HTTPException(
            status_code=400,
            detail="Cart is empty"
        )

    total_amount = 0

    for cart, product in cart_items:

        if cart.quantity > product.stock:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough stock for {product.name}"
            )

        total_amount += product.price * cart.quantity

    new_order = Order(
        user_id=order_data.user_id,
        total_amount=total_amount,
        status="pending"
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    for cart, product in cart_items:

        order_item = OrderItem(
            order_id=new_order.id,
            product_id=product.id,
            quantity=cart.quantity,
            price=product.price
        )

        db.add(order_item)

        product.stock -= cart.quantity

        db.delete(cart)

    db.commit()

    return {
        "message": "Order created successfully",
        "order_id": new_order.id,
        "total_amount": total_amount,
        "status": new_order.status
    }


@router.get("/orders/{user_id}")
def get_my_orders(
    user_id: int,
    db: Session = Depends(get_db)
):

    orders = db.query(Order).filter(
        Order.user_id == user_id
    ).order_by(
        Order.created_at.desc()
    ).all()

    result = []

    for order in orders:

        result.append({
            "order_id": order.id,
            "total_amount": order.total_amount,
            "status": order.status,
            "created_at": order.created_at
        })

    return result

@router.get("/orders/details/{order_id}")
def get_order_details(
    order_id: int,
    db: Session = Depends(get_db)
):

    order = (
        db.query(Order)
        .filter(Order.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    order_items = (
        db.query(OrderItem, Product)
        .join(
            Product,
            OrderItem.product_id == Product.id
        )
        .filter(
            OrderItem.order_id == order_id
        )
        .all()
    )

    items = []

    for item, product in order_items:

        items.append({
            "product_id": product.id,
            "name": product.name,
            "brand": product.brand,
            "image": product.image,
            "price": item.price,
            "quantity": item.quantity,
            "subtotal": item.price * item.quantity
        })

    return {
        "order_id": order.id,
        "status": order.status,
        "total_amount": order.total_amount,
        "created_at": order.created_at,
        "items": items
    }

@router.delete("/orders/{order_id}")
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db)
):

    order = db.query(Order).filter(
        Order.id == order_id
    ).first()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    if order.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Only pending orders can be cancelled"
        )

    order_items = db.query(OrderItem).filter(
        OrderItem.order_id == order_id
    ).all()

    for item in order_items:

        product = db.query(Product).filter(
            Product.id == item.product_id
        ).first()

        if product:
            product.stock += item.quantity

        db.delete(item)

    db.delete(order)

    db.commit()

    return {
        "message": "Order cancelled successfully"
    }

@router.get("/seller/orders/{seller_id}")
def seller_view_orders(
    seller_id: int,
    db: Session = Depends(get_db)
):

    orders = (
        db.query(Order, OrderItem, Product)
        .join(
            OrderItem,
            Order.id == OrderItem.order_id
        )
        .join(
            Product,
            Product.id == OrderItem.product_id
        )
        .filter(
            Product.seller_id == seller_id
        )
        .order_by(
            Order.created_at.desc()
        )
        .all()
    )

    result = []

    for order, item, product in orders:

        result.append({
            "order_id": order.id,
            "customer_id": order.user_id,
            "product_id": product.id,
            "product_name": product.name,
            "image": product.image,
            "quantity": item.quantity,
            "price": item.price,
            "total": item.price * item.quantity,
            "status": order.status,
            "created_at": order.created_at
        })

    return result


@router.put("/seller/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    status_data: OrderStatusUpdate,
    db: Session = Depends(get_db)
):

    order = db.query(Order).filter(
        Order.id == order_id
    ).first()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    allowed_status = [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled"
    ]

    if status_data.status.lower() not in allowed_status:
        raise HTTPException(
            status_code=400,
            detail="Invalid order status"
        )

    order.status = status_data.status.lower()

    db.commit()

    db.refresh(order)

    return {
        "message": "Order status updated successfully",
        "order_id": order.id,
        "status": order.status
    }