import re
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.cart import Cart
from app.models.orders import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.wishlist import WishlistItem
from app.models.user import User


# ---------------------------------------------------------
# Product matching
# ---------------------------------------------------------

def extract_quantity(message: str) -> int:
    patterns = [
        r"\b(\d+)\s*(?:x|items?|units?|pieces?)\b",
        r"\b(?:quantity|qty)\s*(?:is|of)?\s*(\d+)\b",
    ]

    text = message.lower()

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            quantity = int(match.group(1))
            if quantity > 0:
                return quantity

    return 1


def clean_product_query(message: str) -> str:
    text = message.lower().strip()

    phrases = [
        r"\badd\b",
        r"\bput\b",
        r"\bplace\b",
        r"\bremove\b",
        r"\bdelete\b",
        r"\btake\b",
        r"\bbuy\b",
        r"\bget\b",
        r"\bfrom\b",
        r"\bto\b",
        r"\bin\b",
        r"\bmy\b",
        r"\bcart\b",
        r"\bwishlist\b",
        r"\bfavorites?\b",
        r"\bplease\b",
        r"\bquantity\b",
        r"\bqty\b",
        r"\bof\b",
        r"\bitems?\b",
        r"\bunits?\b",
        r"\bpieces?\b",
    ]

    for pattern in phrases:
        text = re.sub(pattern, " ", text)

    text = re.sub(r"\b\d+\b", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    return text


def find_product(db: Session, message: str):
    query_text = clean_product_query(message)

    if not query_text:
        return None

    # First try exact product name.
    product = (
        db.query(Product)
        .filter(Product.name.ilike(query_text))
        .first()
    )

    if product:
        return product

    # Then try product name containing the user's phrase.
    product = (
        db.query(Product)
        .filter(Product.name.ilike(f"%{query_text}%"))
        .first()
    )

    if product:
        return product

    # Finally score products based on matching words.
    words = [
        word
        for word in re.findall(r"\w+", query_text)
        if len(word) >= 2
    ]

    if not words:
        return None

    products = db.query(Product).all()

    best_product = None
    best_score = 0

    for product in products:
        searchable = " ".join(
            [
                product.name or "",
                product.brand or "",
                product.description or "",
            ]
        ).lower()

        score = sum(
            1 for word in words
            if word in searchable
        )

        if score > best_score:
            best_score = score
            best_product = product

    return best_product


# ---------------------------------------------------------
# Cart actions
# ---------------------------------------------------------

def add_to_cart_action(
    db: Session,
    current_user: User,
    message: str,
):
    if current_user.role != "customer":
        raise HTTPException(
            status_code=403,
            detail="Only customer accounts can use the cart.",
        )

    product = find_product(db, message)

    if not product:
        return (
            "I couldn't identify the product you want to add. "
            "Please provide the product name."
        )

    quantity = extract_quantity(message)

    if quantity <= 0:
        return "The quantity must be greater than zero."

    if product.stock <= 0:
        return f"Sorry, {product.name} is currently out of stock."

    existing_item = (
        db.query(Cart)
        .filter(
            Cart.user_id == current_user.id,
            Cart.product_id == product.id,
        )
        .first()
    )

    if existing_item:
        new_quantity = existing_item.quantity + quantity

        if new_quantity > product.stock:
            return (
                f"Only {product.stock} units of {product.name} "
                f"are available."
            )

        existing_item.quantity = new_quantity
        db.commit()

        return (
            f"Added {quantity} more × {product.name} to your cart. "
            f"Your cart now has {new_quantity}."
        )

    if quantity > product.stock:
        return (
            f"Only {product.stock} units of {product.name} "
            f"are available."
        )

    cart_item = Cart(
        user_id=current_user.id,
        product_id=product.id,
        quantity=quantity,
    )

    db.add(cart_item)
    db.commit()

    return (
        f"Added {quantity} × {product.name} to your cart."
    )


def get_cart_action(
    db: Session,
    current_user: User,
):
    if current_user.role != "customer":
        return "Only customer accounts can view the cart."

    items = (
        db.query(Cart, Product)
        .join(Product, Cart.product_id == Product.id)
        .filter(Cart.user_id == current_user.id)
        .all()
    )

    if not items:
        return "Your cart is currently empty."

    lines = ["Here is your cart:"]

    total = Decimal("0.00")

    for cart, product in items:
        subtotal = Decimal(str(product.price)) * cart.quantity
        total += subtotal

        lines.append(
            f"• {product.name} × {cart.quantity} "
            f"= ${subtotal:.2f}"
        )

    lines.append(f"Total: ${total:.2f}")

    return "\n".join(lines)


def remove_from_cart_action(
    db: Session,
    current_user: User,
    message: str,
):
    if current_user.role != "customer":
        return "Only customer accounts can modify the cart."

    product = find_product(db, message)

    if not product:
        return (
            "I couldn't identify the product you want to remove. "
            "Please provide the product name."
        )

    cart_item = (
        db.query(Cart)
        .filter(
            Cart.user_id == current_user.id,
            Cart.product_id == product.id,
        )
        .first()
    )

    if not cart_item:
        return f"{product.name} is not in your cart."

    db.delete(cart_item)
    db.commit()

    return f"Removed {product.name} from your cart."


def update_cart_action(
    db: Session,
    current_user: User,
    message: str,
):
    if current_user.role != "customer":
        return "Only customer accounts can modify the cart."

    quantity = extract_quantity(message)

    product = find_product(db, message)

    if not product:
        return (
            "I couldn't identify the product. "
            "Please provide the product name and quantity."
        )

    cart_item = (
        db.query(Cart)
        .filter(
            Cart.user_id == current_user.id,
            Cart.product_id == product.id,
        )
        .first()
    )

    if not cart_item:
        return f"{product.name} is not in your cart."

    if quantity > product.stock:
        return (
            f"Only {product.stock} units of {product.name} "
            f"are available."
        )

    cart_item.quantity = quantity
    db.commit()

    return (
        f"Updated {product.name} quantity to {quantity}."
    )


# ---------------------------------------------------------
# Order actions
# ---------------------------------------------------------

def place_order_action(
    db: Session,
    current_user: User,
    message: str,
):
    if current_user.role != "customer":
        return "Only customer accounts can place orders."

    # The address must be supplied by the user.
    address_patterns = [
        r"\baddress\s*(?:is|:)?\s*(.+)",
        r"\bdeliver\s+to\s+(.+)",
        r"\bship\s+to\s+(.+)",
    ]

    address = None
    text = message.strip()

    for pattern in address_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            address = match.group(1).strip()
            break

    if not address:
        return (
            "Sure. I can place the order, but I need your shipping "
            "address first. For example: "
            "\"Place my order, address is House 10, Lahore, Pakistan.\""
        )

    if len(address) < 10:
        return "Please provide a complete shipping address."

    cart_items = (
        db.query(Cart, Product)
        .join(Product, Cart.product_id == Product.id)
        .filter(Cart.user_id == current_user.id)
        .with_for_update()
        .all()
    )

    if not cart_items:
        return "Your cart is empty, so there is nothing to order."

    total_amount = Decimal("0.00")
    locked_products = []

    try:
        for cart, product in cart_items:
            if cart.quantity <= 0:
                return f"Invalid quantity for {product.name}."

            if cart.quantity > product.stock:
                return (
                    f"Not enough stock for {product.name}. "
                    f"Only {product.stock} available."
                )

            total_amount += (
                Decimal(str(product.price)) * cart.quantity
            )

            locked_products.append((cart, product))

        new_order = Order(
            user_id=current_user.id,
            total_amount=total_amount,
            status="pending",
            shipping_address=address,
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

        return (
            f"Order #{new_order.id} placed successfully. "
            f"Your total is ${float(new_order.total_amount):.2f}. "
            f"Status: {new_order.status}."
        )

    except Exception:
        db.rollback()
        raise


def get_orders_action(
    db: Session,
    current_user: User,
):
    orders = (
        db.query(Order)
        .filter(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
        .all()
    )

    if not orders:
        return "You don't have any orders yet."

    lines = ["Here are your orders:"]

    for order in orders:
        lines.append(
            f"• Order #{order.id} — "
            f"${float(order.total_amount):.2f} — "
            f"{order.status}"
        )

    return "\n".join(lines)


def extract_order_id(message: str):
    match = re.search(
        r"(?:order\s*#?\s*|#)(\d+)",
        message.lower(),
    )

    if match:
        return int(match.group(1))

    return None


def get_order_details_action(
    db: Session,
    current_user: User,
    message: str,
):
    order_id = extract_order_id(message)

    if not order_id:
        return "Please provide the order number. For example: \"Show order #12\"."

    order = (
        db.query(Order)
        .filter(
            Order.id == order_id,
            Order.user_id == current_user.id,
        )
        .first()
    )

    if not order:
        return f"I couldn't find order #{order_id} in your account."

    items = (
        db.query(OrderItem, Product)
        .join(Product, OrderItem.product_id == Product.id)
        .filter(OrderItem.order_id == order.id)
        .all()
    )

    lines = [
        f"Order #{order.id}",
        f"Status: {order.status}",
        f"Shipping address: {order.shipping_address}",
        "Items:",
    ]

    for item, product in items:
        subtotal = Decimal(str(item.price)) * item.quantity

        lines.append(
            f"• {product.name} × {item.quantity} "
            f"= ${subtotal:.2f}"
        )

    lines.append(
        f"Total: ${float(order.total_amount):.2f}"
    )

    return "\n".join(lines)


def cancel_order_action(
    db: Session,
    current_user: User,
    message: str,
):
    order_id = extract_order_id(message)

    if not order_id:
        return "Please provide the order number you want to cancel."

    order = (
        db.query(Order)
        .filter(
            Order.id == order_id,
            Order.user_id == current_user.id,
        )
        .first()
    )

    if not order:
        return f"I couldn't find order #{order_id} in your account."

    if order.status != "pending":
        return (
            f"Order #{order_id} cannot be cancelled because its "
            f"status is '{order.status}'."
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

        return f"Order #{order_id} has been cancelled successfully."

    except Exception:
        db.rollback()
        raise


# ---------------------------------------------------------
# Wishlist actions
# ---------------------------------------------------------

def get_wishlist_action(
    db: Session,
    current_user: User,
):
    if current_user.role != "customer":
        return "Only customer accounts can use the wishlist."

    items = (
        db.query(WishlistItem)
        .options(joinedload(WishlistItem.product))
        .filter(WishlistItem.user_id == current_user.id)
        .order_by(WishlistItem.created_at.desc())
        .all()
    )

    if not items:
        return "Your wishlist is currently empty."

    lines = ["Here is your wishlist:"]

    for item in items:
        product = item.product

        lines.append(
            f"• {product.name} — ${product.price} "
            f"(Stock: {product.stock})"
        )

    return "\n".join(lines)


def add_to_wishlist_action(
    db: Session,
    current_user: User,
    message: str,
):
    if current_user.role != "customer":
        return "Only customer accounts can use the wishlist."

    product = find_product(db, message)

    if not product:
        return (
            "I couldn't identify the product you want to add "
            "to your wishlist."
        )

    existing = (
        db.query(WishlistItem)
        .filter(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == product.id,
        )
        .first()
    )

    if existing:
        return f"{product.name} is already in your wishlist."

    item = WishlistItem(
        user_id=current_user.id,
        product_id=product.id,
    )

    db.add(item)
    db.commit()

    return f"Added {product.name} to your wishlist."


def remove_from_wishlist_action(
    db: Session,
    current_user: User,
    message: str,
):
    if current_user.role != "customer":
        return "Only customer accounts can use the wishlist."

    product = find_product(db, message)

    if not product:
        return (
            "I couldn't identify the product you want to "
            "remove from your wishlist."
        )

    item = (
        db.query(WishlistItem)
        .filter(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == product.id,
        )
        .first()
    )

    if not item:
        return f"{product.name} is not in your wishlist."

    db.delete(item)
    db.commit()

    return f"Removed {product.name} from your wishlist."


# ---------------------------------------------------------
# Reorder
# ---------------------------------------------------------

def reorder_action(
    db: Session,
    current_user: User,
    message: str,
):
    order_id = extract_order_id(message)

    if not order_id:
        return "Please provide the order number you want to reorder."

    order = (
        db.query(Order)
        .filter(
            Order.id == order_id,
            Order.user_id == current_user.id,
        )
        .first()
    )

    if not order:
        return f"I couldn't find order #{order_id} in your account."

    order_items = (
        db.query(OrderItem, Product)
        .join(Product, OrderItem.product_id == Product.id)
        .filter(OrderItem.order_id == order.id)
        .all()
    )

    if not order_items:
        return f"Order #{order_id} has no items to reorder."

    added = []
    unavailable = []

    for item, product in order_items:
        existing_cart = (
            db.query(Cart)
            .filter(
                Cart.user_id == current_user.id,
                Cart.product_id == product.id,
            )
            .first()
        )

        if product.stock <= 0:
            unavailable.append(product.name)
            continue

        if existing_cart:
            new_quantity = existing_cart.quantity + item.quantity

            if new_quantity > product.stock:
                unavailable.append(product.name)
                continue

            existing_cart.quantity = new_quantity

        else:
            if item.quantity > product.stock:
                unavailable.append(product.name)
                continue

            db.add(
                Cart(
                    user_id=current_user.id,
                    product_id=product.id,
                    quantity=item.quantity,
                )
            )

        added.append(product.name)

    db.commit()

    response = []

    if added:
        response.append(
            "Added to your cart: " + ", ".join(added) + "."
        )

    if unavailable:
        response.append(
            "These products could not be reordered because "
            "of stock limits: " + ", ".join(unavailable) + "."
        )

    return "\n".join(response)
