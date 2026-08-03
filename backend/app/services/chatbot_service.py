import os
import re

from dotenv import load_dotenv
from openai import OpenAI
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.product import Product

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
        "please", "the", "a", "an", "with", "good"
    }

    return [word for word in words if word not in stop_words]


def search_products(db: Session, message: str):

    keywords = extract_keywords(message)

    query = db.query(Product)

    for keyword in keywords:

        query = query.filter(

            or_(

                Product.name.ilike(f"%{keyword}%"),

                Product.brand.ilike(f"%{keyword}%"),

                Product.category.ilike(f"%{keyword}%"),

                Product.description.ilike(f"%{keyword}%")

            )

        )

    return query.limit(5).all()


def build_product_context(products):

    if not products:
        return "No matching products found."

    context = ""

    for product in products:

        context += f"""
Product Name: {product.name}
Brand: {product.brand}
Category: {product.category}
Price: ${product.price}
Description: {product.description}
Stock: {product.stock}

"""

    return context


def ask_ai(message: str, products):

    context = build_product_context(products)

    response = client.chat.completions.create(

        model="llama-3.3-70b-versatile",

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