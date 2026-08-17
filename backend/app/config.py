import os
from dotenv import load_dotenv


load_dotenv()


# ============================================================
# DATABASE
# ============================================================

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL is missing from .env"
    )


# ============================================================
# JWT SETTINGS
# ============================================================

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise ValueError(
        "SECRET_KEY is missing from .env"
    )


# Only allow the algorithm we explicitly support
ALGORITHM = os.getenv(
    "ALGORITHM",
    "HS256"
)

ALLOWED_ALGORITHMS = {
    "HS256",
}

if ALGORITHM not in ALLOWED_ALGORITHMS:
    raise ValueError(
        f"Unsupported JWT algorithm: {ALGORITHM}"
    )


# ============================================================
# ACCESS TOKEN EXPIRATION
# ============================================================

try:

    ACCESS_TOKEN_EXPIRE_MINUTES = int(
        os.getenv(
            "ACCESS_TOKEN_EXPIRE_MINUTES",
            "30"
        )
    )

except ValueError:

    raise ValueError(
        "ACCESS_TOKEN_EXPIRE_MINUTES must be an integer"
    )


if ACCESS_TOKEN_EXPIRE_MINUTES <= 0:

    raise ValueError(
        "ACCESS_TOKEN_EXPIRE_MINUTES must be greater than 0"
    )


if ACCESS_TOKEN_EXPIRE_MINUTES > 60:

    raise ValueError(
        "ACCESS_TOKEN_EXPIRE_MINUTES cannot exceed 60 minutes"
    )