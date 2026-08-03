from faker import Faker
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User

fake = Faker()

db: Session = SessionLocal()

for i in range(100):

    role = "seller" if i < 20 else "customer"

    user = User(
        full_name=fake.name(),
        email=fake.unique.email(),
        phone=fake.unique.numerify("03#########"),
        password="123456",
        role=role
    )

    db.add(user)

try:
    db.commit()
    print("✅ 100 users inserted successfully!")

except Exception as e:
    db.rollback()
    print(f"❌ Error: {e}")

finally:
    db.close()