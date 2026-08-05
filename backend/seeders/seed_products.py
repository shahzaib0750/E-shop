from faker import Faker
from random import randint, choice

from app.database import SessionLocal
from app.models.product import Product
from app.models.categories import Category
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

# Get all categories from database
categories = db.query(Category).all()

# Seller IDs
seller_ids = list(range(1, 21))

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
db.close()

print("500 products inserted successfully.")