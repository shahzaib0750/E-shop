# E-Shop — Production-Readiness Roadmap

**Date:** 2026-08-06 · **Commit baseline:** `b244e39` · **Companion to:** [`AUDIT.md`](AUDIT.md)

`AUDIT.md` says *what is wrong*. This document says *what to build to go live* — the concrete work, in dependency order, with copy-adaptable code and a verifiable definition-of-done for each domain. Every section is grounded in the real files, models, and routes of this repo.

## Scope

This roadmap covers **application-level** production readiness across 11 domains. **CI/CD pipelines and containerization/deployment are intentionally excluded** at your request — no GitHub Actions, Dockerfile, reverse-proxy, or release-process guidance here. Two consequences of that exclusion still need a home in whatever deploy method you choose, so they are flagged where they surface rather than in a section of their own:

- **Run the Alembic migrations as part of releasing** (Section 3 ships the migrations; *when* they execute is your deploy's job).
- **Serve everything over HTTPS.** The frontend currently posts passwords over `http://` (Section 1 / Section 11). TLS termination is deployment-layer, but the requirement is real and non-negotiable for launch.

## How to read this

- **Part I** is the decision layer: the gate model, the readiness scorecard, the go/no-go line, and the phased plan.
- **Part II** is the 11 domain sections. Each has: *Production goal* → *Where the repo is now* → *Gaps* → *Implementation* (real code) → *Definition of done* (verifiable) → *Effort / launch gate*.

---

# Part I — The plan

## The gate model

Every domain is classified by when it must be done:

| Gate | Meaning |
|---|---|
| **🚫 BLOCKING** | Must be **green** before any real user or real payment touches the system. Shipping without it is negligent, not merely risky. |
| **⚠️ Recommended** | Should be green before launch; a short, *documented* grace period is defensible if the blocking set is done and someone owns the follow-up. |
| **🔧 Post-launch** | Real hardening that can land in the weeks after go-live without exposing users to harm. |

**RAG** = current state today: 🔴 not started / broken · 🟡 partial · 🟢 mostly there.

## Readiness scorecard

Every domain is 🔴 today — this is a pre-alpha codebase from a production standpoint (no auth, no tests, no migrations). That is the honest baseline; the value is in the ordered path to green.

| # | Domain | Now | Launch gate | Effort |
|---|---|:--:|:--:|:--:|
| 1 | Authentication & session security | 🔴 | 🚫 BLOCKING | 5–7 d |
| 2 | Authorization & multi-tenant isolation | 🔴 | 🚫 BLOCKING | 3–4 d |
| 3 | Data layer, migrations & integrity | 🔴 | 🚫 BLOCKING | 3–4 d |
| 4 | Transactional & order integrity | 🔴 | 🚫 BLOCKING | 3–4 d |
| 5 | Configuration, secrets & 12-factor | 🔴 | 🚫 BLOCKING | 2–3 d |
| 6 | API hardening & input validation | 🔴 | 🚫 BLOCKING | 3–4 d |
| 7 | Observability & operations | 🔴 | ⚠️ Recommended | 2–3 d |
| 8 | Testing & quality gates | 🔴 | 🚫 BLOCKING | 5–7 d |
| 9 | Frontend production readiness | 🔴 | ⚠️ Recommended | 4–6 d |
| 10 | Performance, scale & resilience | 🔴 | 🔧 Post-launch | 4–6 d |
| 11 | Security posture, privacy & data lifecycle | 🔴 | 🚫 BLOCKING | 4–6 d |

**Totals:** ~38–54 engineer-days end to end. The **blocking set alone is ~28–39 days**. For one engineer that is roughly 8–11 weeks; with 2–3 engineers working the parallelizable tracks below, roughly **4–6 weeks to a launchable state**.

## The go/no-go line

**Do not launch until these eight are green:** Auth (1), Authorization (2), Data integrity (3), Order integrity (4), Config & secrets (5), API hardening (6), Testing (8), Security & privacy (11).

The single most important sentence in this document: **today any anonymous person can read every customer's data, including plaintext passwords, and delete any seller's products.** Sections 1–2 close that. Nothing else matters until they are done — a beautiful frontend on top of an unauthenticated API is a liability, not a product.

## Phased execution plan

Ordered by dependency, not by section number. Later work assumes earlier work exists.

### Phase 0 — Foundations (½–1 day, do first)
Prerequisites that unblock everything: create the backend dependency manifest and `.env.example`, delete `print(DATABASE_URL)`, and get the app starting from a clean clone (this overlaps Section 5). Without it, none of the work below is runnable or testable.

### Phase A — The launch-blocking core (~3–4 weeks)
The eight blocking domains, in dependency order. Two tracks can run in parallel once Phase 0 lands:

- **Track 1 (identity):** §1 Auth → §2 Authorization. Sequential; §2 depends on §1's `get_current_user`.
- **Track 2 (data):** §3 Migrations & integrity → §4 Order integrity. §4 depends on §3's Alembic baseline and `Numeric` money.
- **Converge:** §5 Config/secrets (small, can slot early), §6 API hardening (rate limits, CORS, headers, validation — depends on §1 for *what* to protect), then §8 Testing (writes the authz tests that prove §2 works) and §11 Security/privacy (the pre-launch sign-off that audits §1/§2/§5/§6 and adds account deletion/export + HTTPS).

**Exit criteria for Phase A = the go/no-go line is green.** That is the launch gate.

### Phase B — Recommended before launch (~1 week, overlaps late Phase A)
§7 Observability (you want logs, Sentry, and `/health` *before* real traffic, not after the first incident) and §9 Frontend (protected routes, the API client, error boundary, removing the fixture-to-cart bug). Neither exposes users to *harm* if briefly deferred, but launching blind and with an unguarded SPA is a bad trade.

### Phase C — Post-launch hardening (ongoing)
§10 Performance & resilience (caching, timeouts+retries, async chatbot, load testing) and the deeper items in §7/§9. Real, but they scale *with* traffic — premature before you have any.

---

# Part II — Domain sections

Eleven sections, each self-contained with real code for this stack. Cross-references are by name and number. Deferred detail that belongs to another domain is pointed to, not duplicated.


## 1. Authentication & session security

**Production goal.** Every non-public route is reachable only with a valid, server-issued credential; passwords are never stored or transmitted recoverably; the server — not the client — decides who a caller is and what role they hold. A stolen or leaked token can be revoked, and users can self-serve password reset and email verification without an operator.

**Where the repo is now.** There is no auth at all. `backend/app/routes/account.py` stores the password verbatim (`password=user.password` in `signup`, the explicit `# Plain text for now`) and compares it with `existing_user.password != user.password` in `login`; on success it returns a bare user JSON with no token. `role` is a free-text field the client supplies (`schemas/user.py` `UserSignup.role: str`, `models/user.py` `role = Column(String(20), default="customer")`), so anyone can POST `role: "admin"`. There is no `password_hash`, no `is_verified`, no token table, and no reset/verify columns. The three auth flows are empty 0-byte stubs: `frontend/src/assets/pages/auth/{forgotPassword/ForgotPassword.jsx, resetPassword/ResetPassword.jsx, verifyEmail/VerifyEmail.jsx}`.

**Gaps to close**
- **[P0]** Passwords in plaintext — hash with argon2id; add `password_hash`, drop `password` — `account.py` (signup store / login compare), `models/user.py`
- **[P0]** No token issued; `/login` returns user JSON only — issue signed JWT access + refresh — `account.py:login`
- **[P0]** Client-supplied identity & role — server derives `user_id`/`role` from the token, never from body/URL; strip `role` from `UserSignup` — `schemas/user.py`
- **[P0]** No `get_current_user` dependency; every route is anonymous — add and apply it (route-by-route authorization is Section-authorization's job; this section ships the dependency)
- **[P1]** No revocation/logout — refresh-token table + `jti` denylist so a token can be killed
- **[P1]** Password-reset flow absent — `ForgotPassword.jsx` / `ResetPassword.jsx` stubs + single-use hashed token
- **[P1]** Email verification absent; no `is_verified` gate — `VerifyEmail.jsx` stub
- **[P2]** No password strength / breach floor, no per-account login throttle (rate-limit primitive lives in the rate-limiting section; apply it to `/login`, `/forgot-password` here)

**Implementation**

1. **Config & deps.** Add to the backend manifest: `argon2-cffi==25.1`, `pyjwt==2.13`. Load a real secret via `pydantic-settings` (never hardcode; the `config.py` DATABASE_URL print is Section-secrets' problem).

```python
# app/core/config.py  (pydantic-settings)
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    JWT_SECRET: str                       # 32+ random bytes, from env only
    JWT_ALG: str = "HS256"
    ACCESS_TTL_MIN: int = 15
    REFRESH_TTL_DAYS: int = 30
    FRONTEND_ORIGIN: str = "http://127.0.0.1:5173"

settings = Settings()
```

2. **Hashing + JWT helpers.** One module, argon2id with sane params.

```python
# app/core/security.py
import uuid, datetime as dt
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from app.core.config import settings

ph = PasswordHasher(time_cost=3, memory_cost=64 * 1024, parallelism=2)

def hash_password(raw: str) -> str:
    return ph.hash(raw)

def verify_password(raw: str, stored: str) -> bool:
    try:
        return ph.verify(stored, raw)
    except (VerifyMismatchError, InvalidHashError):
        return False

def needs_rehash(stored: str) -> bool:
    return ph.check_needs_rehash(stored)

def _encode(sub: int, role: str, typ: str, ttl: dt.timedelta) -> tuple[str, str]:
    jti = str(uuid.uuid4())
    now = dt.datetime.now(dt.timezone.utc)
    payload = {"sub": str(sub), "role": role, "type": typ, "jti": jti,
               "iat": now, "exp": now + ttl}
    return jwt.encode(payload, settings.JWT_SECRET, settings.JWT_ALG), jti

def make_access(sub: int, role: str) -> str:
    return _encode(sub, role, "access", dt.timedelta(minutes=settings.ACCESS_TTL_MIN))[0]

def make_refresh(sub: int, role: str) -> tuple[str, str]:
    return _encode(sub, role, "refresh", dt.timedelta(days=settings.REFRESH_TTL_DAYS))

def decode(token: str, expect: str) -> dict:
    data = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
    if data.get("type") != expect:
        raise jwt.InvalidTokenError("wrong token type")
    return data
```

3. **Model changes** (real column names; wire via Alembic — migrations are Section-migrations, but these three tables/columns originate here).

```python
# app/models/user.py  — replace `password`
password_hash = Column(String(255), nullable=False)
role          = Column(String(20), nullable=False, default="customer")  # server-set only
is_verified   = Column(Boolean, nullable=False, server_default="false")

# app/models/auth.py  — new
class RefreshToken(Base):                 # rotation + revocation
    __tablename__ = "refresh_tokens"
    jti        = Column(String(36), primary_key=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    revoked    = Column(Boolean, nullable=False, server_default="false")
    expires_at = Column(DateTime(timezone=True), nullable=False)

class OneTimeToken(Base):                 # password reset + email verify
    __tablename__ = "one_time_tokens"
    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    purpose    = Column(String(20), nullable=False)          # 'reset' | 'verify'
    token_hash = Column(String(64), nullable=False, index=True)  # sha256 hex of raw token
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at    = Column(DateTime(timezone=True), nullable=True)
```

4. **Plaintext → hash migration path (zero forced logout).** Passwords are currently recoverable, so treat the whole table as compromised: on the deploy that adds `password_hash`, backfill by hashing the existing plaintext once, then drop the `password` column. Because the old values leaked (they were plaintext and one sits in git history), force a reset email to all users post-migration. Support transparent upgrade for any residual old-format hash at login via `needs_rehash`.

```python
# one-shot data migration (inside the Alembic upgrade, before dropping `password`)
for uid, raw in conn.execute(text("SELECT id, password FROM users")):
    conn.execute(text("UPDATE users SET password_hash=:h WHERE id=:i"),
                 {"h": hash_password(raw), "i": uid})
```

```python
# in login(), after a successful verify — rehash if params changed
if needs_rehash(u.password_hash):
    u.password_hash = hash_password(payload.password); db.commit()
```

5. **Rewrite `account.py`.** Strip `role` from signup input, hash on write, issue tokens on login, set refresh as an HttpOnly cookie (not localStorage — XSS can read localStorage; the current frontend stores `user` there).

```python
# app/schemas/user.py  — role removed; client can no longer self-elevate
class UserSignup(BaseModel):
    full_name: str; email: EmailStr; phone: str
    password: str = Field(min_length=10, max_length=128)

# app/routes/account.py
@router.post("/signup", status_code=201)
def signup(body: UserSignup, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "Email already exists.")
    u = User(full_name=body.full_name, email=body.email, phone=body.phone,
             password_hash=hash_password(body.password), role="customer",
             is_verified=False)
    db.add(u); db.commit(); db.refresh(u)
    issue_email_verification(db, u)        # step 8
    return {"message": "Account created. Check your email to verify.", "user_id": u.id}

@router.post("/login")
def login(body: UserLogin, response: Response, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == body.email).first()
    if not u or not verify_password(body.password, u.password_hash):
        raise HTTPException(401, "Invalid email or password")   # no user-enumeration
    if not u.is_verified:
        raise HTTPException(403, "Email not verified")
    refresh, jti = make_refresh(u.id, u.role)
    db.add(RefreshToken(jti=jti, user_id=u.id,
        expires_at=dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=settings.REFRESH_TTL_DAYS)))
    db.commit()
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True,
                        samesite="strict", max_age=settings.REFRESH_TTL_DAYS*86400, path="/auth")
    return {"access_token": make_access(u.id, u.role), "token_type": "bearer",
            "user": {"id": u.id, "full_name": u.full_name, "role": u.role}}
```

6. **`get_current_user` dependency** (the primitive every protected route consumes; applying it per-route = authorization section).

```python
# app/core/deps.py
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
bearer = HTTPBearer(auto_error=True)

def get_current_user(cred: HTTPAuthorizationCredentials = Depends(bearer),
                     db: Session = Depends(get_db)) -> User:
    try:
        data = decode(cred.credentials, expect="access")
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    u = db.get(User, int(data["sub"]))
    if not u:
        raise HTTPException(401, "Invalid token")
    return u

def require_role(*roles):
    def dep(u: User = Depends(get_current_user)) -> User:
        if u.role not in roles: raise HTTPException(403, "Forbidden")
        return u
    return dep
```

7. **Refresh & logout (revocation).** Short access TTL (15 min) means a leaked access token dies fast; the refresh token is the long-lived credential, so it must be revocable and rotated on every use.

```python
@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    raw = request.cookies.get("refresh_token")
    if not raw: raise HTTPException(401, "No refresh token")
    try: data = decode(raw, expect="refresh")
    except jwt.PyJWTError: raise HTTPException(401, "Invalid token")
    rec = db.get(RefreshToken, data["jti"])
    if not rec or rec.revoked:              # reuse of a rotated/killed jti
        raise HTTPException(401, "Revoked")
    rec.revoked = True                      # rotate: old jti dies
    new_raw, new_jti = make_refresh(int(data["sub"]), data["role"])
    db.add(RefreshToken(jti=new_jti, user_id=int(data["sub"]),
        expires_at=dt.datetime.now(dt.timezone.utc)+dt.timedelta(days=settings.REFRESH_TTL_DAYS)))
    db.commit()
    response.set_cookie("refresh_token", new_raw, httponly=True, secure=True,
                        samesite="strict", max_age=settings.REFRESH_TTL_DAYS*86400, path="/auth")
    return {"access_token": make_access(int(data["sub"]), data["role"]), "token_type": "bearer"}

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    raw = request.cookies.get("refresh_token")
    if raw:
        try: db.query(RefreshToken).filter_by(jti=decode(raw, "refresh")["jti"]).update({"revoked": True})
        except jwt.PyJWTError: pass
        db.commit()
    response.delete_cookie("refresh_token", path="/auth")
    return {"message": "Logged out"}
```

8. **Password reset + email verification.** Store only the SHA-256 of the raw token; email the raw token in a link. Reset always returns 200 (no enumeration). Sending the actual email is the notifications section — here we mint/verify the single-use token.

```python
import secrets, hashlib
def _mint(db, user_id, purpose, ttl):
    raw = secrets.token_urlsafe(32)
    db.add(OneTimeToken(user_id=user_id, purpose=purpose,
        token_hash=hashlib.sha256(raw.encode()).hexdigest(),
        expires_at=dt.datetime.now(dt.timezone.utc)+ttl)); db.commit()
    return raw   # -> hand to email service as {FRONTEND}/reset-password?token=raw

@router.post("/forgot-password")     # throttled — apply the rate-limit section's limiter
def forgot(body: EmailIn, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == body.email).first()
    if u:
        send_reset_email(u.email, _mint(db, u.id, "reset", dt.timedelta(hours=1)))
    return {"message": "If that email exists, a reset link was sent."}

@router.post("/reset-password")
def reset(body: ResetIn, db: Session = Depends(get_db)):     # {token, new_password}
    h = hashlib.sha256(body.token.encode()).hexdigest()
    rec = (db.query(OneTimeToken).filter_by(token_hash=h, purpose="reset", used_at=None)
             .filter(OneTimeToken.expires_at > func.now()).first())
    if not rec: raise HTTPException(400, "Invalid or expired token")
    u = db.get(User, rec.user_id)
    u.password_hash = hash_password(body.new_password)
    rec.used_at = func.now()
    db.query(RefreshToken).filter_by(user_id=u.id).update({"revoked": True})  # kill all sessions
    db.commit(); return {"message": "Password updated"}

@router.get("/verify-email")
def verify(token: str, db: Session = Depends(get_db)):
    h = hashlib.sha256(token.encode()).hexdigest()
    rec = (db.query(OneTimeToken).filter_by(token_hash=h, purpose="verify", used_at=None)
             .filter(OneTimeToken.expires_at > func.now()).first())
    if not rec: raise HTTPException(400, "Invalid or expired token")
    db.get(User, rec.user_id).is_verified = True
    rec.used_at = func.now(); db.commit(); return {"message": "Email verified"}
```

9. **Frontend: fill the three stubs + stop trusting localStorage for identity.** Keep only the short-lived access token in memory (React state/context); the refresh cookie is HttpOnly and rides automatically. Wire the empty `.jsx` files.

```jsx
// pages/auth/forgotPassword/ForgotPassword.jsx (currently 0 bytes)
export default function ForgotPassword() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false);
  const submit = async (e) => { e.preventDefault();
    await api.post("/forgot-password", { email });   // shared API client (frontend section)
    setSent(true); };                                // always show same message
  return sent ? <p>If that email exists, a reset link was sent.</p>
    : <form onSubmit={submit}><input type="email" value={email}
        onChange={e=>setEmail(e.target.value)} required/><button>Send reset link</button></form>;
}
// resetPassword/ResetPassword.jsx : read ?token=, POST {token,new_password} to /reset-password
// verifyEmail/VerifyEmail.jsx     : on mount, GET /verify-email?token=<param>, show result
```

**Definition of done (verifiable)**
- [ ] `grep -rn "Plain text\|password != \|password=user.password" backend/app/routes/account.py` returns nothing; `users.password` column no longer exists (`\d users` shows `password_hash`, no `password`).
- [ ] A signup POST with `"role":"admin"` in the body creates a `customer` (schema rejects the field / server forces role); asserted by a test.
- [ ] `POST /login` returns a JWT that `pyjwt.decode` validates with `HS256` and the configured secret; `exp` ≈ 15 min out; wrong password and unknown email both return 401 with the identical body.
- [ ] Login before verification returns 403; after `GET /verify-email?token=…`, login succeeds.
- [ ] `POST /refresh` with a used (rotated) refresh `jti` returns 401; `POST /logout` then `/refresh` returns 401.
- [ ] Full reset flow test: `/forgot-password` (200 for both known and unknown email) → `/reset-password` with the emailed token updates the hash, invalidates the token on reuse, and revokes existing refresh tokens.
- [ ] The three `pages/auth/*/{ForgotPassword,ResetPassword,VerifyEmail}.jsx` files are non-empty and render; no auth token is written to `localStorage` (`grep -rn "localStorage" frontend/src` shows no token).
- [ ] `get_current_user` rejects a token signed with the wrong secret, an expired token, and a refresh token presented as access (`type` claim mismatch).

**Effort:** 5-7 days · **Launch gate:** BLOCKING

---

## 2. Authorization & multi-tenant isolation

**Production goal.** Every non-public route derives the acting identity from a verified token (not the request body/URL), and every read/write is scoped to that identity inside the SQL query so no user can touch another user's cart, orders, or products, and no client can act as `admin`.

**Where the repo is now.** Identity is entirely client-supplied and trusted: `CartCreate.user_id`, `OrderCreate.user_id`, and `ProductCreate.seller_id` are attacker-controlled body fields (`schemas/cart.py:5`, `schemas/order.py:6`, `schemas/product.py:13`), and ownership routes key off a path integer (`GET /cart/{user_id}` cart.py:75, `GET /orders/{user_id}` orders.py:81, `GET /seller/orders/{seller_id}` orders.py:203). Nothing verifies the caller: `update_cart_quantity` (cart.py:107), `cancel_order` (orders.py:158), `update_product`/`delete_product` (product.py:120,155) load a row by its own id and mutate it — a textbook IDOR; passing any `cart_id`/`order_id`/`product_id` edits or deletes a stranger's data. `role` is a free string persisted verbatim (`account.py:34`, `models/user.py:15`), so `{"role":"admin"}` on signup mints an admin. This depends on the JWT/auth primitives from Section 1 (token issuance, `argon2` hashing); this section consumes the verified `sub`/`role` claims.

**Gaps to close**
- **[P0]** No auth dependency on any of the 24 non-public routes — identity is never verified — `main.py:36-41`
- **[P0]** IDOR on cart mutate/delete: rows fetched by `cart_id` only — `cart.py:107,162`
- **[P0]** IDOR on order cancel and details: any `order_id` cancellable/readable — `orders.py:106,158`
- **[P0]** IDOR on product update/delete/list: any seller can edit/delete any product — `product.py:120,155,183`
- **[P0]** Client supplies `user_id`/`seller_id`; backend trusts it — `schemas/cart.py:5`, `schemas/order.py:6`, `schemas/product.py:13`
- **[P0]** `role` is an unvalidated string; `admin` self-registerable — `schemas/user.py:9`, `account.py:34`
- **[P1]** Seller endpoints (`/seller/orders/{seller_id}`, `/seller/products/{seller_id}`) don't confirm caller == seller and aren't role-gated — `orders.py:203`, `product.py:183`
- **[P1]** `update_order_status` lets any caller move any order through states — no seller-owns-the-line check — `orders.py:248`

**Implementation**

1. Define a `Role` enum and a strict signup schema so `admin` is unreachable from the client. `admin` is only ever set by a migration/seed, never by the API.

```python
# app/models/enums.py
import enum
class Role(str, enum.Enum):
    customer = "customer"
    seller = "seller"
    admin = "admin"   # backend-only; never accepted from a request body

# app/schemas/user.py
from pydantic import BaseModel, EmailStr
from app.models.enums import Role

class UserSignup(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str
    role: Role = Role.customer          # enum rejects anything else with 422

    @field_validator("role")
    @classmethod
    def no_admin(cls, v: Role) -> Role:
        if v is Role.admin:
            raise ValueError("cannot self-register as admin")
        return v
```

2. Add the auth dependency (builds on Section 1's token verify). Return a lightweight principal, plus a role guard. Attach `Depends(get_current_user)` to every non-public route.

```python
# app/deps/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.enums import Role
from app.core.security import decode_token      # from Section 1 (pyjwt)

bearer = HTTPBearer(auto_error=True)

def get_current_user(
    cred: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = decode_token(cred.credentials)   # verifies sig + exp
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token")
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "unknown user")
    return user

def require_role(*roles: Role):
    def guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in {r.value for r in roles}:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "insufficient role")
        return user
    return guard
```

3. Drop `user_id` from the cart/order bodies and take identity from the token. `CartCreate` becomes `{product_id, quantity}`; `OrderCreate` is deleted entirely (its only field was `user_id`).

```python
# app/schemas/cart.py
class CartCreate(BaseModel):
    product_id: int
    quantity: int = Field(1, gt=0)

# app/routes/cart.py — add-to-cart now scoped to the token
@router.post("/cart")
def add_to_cart(cart: CartCreate,
                user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    ...
    existing = db.query(Cart).filter(
        Cart.user_id == user.id,          # was cart.user_id (client-supplied)
        Cart.product_id == cart.product_id,
    ).first()
    ...
    new_cart = Cart(user_id=user.id, product_id=cart.product_id, quantity=cart.quantity)
```

4. Enforce ownership **in the WHERE clause**, not with a post-fetch `if`. Fetch-then-check leaks existence (404 vs 403) and is easy to forget; a scoped query returns 404 uniformly for both "missing" and "not yours". Replace the path `{user_id}` on `GET /cart/{user_id}`, `GET /cart/count/{user_id}`, `GET /orders/{user_id}` with `user.id`, and rewrite the IDOR mutators:

```python
# app/routes/cart.py — update & delete keyed by (id, owner)
@router.put("/cart/{cart_id}")
def update_cart_quantity(cart_id: int, body: CartUpdate,
                         user: User = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    item = db.query(Cart).filter(
        Cart.id == cart_id, Cart.user_id == user.id,   # ownership in the query
    ).first()
    if not item:
        raise HTTPException(404, "Cart item not found")
    ...

@router.delete("/cart/{cart_id}")
def remove_from_cart(cart_id: int,
                     user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    deleted = db.query(Cart).filter(
        Cart.id == cart_id, Cart.user_id == user.id,
    ).delete()
    db.commit()
    if not deleted:
        raise HTTPException(404, "Cart item not found")
    return {"message": "Product removed from cart", "cart_id": cart_id}
```

```python
# app/routes/orders.py — cancel & details scoped to the owner
@router.delete("/orders/{order_id}")
def cancel_order(order_id: int,
                 user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    order = db.query(Order).filter(
        Order.id == order_id, Order.user_id == user.id,
    ).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status != "pending":
        raise HTTPException(400, "Only pending orders can be cancelled")
    ...   # (atomicity / stock restock handled in the orders/transactions section)
```

5. Gate seller routes by role **and** by seller identity — the seller id comes from the token, so the `{seller_id}` path param and `ProductCreate.seller_id` are removed. `create_product` stamps `seller_id=user.id`; `update_product`/`delete_product` scope by it.

```python
# app/schemas/product.py — seller_id removed from ProductCreate

# app/routes/product.py
@router.post("/products")
def create_product(product: ProductCreate,
                   seller: User = Depends(require_role(Role.seller)),
                   db: Session = Depends(get_db)):
    new = Product(**product.model_dump(), seller_id=seller.id)
    ...

@router.put("/products/{product_id}")
def update_product(product_id: int, product_data: ProductUpdate,
                   seller: User = Depends(require_role(Role.seller)),
                   db: Session = Depends(get_db)):
    product = db.query(Product).filter(
        Product.id == product_id, Product.seller_id == seller.id,
    ).first()
    if not product:
        raise HTTPException(404, "Product not found")
    ...

# /seller/products and /seller/orders lose the {seller_id} path param entirely:
@router.get("/seller/products")
def get_seller_products(seller: User = Depends(require_role(Role.seller)),
                        db: Session = Depends(get_db)):
    return db.query(Product).filter(Product.seller_id == seller.id).all()
```

For `update_order_status` (orders.py:248), scope the update to lines the seller actually owns before allowing the transition:

```python
owns_line = db.query(OrderItem).join(Product).filter(
    OrderItem.order_id == order_id, Product.seller_id == seller.id,
).first()
if not owns_line:
    raise HTTPException(403, "not your order")
```

6. Delete the client-supplied fields from the frontend calls (`CheckOut.jsx` sends `{user_id}`; cart/product forms send `user_id`/`seller_id`) — the token now carries identity. Route guards and the API client that attaches `Authorization` live in the frontend-auth section; reference it, don't rebuild it here.

**Definition of done (verifiable)**
- [ ] Every route in `account.py`/`cart.py`/`orders.py`/`product.py`/`chatbot.py` except `/signup`, `/login`, `GET /products*`, `GET /categories*`, `/` has `Depends(get_current_user)` — assert via a test that enumerates `app.routes` and fails on any non-allowlisted route lacking the dependency.
- [ ] `POST /signup` with `{"role":"admin"}` returns 422; the created user's role is never `admin`.
- [ ] Integration test: user A cannot `PUT`/`DELETE` user B's cart item, cannot `GET`/`DELETE` B's order, cannot read B's `/cart/{...}` — each returns 404, and B's row is unchanged in the DB.
- [ ] `POST /cart`, `POST /orders`, `POST /products` reject bodies containing `user_id`/`seller_id` (extra field or ignored); the persisted row's owner equals the token subject, not any body value.
- [ ] Seller A cannot update/delete seller B's product (404) and `/seller/products` returns only A's rows; a `customer` token gets 403 on any `/seller/*` or product write.
- [ ] `role` column is backed by the `Role` enum; no value outside `{customer,seller,admin}` can be written through the API.

**Effort:** 3-4 days · **Launch gate:** BLOCKING

---

## 3. Data layer, migrations & integrity

**Production goal.** Schema changes are versioned and applied through Alembic (never auto-created at import), every foreign key and sort/filter column is indexed, money is exact `Numeric(12,2)`, the database enforces its own invariants (stock ≥ 0, price > 0, one cart row per user+product) so application bugs cannot corrupt data, and the connection pool is sized to the worker count with a tested backup/restore path.

**Where the repo is now.** `backend/app/main.py:20` calls `Base.metadata.create_all(bind=engine)` on every import — there are no migrations, so the live schema silently drifts from the models and can never be altered in place. All money is `Float` (`models/orders.py:18`, `models/product.py:24`, `models/order_Item.py:16`), `products.seller_id` (`models/product.py:30`) is a bare `Integer` with no `ForeignKey`, no FK carries a covering index, nothing constrains `stock`/`price`/`quantity` sign, and `cart` (`models/cart.py`) permits duplicate `(user_id, product_id)` rows. `database.py:7` builds the engine with all pool defaults and `config.py:8` prints the DB URL (with password) to stdout.

**Gaps to close**
- **[P0]** No migration tooling; schema created by `create_all` at import — `main.py:20`, `database.py`
- **[P0]** Money as `Float` → rounding/precision errors on totals — `models/orders.py:18`, `product.py:24`, `order_Item.py:16`
- **[P0]** `products.seller_id` is an unconstrained `Integer`, no referential integrity to `users` — `models/product.py:30`
- **[P0]** No `CHECK` constraints: negative stock (feeds the race in the orders domain), zero/negative price, non-positive quantity — `product.py:24,26`, `order_Item.py:15`
- **[P1]** No `UNIQUE(user_id, product_id)` on `cart`; "add to cart" creates duplicate rows instead of incrementing — `models/cart.py`
- **[P1]** No indexes on any FK or sort column (`orders.user_id`, `order_items.order_id`/`product_id`, `products.category_id`/`seller_id`, `cart.user_id`) — every model
- **[P1]** Engine has no `pool_pre_ping`, no `pool_size`/`max_overflow` tuning; will exhaust or hand out dead connections under load — `database.py:7`
- **[P1]** DB URL (with password) printed to stdout — `config.py:8` (also flagged in secrets/config section)
- **[P2]** No backup schedule and, critically, no tested restore — nowhere in repo

**Implementation**

1. **Add Alembic, kill `create_all`.** Add `alembic`, `psycopg[binary]`, `sqlalchemy` to the backend manifest (see dependency section), then `alembic init migrations`. Point `env.py` at the app metadata and the runtime URL so autogenerate sees the models:

```python
# backend/migrations/env.py  (key edits)
from app.database import Base
from app.config import DATABASE_URL
from app import models  # noqa: F401 — import every model module so Base sees all tables
target_metadata = Base.metadata

def run_migrations_online():
    config.set_main_option("sqlalchemy.url", DATABASE_URL)
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.", poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata,
                          compare_type=True, compare_server_default=True)
        with context.begin_transaction():
            context.run_migrations()
```

Delete line `main.py:20` entirely:

```diff
- # Create Database Tables
- Base.metadata.create_all(bind=engine)
```

Schema is now owned by `alembic upgrade head`, run as a deploy step (see CI/CD & deploy section) — never at import.

2. **Baseline migration = current live schema.** So existing dev/prod data isn't dropped, the first revision recreates today's tables as-is, then `alembic stamp head` on any DB that already has them:

```python
# migrations/versions/0001_baseline.py
revision = "0001_baseline"; down_revision = None
import sqlalchemy as sa
from alembic import op

def upgrade():
    op.create_table("users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("full_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(100), nullable=False, unique=True),
        sa.Column("phone", sa.String(20), unique=True),
        sa.Column("password", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), server_default="customer"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    # categories, products, cart, orders, order_items … mirror the current models exactly
def downgrade():
    for t in ("order_items","orders","cart","products","categories","users"):
        op.drop_table(t)
```

3. **Migration `0002` — integrity: FK, indexes, CHECKs, UNIQUE.** This is the core hardening revision. Update the models to match (add `ForeignKey`, `index=True`, `CheckConstraint`, `UniqueConstraint`) so autogenerate stays clean afterward.

```python
# migrations/versions/0002_integrity.py
revision = "0002_integrity"; down_revision = "0001_baseline"
import sqlalchemy as sa
from alembic import op

def upgrade():
    # --- real FK on products.seller_id (backfill/clean orphans first) ---
    op.execute("UPDATE products SET seller_id = NULL "
               "WHERE seller_id IS NOT NULL "
               "AND seller_id NOT IN (SELECT id FROM users)")
    op.create_foreign_key("fk_products_seller", "products", "users",
                          ["seller_id"], ["id"], ondelete="SET NULL")

    # --- covering indexes on every FK / sort column ---
    op.create_index("ix_products_category_id", "products", ["category_id"])
    op.create_index("ix_products_seller_id",   "products", ["seller_id"])
    op.create_index("ix_orders_user_id",       "orders",   ["user_id"])
    op.create_index("ix_orders_created_at",    "orders",   ["created_at"])
    op.create_index("ix_order_items_order_id",   "order_items", ["order_id"])
    op.create_index("ix_order_items_product_id", "order_items", ["product_id"])
    op.create_index("ix_cart_user_id",         "cart",     ["user_id"])

    # --- CHECK constraints: DB refuses corrupt values ---
    op.create_check_constraint("ck_products_stock_nonneg", "products", "stock >= 0")
    op.create_check_constraint("ck_products_price_pos",    "products", "price > 0")
    op.create_check_constraint("ck_order_items_qty_pos",   "order_items", "quantity > 0")
    op.create_check_constraint("ck_order_items_price_nonneg","order_items","price >= 0")
    op.create_check_constraint("ck_orders_total_nonneg",   "orders", "total_amount >= 0")
    op.create_check_constraint("ck_cart_qty_pos",          "cart", "quantity > 0")

    # --- one cart line per (user, product); dedupe before adding UNIQUE ---
    op.execute("""
        DELETE FROM cart a USING cart b
        WHERE a.user_id = b.user_id AND a.product_id = b.product_id AND a.id > b.id
    """)
    op.create_unique_constraint("uq_cart_user_product", "cart", ["user_id","product_id"])

def downgrade():
    op.drop_constraint("uq_cart_user_product", "cart", type_="unique")
    for c,t in [("ck_cart_qty_pos","cart"),("ck_orders_total_nonneg","orders"),
                ("ck_order_items_price_nonneg","order_items"),("ck_order_items_qty_pos","order_items"),
                ("ck_products_price_pos","products"),("ck_products_stock_nonneg","products")]:
        op.drop_constraint(c, t, type_="check")
    for ix in ["ix_cart_user_id","ix_order_items_product_id","ix_order_items_order_id",
               "ix_orders_created_at","ix_orders_user_id","ix_products_seller_id","ix_products_category_id"]:
        op.drop_index(ix)
    op.drop_constraint("fk_products_seller","products",type_="foreignkey")
```

4. **Migration `0003` — money `Float` → `Numeric(12,2)`.** Postgres casts float→numeric in place; the `USING` clause makes it explicit and rounds cleanly.

```python
# migrations/versions/0003_money_numeric.py
revision = "0003_money_numeric"; down_revision = "0002_integrity"
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.alter_column("orders", "total_amount", type_=sa.Numeric(12, 2),
                    postgresql_using="total_amount::numeric(12,2)", nullable=False)
    op.alter_column("products", "price", type_=sa.Numeric(12, 2),
                    postgresql_using="price::numeric(12,2)", nullable=False)
    op.alter_column("order_items", "price", type_=sa.Numeric(12, 2),
                    postgresql_using="price::numeric(12,2)", nullable=False)

def downgrade():
    for tbl, col in [("orders","total_amount"),("products","price"),("order_items","price")]:
        op.alter_column(tbl, col, type_=sa.Float, postgresql_using=f"{col}::double precision")
```

Update the models to match — e.g. `models/product.py:24` becomes `price = Column(Numeric(12, 2), nullable=False)`, `models/orders.py:18`, `models/order_Item.py:16` likewise; and `models/product.py:30` becomes `seller_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), index=True)`. Pydantic response schemas must serialize `Decimal` (`json_encoders={Decimal: str}` or `float`); the API-contract section owns that.

5. **Size the connection pool.** Replace the bare engine in `database.py:7`. Pool math: `pool_size + max_overflow` per Gunicorn worker must stay under Postgres `max_connections`. For 4 workers, `pool_size=5, max_overflow=5` → 40 peak connections.

```python
# backend/app/database.py
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # recycle dead conns (idle/DB restart) instead of erroring
    pool_size=5,
    max_overflow=5,
    pool_recycle=1800,       # drop conns older than 30 min (proxy/idle timeouts)
    pool_timeout=30,
)
```

Also delete `print(DATABASE_URL)` at `config.py:8` (covered fully by the secrets/config section).

6. **Backups + a restore test that actually runs.** Nightly `pg_dump` (custom format), and a scheduled restore into a throwaway DB — an untested backup is not a backup.

```yaml
# .github/workflows/db-restore-test.yml  (weekly)
name: db-restore-test
on: { schedule: [{ cron: "0 4 * * 1" }], workflow_dispatch: {} }
jobs:
  restore:
    runs-on: ubuntu-latest
    services:
      pg: { image: postgres:16, env: { POSTGRES_PASSWORD: test }, ports: ["5432:5432"] }
    steps:
      - run: aws s3 cp "s3://eshop-backups/$(date -d yesterday +%F).dump" latest.dump
      - run: PGPASSWORD=test pg_restore -h localhost -U postgres -d postgres --clean --if-exists latest.dump
      - run: |  # smoke-check the restore is non-empty and migration head matches
          PGPASSWORD=test psql -h localhost -U postgres -c "SELECT count(*) FROM products;"
          PGPASSWORD=test psql -h localhost -U postgres -c "SELECT version_num FROM alembic_version;"
```

Production backup cron (host/managed-DB side): `pg_dump -Fc "$DATABASE_URL" | aws s3 cp - "s3://eshop-backups/$(date +%F).dump"`.

**Definition of done (verifiable)**
- [ ] `grep -rn "create_all" backend/` returns nothing; `main.py` no longer creates tables at import
- [ ] `alembic upgrade head` on an empty DB produces the full schema; `alembic downgrade base` reverses it; `alembic check` reports no pending model diffs
- [ ] `\d products` shows `fk_products_seller`, `ck_products_stock_nonneg`, `ck_products_price_pos`, `ix_products_category_id`, `ix_products_seller_id`
- [ ] `INSERT INTO products(...,stock,price...) VALUES (...,-1,10)` and `(...,5,-1)` are both rejected by the DB
- [ ] Two inserts of the same `(user_id, product_id)` into `cart` → second raises unique violation
- [ ] `SELECT data_type FROM information_schema.columns WHERE column_name IN ('price','total_amount')` returns `numeric` for all; scale = 2
- [ ] Engine reports `pool_pre_ping=True` and configured `pool_size`/`max_overflow`; peak connections ≤ Postgres `max_connections`
- [ ] Restore-test workflow completes green: `pg_restore` succeeds and `products` count > 0 against a fresh DB

**Effort:** 3-4 days · **Launch gate:** BLOCKING

---

## 4. Transactional & order integrity

**Production goal.** Placing an order is a single atomic transaction that never oversells stock under concurrency, never double-charges on a retried request, and permanently records the shipping address the customer entered. Cancellation restores stock through exactly one code path regardless of who triggers it.

**Where the repo is now.** `create_order` (`backend/app/routes/orders.py:15-78`) checks stock at line 38 and decrements at line 67 with no row lock — two concurrent buyers of the last unit both pass the check and drive `product.stock` negative. It commits twice (lines 53, 71), so a crash after the first commit leaves an order with zero items and no stock decrement. `CheckOut.jsx:18-23` collects `full_name/phone/address/city/postal_code` but the POST body sends only `{user_id}` (`CheckOut.jsx:160-162`), and `Order` (`models/orders.py:7-31`) has no address column — the address is discarded. There is no idempotency mechanism, so a network retry creates a duplicate order. Stock restoration lives only in `DELETE /orders/{order_id}` (`orders.py:180-197`); the seller `PUT .../status` path (`orders.py:248-289`) can set status to `"cancelled"` (line 279) without ever restoring stock.

**Gaps to close**
- **[P0]** Oversell race: stock read (`orders.py:38`) and decrement (`orders.py:67`) are not row-locked — needs `SELECT … FOR UPDATE` — `orders.py:36-44,56-67`
- **[P0]** Non-atomic creation: two `db.commit()` calls (`orders.py:53,71`) split order + items + stock across transactions — collapse to one
- **[P0]** Shipping address collected then dropped — `CheckOut.jsx:160-162`, `models/orders.py`, `schemas/order.py:5-6`
- **[P1]** No idempotency key on `POST /orders` — a retried checkout duplicates the order — `orders.py:15`
- **[P1]** Two divergent cancel paths; stock restore missing from status route — `orders.py:158-201` vs `orders.py:248-289`
- **[P2]** `stock` has no `CHECK (stock >= 0)` DB guard as a last line of defense — `models/product.py` (constraint work owned by the schema/migrations section; add this one CHECK there)

**Implementation**

1. Add the persisted columns. Snapshot the address onto the order (never a FK to a mutable address row) and add a unique idempotency key. Migration is owned by the Alembic section; the model:

```python
# models/orders.py
from sqlalchemy import Column, Integer, Numeric, String, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    total_amount = Column(Numeric(12, 2), nullable=False)   # money as Numeric, not Float
    status = Column(String(50), nullable=False, default="pending")
    # snapshotted shipping address — immutable copy taken at checkout
    ship_full_name = Column(String(120), nullable=False)
    ship_phone = Column(String(40), nullable=False)
    ship_address = Column(Text, nullable=False)
    ship_city = Column(String(120), nullable=False)
    ship_postal_code = Column(String(20), nullable=False)
    idempotency_key = Column(String(64), unique=True, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

2. Carry the address through the schema and the frontend body:

```python
# schemas/order.py
from pydantic import BaseModel, Field

class OrderCreate(BaseModel):
    user_id: int
    ship_full_name: str = Field(min_length=1, max_length=120)
    ship_phone: str = Field(min_length=3, max_length=40)
    ship_address: str = Field(min_length=1)
    ship_city: str = Field(min_length=1, max_length=120)
    ship_postal_code: str = Field(min_length=1, max_length=20)
```

```jsx
// CheckOut.jsx  — replace the body at :160-162
body: JSON.stringify({
  user_id: user.id,
  ship_full_name: formData.full_name,
  ship_phone: formData.phone,
  ship_address: formData.address,
  ship_city: formData.city,
  ship_postal_code: formData.postal_code,
}),
```
Generate a key once per checkout attempt (persist in component state so retries reuse it) and send it as a header:
```jsx
// once, when the checkout page mounts:
const [idemKey] = useState(() => crypto.randomUUID());
// in the fetch:
headers: { "Content-Type": "application/json", "Idempotency-Key": idemKey },
```

3. Rewrite `create_order` as a single locked transaction. Read `Idempotency-Key`, lock every product row with `with_for_update()`, re-check stock under the lock, and commit exactly once. Money uses `Decimal`.

```python
# routes/orders.py
from decimal import Decimal
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models.orders import Order
from app.models.order_Item import OrderItem
from app.models.cart import Cart
from app.models.product import Product
from app.schemas.order import OrderCreate

@router.post("/orders")
def create_order(
    order_data: OrderCreate,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
):
    # 1. Replay guard: same key returns the original order instead of a duplicate.
    if idempotency_key:
        existing = db.query(Order).filter(
            Order.idempotency_key == idempotency_key
        ).first()
        if existing:
            return {"message": "Order already created", "order_id": existing.id,
                    "total_amount": float(existing.total_amount), "status": existing.status}

    try:
        # 2. Load cart joined to products, LOCKING the product rows (FOR UPDATE).
        rows = (
            db.query(Cart, Product)
            .join(Product, Cart.product_id == Product.id)
            .filter(Cart.user_id == order_data.user_id)
            .with_for_update(of=Product)   # SELECT ... FOR UPDATE on products
            .all()
        )
        if not rows:
            raise HTTPException(status_code=400, detail="Cart is empty")

        # 3. Re-check stock while holding the lock — no other tx can decrement now.
        total = Decimal("0")
        for cart, product in rows:
            if cart.quantity > product.stock:
                raise HTTPException(status_code=400,
                                    detail=f"Not enough stock for {product.name}")
            total += Decimal(str(product.price)) * cart.quantity

        order = Order(
            user_id=order_data.user_id, total_amount=total, status="pending",
            ship_full_name=order_data.ship_full_name, ship_phone=order_data.ship_phone,
            ship_address=order_data.ship_address, ship_city=order_data.ship_city,
            ship_postal_code=order_data.ship_postal_code,
            idempotency_key=idempotency_key,
        )
        db.add(order)
        db.flush()   # assigns order.id WITHOUT committing

        for cart, product in rows:
            db.add(OrderItem(order_id=order.id, product_id=product.id,
                             quantity=cart.quantity, price=product.price))
            product.stock -= cart.quantity   # safe under the row lock
            db.delete(cart)

        db.commit()   # ONE commit: order + items + stock + cart clear are atomic
    except IntegrityError:
        db.rollback()   # unique idempotency_key hit under a concurrent retry
        existing = db.query(Order).filter(
            Order.idempotency_key == idempotency_key).first()
        if existing:
            return {"message": "Order already created", "order_id": existing.id,
                    "total_amount": float(existing.total_amount), "status": existing.status}
        raise
    except HTTPException:
        db.rollback()
        raise

    return {"message": "Order created successfully", "order_id": order.id,
            "total_amount": float(order.total_amount), "status": order.status}
```

4. Unify cancellation. Introduce one helper that both routes call so stock restore can never diverge, and make it re-lock the product rows:

```python
# routes/orders.py
def _restore_stock_and_cancel(order: Order, db: Session):
    if order.status in ("cancelled", "shipped", "delivered"):
        raise HTTPException(status_code=400,
                            detail=f"Cannot cancel an order that is {order.status}")
    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    ids = [i.product_id for i in items]
    products = {p.id: p for p in db.query(Product)
                .filter(Product.id.in_(ids)).with_for_update().all()}
    for item in items:
        p = products.get(item.product_id)
        if p:
            p.stock += item.quantity
    order.status = "cancelled"   # keep the row for audit; do not hard-delete
    db.commit()

@router.delete("/orders/{order_id}")
def cancel_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).with_for_update().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    _restore_stock_and_cancel(order, db)
    return {"message": "Order cancelled successfully"}
```
In `update_order_status` (`orders.py:248-289`), route the cancel case through the same helper instead of the bare `order.status = ...` at line 279:
```python
    new_status = status_data.status.lower()
    if new_status not in allowed_status:
        raise HTTPException(status_code=400, detail="Invalid order status")
    if new_status == "cancelled":
        _restore_stock_and_cancel(order, db)   # restores stock — the old path did not
    else:
        order.status = new_status
        db.commit()
```

**Definition of done (verifiable)**
- [ ] A concurrency test (two threads / two async clients) buying the last unit of a product yields exactly one successful order and one `400 Not enough stock`; `product.stock` never goes negative.
- [ ] `POST /orders` contains exactly one `db.commit()` on the happy path; killing the process mid-request leaves no partial order (asserted by a test that patches to raise after `flush`).
- [ ] Two `POST /orders` with the same `Idempotency-Key` return the same `order_id` and create one row (verified by count on `orders`).
- [ ] A placed order row has non-empty `ship_address`/`ship_city`/`ship_postal_code` matching the checkout form input.
- [ ] Cancelling via `DELETE /orders/{id}` and via `PUT /seller/orders/{id}/status` with `cancelled` both increase `product.stock` by the ordered quantity (parametrized test over both routes).
- [ ] `total_amount` column is `Numeric(12,2)`; no `float` arithmetic remains in `create_order`.

**Effort:** 3-4 days (incl. the Alembic migration adding columns + the `CHECK (stock >= 0)` constraint owned by the schema section) · **Launch gate:** BLOCKING

---

## 5. Configuration, secrets & 12-factor

**Production goal.** Every runtime input (DB URL, Groq/Pexels keys, CORS origins, JWT secret, environment name) is loaded through one typed, validated `Settings` object that **fails fast at startup** if a required secret is missing or malformed; no secret is ever printed, committed, or shipped in the Vite bundle; the leaked git-history DB password is rotated and prod secrets come from a managed backend, not a `.env` file on disk.

**Where the repo is now.** `app/config.py` is four lines: it `load_dotenv()`s, does `DATABASE_URL = os.getenv("DATABASE_URL")` (no validation — a missing var yields `None`, which then explodes deep inside `create_engine` in `database.py:7`), and `config.py:8` **`print(DATABASE_URL)`** leaks the DB password (incl. its plaintext credentials) to stdout/log aggregators on every boot. Other secrets are read ad-hoc and unchecked: `os.getenv("GROQ_API_KEY")` at `services/chatbot_service.py:14`, `os.getenv("PEXELS_API_KEY")` at `utils/pexels.py:7`. A real dev password (`postgres:eshop123`) is committed at `ea57228:backend/.env` and remains in git history. There is no `.env.example`, no environment separation, and no backend dependency manifest to even pin `pydantic-settings`.

**Gaps to close**
- **[P0]** `print(DATABASE_URL)` leaks credentials to logs — `app/config.py:8`
- **[P0]** Leaked DB password in git history must be rotated and treated as compromised — `ea57228:backend/.env`
- **[P0]** No startup validation: missing `DATABASE_URL`/`GROQ_API_KEY`/`PEXELS_API_KEY` fail late and cryptically — `config.py:6`, `chatbot_service.py:14`, `pexels.py:7`
- **[P1]** Scattered `os.getenv` calls instead of one typed config object — 3 sites above
- **[P1]** No `.env.example`, no `ENVIRONMENT` (dev/staging/prod) switch; CORS origins hardcoded (see §CORS/security section)
- **[P1]** No managed secrets backend for prod; secrets live in a plaintext `.env`
- **[P2]** Ensure no secret is exposed via `import.meta.env` in the Vite build (only `VITE_`-prefixed vars ship to the client)
- **[P2]** `pydantic-settings` isn't in any manifest (depends on §dependency-management)

**Implementation**

1. Replace the entire `app/config.py` with a validated `pydantic-settings` model. Required fields have no default, so instantiation raises `ValidationError` at import time if unset — a fail-fast startup. `DATABASE_URL`/secrets use `SecretStr` so they never render in logs or tracebacks.

```python
# app/config.py
from functools import lru_cache
from typing import Literal

from pydantic import Field, PostgresDsn, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",            # dev convenience only; prod injects real env vars
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="forbid",             # unknown keys in .env are an error, not a typo sink
    )

    # --- required: startup fails if any are missing ---
    ENVIRONMENT: Literal["dev", "staging", "prod"] = "dev"
    DATABASE_URL: PostgresDsn                       # validated as a real postgres:// DSN
    GROQ_API_KEY: SecretStr
    PEXELS_API_KEY: SecretStr
    JWT_SECRET: SecretStr                           # consumed by §auth section

    # --- optional with safe defaults ---
    CORS_ORIGINS: list[str] = Field(default_factory=list)
    LOG_LEVEL: str = "INFO"

    @field_validator("DATABASE_URL")
    @classmethod
    def _require_tls_in_prod(cls, v: PostgresDsn, info):
        # ENVIRONMENT is validated before this if declared first; guard defensively
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
```

2. Delete the `print` and route `database.py` through the typed object. `SecretStr` requires an explicit `.get_secret_value()` to read the value, which makes every secret access greppable and prevents accidental logging.

```python
# app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

engine = create_engine(
    str(settings.DATABASE_URL),          # PostgresDsn -> str for SQLAlchemy
    pool_pre_ping=True,
    echo=False,                          # never echo SQL/params in prod
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
```

Then update the two other read sites:

```python
# app/services/chatbot_service.py  (was line 14)
from app.config import settings
client = OpenAI(api_key=settings.GROQ_API_KEY.get_secret_value(),
                base_url="https://api.groq.com/openai/v1")

# app/utils/pexels.py  (was lines 7,15)
from app.config import settings
headers = {"Authorization": settings.PEXELS_API_KEY.get_secret_value()}
```

3. Add `backend/.env.example` (committed) and confirm `backend/.env` is git-ignored. The example carries **placeholders only** — never a real value.

```dotenv
# backend/.env.example — copy to .env and fill in. NEVER commit .env.
ENVIRONMENT=dev
# postgres DSN; use a *rotated* password, not the leaked eshop123
DATABASE_URL=postgresql://eshop_app:CHANGE_ME@localhost:5432/eshop
GROQ_API_KEY=gsk_your_key_here
PEXELS_API_KEY=your_pexels_key_here
JWT_SECRET=generate_with_python_-c_secrets.token_urlsafe_48
# comma-separated; leave empty in dev
CORS_ORIGINS=http://localhost:5173
LOG_LEVEL=INFO
```

```gitignore
# backend/.gitignore
.env
.env.*
!.env.example
```

4. **Rotate the leaked credential (`ea57228:backend/.env`).** The `eshop123` password is compromised the moment it entered history — purging git does not un-leak it, so rotation is mandatory and comes first:

```sql
-- on the postgres server, as a superuser
ALTER ROLE postgres WITH PASSWORD 'REDACTED_new_strong_password';
-- better: give the app its own least-privilege role, don't reuse postgres
CREATE ROLE eshop_app LOGIN PASSWORD 'REDACTED_app_password';
GRANT CONNECT ON DATABASE eshop TO eshop_app;
GRANT USAGE ON SCHEMA public TO eshop_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO eshop_app;
```

Then scrub the file from history (coordinate a force-push; all clones must re-clone):

```bash
pip install git-filter-repo
git filter-repo --path backend/.env --invert-paths --force
git push --force --all
```

5. **Per-environment config.** No secrets in code; `ENVIRONMENT` selects behavior, values are injected by the platform. Dev reads `.env`; staging/prod read real environment variables (pydantic-settings prefers real env vars over the file automatically). Add an env-specific guard so prod can't boot with a dev fallback:

```python
# in app/main.py startup
from app.config import settings

if settings.ENVIRONMENT == "prod" and "localhost" in str(settings.DATABASE_URL):
    raise RuntimeError("Refusing to start prod against a localhost database")
```

6. **Managed secrets backend for prod.** Do not ship a `.env` to prod hosts. Inject `DATABASE_URL`, `GROQ_API_KEY`, `PEXELS_API_KEY`, `JWT_SECRET` as environment variables from a secrets manager (AWS Secrets Manager / SSM Parameter Store, GCP Secret Manager, or Fly/Render/Railway secrets). Example for ECS task definition:

```json
"secrets": [
  {"name": "DATABASE_URL",  "valueFrom": "arn:aws:secretsmanager:...:eshop/DATABASE_URL"},
  {"name": "GROQ_API_KEY",  "valueFrom": "arn:aws:secretsmanager:...:eshop/GROQ_API_KEY"},
  {"name": "PEXELS_API_KEY","valueFrom": "arn:aws:secretsmanager:...:eshop/PEXELS_API_KEY"},
  {"name": "JWT_SECRET",    "valueFrom": "arn:aws:secretsmanager:...:eshop/JWT_SECRET"}
]
```

7. **No secret in the Vite bundle.** Vite only exposes vars prefixed `VITE_` to client code via `import.meta.env`; anything else stays server-side. Enforce it: keep the 29 hardcoded `http://127.0.0.1:8000` fetches moving to a single `import.meta.env.VITE_API_BASE_URL` (see §frontend-API-client), and add a CI grep gate so no `GROQ`/`PEXELS`/`SECRET`/`PASSWORD` string ever ships:

```bash
# fails the build if a secret-shaped var is VITE_-prefixed or hardcoded in the client
! grep -rEn 'VITE_(GROQ|PEXELS|JWT|DB|DATABASE|SECRET|PASSWORD)' frontend/src frontend/.env* 2>/dev/null
! grep -rEn '(gsk_[A-Za-z0-9]{20,}|postgresql://[^ ]*:[^ @]+@)' frontend/src frontend/dist 2>/dev/null
```

**Definition of done (verifiable)**
- [ ] `grep -rn "print(" backend/app/config.py` returns nothing; no secret appears in startup logs
- [ ] Starting the app with `DATABASE_URL` unset exits non-zero with a pydantic `ValidationError` naming the missing field (assert in a test)
- [ ] `grep -rn "os.getenv" backend/app` returns zero hits; all config flows through `app.config.settings`
- [ ] `backend/.env.example` exists with placeholders; `backend/.env` is git-ignored and `git log --all -- backend/.env` shows it removed from history
- [ ] The `eshop123` role/password no longer authenticates against any running database
- [ ] Prod deploy sources all four secrets from the secrets manager, not a file (verified in task/deploy spec)
- [ ] `npm run build` output (`frontend/dist`) contains no Groq/Pexels/DB string; the CI grep gate passes
- [ ] `Settings(extra="forbid")` rejects an unknown key in `.env` (unit test)

**Effort:** 2-3 days (rotation + history scrub + secrets-manager wiring dominate) · **Launch gate:** BLOCKING

---

## 6. API hardening & input validation

**Production goal.** Every endpoint under a versioned `/v1` prefix enforces strict schema validation, bounded request bodies, per-route rate limits, and returns a consistent error envelope with correct status codes; abuse-prone routes (`/login`, `/signup`, `/chatbot`) are throttled via Redis, security headers are present on every response, and `/docs`/`/openapi.json` are closed in production.

**Where the repo is now.** Nothing here exists. `main.py:27-33` hardcodes CORS to localhost with `allow_credentials=True`; there is no rate limiting, no body-size cap, and no security-headers middleware. Every schema (`schemas/user.py`, `schemas/product.py`, `schemas/order.py`) uses bare types with no `Field()` bounds and no `extra="forbid"`, so `role: str` accepts `"admin"` (see Section 1) and unknown keys pass silently. Routes return ad-hoc dicts (`account.py:41`, `product.py:39`) with no `response_model`, wrong-ish codes (signup returns 200 not 201, duplicate email is 400 not 409 at `account.py:24`), and `/chatbot` (`chatbot.py:18`) is unauthenticated, unbounded, and unmetered.

**Gaps to close**
- **[P0]** No rate limiting on any route; `/login` (`account.py:49`) and `/signup` (`account.py:13`) allow unlimited credential-stuffing, `/chatbot` (`chatbot.py:18`) allows unmetered LLM spend
- **[P0]** No request body size limit — any route accepts an arbitrarily large JSON body (memory DoS)
- **[P0]** `extra="forbid"` absent everywhere — mass-assignment / unknown-field acceptance (`schemas/user.py:4`, `schemas/product.py:5`)
- **[P0]** CORS hardcoded, `allow_credentials=True` with wildcard methods/headers — `main.py:27-33` (origins must come from config, Section 8)
- **[P1]** No `Field()` bounds — `price: float` accepts negatives/NaN (`schemas/product.py:10`), `message: str` unbounded (`chatbot.py:15`), `stock: int` accepts negatives
- **[P1]** No security headers (CSP / HSTS / X-Content-Type-Options / Referrer-Policy / frame-ancestors) on any response
- **[P1]** `/docs` & `/openapi.json` always public (`main.py:14-17`)
- **[P1]** No API versioning — all routes at root; no `/v1` prefix
- **[P2]** No `response_model`; inconsistent status codes & error shape (`account.py:24,41`, `product.py:39`)

**Implementation**

1. **Add dependencies** (`backend/requirements.txt` / `pyproject`): `slowapi==0.1.10`, `redis`, `pydantic==2.13`, `pydantic-settings==2.14` (settings live in Section 8). CORS origins, `ENV`, and `REDIS_URL` come from that `Settings` object — referenced here, not redefined.

2. **Rate limiting with slowapi backed by Redis** — `backend/app/core/limiter.py`:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.config import settings  # Section 8 Settings: settings.redis_url, settings.env

# storage_uri -> Redis so limits are shared across gunicorn workers.
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.redis_url,          # e.g. redis://localhost:6379/0
    default_limits=["200/minute"],           # global backstop for every route
    headers_enabled=True,                    # emit X-RateLimit-* headers
    strategy="fixed-window",
)
```
Wire it in `main.py` and register the 429 handler that emits our envelope:
```python
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.limiter import limiter
from app.core.errors import error_body

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

@app.exception_handler(RateLimitExceeded)
async def ratelimit_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content=error_body("rate_limited", f"Rate limit exceeded: {exc.detail}"),
    )
```
Apply tight per-route limits on abuse-prone endpoints. The `request: Request` param is **required** by slowapi's decorator:
```python
# account.py
@router.post("/login", status_code=200, response_model=LoginResponse)
@limiter.limit("5/minute")
def login(request: Request, user: UserLogin, db: Session = Depends(get_db)):
    ...

@router.post("/signup", status_code=201, response_model=SignupResponse)
@limiter.limit("3/minute")
def signup(request: Request, user: UserSignup, db: Session = Depends(get_db)):
    ...

# chatbot.py — throttle LLM spend hard
@router.post("", response_model=ChatResponse)
@limiter.limit("10/minute;100/day")
def chatbot(request: Request, body: ChatRequest, db: Session = Depends(get_db)):
    ...
```

3. **Request body size limit** — reject oversized bodies before they are buffered. `backend/app/middleware/body_limit.py`:
```python
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.core.errors import error_body

MAX_BODY_BYTES = 256 * 1024  # 256 KB; chatbot/product JSON never approaches this

class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        cl = request.headers.get("content-length")
        if cl is not None and cl.isdigit() and int(cl) > MAX_BODY_BYTES:
            return JSONResponse(
                status_code=413,
                content=error_body("payload_too_large", "Request body too large."),
            )
        return await call_next(request)
```
Register with `app.add_middleware(BodySizeLimitMiddleware)`. (Enforce a real byte ceiling at the nginx/ingress layer too — `client_max_body_size 256k;` — since `Content-Length` can be spoofed.)

4. **Strict schemas — `Field()` bounds + `extra="forbid()"` on every model.** Shared base in `schemas/base.py`, then tighten each schema:
```python
# schemas/base.py
from pydantic import BaseModel, ConfigDict

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

# schemas/user.py
from decimal import Decimal
from enum import Enum
from pydantic import EmailStr, Field
from app.schemas.base import StrictModel

class Role(str, Enum):          # closes the self-register-as-admin hole (Section 1)
    buyer = "buyer"
    seller = "seller"

class UserSignup(StrictModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str = Field(pattern=r"^\+?[0-9]{7,15}$")
    password: str = Field(min_length=8, max_length=128)
    role: Role = Role.buyer     # 'admin' from the client now 422s

# schemas/product.py — money as Decimal + bounds (Float→Numeric migration is Section 3)
class ProductCreate(StrictModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5000)
    category_id: int = Field(gt=0)
    brand: str = Field(min_length=1, max_length=120)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    stock: int = Field(ge=0)
    image: str = Field(max_length=2048)
    # seller_id removed from body — derive from auth token (Section 1), never trust client

# chatbot.py
class ChatRequest(StrictModel):
    message: str = Field(min_length=1, max_length=2000)
```

5. **Security headers middleware** — `backend/app/middleware/security_headers.py`:
```python
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        resp = await call_next(request)
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["Referrer-Policy"] = "no-referrer"
        resp.headers["X-Frame-Options"] = "DENY"
        resp.headers["Content-Security-Policy"] = (
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
        )  # API returns JSON only — lock it all down
        if settings.env == "production":
            resp.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains; preload"
            )
        return resp
```
Register `app.add_middleware(SecurityHeadersMiddleware)`.

6. **Disable `/docs` & `/openapi.json` in prod + config-driven CORS** — rebuild the app factory in `main.py`:
```python
from app.config import settings

_docs = None if settings.env == "production" else "/docs"
app = FastAPI(title="E-Shop API", version="1.0.0",
              docs_url=_docs, redoc_url=None,
              openapi_url=None if settings.env == "production" else "/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,   # list from Settings, not the hardcoded literal
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

7. **`/v1` versioning + consistent error envelope & status codes.** Mount every router under one versioned prefix:
```python
from fastapi import APIRouter
api = APIRouter(prefix="/v1")
api.include_router(account_router)
api.include_router(product_router)
api.include_router(cart_router)
api.include_router(orders_router)
api.include_router(chatbot_router, prefix="/chatbot", tags=["ChatBot"])
api.include_router(categories.router)
app.include_router(api)
```
Standard envelope in `backend/app/core/errors.py`, plus handlers that make `HTTPException` and 422 validation errors share the shape:
```python
def error_body(code: str, message: str, details=None):
    return {"error": {"code": code, "message": message, "details": details}}

from fastapi.exceptions import RequestValidationError
from fastapi import HTTPException

@app.exception_handler(HTTPException)
async def http_exc_handler(request, exc):
    return JSONResponse(status_code=exc.status_code,
                        content=error_body("http_error", exc.detail))

@app.exception_handler(RequestValidationError)
async def validation_handler(request, exc):
    return JSONResponse(status_code=422,
                        content=error_body("validation_error", "Invalid request.",
                                           details=exc.errors()))
```
Correct the codes at the call sites: duplicate email → `409 Conflict` (`account.py:24`), signup success → `201`, DELETE routes → `204`, out-of-stock on order create → `409` (Section 3). Add `response_model=` and drop the hand-built dict returns on all ~27 routes so bodies match the OpenAPI schema the frontend generates types from (Section 9).

**Definition of done (verifiable)**
- [ ] `POST /v1/login` returns `429` with the error envelope on the 6th request within a minute; the 429 count is shared across workers (verified by hitting two gunicorn workers) — confirming Redis backing, not in-memory
- [ ] `POST /v1/products` with `{"price": -5}` or an unknown field returns `422`; `{"role": "admin"}` on `/v1/signup` returns `422`
- [ ] A request with `Content-Length` > 256 KB returns `413`
- [ ] `curl -I` on any route shows `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy`, `X-Frame-Options`; HSTS present only when `ENV=production`
- [ ] `GET /docs` and `GET /openapi.json` return `404` when `ENV=production`; both serve in dev
- [ ] All routes resolve under `/v1`; root paths return `404`
- [ ] `pytest` asserts: signup→`201`, duplicate email→`409`, DELETE→`204`, out-of-stock→`409`; every 4xx/5xx body matches `{"error": {"code", "message", "details"}}`
- [ ] Every route declares `response_model`; a test asserts no route returns an undocumented raw dict

**Effort:** 3-4 days · **Launch gate:** BLOCKING

---

## 7. Observability & operations

**Production goal.** Every request emits a structured JSON log line carrying a correlation ID; unhandled exceptions reach Sentry with that ID; RED metrics (rate/errors/duration) are scrapeable by Prometheus; and orchestrators can distinguish "process alive" (`/health`) from "can serve traffic" (`/ready` → DB reachable). No secret, password, or PII ever lands in a log.

**Where the repo is now.** Zero instrumentation: no logging config anywhere, so FastAPI/uvicorn only emit default access lines. `app/config.py:8` `print(DATABASE_URL)` leaks the DB password (incl. credentials) to stdout on every boot; `app/routes/cart.py:88` prints cart contents; `app/test_db.py` prints connection errors. The only endpoint resembling a probe is `app/main.py:44` `GET /` returning a static string — it never touches the DB, so it stays "healthy" while Postgres is down. The frontend carries 30 `console.log` calls in `src/`. There is no Sentry, no `/metrics`, no readiness check, and no request/correlation ID.

**Gaps to close**
- **[P0]** DB password printed to stdout on startup — `app/config.py:8` (delete; folds into the pydantic-settings work in the config section)
- **[P0]** No error tracking — an unhandled 500 (e.g. the `/chatbot` `.ilike` crash) is invisible in prod
- **[P1]** No readiness probe that verifies the DB; `GET /` at `app/main.py:44` gives false "up" signals to k8s/compose healthchecks
- **[P1]** No structured logging or correlation ID — cannot trace a single request across the two non-atomic order commits (`app/routes/orders.py:52-71`)
- **[P1]** No Prometheus metrics — no visibility into request rate, latency, or error ratio
- **[P2]** Stray `print()` debug logging — `app/routes/cart.py:88`, `app/test_db.py`
- **[P2]** 30 `console.log` in frontend `src/` leak state to the browser console; strip via a Vite build drop (see the frontend hardening section)
- **[P3]** No alerting rules wired to the metrics/Sentry

**Implementation**

1. Add deps to the backend manifest (see build/deps section): `structlog==26.1 sentry-sdk==2.66 prometheus-fastapi-instrumentator asgi-correlation-id`.

2. Structured JSON logging with a request-scoped correlation ID. New `app/observability/logging.py`:

```python
import logging
import sys
import structlog
from asgi_correlation_id import correlation_id

def _add_correlation_id(_, __, event_dict):
    if (cid := correlation_id.get()) is not None:
        event_dict["request_id"] = cid
    return event_dict

def configure_logging(log_level: str = "INFO", json_logs: bool = True) -> None:
    shared = [
        structlog.contextvars.merge_contextvars,
        _add_correlation_id,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
    ]
    renderer = (
        structlog.processors.JSONRenderer()
        if json_logs else structlog.dev.ConsoleRenderer()
    )
    structlog.configure(
        processors=shared + [structlog.stdlib.ProcessorFormatter.wrap_for_formatter],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.getLevelName(log_level)
        ),
        cache_logger_on_first_use=True,
    )
    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared,
        processors=[structlog.stdlib.ProcessorFormatter.remove_processors_meta, renderer],
    )
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    root = logging.getLogger()
    root.handlers.clear()          # drop uvicorn's default text handlers
    root.addHandler(handler)
    root.setLevel(log_level)
    for name in ("uvicorn.access",):   # access logs come from our middleware instead
        logging.getLogger(name).handlers.clear()
        logging.getLogger(name).propagate = False
```

3. Wire everything into `app/main.py`. `CorrelationIdMiddleware` reads/generates `X-Request-ID`; an access-log middleware emits one JSON line per request with method, path, status, and duration:

```python
import time
import structlog
from asgi_correlation_id import CorrelationIdMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from app.observability.logging import configure_logging
from app.observability.sentry import init_sentry
from app.observability.health import router as health_router
from app.config import settings   # pydantic-settings BaseSettings (see config section)

configure_logging(settings.LOG_LEVEL, json_logs=settings.ENV != "local")
init_sentry(settings)
log = structlog.get_logger()

app = FastAPI(title="E-Shop API", version="1.0.0")
app.add_middleware(CorrelationIdMiddleware, header_name="X-Request-ID")

@app.middleware("http")
async def access_log(request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    log.info(
        "http_request",
        method=request.method,
        path=request.url.path,          # path only — never request.url (query strings carry PII)
        status_code=response.status_code,
        duration_ms=round((time.perf_counter() - start) * 1000, 2),
        client=request.client.host if request.client else None,
    )
    return response

Instrumentator(excluded_handlers=["/metrics", "/health", "/ready"]).instrument(app).expose(
    app, endpoint="/metrics", include_in_schema=False
)
app.include_router(health_router)
```

4. Liveness + readiness in `app/observability/health.py`. `/health` never touches the DB; `/ready` runs `SELECT 1` and returns 503 when Postgres is unreachable so k8s/compose stop routing traffic:

```python
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter(tags=["ops"])

@router.get("/health", include_in_schema=False)
def health():
    return {"status": "ok"}

@router.get("/ready", include_in_schema=False)
def ready(response: Response, db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not_ready", "checks": {"database": "down"}}
```

Point your process supervisor or load-balancer healthcheck at `/ready` (e.g. `curl -fsS http://localhost:8000/ready`).

5. Sentry init in `app/observability/sentry.py` — the `FastApiIntegration` auto-captures unhandled exceptions with the correlation ID as a tag:

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

def init_sentry(settings) -> None:
    if not settings.SENTRY_DSN:
        return
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENV,
        release=settings.RELEASE,
        traces_sample_rate=0.1,
        send_default_pii=False,      # do not attach cookies/headers/bodies
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
    )
```

6. Log hygiene — delete every debug `print`/`console.log`:
   - Remove `app/config.py:8` `print(DATABASE_URL)` (config moves to pydantic-settings; the URL never gets logged).
   - Remove `app/routes/cart.py:88` `print("Found:", cart_items)` and the prints in `app/test_db.py` (delete `test_db.py` outright — it is a scratch script).
   - Frontend: strip the 30 `console.log` in `src/` at build time in `vite.config.js` so nothing leaks in prod:
   ```js
   export default defineConfig({ esbuild: { drop: ['console', 'debugger'] } });
   ```
   - Never log request bodies from `/account` (plaintext passwords) or headers.

7. Alerting (wire once metrics ship): Prometheus/Grafana alert rules on `/metrics` output, plus Sentry issue alerts.

```yaml
groups:
  - name: eshop
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
            / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels: { severity: page }
        annotations: { summary: "5xx rate >5% over 5m" }
      - alert: HighLatencyP95
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 1
        for: 10m
        labels: { severity: warn }
      - alert: NotReady
        expr: up{job="eshop"} == 0
        for: 2m
        labels: { severity: page }
```

**Definition of done (verifiable)**
- [ ] `grep -rn "print(" backend/app` returns nothing; `print(DATABASE_URL)` gone from `config.py`
- [ ] `curl -s localhost:8000/health` → 200 `{"status":"ok"}` even with Postgres stopped
- [ ] `curl -si localhost:8000/ready` → 200 when DB up; **503** `{"status":"not_ready"}` when DB stopped
- [ ] Every request produces one JSON log line on stdout containing `request_id`, `method`, `path`, `status_code`, `duration_ms`; the `request_id` matches the `X-Request-ID` response header
- [ ] `curl -s localhost:8000/metrics` returns Prometheus text including `http_requests_total` and `http_request_duration_seconds_bucket`
- [ ] Forcing a 500 (call the broken `/chatbot`) creates a Sentry issue tagged with the matching `request_id`
- [ ] Production `vite build` output contains zero `console.log`; `grep -rn "console.log" frontend/dist` is empty
- [ ] Alert rules load in Prometheus (`promtool check rules`) without error

**Effort:** 2-3 days · **Launch gate:** Recommended before launch (the `print(DATABASE_URL)` secret leak is BLOCKING and must ship with the config/secrets fix)

---

## 8. Testing & quality gates

**Production goal.** Every route has an automated test that runs on real Postgres in CI, and the suite proves the authorization model — user A can never read or mutate user B's cart, orders, or products. No merge to `main` is possible while tests, lint, or type checks fail.

**Where the repo is now.** Zero tests exist; `backend/app/test_db.py` is a bare connectivity script, not a pytest suite, and there is no `pytest`, `vitest`, CI workflow, or pre-commit config anywhere. The routes are structurally untestable-for-authz today because identity is client-supplied: `create_order` (`routes/orders.py:16`) trusts `order_data.user_id`, and `get_order_details` / `cancel_order` (`routes/orders.py:104,158`) look up by bare path id with no owner check. The suite must therefore be written against the *post-auth* contract (Section on authentication) — the authz tests are the executable spec that forces those fixes and go red until they land.

**Gaps to close**
- **[P0]** No authorization test per endpoint — the core security regression net is absent for all ~27 routes (`routes/orders.py`, `routes/cart.py`, `routes/product.py`, `routes/account.py`)
- **[P0]** No test DB isolation — tests would need to hit the dev Postgres in `config.py`; need ephemeral Postgres via testcontainers + a `get_db` dependency override
- **[P1]** No backend unit coverage for the atomicity/stock-race and money-math paths (`routes/orders.py:38,67`) — see Section on data integrity for the fixes these tests lock in
- **[P1]** No frontend component/interaction tests; 29 hardcoded `fetch` calls have no seam — MSW is required to test without a live backend
- **[P1]** No e2e coverage of the checkout happy path (`CheckOut.jsx`)
- **[P2]** No `ruff`, no ESLint config, no `pre-commit` — style/lint regressions land unchecked
- **[P2]** No coverage measurement or enforced threshold

**Implementation**

1. Backend test deps and layout. Add to `backend/pyproject.toml` (or a `requirements-dev.txt`): `pytest==9.1`, `pytest-asyncio==1.4`, `httpx==0.28`, `testcontainers`, `pytest-cov`. Create `backend/tests/` with `conftest.py` that spins one Postgres container per session, creates the schema, and overrides `get_db` per test inside a rolled-back transaction (fast, fully isolated):

```python
# backend/tests/conftest.py
import pytest, pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from testcontainers.postgres import PostgresContainer

from app.main import app
from app.database import Base, get_db

@pytest.fixture(scope="session")
def pg_engine():
    with PostgresContainer("postgres:16-alpine") as pg:
        engine = create_engine(pg.get_connection_url())
        Base.metadata.create_all(engine)   # mirrors main.py:20 until Alembic lands
        yield engine

@pytest.fixture
def db_session(pg_engine):
    conn = pg_engine.connect()
    txn = conn.begin()
    Session = sessionmaker(bind=conn, autoflush=False, autocommit=False)
    session = Session()
    yield session
    session.close()
    txn.rollback()          # undo everything the test wrote
    conn.close()

@pytest_asyncio.fixture
async def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
```

2. Seed helper + the priority authz test, one assertion pattern per protected endpoint. This test encodes the target contract: an authenticated caller acting on a resource they do not own gets `403`. It is **red today** (routes return `200`/`404` by bare id) and turns green when the auth section adds the current-user dependency and owner checks.

```python
# backend/tests/test_authz_orders.py
import pytest
from app.models.user import User
from app.models.orders import Order

def make_user(db, email, role="user"):
    u = User(full_name=email, email=email, phone="0", password="x", role=role)
    db.add(u); db.commit(); db.refresh(u)
    return u

def auth(uid):                       # replace with real JWT header from auth section
    return {"Authorization": f"Bearer test-user-{uid}"}

@pytest.mark.asyncio
async def test_user_b_cannot_read_user_a_order(client, db_session):
    alice, bob = make_user(db_session, "a@e.sh"), make_user(db_session, "b@e.sh")
    order = Order(user_id=alice.id, total_amount=10.0, status="pending")
    db_session.add(order); db_session.commit(); db_session.refresh(order)

    # Bob asks for Alice's order via GET /orders/details/{order_id} (routes/orders.py:104)
    r = await client.get(f"/orders/details/{order.id}", headers=auth(bob.id))
    assert r.status_code == 403           # today: 200 with Alice's items -> FAIL, by design

@pytest.mark.asyncio
async def test_user_b_cannot_cancel_user_a_order(client, db_session):
    alice, bob = make_user(db_session, "a2@e.sh"), make_user(db_session, "b2@e.sh")
    order = Order(user_id=alice.id, total_amount=10.0, status="pending")
    db_session.add(order); db_session.commit(); db_session.refresh(order)

    r = await client.delete(f"/orders/{order.id}", headers=auth(bob.id))  # orders.py:158
    assert r.status_code == 403

@pytest.mark.asyncio
async def test_order_uses_caller_identity_not_body(client, db_session):
    alice, bob = make_user(db_session, "a3@e.sh"), make_user(db_session, "b3@e.sh")
    # Bob authenticates but puts Alice's id in the body (orders.py:16 trusts order_data.user_id)
    r = await client.post("/orders", json={"user_id": alice.id}, headers=auth(bob.id))
    assert r.status_code in (400, 403)    # must never create an order as Alice
```

Add the sibling authz tests: `test_authz_cart.py` (`GET/POST/DELETE /cart` keyed on `user_id`), `test_authz_products.py` (seller edit/delete of a product they don't own, `routes/product.py`), and a `role`-escalation test asserting a `role="user"` caller gets `403` on the seller/admin routes (`/seller/orders/*`, `PUT /seller/orders/{order_id}/status`).

3. Non-authz backend correctness tests worth locking in now: the stock-race / atomicity contract for `POST /orders` (assert stock is unchanged and no partial `Order` row survives when a concurrent decrement would oversell — see Section on data integrity) and money precision once `Float` becomes `Numeric`. Keep these in `test_orders_logic.py`.

4. Coverage target and gate. Run with `pytest --cov=app --cov-report=term-missing --cov-fail-under=75`. Set the initial floor to **75%** with a hard requirement that the `routes/` package is ≥90% (the security surface); ratchet up over time. Fail CI if uncovered.

5. Frontend: Vitest + React Testing Library + MSW. Add `vitest==4.1`, `@testing-library/react`, `msw==2.15`, `jsdom` to `frontend/package.json`; set `test: "vitest"` and a `vitest.config.js` with `environment: "jsdom"` and `setupFiles: ["./src/test/setup.js"]`. MSW intercepts the hardcoded `http://127.0.0.1:8000` calls so components test without a backend:

```js
// frontend/src/test/handlers.js
import { http, HttpResponse } from "msw";
const API = "http://127.0.0.1:8000";
export const handlers = [
  http.get(`${API}/cart`, () =>
    HttpResponse.json([{ product_id: 1, name: "Mug", price: 9.99, quantity: 2 }])),
  http.post(`${API}/orders`, async ({ request }) => {
    const body = await request.json();
    if (!body.user_id) return new HttpResponse(null, { status: 400 });
    return HttpResponse.json({ message: "Order created successfully", order_id: 42,
      total_amount: 19.98, status: "pending" });
  }),
];
```

```js
// frontend/src/test/setup.js
import { afterAll, afterEach, beforeAll } from "vitest";
import { setupServer } from "msw/node";
import { handlers } from "./handlers";
export const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

```jsx
// frontend/src/pages/CheckOut.test.jsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CheckOut from "./CheckOut";

test("checkout places order and shows success", async () => {
  localStorage.setItem("user", JSON.stringify({ id: 1 }));
  render(<MemoryRouter><CheckOut /></MemoryRouter>);
  await userEvent.click(await screen.findByRole("button", { name: /place order/i }));
  expect(await screen.findByText(/order created successfully/i)).toBeInTheDocument();
});
```

6. Playwright e2e for the checkout happy path against the running stack (`vite` + FastAPI on a seeded test DB). Add `playwright==1.62`; `playwright.config.js` sets `webServer` to boot both. One spec walks: login → add product to cart → open `/checkout` → place order → assert confirmation:

```js
// frontend/e2e/checkout.spec.js
import { test, expect } from "@playwright/test";
test("happy-path checkout", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("buyer@e.sh");
  await page.getByLabel("Password").fill("pw");
  await page.getByRole("button", { name: /login/i }).click();
  await page.goto("/products");
  await page.getByRole("button", { name: /add to cart/i }).first().click();
  await page.goto("/checkout");
  await page.getByRole("button", { name: /place order/i }).click();
  await expect(page.getByText(/order created successfully/i)).toBeVisible();
});
```

7. Lint + pre-commit. Backend `ruff==0.16` (`ruff check` + `ruff format --check`); frontend ESLint (flat config with `eslint-plugin-react` + `eslint-plugin-react-hooks`). Wire `pre-commit`:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.16.0
    hooks: [{ id: ruff, args: ["--fix"] }, { id: ruff-format }]
  - repo: local
    hooks:
      - id: eslint
        name: eslint
        entry: bash -c 'cd frontend && npx eslint src --max-warnings=0'
        language: system
        files: ^frontend/src/.*\.jsx?$
```

Full CI wiring (matrix, caching, `pip-audit`) lives in the Section on CI/CD; this section owns the test suites, lint config, and coverage gate the CI job invokes.

**Definition of done (verifiable)**
- [ ] `pytest -q` runs green against a testcontainers Postgres with no external DB configured
- [ ] Each protected route (orders, cart, products, seller/admin) has a passing "user A cannot touch user B" test; a deliberately reverted owner-check makes exactly those tests fail
- [ ] A role-escalation test proves a `user` role is rejected (`403`) from every `/seller/*` route
- [ ] `pytest --cov=app --cov-fail-under=75` passes and `routes/` coverage is ≥90%
- [ ] `vitest run` passes with MSW `onUnhandledRequest: "error"` (no real network calls leak)
- [ ] `npx playwright test` passes the checkout happy-path spec headlessly
- [ ] `ruff check`, `ruff format --check`, and `eslint --max-warnings=0` all exit 0; `pre-commit run --all-files` is clean

**Effort:** 5-7 days · **Launch gate:** BLOCKING (the authz suite is the acceptance test for the auth work; do not launch without it)

---

## 9. Frontend production readiness

**Production goal.** The React app talks to the API through one configurable, auth-aware client (no hardcoded hosts), gates protected pages with a real route guard fed by a server-verified session, never crashes to a white screen, and ships a code-split bundle within a fixed budget with an accessibility baseline. User-facing state comes from a cache, not ad-hoc `fetch` + `useState`.

**Where the repo is now.** Every network call is a raw `fetch("http://127.0.0.1:8000/...")` — 29 of them across `frontend/src` — with no shared client, so the app cannot be built for any environment but a dev laptop. There is no auth context: pages read `JSON.parse(localStorage.getItem("user"))` inline and self-gate with `alert("Please login first.")` (e.g. `productSection/productCard.jsx:13-18`), and `App.jsx` wires ~20 routes with zero guards, no `<ErrorBoundary>`, no catch-all `*` route, and no `React.lazy`. There are 55 `alert()` and 30 `console.log` calls, and the New Arrivals page renders a hardcoded fixture (`assets/data/newArrivals.js`) whose synthetic ids 1-4 are POSTed straight to the live `/cart` endpoint via `productCard.jsx:handleAddToCart`, corrupting real carts.

**Gaps to close**
- **[P0]** No API base-URL config; 29 hardcoded `http://127.0.0.1:8000` fetches — un-deployable — `productCard.jsx:23`, all of `assets/pages/**`
- **[P0]** Fixture data wired to the live mutation endpoint — `assets/data/newArrivals.js` → `NewArrivals.jsx:23` → `productCard.jsx:23`
- **[P1]** Identity read from `localStorage` per-page; no `AuthContext`, no `/auth/me` bootstrap (depends on backend auth — see §2)
- **[P1]** No route guard; `App.jsx` routes are all public; gating is per-page `alert()`
- **[P1]** No `401` handling — an expired session shows a random broken page, not a redirect to `/login`
- **[P1]** No error boundary and no `*`/404 route in `App.jsx` — an uncaught render error or bad URL yields a blank page
- **[P2]** No server-state cache; hand-rolled `fetch`+`useState`+`useEffect` in every page (no dedupe, retry, or loading/error contract)
- **[P2]** 55 `alert()` + 30 `console.log` as the UX and logging layer
- **[P2]** No code splitting (`React.lazy`) — one monolithic bundle; no bundle budget in CI
- **[P3]** No accessibility baseline (icon-only buttons like `productCard.jsx` "Add to Cart" lack labels; no eslint-plugin-jsx-a11y)

**Implementation**

1. **One API client keyed off `VITE_API_URL`.** Create `frontend/src/lib/api.js`. It centralizes the base URL, JSON handling, credentials, and a `401` interceptor. Add `frontend/.env.example` with `VITE_API_URL=http://127.0.0.1:8000` and read it via `import.meta.env`.

```js
// frontend/src/lib/api.js
const BASE_URL = import.meta.env.VITE_API_URL;
if (!BASE_URL) throw new Error("VITE_API_URL is not set (see .env.example)");

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

// Callers subscribe (AuthContext) to react to forced logout on 401.
const unauthorizedHandlers = new Set();
export function onUnauthorized(fn) {
  unauthorizedHandlers.add(fn);
  return () => unauthorizedHandlers.delete(fn);
}

export async function api(path, { method = "GET", body, signal } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: "include", // send the auth cookie set by §2
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (res.status === 401) {
    unauthorizedHandlers.forEach((fn) => fn());
    throw new ApiError("Unauthorized", 401);
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.detail || res.statusText, res.status, data?.detail);
  }
  return data;
}

export const get = (p, o) => api(p, o);
export const post = (p, body, o) => api(p, { ...o, method: "POST", body });
export const put = (p, body, o) => api(p, { ...o, method: "PUT", body });
export const del = (p, o) => api(p, { ...o, method: "DELETE" });
```

Then codemod all 29 call sites. `productCard.jsx` becomes:

```js
import { post } from "../lib/api";
// ...
await post("/cart", { product_id: product.id, quantity: 1 });
// user_id is dropped: the server derives identity from the session (§2), not the body.
```

2. **AuthContext bootstrapped from `/auth/me`.** Replace every inline `localStorage.getItem("user")` with a context that verifies the session server-side on mount and wires the `401` interceptor to a forced logout. (The `/auth/me` route and cookie session are owned by §2 — this consumes them.)

```jsx
// frontend/src/auth/AuthContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { get, post, onUnauthorized } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | authed | anon

  const bootstrap = useCallback(async () => {
    try {
      setUser(await get("/auth/me"));
      setStatus("authed");
    } catch {
      setUser(null);
      setStatus("anon");
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);
  useEffect(() => onUnauthorized(() => { setUser(null); setStatus("anon"); }), []);

  const login = async (creds) => { setUser(await post("/auth/login", creds)); setStatus("authed"); };
  const logout = async () => { await post("/auth/logout"); setUser(null); setStatus("anon"); };

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

3. **A real `<ProtectedRoute>`** replacing per-page `alert("Please login")`. Supports role checks for the seller pages.

```jsx
// frontend/src/auth/ProtectedRoute.jsx
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ role }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <div className="route-spinner" role="status" aria-live="polite">Loading…</div>;
  if (status === "anon") return <Navigate to="/login" replace state={{ from: location }} />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}
```

4. **Router: providers, lazy pages, guards, error boundary, 404.** Rewrite `App.jsx` and `main.jsx`.

```jsx
// frontend/src/App.jsx
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { CartProvider } from "./cartContext/CartContext";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import ChatBot from "./assets/components/chatbot/ChatBot";

const Home = lazy(() => import("./assets/pages/Home/Home"));
const Login = lazy(() => import("./assets/pages/auth/login/Login"));
const Signup = lazy(() => import("./assets/pages/auth/signup/Signup"));
const Cart = lazy(() => import("./assets/pages/cart/Cart"));
const CheckOut = lazy(() => import("./assets/pages/checkout/CheckOut"));
const Account = lazy(() => import("./assets/pages/auth/account/Account"));
const CustomerDashboard = lazy(() => import("./assets/pages/customer/CustomerDashboard"));
const SellerDashboard = lazy(() => import("./assets/pages/seller/SellerDashboard"));
const AddProduct = lazy(() => import("./assets/pages/seller/AddProduct"));
const SellerProducts = lazy(() => import("./assets/pages/seller/Products"));
const SellerOrders = lazy(() => import("./assets/pages/seller/SellerOrders"));
const EditProduct = lazy(() => import("./assets/pages/seller/EditProduct"));
const ProductDetails = lazy(() => import("./assets/pages/productDetails/ProductDetails"));
const CategoryProducts = lazy(() => import("./assets/pages/categoryProducts/CategoryProducts"));
const SearchResults = lazy(() => import("./assets/pages/searchResults/SearchResults"));
const NotFound = lazy(() => import("./assets/pages/notFound/NotFound"));

function Fallback({ error }) {
  return (
    <div role="alert" style={{ padding: 40 }}>
      <h1>Something went wrong.</h1>
      <button onClick={() => window.location.assign("/")}>Go home</button>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={Fallback}>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Suspense fallback={<div className="route-spinner" role="status">Loading…</div>}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/category/:id" element={<CategoryProducts />} />
                <Route path="/search" element={<SearchResults />} />

                {/* Any logged-in user */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<CheckOut />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/customer-dashboard" element={<CustomerDashboard />} />
                </Route>

                {/* Seller-only */}
                <Route element={<ProtectedRoute role="seller" />}>
                  <Route path="/seller-dashboard" element={<SellerDashboard />} />
                  <Route path="/seller/products" element={<SellerProducts />} />
                  <Route path="/seller/add-product" element={<AddProduct />} />
                  <Route path="/seller/orders" element={<SellerOrders />} />
                  <Route path="/seller/edit-product/:id" element={<EditProduct />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
              <ChatBot />
            </Suspense>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
```

5. **TanStack Query for server state.** Mount `QueryClientProvider` in `main.jsx` and replace hand-rolled `fetch`+`useEffect` reads. Mutations invalidate the affected cache key instead of `alert()`-ing and manually refetching (this also removes `CartContext`'s `refreshCart()` plumbing).

```jsx
// frontend/src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
```

```jsx
// Add-to-cart, cache-driven (no alert, no manual refresh):
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post } from "../lib/api";
import { toast } from "../lib/toast"; // small non-blocking toast, replaces alert()

const qc = useQueryClient();
const addToCart = useMutation({
  mutationFn: (product) => post("/cart", { product_id: product.id, quantity: 1 }),
  onSuccess: () => { qc.invalidateQueries({ queryKey: ["cart"] }); toast.success("Added to cart"); },
  onError: (e) => toast.error(e.detail ?? "Could not add to cart"),
});
```

6. **Delete the fixture-to-cart wiring.** Remove `assets/data/newArrivals.js` and rewrite `NewArrivals.jsx` to fetch real products so no synthetic id ever reaches `/cart`:

```jsx
// frontend/src/assets/pages/newArrivals/NewArrivals.jsx
import { useQuery } from "@tanstack/react-query";
import { get } from "../../../lib/api";
import ProductCard from "../../../productSection/productCard";

export default function NewArrivals() {
  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ["products", "new-arrivals"],
    queryFn: () => get("/products?sort=created_desc&limit=12"),
  });
  if (isLoading) return <p role="status">Loading…</p>;
  if (isError) return <p role="alert">Couldn't load new arrivals.</p>;
  return products.map((p) => <ProductCard key={p.id} product={p} />);
}
```

7. **Kill `alert`/`console.log`; add a11y + bundle budget in CI.** Replace all 55 `alert()` with the toast helper and delete all 30 `console.log`; enforce with eslint (`no-alert`, `no-console`) and `eslint-plugin-jsx-a11y`, and fail the build if the JS bundle exceeds budget.

```js
// frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 250, // kB — warn early
    rollupOptions: {
      output: {
        manualChunks: { vendor: ["react", "react-dom", "react-router-dom", "@tanstack/react-query"] },
      },
    },
  },
});
```

```yaml
# .github/workflows/frontend.yml (excerpt — CI wiring lives in §9)
- run: npm ci --prefix frontend
- run: npm run --prefix frontend lint       # no-alert, no-console, jsx-a11y must pass
- run: npm run --prefix frontend build
- name: Enforce bundle budget
  run: |
    MAX=350000  # 350 kB gzipped main entry
    node -e "const {gzipSync}=require('zlib'),fs=require('fs'),p=require('path');
      const dir='frontend/dist/assets';
      const main=fs.readdirSync(dir).filter(f=>f.startsWith('index')&&f.endsWith('.js'));
      const b=gzipSync(fs.readFileSync(p.join(dir,main[0]))).length;
      console.log('main gzip',b);
      if(b>${'$'}{process.env.MAX})process.exit(1);"
  env: { MAX: 350000 }
```

**Definition of done (verifiable)**
- [ ] `grep -rn "127.0.0.1:8000" frontend/src` returns 0 matches; app builds and runs against a `VITE_API_URL` pointing at staging
- [ ] `grep -rn "alert(" frontend/src` and `grep -rn "console.log" frontend/src` both return 0; eslint `no-alert`/`no-console` are errors and CI is green
- [ ] Navigating to `/seller/orders` while logged out redirects to `/login`; while logged in as a customer redirects to `/`; an unknown URL renders the `*` NotFound page
- [ ] A forced `401` from the API (expired session) redirects the user to `/login` via the interceptor without a blank page
- [ ] Throwing inside any page renders the `<ErrorBoundary>` fallback, not a white screen
- [ ] `assets/data/newArrivals.js` no longer exists; New Arrivals renders `/products` data and Add-to-Cart only ever posts real product ids
- [ ] Network tab shows lazy route chunks loading on navigation; CI bundle-budget step fails if the main entry exceeds 350 kB gzipped
- [ ] `eslint-plugin-jsx-a11y` passes with icon-only controls (e.g. Add-to-Cart) carrying `aria-label`

**Effort:** 4-6 days · **Launch gate:** Recommended before launch (the `<ProtectedRoute>`/AuthContext work is inert until backend auth in §2 lands — coordinate; client-side guards are UX, never a security boundary).

---

## 10. Performance, scale & resilience

**Production goal.** Every request completes or fails fast under a bounded resource budget: outbound calls to Groq and Pexels have timeouts, retries, and a fallback so a slow third party can't pin the whole app; hot reads are cached and invalidated correctly; sync DB workers and the connection pool are sized to each other; and pagination can't be used to pull the whole table. A published load test proves the target throughput.

**Where the repo is now.** Both outbound integrations are unbounded: `pexels.py:23` calls `requests.get` with no `timeout`, and `chatbot_service.py:86` calls the Groq client with no `timeout`/`max_retries`, so either service hanging stalls a worker thread indefinitely. `database.py:7` creates the engine with zero pool arguments (default `QueuePool` = 5 + 10 overflow = 15 connections) while all handlers are sync `def` and run in Starlette's 40-token AnyIO threadpool — 40 workers contend for 15 connections. `cancel_order` runs an N+1 loop (`orders.py:186-188`, one `SELECT` per line item). `/products` caps `limit` at `ge=1` with no upper bound (`product.py:52`); `/products/search`, `/categories`, and category products return `.all()` with no limit. There is no caching layer and no load test.

**Gaps to close**
- **[P0]** No timeout on Pexels — one hung request pins a thread forever — `pexels.py:23`
- **[P0]** No timeout/retry on Groq; `/chatbot` blocks a sync worker for the full LLM latency — `chatbot_service.py:86`, `chatbot.py:19`
- **[P0]** Threadpool (40) oversubscribes the DB pool (15); under load requests block on `pool_timeout` (30s default) then 500 — `database.py:7`
- **[P1]** N+1 in the cancel loop — `orders.py:184-193`
- **[P1]** Unbounded pagination / `.all()` on product & category reads — `product.py:52,78,89`, `categories.py:50,96-100`
- **[P1]** No graceful degradation when Groq or Pexels is down (Pexels already returns a dead `via.placeholder.com` URL — `pexels.py:36`)
- **[P2]** No caching for `/categories` and hot product reads — `categories.py:45`, `product.py:97`
- **[P2]** No load-test harness or documented capacity target
- Rate limiting / metering `/chatbot` belongs to the rate-limiting section; observability of pool saturation belongs to the observability section.

**Implementation**

1. **Bound and retry the Pexels call with httpx + tenacity, with a real fallback.** Replace the `requests` call in `pexels.py`:
```python
# app/utils/pexels.py
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

_TIMEOUT = httpx.Timeout(connect=3.0, read=5.0, write=5.0, pool=5.0)
_client = httpx.Client(timeout=_TIMEOUT)  # module-level: reuse connections
PLACEHOLDER = "/static/product-placeholder.png"  # ship a real local asset

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.5, max=4),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.TransportError)),
    reraise=True,
)
def _search(query: str) -> httpx.Response:
    return _client.get(
        "https://api.pexels.com/v1/search",
        headers={"Authorization": PEXELS_API_KEY},
        params={"query": query, "per_page": 1},
    )

def get_product_image(query: str) -> str:
    try:
        resp = _search(query)
        resp.raise_for_status()
        photos = resp.json().get("photos") or []
        return photos[0]["src"]["large"] if photos else PLACEHOLDER
    except (httpx.HTTPError, KeyError, ValueError):
        return PLACEHOLDER  # seeder degrades to placeholder, never hangs
```

2. **Bound and retry Groq, and stop blocking the worker.** The OpenAI SDK (Groq base URL) takes `timeout` and `max_retries` directly. Configure the client once and offload the blocking call so the request thread isn't held for the full generation:
```python
# app/services/chatbot_service.py
import httpx
from openai import OpenAI, APITimeoutError, APIConnectionError, APIStatusError

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
    timeout=httpx.Timeout(connect=3.0, read=20.0, write=5.0, pool=5.0),
    max_retries=2,  # SDK retries 429/5xx/timeout with backoff
)

FALLBACK = "Our assistant is briefly unavailable — please browse products directly or try again shortly."

def ask_ai(message: str, products) -> str:
    context = build_product_context(products)
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.4,
            messages=[
                {"role": "system", "content": f"...{context}..."},
                {"role": "user", "content": message},
            ],
        )
        return response.choices[0].message.content
    except (APITimeoutError, APIConnectionError, APIStatusError):
        return FALLBACK  # graceful degradation, HTTP 200 with a usable reply
```
```python
# app/routes/chatbot.py — offload the sync SDK call off the request path
from starlette.concurrency import run_in_threadpool

@router.post("")
async def chatbot(request: ChatRequest, db: Session = Depends(get_db)):
    products = search_products(db, request.message)          # DB, fast
    reply = await run_in_threadpool(ask_ai, request.message, products)
    return {"reply": reply}
```
(The `Product.category.ilike` 500 in `search_products` is a correctness bug owned by another section — must be fixed for `/chatbot` to return anything at all.)

3. **Size the threadpool to the connection pool.** With sync handlers, concurrency is `min(threadpool_tokens, pool_size + max_overflow)`. Set both explicitly and add `pool_pre_ping` + a short `pool_timeout` so a saturated pool fails fast instead of hanging:
```python
# app/database.py
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=10,        # 30 connections/worker ceiling
    pool_timeout=5,         # fail in 5s, don't block 30s under load
    pool_pre_ping=True,     # drop dead conns (idle-timeout, restart)
    pool_recycle=1800,
)
```
```python
# app/main.py — cap the AnyIO threadpool to match the pool
import anyio
@app.on_event("startup")
def _tune_threadpool():
    anyio.to_thread.current_default_thread_limiter().total_tokens = 30
```
**Capacity note:** with Gunicorn/Uvicorn workers, total DB connections = `workers × 30`. Postgres default `max_connections` is 100, so cap at ~3 workers against a default DB, or raise `max_connections` / put PgBouncer in front. Document the chosen worker count alongside your runtime/server configuration.

4. **Kill the N+1 in `cancel_order`.** Restock every line item with two set-based statements instead of a query-per-item:
```python
# app/routes/orders.py — cancel_order
from sqlalchemy import update
order_items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
for item in order_items:
    db.execute(
        update(Product)
        .where(Product.id == item.product_id)
        .values(stock=Product.stock + item.quantity)  # atomic increment
    )
db.query(OrderItem).filter(OrderItem.order_id == order_id).delete(synchronize_session=False)
db.delete(order)
db.commit()
```

5. **Put an upper bound on every list endpoint.** Add `le=100` and make `.all()` reads paginated:
```python
# app/routes/product.py
def get_products(page: int = Query(1, ge=1),
                 limit: int = Query(12, ge=1, le=100),   # hard ceiling
                 db: Session = Depends(get_db)): ...

def search_products(keyword: str = Query(..., min_length=1, max_length=100),
                    limit: int = Query(20, ge=1, le=100),
                    db: Session = Depends(get_db)):
    return db.query(Product).filter(Product.name.ilike(f"%{keyword}%")).limit(limit).all()
```
Apply the same `.limit()` to `categories.py:96-100` (products-by-category). `/categories` itself (`categories.py:50`) is small and bounded by cache in step 6.

6. **Cache `/categories` and single-product reads with explicit invalidation.** Categories change rarely; products change on write. Cache-aside with Redis:
```python
# app/cache.py
import json, redis
r = redis.Redis.from_url(os.getenv("REDIS_URL"), socket_timeout=1, decode_responses=True)

# app/routes/categories.py
@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    if (hit := r.get("categories:all")):
        return json.loads(hit)
    data = [{"id": c.id, "name": c.name} for c in db.query(Category).all()]
    r.set("categories:all", json.dumps(data), ex=300)   # 5-min TTL as a safety net
    return data
# on create_category(): r.delete("categories:all")
```
```python
# app/routes/product.py — invalidate on write
def _bust(pid: int): r.delete(f"product:{pid}")
# get_product: check r.get(f"product:{pid}") first, set with ex=60
# update_product / delete_product: call _bust(product_id) after commit
```
Redis failing must not break reads: wrap `r.get`/`r.set` so a `redis.RedisError` (or the 1s socket timeout) falls through to the DB.

7. **Load-test harness (k6) with a documented target.** Commit `loadtest/eshop.js` and a target SLO (e.g. p95 < 300ms for reads, < 800ms for `/orders`, at 100 RPS):
```javascript
// loadtest/eshop.js — run: k6 run -e BASE=http://127.0.0.1:8000 loadtest/eshop.js
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  scenarios: { browse: { executor: 'ramping-vus',
    stages: [{duration:'1m',target:50},{duration:'3m',target:100},{duration:'1m',target:0}] } },
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<300'] },
};
export default function () {
  const b = __ENV.BASE;
  check(http.get(`${b}/products?page=1&limit=12`), { '200': r => r.status === 200 });
  check(http.get(`${b}/categories`), { '200': r => r.status === 200 });
  sleep(1);
}
```
Add a separate low-VU scenario for `/chatbot` (LLM latency dominates) so it doesn't drown the read thresholds.

**Definition of done (verifiable)**
- [ ] `grep -rn "requests.get\|\.create(" backend/app/utils backend/app/services` shows every outbound call carries an explicit timeout; killing Pexels/Groq (block the host) returns a fallback within the read timeout, not a hang.
- [ ] `/chatbot` handler is `async` and offloads the SDK call; a `time` on a request with Groq stubbed to sleep 30s does not block concurrent `/products` requests.
- [ ] Engine sets `pool_size`/`max_overflow`/`pool_timeout`; the AnyIO threadpool token count ≤ pool capacity; a k6 spike to 100 VUs produces zero `QueuePool limit ... connection timed out` errors in logs.
- [ ] `cancel_order` issues a constant number of SQL statements regardless of line-item count (verify with SQLAlchemy echo or query counter in a test).
- [ ] Every list endpoint rejects `limit=101` with 422; no route returns an unbounded `.all()` over products.
- [ ] `/categories` and `/products/{id}` served from Redis on repeat calls; a product update is reflected on the next read (invalidation test); Redis down still serves from DB.
- [ ] `k6 run loadtest/eshop.js` passes the committed thresholds; results and chosen worker/pool numbers recorded in the repo.

**Effort:** 4-6 days · **Launch gate:** Recommended before launch (timeouts + pool sizing in steps 1-3 are BLOCKING; caching and the load test are hardening)

---

## 11. Security posture, privacy & data lifecycle

**Production goal.** No sign-in, checkout, or chatbot call ever traverses plaintext HTTP; every dependency and commit is scanned for CVEs and secrets on each push; and the app can honor a GDPR/CCPA data-export or deletion request and delete/retain data on a written policy — with a documented go/no-go checklist that must be all-green before launch.

**Where the repo is now.** Nothing here exists: the frontend posts credentials to `http://127.0.0.1:8000` in 29 hardcoded fetches (e.g. `Login.jsx`, `Signup.jsx`) over cleartext; a real dev DB password is committed at `ea57228:backend/.env` and `config.py:8` prints `DATABASE_URL` to stdout; there is no dependency manifest, no CI, no secret scan. There is no way to export or delete a user's data (no such routes among the ~27), no retention policy, and `chatbot_service.py:86` streams user messages plus the product catalog to Groq with zero disclosure to the user. This section is the consolidated pre-launch security sign-off — auth (§2), password hashing (§1), transport/CORS/headers (§5/§6), rate limiting (§9), and secrets management (§10) are owned elsewhere and only gated here, not re-specified.

**Gaps to close**
- **[P0]** Passwords and all traffic sent over `http://` — `Login.jsx`, `Signup.jsx`, `CheckOut.jsx` (TLS enforcement + HSTS is §5; this section gates it).
- **[P0]** Live secret in git history (`ea57228:backend/.env`) and printed at runtime (`config.py:8`) — must be rotated and scanned-for on every push.
- **[P0]** No dependency-vulnerability scanning (no backend manifest at all; `frontend/package.json` unscanned) — CVEs ship blind.
- **[P0]** No GDPR/CCPA data-subject rights: no account-deletion or data-export endpoint anywhere.
- **[P1]** No PII inventory; unknown what personal data lives where (`models/user.py`, `models/orders.py`, discarded checkout address at `CheckOut.jsx:160`).
- **[P1]** No privacy notice that `/chatbot` sends user input + catalog to a third party (Groq) — `chatbot_service.py:86`.
- **[P1]** No data-retention policy — orders, chat logs, and users kept forever by default.
- **[P2]** `/docs` & `/openapi.json` public expose the full attack surface to scanners (hardening in §6; listed on the checklist).

**Implementation**

1. **Secret scanning + dependency + secret gate in CI (blocking merge).** Add `.github/workflows/security.yml`. This assumes §10 has produced `backend/requirements.txt` (or a `uv`/`pyproject` lock); until then `pip-audit` runs against the resolved venv.

```yaml
name: security
on: [push, pull_request]
permissions:
  contents: read
jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }        # full history so ea57228 .env is caught
      - uses: gitleaks/gitleaks-action@v2
        env: { GITLEAKS_CONFIG: .gitleaks.toml }
  py-deps:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install pip-audit==2.10
      - run: pip-audit -r backend/requirements.txt --strict --desc
  js-deps:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22" }
      - run: npm ci --prefix frontend
      - run: npm audit --prefix frontend --audit-level=high
```

`.gitleaks.toml` — extend the default ruleset and confirm the historical `.env` is flagged, not allowlisted:

```toml
[extend]
useDefault = true
[[rules]]
id = "eshop-db-url"
regex = '''postgres(?:ql)?:\/\/[^\s:@]+:[^\s:@]+@'''
description = "DATABASE_URL with inline password"
```

2. **Rotate the leaked credential and stop printing it.** The password at `ea57228:backend/.env` must be treated as compromised: rotate the Postgres role now (history rewrite alone is insufficient — assume it was cloned). Delete the print in `config.py:8`:

```python
# config.py — REMOVE this line:
# print(DATABASE_URL)
import structlog
log = structlog.get_logger()
log.info("db_configured", host=make_url(DATABASE_URL).host)  # host only, never password
```

3. **PII inventory (checked-in doc + data-map).** Create `docs/pii-inventory.md` enumerating every personal field, its store, lawful basis, and retention — this drives steps 4–6.

| Data | Location | Category | Retention |
|---|---|---|---|
| email, name | `users` (`models/user.py`) | Identity | Life of account + 30d |
| password | `users.password` (plaintext today — §1) | Credential | Hashed at rest; never exported |
| order + line items | `orders`, `order_items` | Transaction | 7 yrs (tax), then purge |
| shipping address | not yet stored (`CheckOut.jsx:160` discards it) | Address | add column in §checkout; 7 yrs |
| chat messages | sent to Groq, not persisted | Content | not stored locally; Groq per their DPA |

4. **Account deletion + data export endpoints (GDPR Art. 15 & 17 / CCPA).** New `backend/routes/privacy.py`, mounted in `main.py`. These MUST sit behind the real auth from §2 — the current client-supplied `user_id` cannot gate deletion, so they stay disabled until §2 lands. Export returns everything the PII inventory lists; deletion anonymizes orders (retained for tax) and hard-deletes identity.

```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import current_user          # from §2 — verified JWT subject
from ..models.user import User
from ..models.orders import Order

router = APIRouter(prefix="/me", tags=["privacy"])

@router.get("/export")
def export_my_data(user: User = Depends(current_user), db: Session = Depends(get_db)):
    orders = db.query(Order).filter(Order.user_id == user.id).all()
    payload = {
        "identity": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
        "orders": [{"id": o.id, "total": o.total, "created_at": str(o.created_at),
                    "items": [{"product_id": i.product_id, "quantity": i.quantity,
                               "price": i.price} for i in o.items]} for o in orders],
        "note": "Chat messages are not stored by E-Shop; see privacy notice re: Groq.",
    }
    return JSONResponse(payload, headers={
        "Content-Disposition": 'attachment; filename="eshop-export.json"'})

@router.delete("/account", status_code=204)
def delete_my_account(user: User = Depends(current_user), db: Session = Depends(get_db)):
    # Anonymize retained financial records (7-yr tax hold) instead of orphaning FKs.
    db.query(Order).filter(Order.user_id == user.id).update(
        {Order.user_id: None}, synchronize_session=False)   # requires user_id nullable
    db.delete(user)
    db.commit()
    return  # 204
```

5. **Chatbot third-party privacy notice (in-product + policy).** `/chatbot` sends user text and catalog to Groq (`chatbot_service.py:86`). Add a one-time disclosure the user must see before first use, and log consent:

```jsx
// ChatBot.jsx — render above the input, once per session
const [ack, setAck] = useState(() => localStorage.getItem("chatbot_privacy_ack") === "1");
{!ack && (
  <div className="chatbot-notice" role="note">
    Messages you send here are processed by Groq (a third-party AI provider) to
    generate replies. Do not share passwords or payment details.{" "}
    <button onClick={() => { localStorage.setItem("chatbot_privacy_ack", "1"); setAck(true); }}>
      Got it
    </button>
  </div>
)}
```

6. **Written retention + TLS enforcement, verified.** Retention rules from step 3 become a scheduled purge (owned by ops; one line here: cron `DELETE FROM orders WHERE user_id IS NULL AND created_at < now() - interval '7 years'`). TLS is enforced in §5 (HSTS + redirect); this section only verifies it: after §5, every hardcoded `http://127.0.0.1:8000` in the 29 frontend fetches must be replaced by a `VITE_API_BASE_URL` that is `https://` in production builds.

**Go / no-go security checklist** (all must be checked to launch):

```
[ ] §1  Passwords hashed with argon2 — no plaintext in DB or logs
[ ] §2  All non-public routes require a verified token; identity not client-supplied
[ ] §5  HTTPS enforced end-to-end; HSTS on; no http:// in prod frontend build
[ ] §6  Security headers present; /docs & /openapi.json gated in prod
[ ] §9  Rate limiting on /login, /signup, /chatbot
[ ] §10 Leaked ea57228 .env password ROTATED; no secrets in env output
[ ] §13 gitleaks, pip-audit, npm audit all green in CI and required for merge
[ ] §13 /me/export and /me/account (delete) live behind auth and tested
[ ] §13 PII inventory doc committed and matches schema
[ ] §13 Chatbot Groq disclosure shown before first use
[ ] §13 Retention purge job scheduled and dry-run verified
```

**Definition of done (verifiable)**
- [ ] Pushing a commit containing a fake `postgres://u:p@host` string fails the `secret-scan` job; the workflow is a required status check on `main`.
- [ ] `pip-audit -r backend/requirements.txt --strict` and `npm audit --audit-level=high` both exit 0 in CI.
- [ ] The leaked DB role from `ea57228` no longer authenticates; `config.py` prints no credential (`grep -r "print(DATABASE_URL)" backend/` is empty).
- [ ] `GET /me/export` with a valid token returns the caller's identity + orders as a downloadable JSON and 401s without a token.
- [ ] `DELETE /me/account` removes the user row, nulls their `orders.user_id`, and a subsequent login fails — proven by a pytest test.
- [ ] `docs/pii-inventory.md` exists and every column it lists is present in the actual models (and vice versa).
- [ ] First `/chatbot` open in a clean browser shows the Groq disclosure before any request is sent.
- [ ] No occurrence of `http://127.0.0.1:8000` remains in a production frontend build (`grep -r "http://127.0.0.1" frontend/dist` is empty).

**Effort:** 4-6 days (gates + endpoints ~2d; PII/retention/notice ~1-2d; blocked on §2 auth for the deletion/export gate) · **Launch gate:** BLOCKING
