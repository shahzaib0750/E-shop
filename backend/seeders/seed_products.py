from faker import Faker
from random import randint, choice

from app.database import SessionLocal
from app.models.product import Product
from app.models.categories import Category
from app.models.user import User
from app.utils.pexels import get_product_image

fake = Faker()

db = SessionLocal()

brands = [
    "Apple",
    "Samsung",
    "Dell",
    "HP",
    "Lenovo",
    "Sony",
    "Asus",
    "Acer",
    "Xiaomi",
    "Huawei"
]


def main():
    try:
        # Idempotent: never duplicate rows on a re-run.
        if db.query(Product).count() > 0:
            print("⚠️ Products already exist. Seeder skipped.")
            return

        categories = db.query(Category).all()

        if not categories:
            print("❌ No categories found. Run a category seeder first.")
            return

        seller_ids = [
            row.id
            for row in db.query(User.id)
            .filter(User.role == "seller")
            .all()
        ]

        if not seller_ids:
            print("❌ No seller accounts found. Run seed_users first.")
            return

        for i in range(500):

            brand = choice(brands)

            category = choice(categories)

            product = Product(
                name=f"{brand} {category.name} {fake.word().title()}",
                brand=brand,
                category_id=category.id,
                description=fake.sentence(nb_words=12),
                price=randint(100, 3000),
                stock=randint(1, 100),
                image=get_product_image(f"{brand} {category.name}"),
                seller_id=choice(seller_ids)
            )

            db.add(product)

        db.commit()

        print("✅ 500 products inserted successfully.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
