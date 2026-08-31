from faker import Faker
from sqlalchemy.orm import Session
import app.models
from app.database import SessionLocal
from app.models.user import User
from app.models.product import Product
from app.models.categories import Category
from app.auth.security import hash_password

fake = Faker()

SELLER_COUNT = 100
PRODUCTS_PER_SELLER = 5

products = [
    ("Samsung Galaxy A55", "Samsung", 99999),
    ("Dell Inspiron 15", "Dell", 145000),
    ("JBL Bluetooth Speaker", "JBL", 18500),
    ("Logitech Wireless Mouse", "Logitech", 4500),
    ("Xiaomi Smart Band 9", "Xiaomi", 9500),

    ("Levis Men's Jeans", "Levis", 8500),
    ("Men's Casual Shirt", "Outfitters", 4500),
    ("Women's Summer Dress", "Sapphire", 6500),
    ("Adidas Running Shoes", "Adidas", 12500),
    ("Leather Crossbody Bag", "Stylo", 7500),

    ("Philips Air Fryer", "Philips", 28000),
    ("Non Stick Cookware Set", "Sonex", 14500),
    ("Electric Blender", "Westpoint", 8500),
    ("Modern Table Lamp", "IKEA", 5500),
    ("Memory Foam Pillow", "MoltyFoam", 4500),

    ("L'Oreal Shampoo", "L'Oreal", 3200),
    ("Maybelline Foundation", "Maybelline", 4500),
    ("Nivea Body Lotion", "Nivea", 2800),
    ("The Ordinary Serum", "The Ordinary", 6500),
    ("Revlon Hair Dryer", "Revlon", 8500),

    ("Nike Training Shirt", "Nike", 6500),
    ("Adidas Football", "Adidas", 5500),
    ("Yoga Mat", "FitPro", 3500),
    ("Adjustable Dumbbells", "Bowflex", 18000),
    ("Cricket Bat", "CA", 12500),

    ("Mechanical Gaming Keyboard", "Redragon", 12500),
    ("Wireless Gaming Mouse", "Razer", 8500),
    ("Gaming Headset", "HyperX", 9500),
    ("PlayStation Controller", "Sony", 18500),
    ("RGB Gaming Mouse Pad", "Corsair", 4500),

    ("Python Programming Book", "Packt", 3500),
    ("JavaScript Complete Guide", "O'Reilly", 4200),
    ("Clean Code", "Pearson", 5500),
    ("The Psychology of Money", "Harriman House", 2800),
    ("Atomic Habits", "Penguin", 2500),

    ("Car Phone Holder", "Baseus", 2500),
    ("Car Cleaning Kit", "Meguiar's", 4500),
    ("LED Headlight Bulbs", "Philips", 6500),
    ("Car Air Freshener", "Ambi Pur", 1200),
    ("Digital Tire Inflator", "Xiaomi", 8500),

    ("Leather Wallet", "Hush Puppies", 3500),
    ("Polarized Sunglasses", "Ray-Ban", 4500),
    ("USB C Charging Cable", "Anker", 1800),
    ("Power Bank 20000mAh", "Anker", 7500),
    ("Stainless Steel Water Bottle", "Hydro Flask", 3200),
]


db: Session = SessionLocal()

try:
    categories = db.query(Category).all()

    if not categories:
        raise Exception(
            "No categories found. Seed categories before running this seeder."
        )

    category_map = {
        category.name.lower(): category.id
        for category in categories
    }

    sellers = []

    for i in range(SELLER_COUNT):
        seller = User(
            full_name=f"Seller {i + 1}",
            email=f"seller{i + 1}@eshop.test",
            phone=f"03{str(i + 1).zfill(9)}",
            password=hash_password("12345678"),
            role="seller",
        )

        db.add(seller)
        sellers.append(seller)

    db.flush()

    category_ids = [category.id for category in categories]

    product_index = 0

    for seller in sellers:
        for product_number in range(PRODUCTS_PER_SELLER):
            name, brand, price = products[product_index % len(products)]

            category_id = category_ids[
                product_index % len(category_ids)
            ]

            product = Product(
                name=f"{name}",
                description=(
                    f"High quality {name} by {brand}. "
                    f"Suitable for everyday use and available "
                    
                ),
                category_id=category_id,
                brand=brand,
                price=price,
                stock=fake.random_int(min=10, max=100),
                image=f"https://picsum.photos/seed/product{product_index + 1}/600/600",
                seller_id=seller.id,
            )

            db.add(product)
            product_index += 1

    db.commit()

    seller_count = (
        db.query(User)
        .filter(User.role == "seller")
        .count()
    )

    product_count = db.query(Product).count()

    print("Seeding completed.")
    print(f"Sellers: {seller_count}")
    print(f"Products: {product_count}")
    print(f"Products per seller: {PRODUCTS_PER_SELLER}")

except Exception as e:
    db.rollback()
    print(f"Seeder failed: {e}")

finally:
    db.close()