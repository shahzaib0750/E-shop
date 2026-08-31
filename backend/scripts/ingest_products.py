from sqlalchemy.orm import Session, joinedload

from app.database import SessionLocal
from app.models.product import Product
from app.models.categories import Category
from app.models.user import User

from app.models.customer import Customer
from app.models.order_item import OrderItem
from app.models.orders import Order
from app.models.seller import Seller
from app.models.wishlist import WishlistItem

from app.rag.documents import products_to_documents
from app.rag.vectorstore import get_vectorstore, clear_vectorstore


def ingest_products():
    db: Session = SessionLocal()

    try:
        products = (
            db.query(Product)
            .options(joinedload(Product.category))
            .all()
        )

        if not products:
            print("No products found in the database.")
            return

        print(f"Found {len(products)} products in PostgreSQL.")

        vectorstore = get_vectorstore()

        print("Clearing existing ChromaDB products...")
        clear_vectorstore()
        print("ChromaDB cleared.")

        documents = products_to_documents(products)

        ids = [
            f"product-{product.id}"
            for product in products
        ]

        vectorstore.add_documents(
            documents=documents,
            ids=ids,
        )

        print(
            f"Successfully indexed {len(documents)} products "
            "into ChromaDB."
        )

        collection = vectorstore._collection
        count = collection.count()

        print(f"ChromaDB vector count: {count}")

    except Exception as e:
        print(f"Ingestion failed: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    ingest_products()