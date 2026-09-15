import os
import re

from dotenv import load_dotenv
from openai import OpenAI
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.models.product import Product
from app.models.categories import Category
from app.models.user import User

load_dotenv()

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)


def extract_keywords(message: str):
    words = re.findall(r"\w+", message.lower())

    stop_words = {
        "give", "me", "show", "best", "cheap", "budget",
        "low", "under", "find", "looking", "for",
        "recommend", "recommendation", "need", "want",
        "please", "the", "a", "an", "with", "good",
        "how", "many", "much", "does", "do", "have",
        "has", "this", "site", "store", "shop", "total",
        "there", "are", "is", "our", "your"
    }

    return [word for word in words if word not in stop_words]


def search_products(db: Session, message: str):
    keywords = extract_keywords(message)

    query = db.query(Product).join(Product.category)

    for keyword in keywords:
        query = query.filter(
            or_(
                Product.name.ilike(f"%{keyword}%"),
                Product.brand.ilike(f"%{keyword}%"),
                Category.name.ilike(f"%{keyword}%"),
                Product.description.ilike(f"%{keyword}%")
            )
        )

    return query.limit(5).all()


def get_store_information(db: Session, message: str):
    """
    Handles questions that require exact information from PostgreSQL.
    Returns a string if the question is a store-information question.
    Otherwise returns None.
    """

    text = message.lower().strip()

    # Product count
    if (
        ("how many" in text or "total" in text or "count" in text)
        and "product" in text
    ):
        count = db.query(Product).count()
        return f"Our store currently has {count} products."

    # Seller count
    if (
        ("how many" in text or "total" in text or "count" in text)
        and ("seller" in text or "vendor" in text)
    ):
        count = (
            db.query(User)
            .filter(User.role == "seller")
            .count()
        )
        return f"Our store currently has {count} sellers."

    # Category count
    if (
        ("how many" in text or "total" in text or "count" in text)
        and "categor" in text
    ):
        count = db.query(Category).count()
        return f"Our store currently has {count} categories."

    # List categories
    if (
        "what categories" in text
        or "which categories" in text
        or "categories do you have" in text
        or "list categories" in text
    ):
        categories = (
            db.query(Category)
            .order_by(Category.name)
            .all()
        )

        if not categories:
            return "There are currently no categories in the store."

        names = ", ".join(category.name for category in categories)

        return f"Our available categories are: {names}."

    # Cheapest product
    if (
        "cheapest product" in text
        or "lowest priced product" in text
        or "least expensive product" in text
    ):
        product = (
            db.query(Product)
            .order_by(Product.price.asc())
            .first()
        )

        if not product:
            return "There are currently no products in the store."

        return (
            f"The cheapest product is {product.name} "
            f"by {product.brand}, priced at ${product.price}."
        )

    # Most expensive product
    if (
        "most expensive product" in text
        or "highest priced product" in text
        or "most costly product" in text
    ):
        product = (
            db.query(Product)
            .order_by(Product.price.desc())
            .first()
        )

        if not product:
            return "There are currently no products in the store."

        return (
            f"The most expensive product is {product.name} "
            f"by {product.brand}, priced at ${product.price}."
        )

    # Product count by category
    category_match = re.search(
        r"(?:how many|count).*products?.*?(?:in|under|from|of)\s+(?:the\s+)?(.+?)(?:\?|$)",
        text,
    )

    if category_match:
        category_name = category_match.group(1).strip()

        category = (
            db.query(Category)
            .filter(Category.name.ilike(f"%{category_name}%"))
            .first()
        )

        if category:
            count = (
                db.query(Product)
                .filter(Product.category_id == category.id)
                .count()
            )

            return (
                f"There are {count} products in the "
                f"{category.name} category."
            )

    return None


def build_product_context(products):
    if not products:
        return "No matching products found."

    context = ""

    for product in products:
        context += f"""
Product Name: {product.name}
Brand: {product.brand}
Category: {product.category.name if product.category else ""}
Price: ${product.price}
Description: {product.description}
Stock: {product.stock}

"""

    return context


def ask_ai(message: str, products):
    context = build_product_context(products)

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        temperature=0.4,
        messages=[
            {
                "role": "system",
                "content": f"""
You are an AI shopping assistant.

ONLY recommend products from the list below.

Never invent products.

If the list is empty, politely tell the customer no matching product was found.

Available Products:

{context}
"""
            },
            {
                "role": "user",
                "content": message
            }
        ]
    )

    return response.choices[0].message.content

def detect_action(message: str):
    text = message.lower().strip()

    # Reorder
    if (
        "reorder" in text
        or "order again" in text
        or "buy again" in text
    ):
        return "reorder"

    # Place order
    if (
        "place my order" in text
        or "place order" in text
        or "checkout" in text
        or "check out" in text
        or "buy everything in my cart" in text
        or "purchase my cart" in text
    ):
        return "place_order"

    # Cancel order
    if (
        "cancel order" in text
        or "cancel my order" in text
        or "cancel the order" in text
    ):
        return "cancel_order"

    # Order details
    if (
        (
            "order details" in text
            or "details of order" in text
            or "show order" in text
            or "view order" in text
        )
        and re.search(r"(?:order\s*#?\s*|#)\d+", text)
    ):
        return "order_details"

    # Order history
    if (
        "order history" in text
        or "my orders" in text
        or "show my orders" in text
        or "view my orders" in text
        or "previous orders" in text
        or "past orders" in text
    ):
        return "orders"

    # Wishlist
    if (
        "show my wishlist" in text
        or "view my wishlist" in text
        or "my wishlist" in text
        or "wishlist items" in text
    ):
        return "wishlist"

    if (
        "remove from wishlist" in text
        or "delete from wishlist" in text
        or "remove from my wishlist" in text
    ):
        return "remove_wishlist"

    if (
        "add to wishlist" in text
        or "add this to wishlist" in text
        or "save to wishlist" in text
        or "save this to wishlist" in text
    ):
        return "add_wishlist"

    # Cart viewing
    if (
        "show my cart" in text
        or "view my cart" in text
        or "what is in my cart" in text
        or "what's in my cart" in text
        or "whats in my cart" in text
        or "cart contents" in text
    ):
        return "view_cart"

    # Remove from cart
    if (
        "remove from cart" in text
        or "remove from my cart" in text
        or "delete from cart" in text
        or "delete from my cart" in text
        or "take out of my cart" in text
    ):
        return "remove_cart"

    # Update cart quantity
    if (
        "change quantity" in text
        or "update quantity" in text
        or "set quantity" in text
        or "change the quantity" in text
        or re.search(r"\bquantity\s+(?:to|=)\s*\d+", text)
    ):
        return "update_cart"

    # Add to cart
    if (
        "add to cart" in text
        or "add this to cart" in text
        or "add this product" in text
        or "put in cart" in text
        or "put it in my cart" in text
        or "add it to my cart" in text
    ):
        return "add_cart"

    return None