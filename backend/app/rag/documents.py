from typing import Iterable

from langchain_core.documents import Document

from app.models.product import Product


def product_to_document(product: Product) -> Document:
    """
    Convert a SQLAlchemy Product into a LangChain Document.

    PostgreSQL remains the source of truth.
    ChromaDB stores the searchable representation.
    """

    category_name = (
        product.category.name
        if product.category is not None
        else None
    )

    content_parts = [
        f"Product: {product.name}",
        f"Description: {product.description}",
        f"Brand: {product.brand}",
        f"Price: {product.price}",
        f"Stock: {product.stock}",
    ]

    if category_name:
        content_parts.append(f"Category: {category_name}")
    else:
        content_parts.append(
            f"Category ID: {product.category_id}"
        )

    page_content = "\n".join(content_parts)

    metadata = {
        "product_id": str(product.id),
        "category_id": str(product.category_id),
        "brand": product.brand,
        "price": float(product.price),
        "stock": product.stock,
        "seller_id": str(product.seller_id),
    }

    if category_name:
        metadata["category"] = category_name

    return Document(
        page_content=page_content,
        metadata=metadata,
    )


def products_to_documents(
    products: Iterable[Product],
) -> list[Document]:
    """
    Convert multiple SQLAlchemy Products
    into LangChain Documents.
    """

    return [
        product_to_document(product)
        for product in products
    ]