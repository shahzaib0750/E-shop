from datetime import datetime, timedelta, timezone
from uuid import uuid4

from jose import JWTError, jwt

from app.config import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)


# JWT creation and verification

def create_access_token(data: dict):
    to_encode = data.copy()

    now = datetime.now(timezone.utc)
    expire = now + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({
        "iat": now,
        "exp": expire,
        "jti": str(uuid4()),
        "type": "access",
    })

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def verify_access_token(token: str):
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        if payload.get("type") != "access":
            return None

        jti = payload.get("jti")

        if not isinstance(jti, str) or not jti:
            return None

        user_id = payload.get("user_id")

        if user_id is None:
            return None

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return None

        if user_id <= 0:
            return None

        payload["user_id"] = user_id

        return payload

    except JWTError:
        return None