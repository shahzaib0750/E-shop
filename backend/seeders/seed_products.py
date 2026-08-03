from faker import Faker
from random import randint, choice

from app.database import SessionLocal
from app.models.product import Product

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

categories = [
    "Mobile",
    "Laptop",
    "Watch",
    "Headphones",
    "Camera",
    "Monitor",
    "Keyboard",
    "Mouse",
    "Tablet",
    "Accessories"
]

# Seller IDs (assuming sellers have IDs 1-20)
seller_ids = list(range(1, 21))

for i in range(500):

    category = choice(categories)
    brand = choice(brands)

    product = Product(
        name=f"{brand} {category} {fake.word().title()}",
        brand=brand,
        category=category,
        description=fake.sentence(nb_words=12),
        price=randint(100, 3000),
        stock=randint(1, 100),

        # Random image
        image=f"https://picsum.photos/400/400?random={i+1}",

        seller_id=choice(seller_ids)
    )

    db.add(product)

db.commit()
db.close()

print("✅ 500 products inserted successfully.")