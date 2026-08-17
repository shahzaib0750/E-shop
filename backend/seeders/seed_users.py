from faker import Faker
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User
from app.auth.security import hash_password

fake = Faker()

db: Session = SessionLocal()

try:
    existing_users = db.query(User).count()

    if existing_users > 0:
        print("⚠️ Users already exist. Seeder skipped.")
    else:
        for i in range(100):
            role = "seller" if i < 20 else "customer"

            user = User(
                full_name=fake.name(),
                email=fake.unique.email(),
                phone=fake.unique.numerify("03#########"),
                password=hash_password("12345678"),
                role=role,
            )

            db.add(user)

        db.commit()

        print("✅ 100 users inserted successfully!")
        print("🔐 Seed user password: 12345678")

except Exception as e:
    db.rollback()
    print(f"❌ Error: {e}")

finally:
    db.close()