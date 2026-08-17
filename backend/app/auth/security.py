from argon2 import PasswordHasher
from argon2.exceptions import (
    VerifyMismatchError,
    InvalidHashError,
)


ph = PasswordHasher()


# ============================================================
# HASH PASSWORD
# ============================================================

def hash_password(password: str) -> str:
    return ph.hash(password)


# ============================================================
# VERIFY PASSWORD
# ============================================================

def verify_password(
    password: str,
    hashed_password: str
) -> bool:

    try:

        return ph.verify(
            hashed_password,
            password
        )

    except (
        VerifyMismatchError,
        InvalidHashError
    ):

        return False