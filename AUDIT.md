# E-Shop — Development Audit

**Date:** 2026-08-05 · **Commit:** `b244e39` · **Scope:** entire repository, every source file read in full.

This is a *development* audit, not just a security review. It answers three questions for every file: **what it is**, **what's wrong with it** (with `file:line` evidence), and **what it can be**. Part I is the synthesis — the verdict, the root causes, the scorecard, and the improvement roadmap. Part II is the file-by-file record. Nothing here was changed in the codebase; this is an assessment.

## How this was produced

Thirteen reviewer agents read the repository in parallel, each owning a cohesive set of files and reading them line by line. Their findings were consolidated verbatim into Part II and cross-checked against a full re-read. **138 tracked files** were catalogued (Appendix A); **66 active source files** were audited in depth. Over **320 file-level findings** were logged. That number is deliberately un-deduplicated — the same root cause surfaces in many files, and seeing it recur *is* the point. The Root-Cause Map below collapses them.

CSS is inventoried but not line-audited, except the near-empty and dead stylesheets, which §13 covers. Backend dependencies could not be installed in this environment (there is no manifest to install from — that is itself finding **RC-8**), so backend findings are by inspection, not runtime.

---

# Part I — Synthesis

## 1. One-paragraph verdict

E-Shop is a competently *laid-out* but fundamentally *unfinished* full-stack e-commerce app. The structure is readable and the feature surface is broad — catalog, cart, orders, seller tools, an LLM chatbot — but the load-bearing engineering is missing: **there is no authentication anywhere, passwords are stored in plaintext, and the server trusts a `user_id` the browser supplies**, so the entire dataset is readable and writable by anyone. Underneath that sit a dozen systemic gaps — no tests, no migrations, no dependency manifest, no rate limiting, money stored as floating point, a checkout that discards the shipping address, and a chatbot query that throws on every call. It reads like a capable developer's portfolio project that got to "the screens work on my machine" and stopped before the parts that don't show up in a demo. The good news is that the flaws are *structural and finite*, not scattered rot: fixing the six root causes below repairs most of the 320 findings at once.

## 2. Health scorecard

| Area | Grade | Why |
|---|:--:|---|
| **Architecture & layout** | C | Clean per-domain file split and a proper `get_db` dependency, but all logic lives in route handlers, no service/repository layer, and half the ORM relationships are hand-joined. |
| **Security** | F | No auth, plaintext passwords, client-supplied identity, self-assigned `admin` role, no rate limiting, DB password printed to logs. |
| **Data integrity** | D− | No migrations, no FK indexes, money as `Float`, non-atomic order writes, an oversell race, `seller_id` with no foreign key. |
| **Frontend** | D+ | Functional and readable, but no route guards, no data-fetch layer, 55 `alert()`s, fixture data wired to the live cart, `category`/`rating` rendered from fields the API never returns. |
| **Correctness** | D | Chatbot 500s on every message, checkout drops the address, `OrderSuccess` hardcodes the order number, New Arrivals adds the wrong product to cart. |
| **Testing & CI** | F | Zero tests, zero CI, `test_db.py` is a print script. |
| **Ops & DX** | F | No README, no `.env.example`, no dependency manifest, no Docker; the app does not start from a clean clone. |
| **Code hygiene** | C− | 12 empty stub files, 12 dead duplicate files, a tracked `.pyc`, 30 `console.log`s, typo'd filenames. |

## 3. Root-Cause Map — the 320 findings collapse to these

Fix these eight and the long tail mostly evaporates. Ordered by how much they hurt.

| # | Root cause | Severity | Files where it surfaces (sample) | The fix, in one line |
|---|---|:--:|---|---|
| **RC-1** | **No authentication; identity is a client-supplied `user_id`.** No token is ever issued or verified. | **P0** | every route file; `Login.jsx`, `CartContext.jsx`, `productCard.jsx:34`, `CheckOut.jsx:161`, all seller pages | Issue a JWT on login; add a `get_current_user` dependency; derive identity from the token, never the body. |
| **RC-2** | **Passwords stored & compared in plaintext.** | **P0** | `account.py:33,64`, `models/user.py:14`, `seed_users.py:19` | Hash with `argon2-cffi`; verify with constant-time compare. |
| **RC-3** | **No per-object authorization (IDOR everywhere).** Ownership is never in the query. | **P0** | `cart.py:115`, `orders.py:164`, `product.py:127,156`, `orders.py:249` | Put `.filter(... owner_id == user.id)` in every by-id query; 404 on miss. |
| **RC-4** | **Self-assigned role incl. `admin`.** `role` is an unvalidated string. | **P0** | `schemas/user.py:9`, `account.py:34`, `Signup.jsx:240` | Make role an enum of `customer`/`seller`; never accept `admin` from a client. |
| **RC-5** | **No dependency manifest / README / migrations.** App can't be installed, schema can't evolve. | **P1** | `backend/` (no `pyproject.toml`), `main.py:20` `create_all`, no `seed_categories` | `uv init`; write a README; adopt Alembic; add a category seeder. |
| **RC-6** | **Order write path is unsafe.** Non-atomic (two commits), oversell race, address discarded, money as float. | **P1** | `orders.py:52-71`, `orders.py:38/67`, `CheckOut.jsx:160`, `models/orders.py:19` | One transaction + `with_for_update`; persist address; `Numeric(12,2)`. |
| **RC-7** | **No guardrails.** No rate limiting, no outbound timeouts, no input caps, `/chatbot` open & unmetered. | **P1** | `chatbot.py:18`, `pexels.py:23`, `schemas/*` (no `Field`) | `slowapi`+Redis; `timeout=` on every call; `Field()` bounds; cap chatbot input. |
| **RC-8** | **Fixture data mixed with live API.** Hardcoded ids POSTed to the real `/cart`; phantom `category`/`rating` fields. | **P1** | `newArrivals.js:4` (live!), `FlashSale.jsx:5`, `productCard.jsx:95,109`, `products.js` | Source every card from the API; delete fixtures; normalize the product shape. |

## 4. The distinct P0/P1 defects worth naming

Stripped of duplication, these are the things that would actually cause an incident:

1. **Total data exposure (RC-1+RC-3).** `curl /orders/1`, `/orders/2`… returns every customer's order history with no credential. Combined with RC-2, a single DB read yields real passwords users reuse elsewhere.
2. **Marketplace sabotage (RC-3).** Any anonymous caller can `DELETE /products/{id}` for a competitor, `PUT` their prices to `0.01`, or `DELETE /orders/{id}` to erase orders — all hard deletes, no audit trail.
3. **Privilege escalation (RC-4).** `POST /signup {"role":"admin"}` succeeds. `Login.jsx:44` already routes on `admin`, so the next admin feature ships pre-compromised.
4. **Unfulfillable orders (RC-6).** `CheckOut.jsx` collects a full address and sends only `{user_id}`; `Order` has no address column. No order placed through the UI can be shipped.
5. **Corrupted orders under load (RC-6).** Two commits with no transaction leave orders with zero line items on any mid-write failure; the stock check/decrement race oversells.
6. **The chatbot is broken and is an open wallet (RC-7).** `chatbot_service.py:49` calls `.ilike()` on `Product.category`, a *relationship* — every message 500s. The endpoint is also unauthenticated and unmetered, so it is a one-loop path to draining the Groq bill and the worker threadpool.
7. **New Arrivals adds the wrong product (RC-8).** `newArrivals.js` fixture id `1` is POSTed to `/cart` as `product_id: 1`, storing whatever real DB row #1 happens to be. This is live and user-facing today.
8. **Credentials in logs & history.** `config.py:8` prints the DB URL (password included) on every boot; a dev DB password sits in git history at `ea57228:backend/.env`.

## 5. What's genuinely good — keep these

Said sincerely; several are things larger codebases get wrong:

- **No SQL injection.** Every filter is a bound SQLAlchemy expression, including the `ilike(f"%{kw}%")` that people usually get wrong (`product.py:87`).
- **No XSS surface.** No `dangerouslySetInnerHTML`, no user-controlled `href`, no `target="_blank"` — React's escaping is doing its job.
- **Sync handlers, not fake-async.** Every route is sync `def`, so FastAPI offloads to the threadpool and the event loop is never blocked — the *correct* choice with a sync driver, and commonly gotten backwards.
- **CORS is a real allowlist**, not `["*"]` paired with credentials.
- **Route order is correct** — `/products/count` and `/products/search` precede `/products/{id}`; the classic shadowing bug is absent.
- **`/login` hand-picks its response fields** (`account.py:70`) rather than dumping the user model — the one thing keeping plaintext passwords off the wire.
- **Timestamps are `DateTime(timezone=True)` with `server_default=func.now()`** — timezone-aware and DB-generated.
- **`get_db` is a proper generator dependency** with `finally: db.close()`.
- **Readable, predictable file organization.** This audit could be exhaustive *because* the code is easy to follow.

## 6. Improvement roadmap

Phased so each step leaves the app working. Detail per file is in Part II under each file's *"What it can be."*

**Phase 0 — Make it runnable (½ day).** `uv init` + manifest (RC-5); `backend/.gitignore` + `git rm --cached` the `.pyc`; delete the two credential-leaking `print`s; write `seed_categories.py`; root README + `.env.example`. *Nothing below is verifiable until this is done.*

**Phase 1 — Auth & authorization (3–4 days). Closes RC-1–4.** `argon2` hashing; JWT + `get_current_user`; attach it to all 24 non-public routes; **delete `user_id`/`seller_id` from request bodies**; ownership predicate in every by-id query; role enum without `admin`; collapse the login enumeration oracle. Frontend: one `api.js` client with a base URL + `Authorization` header, an `AuthContext` that verifies the token via `/auth/me`, and real `<ProtectedRoute>` guards (replacing the per-page `alert("please login")`).

**Phase 2 — Order correctness (2–3 days). Closes RC-6.** Alembic baseline (then delete `create_all`); money → `Numeric(12,2)`; persist a snapshotted shipping address; single-transaction order creation with `with_for_update`; `CHECK (stock >= 0)`; unify the two cancel paths; FK indexes; real `ForeignKey` on `products.seller_id`.

**Phase 3 — Guardrails (2–3 days). Closes RC-7.** `slowapi`+Redis on auth and `/chatbot`; outbound `timeout=` everywhere; `Field()` caps on every schema + `extra="forbid"`; fix the chatbot `Category` join; CI (ruff, `pip-audit`, pytest, eslint, build, `npm audit`, gitleaks).

**Phase 4 — Correctness & data hygiene (2–3 days). Closes RC-8.** Source New Arrivals / Flash Sale / Featured from the API; delete `products.js`, `categories.js`, and the 12 dead duplicate files and 12 empty stubs; `OrderSuccess` reads real state; one `productImageSrc()` helper; response models on all routes so `category` is actually returned.

**Phase 5 — Observability, tests, product (ongoing).** structlog + Sentry + `/health`/`/ready`; pytest with an authz test per endpoint (highest value per line here); password reset + email verification (the 3 empty auth pages); TypeScript + generated client + TanStack Query; accessibility pass; replace 55 `alert()`s.

---

# Part II — File-by-file audit

Every audited source file, grouped by area. Each entry: *what it is* → *issues* (with `file:line`) → *what it can be*. Empty stubs, dead duplicates, and the tracked `.pyc` are covered in §13; the full 138-file inventory is Appendix A.



### 1. Backend — Application core & database

> **Area verdict.** This is the FastAPI application bootstrap and database plumbing for E-Shop. main.py wires CORS and mounts six routers with schema created eagerly at import time via Base.metadata.create_all; config.py loads DATABASE_URL from a .env with no validation and prints it to stdout; database.py sets up the SQLAlchemy engine, session factory, and a get_db dependency; test_db.py is a throwaway connectivity script, not a real test. The group is functional but naive: secrets are printed to logs, there is no config validation or fail-fast on a missing DATABASE_URL, no connection pooling tuning, no lifespan management, and CORS with allow_credentials plus wildcard methods/headers sits atop a system that has no authentication at all.

#### `backend/app/main.py`  — active, 48 LOC

*What it is.* The FastAPI application entrypoint. It instantiates the app, eagerly creates all DB tables via Base.metadata.create_all at import time, configures CORS for the Vite dev origins, registers six routers (account, product, cart, orders, chatbot, categories), and exposes a trivial GET / health message.

**Issues**

- **P1 · design** — backend/app/main.py:20 "Base.metadata.create_all(bind=engine)" — Schema is created as an import side-effect on every startup with no migration path, so any column change silently never applies to an existing database.
- **P1 · security** — backend/app/main.py:30-32 "allow_credentials=True, allow_methods=["*"]" — CORS permits credentialed requests with wildcard methods and headers, widening the browser attack surface on an API that already trusts client-supplied identity.
- **P2 · design** — backend/app/main.py:22-25 "origins = [ "http://localhost:5173", ... ]" — Allowed origins are hardcoded to localhost dev ports, so this exact file cannot serve a deployed frontend without an edit.
- **P2 · correctness** — backend/app/main.py:20 "Base.metadata.create_all(bind=engine)" — Table creation runs at import before Uvicorn's startup lifecycle, so a DB outage crashes the whole process at import rather than being handled.
- **P3 · design** — backend/app/main.py:12 "from app.routes import categories" — Router imports are inconsistent: five use `from ... import router as X_router` but categories is imported as a module, hurting readability.

*What it can be.* Move Base.metadata.create_all out of module scope into an async lifespan handler (or replace it entirely with Alembic migrations under backend/alembic/), so startup can fail gracefully and schema changes are versioned. Pull the CORS origins list from config.py (e.g. a CORS_ORIGINS env var) and narrow allow_methods to the verbs actually used. Normalize all six router imports to the `from app.routes.X import router as X_router` form already used by account/product/cart/orders/chatbot. Once real auth exists, this file is where a global auth dependency or middleware should be attached.

#### `backend/app/config.py`  — config, 8 LOC

*What it is.* The configuration loader. It calls load_dotenv() to read a .env file, pulls DATABASE_URL from the environment, and prints it. This single variable is the only configuration the app exposes; database.py imports DATABASE_URL directly from here.

**Issues**

- **P1 · security** — backend/app/config.py:8 "print(DATABASE_URL)" — The full database connection string, including any password, is printed to stdout on every import and lands in logs.
- **P1 · correctness** — backend/app/config.py:6 "DATABASE_URL = os.getenv("DATABASE_URL")" — A missing DATABASE_URL silently yields None instead of failing fast, deferring the crash to an opaque SQLAlchemy error at engine creation.
- **P2 · design** — backend/app/config.py:6 "DATABASE_URL = os.getenv("DATABASE_URL")" — Configuration is a bag of module-level globals with no typing, defaults, or single settings object, so adding config means scattering more os.getenv calls.

*What it can be.* Delete the print on line 8 immediately; it leaks credentials. Replace the ad-hoc globals with a pydantic-settings BaseSettings class (Settings) that declares database_url as a required field, so a missing value raises a clear ValidationError at startup and future values like CORS_ORIGINS, HTTP timeouts, and rate-limit knobs get a single typed home. Export a cached get_settings() and have database.py consume settings.database_url instead of importing a bare string. This becomes the natural place to centralize the environment-driven config the rest of the audit calls out as missing.

#### `backend/app/database.py`  — active, 23 LOC

*What it is.* The SQLAlchemy data-access foundation. It creates the engine from DATABASE_URL, defines the SessionLocal session factory (autocommit/autoflush off), the declarative Base that all models inherit, and the get_db generator dependency that yields a session and closes it in a finally block.

**Issues**

- **P2 · performance** — backend/app/database.py:7 "engine = create_engine(DATABASE_URL)" — The engine uses default pool settings with no pool_pre_ping, so stale connections after a DB restart surface as request errors.
- **P2 · correctness** — backend/app/database.py:7 "engine = create_engine(DATABASE_URL)" — Passing a None DATABASE_URL (see config.py) here raises a cryptic SQLAlchemy ArgumentError at import with no actionable message.
- **P3 · design** — backend/app/database.py:18-22 "def get_db(): db = SessionLocal()" — get_db never rolls back on exception before closing, so a failed request relies solely on session GC semantics for cleanup.

*What it can be.* Add pool_pre_ping=True and explicit pool_size/max_overflow to create_engine so connections survive DB restarts under load. Harden get_db with an except branch that calls db.rollback() before re-raising, matching the transactional safety the order and cart routes need. Once config.py becomes a Settings object, take database_url from it rather than the bare import, and consider exposing a typed Session return annotation on get_db for editor support. This file is the correct single chokepoint for any future read-replica or connection-timeout policy.

#### `backend/app/test_db.py`  — dead-or-duplicate, 8 LOC

*What it is.* A one-off manual connectivity script, not an automated test. When run directly it opens a connection to the engine, prints 'Database connected' on success, and prints 'Connection Failed' plus the exception on failure. It uses no test framework and asserts nothing.

**Issues**

- **P2 · dead-code** — backend/app/test_db.py:2-4 "try: connection=engine.connect()" — Named test_db.py but contains no test framework or assertions, so it will be collected by pytest yet verify nothing while opening a real DB connection.
- **P3 · dx** — backend/app/test_db.py:7 "print("Connection Failed")" — Failure only prints and does not exit non-zero, so it is useless as a CI or scripted health gate.
- **P3 · style** — backend/app/test_db.py:3 "connection=engine.connect()" — Module runs its logic at import scope with no __main__ guard, so merely importing it triggers a live DB connection.

*What it can be.* Either delete this file or promote it into a real pytest test under backend/tests/ that uses a fixture around get_db and asserts engine.connect() succeeds, so it participates in the CI the repo currently lacks. If kept as a manual smoke script, rename it away from the test_* prefix (e.g. scripts/check_db.py), wrap the logic in an `if __name__ == '__main__':` guard, and sys.exit(1) on failure so it can gate deploys. As written it is the seed of a test suite that does not otherwise exist in this codebase.

### 2. Backend — ORM models

> **Area verdict.** These six SQLAlchemy model files define the entire relational schema for E-Shop (users, products, categories, cart, orders, order_items). They are minimal and mostly syntactically clean, but the schema is structurally underspecified: it is the root cause of the plaintext-password and client-supplied-identity problems established for the system, has no DB-level foreign keys or indexes on hot join columns, and stores all money as Float, which silently corrupts totals. Relationships are declared inconsistently (Product<->Category is wired, but Cart, Order, OrderItem carry FKs with zero ORM relationships and seller_id is a bare int with no FK). There are no timestamps on cart/order_items, no unique/check constraints, no cascade rules, and no enum discipline on role/status, so referential integrity and data quality rest entirely on application code that the audit already knows does not enforce it.

#### `backend/app/models/user.py`  — active, 16 LOC

*What it is.* SQLAlchemy ORM model for the 'users' table: id, full_name, email (unique), phone (unique, nullable), password, role (default 'customer'), created_at. This is the identity/account root for the whole app.

**Issues**

- **P0 · security** — user.py:14 password = Column(String(255), nullable=False) — The password column is a plain String with no hashing at the schema or app layer, so every account credential is stored in cleartext.
- **P1 · security** — user.py:15 role = Column(String(20), default="customer") — Role is a free-form string with no CHECK/enum constraint, so any value including 'admin' can be inserted directly and self-registered users can grant themselves privilege.
- **P2 · design** — user.py:15 role = Column(String(20), default="customer") — Default role is 'customer' but the Product/Cart layer assumes 'seller'/'admin' semantics, and there is no relationship linking users to their products, carts, or orders.
- **P3 · correctness** — user.py:16 created_at = Column(DateTime(timezone=True), server_default=func.now()) — There is no updated_at column, so account modifications are untraceable.

*What it can be.* Password should never live here as cleartext; store a bcrypt/argon2 hash in a `password_hash` column and move verification into an auth service, mirroring what a real login route needs instead of the current plaintext /login. Constrain `role` with a SQLAlchemy Enum('customer','seller','admin') plus a server-side check so privilege escalation cannot happen by inserting a string. Add ORM relationships (`products`, `carts`, `orders`) so seller_id in product.py and user_id in cart.py/orders.py become navigable and enforceable rather than loose integers. Add an `updated_at = Column(DateTime, onupdate=func.now())` for auditability.

#### `backend/app/models/product.py`  — active, 35 LOC

*What it is.* SQLAlchemy ORM model for the 'products' table: id, name, description (Text), category_id (FK to categories, required), brand, price (Float), stock (default 0), image, seller_id, plus a category relationship back-populated to Category.

**Issues**

- **P1 · correctness** — product.py:24 price = Column(Float, nullable=False) — Price is stored as Float, so currency values accumulate binary rounding error and totals derived from it (orders.total_amount, order_items.price) drift.
- **P1 · design** — product.py:30 seller_id = Column(Integer) — seller_id is a bare Integer with no ForeignKey to users.id, so products can reference nonexistent sellers and no join integrity exists for the seller dashboard.
- **P2 · validation** — product.py:26 stock = Column(Integer, default=0) — stock has no CHECK constraint preventing negative values, so overselling writes negative inventory instead of failing.
- **P2 · validation** — product.py:24 price = Column(Float, nullable=False) — price has no CHECK (price >= 0), allowing zero or negative-priced products to be inserted directly.
- **P3 · performance** — product.py:16-20 category_id = Column(Integer, ForeignKey("categories.id") — category_id and seller_id are unindexed, so the category-listing and seller-listing queries (a core app flow) do full table scans.

*What it can be.* Convert `price` to Numeric(10,2) so money is exact everywhere it flows (into orders.total_amount and order_items.price), eliminating the Float drift established for the system. Promote `seller_id` to `Column(Integer, ForeignKey('users.id'), index=True)` with a `seller = relationship('User')`, matching how `category` is already wired at lines 32-34. Add `index=True` to category_id and CHECK constraints for `stock >= 0` and `price >= 0` via `__table_args__` so overselling and bad prices fail at the DB instead of the trusting endpoints. This turns the model into an actual invariant boundary rather than a passive record.

#### `backend/app/models/categories.py`  — active, 17 LOC

*What it is.* SQLAlchemy ORM model for the 'categories' table: id, name (unique, required) and a products relationship back-populated to Product. The lookup table anchoring product categorization.

**Issues**

- **P3 · design** — categories.py:12 name = Column(String, unique=True, nullable=False) — name uses unbounded String with no length cap, inconsistent with String(n) used across the other models and unenforceable on some backends.
- **P3 · design** — categories.py:14-16 products = relationship("Product", back_populates="category") — The relationship declares no cascade or passive_deletes, so deleting a category leaves orphaned products or errors depending on DB FK behavior.

*What it can be.* Bound the name with String(100) to match the column-width discipline in user.py and orders.py, and add a `slug` unique column so the frontend category routes key off a stable identifier instead of a mutable display name. Specify explicit delete behavior on the `products` relationship (e.g. restrict deletion when products exist, or `ondelete='RESTRICT'` on the FK in product.py) so category removal cannot silently orphan the catalog. Optionally add `created_at` for parity with the other tables.

#### `backend/app/models/cart.py`  — active, 15 LOC

*What it is.* SQLAlchemy ORM model for the 'cart' table: id, user_id (FK users), product_id (FK products), quantity (default 1). A flat per-row cart line with no relationships or timestamps.

**Issues**

- **P1 · design** — cart.py:11-13 user_id = Column(... ForeignKey("users.id") — There is no unique constraint on (user_id, product_id), so the same product can create unlimited duplicate cart rows for one user.
- **P2 · validation** — cart.py:15 quantity = Column(Integer, default=1, nullable=False) — quantity has no CHECK (quantity > 0), so zero or negative quantities can be persisted and later feed order math.
- **P2 · design** — cart.py:11-13 ForeignKey("users.id") ... ForeignKey("products.id") — Both FKs exist but no ORM relationships are declared, so cart reads must manually re-query User and Product instead of navigating.
- **P3 · design** — cart.py:13 product_id = Column(Integer, ForeignKey("products.id"), nullable=False) — No created_at/updated_at, so abandoned-cart cleanup and recency ordering are impossible.

*What it can be.* Add `__table_args__ = (UniqueConstraint('user_id','product_id'), CheckConstraint('quantity > 0'))` so add-to-cart becomes an upsert-and-increment instead of spawning duplicate rows, and negative quantities can never reach the order pipeline. Declare `user` and `product` relationships so cart serialization can eager-load product name/price/image (the fields the frontend cart view needs) in one query. Add `created_at`/`updated_at` to enable abandoned-cart jobs. This mirrors the wired relationship pattern in product.py/categories.py that cart.py currently omits.

#### `backend/app/models/orders.py`  — active, 33 LOC

*What it is.* SQLAlchemy ORM model for the 'orders' table: id, user_id (FK users), total_amount (Float), status (default 'pending'), created_at. The order header record.

**Issues**

- **P1 · correctness** — orders.py:18-21 total_amount = Column(Float, nullable=False) — total_amount is a Float, so the authoritative charged total is subject to binary rounding error and cannot be reconciled exactly against order_items.
- **P2 · design** — orders.py:23-26 status = Column(String(50), default="pending") — Order status is a free-form String with no enum/CHECK, so invalid or typo'd statuses ('shiped', 'PENDING') are accepted and break status filtering.
- **P2 · design** — orders.py:12-16 user_id = Column(... ForeignKey("users.id") — There is no relationship to User or to OrderItem, so an order cannot navigate to its line items despite order_items.order_id pointing back.
- **P3 · correctness** — orders.py:33-34 (trailing blank lines, no updated_at) — No updated_at column, so status transitions (pending->shipped->delivered) leave no timestamp trail.

*What it can be.* Store `total_amount` as Numeric(10,2) and compute it server-side from order_items rather than trusting a client-supplied float, closing the money-drift and client-identity gaps at once. Replace the free-string `status` with Enum('pending','paid','shipped','delivered','cancelled') and add `items = relationship('OrderItem', back_populates='order', cascade='all, delete-orphan')` plus `user = relationship('User')` so an order is a real aggregate root. Add `updated_at` with onupdate for a status-transition audit trail, matching the created_at already present at lines 28-31.

#### `backend/app/models/order_Item.py`  — active, 15 LOC

*What it is.* SQLAlchemy ORM model for the 'order_items' table: id, order_id (FK orders), product_id (FK products), quantity, price (Float). The order line-item / snapshot record.

**Issues**

- **P1 · correctness** — order_Item.py:16 price = Column(Float, nullable=False) — Line-item price is a Float, so per-line and summed order totals accumulate rounding error and cannot exactly reconcile with orders.total_amount.
- **P2 · design** — order_Item.py:11-13 order_id = Column(... ForeignKey("orders.id") — FKs to orders and products exist but no ORM relationships are declared, so line items cannot navigate to their order or product.
- **P2 · validation** — order_Item.py:15 quantity = Column(Integer, nullable=False) — quantity and price have no CHECK constraints, permitting zero/negative line quantities or prices to persist in finalized orders.
- **P3 · style** — order_Item.py:1 filename order_Item.py — The file is named order_Item.py with inconsistent CamelCase, diverging from the lower_snake_case convention of every sibling model and risking case-sensitivity import bugs on Linux.

*What it can be.* Store `price` as Numeric(10,2) captured as a snapshot of product price at purchase time (so later product price edits don't rewrite order history), the same conversion product.py and orders.py need. Add `order = relationship('Order', back_populates='items')` and `product = relationship('Product')` so an order can be serialized with its lines in one traversal. Add CheckConstraints for `quantity > 0` and `price >= 0`, and rename the file to order_item.py to match the snake_case convention of cart.py/categories.py and avoid case-sensitivity import failures on deployment. Consider a UniqueConstraint on (order_id, product_id) to prevent duplicate lines.

### 3. Backend — Pydantic schemas

> **Area verdict.** These five Pydantic schema files define the request/response contracts for the entire API surface but are systematically anemic: they perform almost no validation beyond raw Python types. Critical trust-boundary fields (role, seller_id, user_id, price, stock, quantity) are accepted as unconstrained str/int/float straight from the client, which is the schema-layer half of the app-wide "client-supplied identity" and "money as Float" problems. Naming is inconsistent (id vs order_id vs cart_id), Config uses the mixed Pydantic v1/v2 style, and order.py contains a duplicate import indicating copy-paste authorship. None of these schemas would need auth to fix, but tightening constraints here is the cheapest defense-in-depth available in the codebase.

#### `backend/app/schemas/user.py`  — active, 14 LOC

*What it is.* Defines the two request-body Pydantic models for authentication endpoints: UserSignup (full_name, email, phone, password, role) and UserLogin (email, password). EmailStr is used so email format is validated, but nothing else is constrained.

**Issues**

- **P0 · security** — backend/app/schemas/user.py:9 `role: str` — role is a free-form client-supplied string with no enum/whitelist, so anyone can sign up as admin or seller at the schema boundary.
- **P1 · validation** — backend/app/schemas/user.py:8 `password: str` — password has no minimum length or complexity constraint, allowing empty or one-character passwords (compounded by plaintext storage).
- **P2 · validation** — backend/app/schemas/user.py:7 `phone: str` — phone accepts any string with no length or pattern validation, so garbage or empty values pass.
- **P2 · validation** — backend/app/schemas/user.py:5 `full_name: str` — full_name has no min_length, so an empty-string name is accepted as a valid account.

*What it can be.* role should become a Literal["customer","seller","admin"] (or better, be removed from signup entirely so self-registration cannot mint admins, with role assignment moved server-side). password should use constr(min_length=8) and full_name/phone should get constr(min_length=1) plus a phone regex pattern. Add a UserResponse model with from_attributes=True that omits the password field, mirroring ProductResponse in product.py, so the /login handler stops returning raw ORM objects that leak the plaintext password. These are pure schema changes needing no auth work and would harden the single most dangerous input in the app.

#### `backend/app/schemas/product.py`  — active, 38 LOC

*What it is.* Defines the product CRUD contracts: ProductCreate (full product incl. seller_id), ProductResponse (adds id, from_attributes=True for ORM serialization), and ProductUpdate (all-optional PATCH body). This is the most complete schema file, using Optional correctly for updates.

**Issues**

- **P1 · security** — backend/app/schemas/product.py:13 `seller_id: int` — seller_id is client-supplied in the create body, letting a caller create products attributed to any other seller.
- **P1 · validation** — backend/app/schemas/product.py:10 `price: float` — price is an unconstrained float allowing negative or zero prices and floating-point money errors.
- **P2 · validation** — backend/app/schemas/product.py:11 `stock: int` — stock has no ge=0 constraint, so negative inventory can be written.
- **P2 · validation** — backend/app/schemas/product.py:12 `image: str` — image is a bare string with no URL/path validation, accepting arbitrary or empty values.
- **P3 · style** — backend/app/schemas/product.py:27-28 `class Config: from_attributes = True` — Uses the inner Config class (v1 style) instead of Pydantic v2 model_config, and only ProductResponse defines it inconsistently.

*What it can be.* price should become condecimal(gt=0, max_digits=10, decimal_places=2) (paired with migrating the model column off Float) and stock a conint(ge=0), with image typed as pydantic.HttpUrl or a validated path. seller_id should be dropped from ProductCreate and injected from the authenticated principal once identity exists, since trusting it here is the schema-side of the client-supplied-identity flaw. Replace the inner Config with model_config = ConfigDict(from_attributes=True) and apply the same to every response model across these files for consistency. ProductUpdate correctly models PATCH and should be the template the other resources copy.

#### `backend/app/schemas/categories.py`  — active, 4 LOC

*What it is.* Defines a single request model, CategoryCreate, with one field (name) for creating a product category. There is no response schema, so category endpoints likely return raw ORM objects or dicts.

**Issues**

- **P2 · validation** — backend/app/schemas/categories.py:4 `name: str` — name has no min_length or uniqueness-hinting constraint, so empty or whitespace category names are accepted.
- **P3 · design** — backend/app/schemas/categories.py:3 `class CategoryCreate(BaseModel):` — No CategoryResponse model exists, so category read endpoints have no typed, ORM-safe output contract like product.py has.

*What it can be.* name should become constr(min_length=1, strip_whitespace=True) to reject blank categories. Add a CategoryResponse(BaseModel) with id and name plus model_config = ConfigDict(from_attributes=True), mirroring ProductResponse, so the category router can declare response_model and stop leaking raw ORM rows. This file is trivially small and the cleanest place to establish the request+response pairing convention that the other schemas should follow.

#### `backend/app/schemas/cart.py`  — active, 19 LOC

*What it is.* Defines cart contracts: CartCreate (user_id, product_id, quantity default 1), CartItemResponse (a denormalized read view joining product name/brand/price/image), and CartUpdate (quantity only). CartItemResponse notably lacks from_attributes, so it is built from dicts, not ORM rows.

**Issues**

- **P1 · security** — backend/app/schemas/cart.py:5 `user_id: int` — user_id is client-supplied in the cart-create body, letting a caller add items to any other user's cart.
- **P1 · validation** — backend/app/schemas/cart.py:7 `quantity: int = 1` — quantity has no ge=1 constraint, so zero or negative quantities can be inserted into the cart.
- **P1 · validation** — backend/app/schemas/cart.py:19 `quantity: int` — CartUpdate.quantity is likewise unconstrained, allowing an update to a negative quantity that can corrupt order totals.
- **P3 · design** — backend/app/schemas/cart.py:9 `class CartItemResponse(BaseModel):` — CartItemResponse omits from_attributes/model_config, so it cannot serialize an ORM join directly and forces manual dict assembly in the router.

*What it can be.* quantity in both CartCreate and CartUpdate should be conint(ge=1) to make zero/negative quantities structurally impossible. user_id should be removed and derived from the authenticated principal once identity exists, closing the same client-supplied-identity hole seen in product.py's seller_id. Give CartItemResponse a model_config = ConfigDict(from_attributes=True) and back it with a proper ORM relationship or a typed query result so the router stops hand-building dicts. Consider a shared conint(ge=1) Quantity type alias reused by the order flow.

#### `backend/app/schemas/order.py`  — active, 20 LOC

*What it is.* Defines order contracts: OrderCreate (user_id only), OrderResponse (order_id, total_amount, status, created_at), and OrderStatusUpdate (status). Contains a duplicated `from pydantic import BaseModel` on line 17, evidence of copy-paste construction.

**Issues**

- **P1 · security** — backend/app/schemas/order.py:6 `user_id: int` — user_id is client-supplied in the order-create body, letting a caller place orders as any other user.
- **P1 · security** — backend/app/schemas/order.py:20 `status: str` — OrderStatusUpdate.status is a free-form string with no enum, so any client can set an order to arbitrary or nonsensical states.
- **P2 · correctness** — backend/app/schemas/order.py:11 `total_amount: float` — total_amount is a float on the response contract, propagating money-as-Float rounding errors to the client.
- **P2 · design** — backend/app/schemas/order.py:9-13 `class OrderResponse` (no Config) — OrderResponse lacks from_attributes, so it cannot serialize the Order ORM row directly and diverges from ProductResponse's pattern.
- **P3 · dead-code** — backend/app/schemas/order.py:17 `from pydantic import BaseModel` — BaseModel is imported a second time mid-file, a redundant duplicate import left from copy-paste.

*What it can be.* status on both OrderResponse and OrderStatusUpdate should be a Literal (e.g. "pending","paid","shipped","delivered","cancelled") or shared OrderStatus enum so state transitions are constrained at the boundary. total_amount should become condecimal(ge=0, decimal_places=2) once the model column migrates off Float. Remove the duplicate import on line 17 and add model_config = ConfigDict(from_attributes=True) to OrderResponse so it serializes the ORM row like ProductResponse does. user_id should be dropped from OrderCreate and taken from the authenticated principal, matching the fix in cart.py.

### 4. Backend — Routes: account, cart, categories

> **Area verdict.** These three files implement the core public REST surface for account auth, shopping cart, and product categories. They share a uniform, readable style (APIRouter, get_db dependency, explicit HTTPException raises) but every route is unauthenticated and trusts client-supplied identity: signup lets anyone pick role=admin, login compares plaintext passwords and leaks user-enumeration via distinct 404/401 responses, and cart operations accept a user_id in the body/URL with no ownership check so any user can read, mutate, or delete any other user's cart. Beyond auth, there are concrete correctness bugs: cart's add-to-cart re-add path ignores stock when summing quantities, a debug print statement ships in get_cart, an unreachable comment sits after a return, and money/quantity fields lack integrity guards. Categories is the cleanest of the three but still exposes unauthenticated create and returns raw ORM objects without response schemas.

#### `backend/app/routes/account.py`  — active, 78 LOC

*What it is.* Auth router exposing POST /signup and POST /login. Signup creates a User with client-chosen role and plaintext password; login looks up by email, string-compares the plaintext password, and returns a bare user JSON with no token or session.

**Issues**

- **P0 · security** — account.py:34 "role=user.role" — Signup accepts an arbitrary client-supplied role, so anyone can self-register as admin.
- **P0 · security** — account.py:33 "password=user.password,   # Plain text for now" — Passwords are persisted in plaintext, so any DB read exposes every user credential.
- **P0 · security** — account.py:64 "if existing_user.password != user.password" — Login compares plaintext passwords directly with no hashing and no constant-time check.
- **P1 · security** — account.py:70-77 "return { "message": "Login Successful", "user": {...} }" — Login issues no token or session, so downstream routes have no way to verify identity.
- **P1 · security** — account.py:58-62 "status_code=404, detail="User not found"" — Distinct 404-vs-401 responses let an attacker enumerate which emails are registered.
- **P2 · correctness** — account.py:19 "filter(User.email == user.email)" — No case/whitespace normalization on email means Foo@x.com and foo@x.com become duplicate accounts.
- **P3 · design** — account.py:41-44 "return { "message": ..., "user_id": new_user.id }" — Endpoints return ad-hoc dicts instead of declared response_model schemas, so the contract is untyped.

*What it can be.* This should become the single source of authenticated identity: hash passwords with passlib/bcrypt on signup and use a constant-time verify on login, mirroring a shared security util rather than the plaintext compare on line 64. Strip role from UserSignup so self-registration always yields a customer, and gate admin/seller creation behind an authenticated admin route. Issue a signed JWT on successful login and add a get_current_user dependency that sibling routers (cart.py, categories.py) consume instead of trusting client-supplied user_id. Return typed response_model schemas and collapse the 404/401 branches into one generic 'Invalid credentials' to stop email enumeration.

#### `backend/app/routes/cart.py`  — active, 206 LOC

*What it is.* Cart router with POST /cart (add or increment), GET /cart/{user_id}, PUT /cart/{cart_id}, DELETE /cart/{cart_id}, and GET /cart/count/{user_id}. Validates product existence, quantity>0, and stock, and joins Cart with Product to return line items.

**Issues**

- **P0 · security** — cart.py:75-86 "def get_cart(user_id: int..." filter(Cart.user_id == user_id) — Any caller can read, update, delete, or count any user's cart because user_id/cart_id are unauthenticated path/body params with no ownership check.
- **P1 · correctness** — cart.py:48 "existing_item.quantity += cart.quantity" — The re-add path increments quantity without checking the new total against product.stock, so repeated adds exceed available stock.
- **P1 · validation** — cart.py:58-62 "Cart(user_id=cart.user_id, product_id=..., quantity=...)" — No foreign-key validation that cart.user_id references a real user, so orphan cart rows can be created for nonexistent users.
- **P2 · dx** — cart.py:88 "print("Found:", cart_items)" — A leftover debug print statement runs on every GET /cart request and pollutes server logs.
- **P2 · dead-code** — cart.py:187 "# GET CART COUNT" after return on line 184 — The GET CART COUNT comment is indented under remove_from_cart after its return, making it misleading dead placement.
- **P2 · performance** — cart.py:194-201 ".all()" then "sum(item.quantity for item in total_items)" — Cart count loads every row into Python and sums in a loop instead of a single SQL SUM aggregate.
- **P2 · correctness** — cart.py:35 "if cart.quantity > product.stock" — Stock is checked but never decremented, and the read-check-write on add/update has no row lock, allowing oversell under concurrency.
- **P3 · design** — cart.py:91-101 "result.append({...})" — Hand-built response dicts duplicate field mapping instead of a Pydantic response_model, drifting easily from the model.

*What it can be.* Cart should derive user identity from the authenticated token (a get_current_user dependency) instead of the client-supplied user_id on lines 42/59/85, and every mutating route should assert cart_item.user_id == current_user.id before acting. The increment branch on line 48 must validate existing_item.quantity + cart.quantity against product.stock so re-adds cannot oversell, ideally inside a SELECT ... FOR UPDATE transaction to close the concurrency window. Replace the print on line 88 with structured logging, and rewrite get_cart_count to use db.query(func.coalesce(func.sum(Cart.quantity),0)).filter(...).scalar() for one round trip. Declare Pydantic response_models so the get_cart line-item shape is a typed contract rather than the ad-hoc dict on lines 93-101.

#### `backend/app/routes/categories.py`  — active, 102 LOC

*What it is.* Categories router with POST /categories (create with duplicate-name guard), GET /categories (list all), GET /categories/{id} (single, 404 if missing), and GET /categories/{id}/products (products filtered by category_id).

**Issues**

- **P1 · security** — categories.py:14-18 "def create_category(category: CategoryCreate..." — Category creation is fully public with no admin/auth check, so anyone can pollute the taxonomy.
- **P2 · correctness** — categories.py:23 "filter(Category.name == category.name)" — Duplicate check is exact-match and case-sensitive, so 'Shoes' and 'shoes' both insert as distinct categories.
- **P2 · design** — categories.py:40 "return new_category" and :50 "return db.query(Category).all()" — Endpoints return raw ORM objects with no response_model, leaking whatever columns the model has and coupling API to schema.
- **P3 · performance** — categories.py:96-100 "db.query(Product).filter(Product.category_id == category_id).all()" — Products-by-category has no pagination, returning the entire product set for large categories in one payload.

*What it can be.* Gate POST /categories behind the admin dependency introduced in account.py so only admins mutate the taxonomy, leaving the GET routes public. Normalize names (lowercase/trim, or a case-insensitive unique index) so the line 23 duplicate check actually prevents 'Shoes'/'shoes' collisions. Add Pydantic response_models (CategoryOut, ProductOut) so lines 40/50/73/102 return typed, field-controlled payloads instead of raw ORM rows. Add limit/offset pagination to get_products_by_category so large categories page rather than dumping the whole product table, matching whatever paging pattern the products router should adopt.

### 5. Backend — Routes: product, orders, chatbot

> **Area verdict.** These three routers are the transactional core of E-Shop (catalog CRUD, order lifecycle, and an AI chatbot) and share one fatal trait: not a single endpoint verifies who the caller is. Every seller_id and user_id is taken straight from the request body or URL and trusted, so any anonymous client can create products under another seller, delete any product, view or cancel any user's order, and mutate any order's status. orders.py additionally has a non-atomic two-commit order flow and a classic check-then-decrement stock race, and money is computed in Float. The code is otherwise readable and uses SQLAlchemy parameterization (no raw SQL injection), but it reads as a trusting single-user prototype exposed as a public multi-tenant API.

#### `backend/app/routes/product.py`  — active, 197 LOC

*What it is.* FastAPI router implementing full product catalog CRUD: create, paginated list, count, name search (ilike), get-by-id, update (partial via model_dump exclude_unset), delete, and a per-seller product listing. All handlers take a raw SQLAlchemy Session via get_db and operate directly on the Product model with no authorization layer.

**Issues**

- **P0 · security** — product.py:32 "seller_id=product.seller_id" — create_product trusts a client-supplied seller_id from the request body, so anyone can create products attributed to any seller.
- **P0 · security** — product.py:155-159 "def delete_product(product_id: int, db: Session" — delete_product has no ownership or role check, so any anonymous caller can permanently delete any product by id.
- **P0 · security** — product.py:120-125 "def update_product(product_id: int, product_data: ProductUpdate" — update_product lets any caller mutate any product including its price, stock, and seller_id with no owner verification.
- **P1 · design** — product.py:149 ""product": product" — update_product has no response_model and returns the raw ORM object, serializing every column and bypassing the ProductResponse contract used elsewhere.
- **P1 · performance** — product.py:52 "limit: int = Query(12, ge=1)" — The pagination limit has a lower bound but no upper bound, so a client can request limit=1000000 and force a full-table dump.
- **P2 · performance** — product.py:84-90 "db.query(Product).filter(Product.name.ilike" — search_products returns all matches with no pagination or limit, so a broad keyword scans and serializes the entire catalog.
- **P2 · validation** — product.py:24-33 "new_product = Product(...category_id=product.category_id" — No existence check on category_id or seller_id before insert, so orphan foreign keys silently persist if the DB lacks enforced constraints.
- **P3 · dead-code** — product.py:47 "from fastapi import Query" — Query is re-imported mid-file despite already being imported on line 1, a leftover redundant import.
- **P3 · design** — product.py:183 "@router.get("/seller/products/{seller_id}")" — get_seller_products returns raw ORM objects with no response_model, inconsistent with the ProductResponse used by sibling read routes.

*What it can be.* This should become an ownership-enforced catalog router where a get_current_user dependency (once real auth exists) supplies seller_id instead of the request body, and create/update/delete assert product.seller_id == current_user.id before mutating. Give every read route the same ProductResponse response_model that the list and get-by-id routes already use, so update_product on line 149 stops leaking raw ORM columns. Cap the pagination limit (e.g. Query(12, ge=1, le=100)) and add limit/offset to search_products so neither can be weaponized into a full-table dump. Validate category_id and seller_id existence before insert, mirroring the not-found guards already present in get_product, to prevent orphaned rows.

#### `backend/app/routes/orders.py`  — active, 289 LOC

*What it is.* FastAPI router implementing the order lifecycle: create-from-cart (validates stock, sums total, writes Order + OrderItems, decrements stock, clears cart), list-my-orders, order-details with joined product info, cancel (restocks and hard-deletes), a seller order view joined by product ownership, and a seller status-update endpoint.

**Issues**

- **P0 · correctness** — orders.py:53 and 71 "db.commit()" ... "db.commit()" — The order is committed at line 53 before order items, stock decrement, and cart clearing at line 71, so a failure in between leaves a persisted order with no items and undecremented stock.
- **P0 · correctness** — orders.py:38 "if cart.quantity > product.stock" ... :67 "product.stock -= cart.quantity" — Stock is checked then decremented without row locking, a check-then-act race letting two concurrent orders oversell the same product below zero.
- **P0 · security** — orders.py:158-162 "def cancel_order(order_id: int, db: Session" — cancel_order has no ownership check, so any caller can cancel and hard-delete any user's pending order by id.
- **P0 · security** — orders.py:248-253 "def update_order_status(order_id: int, status_data" — update_order_status verifies no seller ownership of the order, so any caller can move any order to shipped/delivered/cancelled.
- **P1 · security** — orders.py:106-110 "def get_order_details(order_id: int, db: Session" — get_order_details exposes any order's full contents, customer, and totals to any caller with no owner or seller check (IDOR).
- **P1 · security** — orders.py:25 "Cart.user_id == order_data.user_id" — create_order trusts a client-supplied user_id, letting a caller create orders as any user and drain that user's cart.
- **P1 · correctness** — orders.py:44 "total_amount += product.price * cart.quantity" — Order totals are computed and stored as Float, accumulating rounding errors on money that will drift from summed line items over time.
- **P2 · performance** — orders.py:186-188 "product = db.query(Product).filter(Product.id == item.product_id).first()" — cancel_order issues one product query per order item inside a loop, an N+1 pattern that should be a single IN query.
- **P2 · design** — orders.py:195 "db.delete(order)" — Cancelling hard-deletes the order and its items instead of setting status='cancelled', destroying the audit trail the status field implies.
- **P3 · style** — orders.py:7 "from app.models.order_Item import OrderItem" — The order_Item module name uses inconsistent PascalCase-with-underscore casing that breaks the snake_case convention of sibling model files.

*What it can be.* The whole create_order flow should be wrapped in a single transaction (one commit at the end, or a with db.begin() block) with SELECT ... FOR UPDATE on the product rows so stock check-and-decrement is atomic and oversell becomes impossible; the current two-commit split on lines 53 and 71 is the highest-value fix here. Money must move to Numeric/Decimal columns so total_amount on line 44 stops drifting from summed OrderItem prices. Every read and mutation route (get_order_details, cancel_order, update_order_status) needs an ownership guard once auth lands: buyers scoped to their own user_id, sellers scoped to orders containing their products via the same Product.seller_id join already used in seller_view_orders. Replace the hard-delete in cancel_order with a status transition to preserve history, and collapse its per-item product lookup into one IN-clause query.

#### `backend/app/routes/chatbot.py`  — active, 27 LOC

*What it is.* Thin FastAPI router exposing a single POST /chatbot endpoint that takes a free-text message, calls search_products to fetch matching catalog rows from the DB, and passes both to ask_ai (an external LLM call in chatbot_service) to produce a natural-language reply.

**Issues**

- **P1 · security** — chatbot.py:18-19 "@router.post("") def chatbot(request: ChatRequest" — The chatbot endpoint is public and unauthenticated, so anyone can drive unbounded paid LLM calls against ask_ai with no attribution.
- **P1 · validation** — chatbot.py:14-15 "class ChatRequest(BaseModel): message: str" — message has no max length constraint, so an oversized payload is forwarded straight into the LLM prompt inflating cost and latency.
- **P2 · performance** — chatbot.py:23 "reply = ask_ai(request.message, products)" — The synchronous ask_ai call blocks the request worker for the full LLM round-trip with no timeout guard, so a slow provider stalls the endpoint.
- **P2 · security** — chatbot.py:21 "products = search_products(db, request.message)" — Raw user text is passed as a product search term and into the AI prompt with no sanitization, an open prompt-injection surface.

*What it can be.* This router is structurally fine but needs guardrails around the expensive call it fronts: add a max_length constraint on ChatRequest.message (e.g. Field(max_length=500)) so oversized prompts are rejected at the schema boundary, and gate the endpoint behind the same auth dependency the rest of the API should adopt plus per-user rate limiting, since an unauthenticated LLM endpoint is a direct cost-abuse vector. Make the handler async and give ask_ai an explicit outbound timeout in chatbot_service so a slow LLM provider cannot pin request workers. Keep the search_products + ask_ai composition, but treat the incoming message strictly as untrusted data in the prompt template to blunt injection.

### 6. Backend — Services, utils & seeders

> **Area verdict.** This group is the backend's "AI/utility" layer, and it is mostly vaporware: five of nine files (account_servoce.py, ai_services.py, product_search.py, prompts/e-prompts.py, seeders/__init__.py) are 0-byte empty stubs whose implied features do not exist. The only real code is a Groq-backed chatbot service, a Pexels image fetcher, and two throwaway seeder scripts. Every live file shares the same defects: secrets pulled from env with no validation, third-party HTTP calls with no timeout or error handling, and hardcoded model/URL constants. The misspelled filename account_servoce.py and the dash in e-prompts.py (non-importable module name) show this directory was scaffolded by guesswork and never finished.

#### `backend/app/services/chatbot_service.py`  — active, 120 LOC

*What it is.* The live chatbot backend. It extracts keywords from a user message (regex + a small stopword set), builds an ILIKE OR-query across Product name/brand/category/description limited to 5 rows, formats those rows into a text context, and calls Groq's OpenAI-compatible chat completion (llama-3.3-70b-versatile) to generate a shopping reply. Imported by app/routes/chatbot.py.

**Issues**

- **P1 · correctness** — chatbot_service.py:14 api_key=os.getenv("GROQ_API_KEY") — The OpenAI client is constructed at import time with no check that GROQ_API_KEY exists, so a missing key silently yields a client that 401s on every chat request.
- **P1 · correctness** — chatbot_service.py:49 Product.category.ilike(f"%{keyword}%") — It filters and prints Product.category/product.category, but the seeder writes category_id (FK to Category), so this column reference is almost certainly wrong/stale against the real schema.
- **P1 · performance** — chatbot_service.py:86 response = client.chat.completions.create( — The external LLM call has no timeout and no try/except, so a slow or failing Groq endpoint hangs the request thread indefinitely with no fallback reply.
- **P2 · design** — chatbot_service.py:39 for keyword in keywords: — Every keyword is AND-ed together across four ILIKE columns, so a two-word query like 'gaming laptop' returns nothing unless one product row matches both terms, making search brittle.
- **P2 · design** — chatbot_service.py:88 model="llama-3.3-70b-versatile" — Model name, base_url, temperature, and result limit are all hardcoded literals rather than config, so changing provider or tuning requires editing source.
- **P2 · performance** — chatbot_service.py:57 return query.limit(5).all() — The message text is unbounded and every non-stopword becomes an ILIKE '%...%' filter (no leading-anchor index usable), so long inputs generate many full-scan LIKE clauses per request.
- **P3 · style** — chatbot_service.py:41-55 query = query.filter( or_( — Excessive blank-line padding between every statement inflates the file and hurts readability with no benefit.

*What it can be.* This should become a small, testable retrieval-augmented search module. Move GROQ_API_KEY, base_url, model, temperature, and the result limit into app/config settings and construct the client lazily behind a get_client() so import never fails. Wrap the completion in try/except with a request timeout and return a graceful 'assistant unavailable' string on failure, and reconcile the Product.category reference against the real model (join Category via category_id like seed_products.py does). Replace the AND-per-keyword filter with an OR-across-keywords relevance ranking, and add a couple of unit tests around extract_keywords and search_products against a seeded test DB.

#### `backend/app/services/account_servoce.py`  — empty-stub, 0 LOC

*What it is.* A 0-byte empty file. The misspelled name ('servoce') implies an intended account/user service layer (profile, password, role logic) that was never written; no account service exists in the backend.

**Issues**

- **P2 · dead-code** — account_servoce.py:0 (0-byte file) — Empty placeholder committed to the repo; the account-service feature it implies does not exist and the filename is misspelled.

*What it can be.* If an account/service layer is intended, rename to account_service.py and implement the user-facing logic that currently lives loose in routes: profile fetch/update, role changes, and (once auth exists) password hashing/verification to replace the plaintext comparisons noted system-wide. It should take a Session and typed inputs, mirroring the db-first signature style of chatbot_service.search_products. Otherwise delete it, since an empty misspelled module is pure noise.

#### `backend/app/services/ai_services.py`  — empty-stub, 0 LOC

*What it is.* A 0-byte empty file. Name implies a general AI-services abstraction (likely intended to hold the LLM/embedding logic that instead lives inline in chatbot_service.py). No such service exists.

**Issues**

- **P2 · dead-code** — ai_services.py:0 (0-byte file) — Empty placeholder; the AI-services abstraction it implies does not exist and duplicates the intent of chatbot_service.py.

*What it can be.* This is the natural home for the LLM client that is currently hardcoded inside chatbot_service.py. Extract the Groq/OpenAI client construction, model config, and a single generate(system, user, timeout) helper here so chatbot_service and any future feature share one configured, timeout-guarded client. Add a thin interface so the provider can be swapped without touching callers. If that consolidation is not planned, delete the file.

#### `backend/app/utils/pexels.py`  — active, 36 LOC

*What it is.* A Pexels image-search helper. get_product_image(query) hits the Pexels v1 search API with per_page=1 and returns the first photo's 'large' src, falling back to a via.placeholder.com URL. Used by seeders/seed_products.py to populate Product.image.

**Issues**

- **P1 · performance** — pexels.py:23 response = requests.get( url, headers=headers, params=params ) — No timeout on the outbound request, so a hung Pexels connection blocks the caller (the 500-iteration seeder) indefinitely.
- **P2 · correctness** — pexels.py:7 PEXELS_API_KEY = os.getenv("PEXELS_API_KEY") — A missing/empty key is not validated, so every call quietly returns the placeholder URL and the failure looks like 'no images found' rather than a config error.
- **P2 · correctness** — pexels.py:36 return "https://via.placeholder.com/400" — The fallback points at via.placeholder.com, a service that is defunct/unreliable, so failed lookups produce broken image URLs in the DB.
- **P3 · design** — pexels.py:29 if response.status_code == 200: — Only 200 is handled with no logging of 429/401/5xx, so rate-limit and auth failures are indistinguishable from empty results.

*What it can be.* Harden this into a reliable image util: add a timeout (e.g. requests.get(..., timeout=10)) and wrap in try/except so network errors return the fallback instead of raising mid-seed. Validate PEXELS_API_KEY at call time and log non-200 responses (especially 429 rate limits, which matter when the seeder calls this 500 times). Replace the dead via.placeholder.com fallback with a locally-served or data-URI placeholder, and consider caching by query so repeated brand+category pairs in seed_products.py don't each hit the API.

#### `backend/app/utils/product_search.py`  — empty-stub, 0 LOC

*What it is.* A 0-byte empty file. Name implies reusable product-search logic, but the actual keyword search lives in chatbot_service.search_products and routes/product.py. No code here.

**Issues**

- **P2 · dead-code** — product_search.py:0 (0-byte file) — Empty placeholder; product-search logic is duplicated across chatbot_service.py and routes/product.py instead of living here.

*What it can be.* Make this the single source of truth for product querying. Move the keyword-extraction and ILIKE/OR search out of chatbot_service.py and the search endpoint in routes/product.py into one search_products(db, terms, limit) function here, then have both callers import it. That removes the duplication and gives one place to add proper ranking, pagination, and a category join. If consolidation is not planned, delete the stub.

#### `backend/app/prompts/e-prompts.py`  — empty-stub, 0 LOC

*What it is.* A 0-byte empty file intended to hold prompt templates for the AI chatbot. Currently the system prompt is inlined in chatbot_service.ask_ai, so this file is unused. The hyphen in the name also makes it non-importable as a normal module.

**Issues**

- **P2 · dead-code** — e-prompts.py:0 (0-byte file) — Empty placeholder; the prompt library it implies does not exist and the inline prompt in chatbot_service.py has no home here.
- **P3 · dx** — e-prompts.py filename contains a hyphen 'e-prompts.py' — The hyphen makes the module name invalid for a normal `import`, so this file could never be imported without importlib gymnastics.

*What it can be.* Rename to a valid module (e.g. prompts.py) and move the system prompt string currently hardcoded at chatbot_service.py:96-108 here as a named constant or a template function that takes the product context. That centralizes prompt wording for tuning and review and keeps chatbot_service focused on retrieval + the API call. If no prompt library is planned, delete it.

#### `backend/seeders/seed_products.py`  — active, 55 LOC

*What it is.* A run-once script that seeds 500 fake products. It loads all categories, picks a random brand/category, generates Faker name/description/price/stock, fetches a Pexels image per product, assigns a random seller_id in 1..20, and commits. Executed directly, not imported.

**Issues**

- **P1 · performance** — seed_products.py:46 image=get_product_image(f"{brand} {category.name}") — It makes one synchronous, timeout-less Pexels HTTP call inside a 500-iteration loop, so seeding is slow and will hit Pexels rate limits (429), silently filling image with placeholders.
- **P1 · correctness** — seed_products.py:30 seller_ids = list(range(1, 21)) — seller_id is hardcoded to 1..20 assuming seed_users ran first and produced exactly those IDs; if user IDs differ, products reference non-existent sellers with no FK guarantee.
- **P2 · correctness** — seed_products.py:27 categories = db.query(Category).all() — If the categories table is empty, choice(categories) raises IndexError and the whole seed aborts with no guard or seeding of categories first.
- **P2 · correctness** — seed_products.py:52 db.commit() — A single commit after 500 adds with no try/except means one bad row (or the IndexError above) rolls back or crashes the entire batch.
- **P3 · design** — seed_products.py:11 db = SessionLocal() — Session and loop run at module top level, so merely importing this file executes the seed and 500 API calls as a side effect.

*What it can be.* Wrap the whole thing in a def seed_products(count=500) with a __main__ guard so importing it is safe, and add try/except/rollback like seed_users.py already does. Guard against empty categories (seed them first or assert), and derive seller_ids from an actual query of User.role=='seller' instead of the hardcoded range(1,21). Batch or skip the per-row Pexels call (fetch once per brand+category and cache, or use a static asset) to make seeding fast and rate-limit-safe; add a timeout via the hardened pexels util.

#### `backend/seeders/seed_users.py`  — active, 34 LOC

*What it is.* A run-once script that seeds 100 fake users: the first 20 are role 'seller', the rest 'customer', each with Faker name/email/phone and the literal password '123456'. Commits inside try/except/finally with rollback. Executed directly.

**Issues**

- **P1 · security** — seed_users.py:19 password="123456" — Every seeded user shares the plaintext password '123456', which combined with the app's plaintext storage and open admin registration makes all 100 accounts trivially takeoverable.
- **P2 · design** — seed_users.py:9 db: Session = SessionLocal() — The session and 100-iteration insert loop run at module top level, so importing this file performs the seed as an import side effect.
- **P3 · correctness** — seed_users.py:13 role = "seller" if i < 20 else "customer" — No admin users are seeded and the seller/customer split is a magic threshold, so seed_products' assumption of seller IDs 1..20 is only coincidentally satisfied.
- **P3 · dx** — seed_users.py:27 print("✅ 100 users inserted successfully!") — Emoji in stdout can crash on Windows consoles using cp1252, aborting the script on the success message.

*What it can be.* Refactor into a def seed_users(n=100) with a __main__ guard so it is importable, and once password hashing exists (see the account_servoce.py vision) hash the seed password instead of storing '123456' in plaintext. Make roles explicit (seed a known admin, a fixed block of sellers, then customers) and have seed_products.py query the resulting seller IDs rather than assuming 1..20. Its existing try/except/rollback/finally pattern is the right template to copy into seed_products.py, which currently lacks it.

#### `backend/seeders/__init__.py`  — config, 0 LOC

*What it is.* A 0-byte empty package marker for the seeders directory. Contains no orchestration; the seed scripts must each be run manually.

**Issues**

- **P3 · dx** — __init__.py:0 (0-byte file) — Empty package init provides no unified seed entrypoint, so operators must know to run seed_users.py before seed_products.py in the right order.

*What it can be.* Turn this into a lightweight orchestrator exposing a run_all() that seeds in dependency order (categories, then users, then products) so the fragile seed_products->seller_ids assumption is enforced in one place. Expose the individual seed_* functions once the scripts are refactored away from top-level execution, enabling `python -m seeders`. Keeping it as a bare marker is acceptable only if a documented run order lives in a root README, which currently does not exist.

### 7. Frontend — App shell, global state & config

> **Area verdict.** This group is the frontend shell and build config for a Vite + React 19 SPA. App.jsx is the sole router and mounts every page; nearly all imports point into src/assets/pages, confirming that src/assets is the live copy and any parallel src/ component tree is the dead duplicate. The config files are essentially the stock Vite scaffold, untouched: no path aliases, no proxy, no env handling, no test tooling, and dependency versions that are implausibly high (React 19.2.7, Vite 8, ESLint 10) suggesting an unverified/AI-generated manifest. CartContext is the only shared state and hardcodes the backend origin and trusts a localStorage-supplied user id, matching the system-wide client-supplied-identity and no-API-client problems.

#### `frontend/src/App.jsx`  — active, 102 LOC

*What it is.* The application root and only router. Wraps everything in CartProvider + BrowserRouter and declares all 18 routes mapping paths to page components; renders a global ChatBot below the Routes.

**Issues**

- **P2 · design** — App.jsx:3-24 mix of "./assets/pages/..." and "../src/assets/pages/..." — Imports randomly alternate between relative './assets' and pointless '../src/assets' paths for the same directory, showing copy-paste churn and no import discipline.
- **P2 · design** — App.jsx:35-88 flat <Route> list, no auth guards — Seller and customer routes like '/seller/add-product' and '/customer-dashboard' are declared with zero guarding, so any visitor can open any dashboard directly.
- **P3 · dead-code** — App.jsx:11 "// import OrderSuccess from ./assets/pages/orderSuccess" — Commented-out duplicate import and commented '/home' route (line 49) are leftover cruft that should be deleted.
- **P3 · correctness** — App.jsx:33-90 no fallback <Route path="*"> — There is no catch-all/404 route, so unknown URLs render an empty page with only the ChatBot.
- **P3 · style** — App.jsx:52-88 wildly inconsistent JSX indentation — Route indentation is erratic (some flush-left, some nested), indicating no formatter is run on the file.

*What it can be.* This should be split into a route table and layout. Extract a routes array or a dedicated <AppRoutes> and add a <Route path="*"> 404 plus a <ProtectedRoute role="seller"> wrapper that reads the CartContext/auth user before rendering SellerDashboard, Products, AddProduct, EditProduct and SellerOrders. Normalize every import to './assets/pages/...' (or introduce a Vite '@' alias in vite.config.js and import from '@/pages/...') and delete the commented lines 11 and 49. Once the dead src/ duplicate tree is removed, these imports become unambiguous.

#### `frontend/src/main.jsx`  — active, 11 LOC

*What it is.* The Vite entry point. Creates the React root on #root and renders <App/> inside StrictMode; imports global index.css.

**Issues**

- **P3 · correctness** — main.jsx:6 createRoot(document.getElementById('root')) — No null-check or ErrorBoundary; if #root is missing or App throws, the user gets a blank white screen with no diagnostic.

*What it can be.* This is the natural home for cross-cutting providers and an error boundary. Wrap <App/> in a top-level <ErrorBoundary> that renders a fallback UI instead of a white screen, and this is where a future auth/theme provider would sit alongside CartProvider (currently CartProvider lives inside App.jsx and could move up here). Otherwise it is correct stock scaffold and needs little else.

#### `frontend/src/cartContext/CartContext.jsx`  — active, 63 LOC

*What it is.* The only shared React context. Provides a cartCount integer and a refreshCart function; on mount it reads the 'user' object from localStorage and GETs http://127.0.0.1:8000/cart/count/{user.id} to populate the badge count.

**Issues**

- **P1 · security** — CartContext.jsx:12-23 user = JSON.parse(localStorage...); fetch(`/cart/count/${user.id}`) — Cart count is fetched for whatever user.id sits in localStorage, so a user can read any account's cart count by editing localStorage — client-supplied identity.
- **P1 · design** — CartContext.jsx:22-24 fetch(`http://127.0.0.1:8000/cart/count/${user.id}`) — Backend origin is hardcoded here just like everywhere else; there is no API client, so no deploy can reach a non-localhost backend.
- **P2 · correctness** — CartContext.jsx:12 JSON.parse(localStorage.getItem("user")) — JSON.parse of corrupt localStorage will throw synchronously outside the try block, crashing the provider and thus the whole app.
- **P2 · correctness** — CartContext.jsx:27-33 no response.ok check before data.count — A non-200 response (or missing 'count' field) sets cartCount to undefined instead of surfacing the error, silently breaking the badge.
- **P3 · dx** — CartContext.jsx:30 console.log("Backend cart count:", data) — Debug console.log statements ship to production.

*What it can be.* This context should stop trusting localStorage for identity and stop hardcoding the origin. Introduce a shared src/api/client.js that reads import.meta.env.VITE_API_URL and centralizes fetch; CartContext then calls api.get('/cart/count') where the user is resolved server-side from a session/token rather than a URL-embedded id. Guard the JSON.parse in a try/catch, check response.ok before reading data.count, and drop the console.logs. This is the single seam through which every cart-count read flows, so fixing it here fixes the badge app-wide.

#### `frontend/index.html`  — config, 13 LOC

*What it is.* The Vite HTML template and single-page shell. Declares charset/viewport, favicon, page title 'e-shop', the #root mount node, and the module script pointing at /src/main.jsx.

**Issues**

- **P3 · accessibility** — index.html:7 <title>e-shop</title> — Static title and no meta description; SPA never updates the document title per route, hurting SEO and tab identification.
- **P3 · correctness** — index.html:9-12 <body> with only #root, no <noscript> — No <noscript> fallback, so JS-disabled or failed-bundle visitors see a blank page with no message.

*What it can be.* Keep it as the minimal Vite shell but add a <meta name="description">, a <noscript> fallback message, and adopt a per-route title mechanism (react-helmet-async or a small useDocumentTitle hook invoked in each page under App.jsx's routes). These are cheap SEO/UX wins that pair naturally with the routing cleanup in App.jsx.

#### `frontend/package.json`  — config, 29 LOC

*What it is.* The frontend dependency manifest and npm scripts (dev/build/lint/preview). Declares React 19, react-router-dom 7, react-icons, and the Vite/ESLint toolchain.

**Issues**

- **P1 · correctness** — package.json:13-27 "react": "^19.2.7", "vite": "^8.1.1", "eslint": "^10.6.0" — These version numbers exceed anything actually released (React 19.2.7, Vite 8, ESLint 10, @eslint/js 10), so a clean npm install will fail or resolve to unintended packages.
- **P2 · dx** — package.json:6-11 scripts have no "test" — No test script and no test dependency, matching the system-wide 'no tests' fact; there is no way to run a suite.
- **P2 · dx** — package.json:18-27 @types/react in a plain-JS project — @types/react and @types/react-dom are pulled in but the project is plain JavaScript with no TypeScript, so they are dead weight.
- **P3 · dx** — package.json:1-4 "name": "e-shop", "version": "0.0.0" — Placeholder version 0.0.0 and no engines field; Node version is unpinned across contributors.

*What it can be.* Pin every dependency to a real, installed version by regenerating from a working node_modules/lockfile, and commit package-lock.json (verify it is not gitignored). Add a 'test' script wired to Vitest + React Testing Library so CartContext and the router can be covered, add an 'engines' field pinning Node, and drop the @types/* dev deps since there is no TypeScript. A VITE_API_URL entry documented here (via .env.example) would support the API-client refactor CartContext.jsx needs.

#### `frontend/vite.config.js`  — config, 8 LOC

*What it is.* The Vite build/dev config. Stock scaffold that only registers the @vitejs/plugin-react plugin.

**Issues**

- **P2 · design** — vite.config.js:5-7 defineConfig({ plugins: [react()] }) — No dev-server proxy for the backend, so every fetch must hardcode http://127.0.0.1:8000 and CORS is relied on instead of a proxy.
- **P3 · design** — vite.config.js:5-7 no resolve.alias — No '@' path alias, forcing the brittle '../src/assets/...' relative import chains seen in App.jsx.

*What it can be.* Add a server.proxy entry mapping '/api' (or the specific backend routes) to http://127.0.0.1:8000 so the frontend can call same-origin relative URLs and drop every hardcoded origin including CartContext.jsx line 22. Add resolve.alias '@' -> '/src' to kill the '../src/assets' import noise in App.jsx. Optionally wire define/loadEnv so VITE_API_URL drives the base URL in production.

#### `frontend/eslint.config.js`  — config, 22 LOC

*What it is.* The ESLint flat config. Ignores dist, applies js recommended plus react-hooks and react-refresh rules to all js/jsx files with browser globals and JSX parsing.

**Issues**

- **P3 · dx** — eslint.config.js:7-20 no no-unused-vars/no-console customization — Config is the untouched scaffold; it never enforces removal of the dead commented imports in App.jsx or the console.logs in CartContext, so lint passes on obviously dirty code.

*What it can be.* Keep the flat-config base but tighten it: enable no-unused-vars as an error (would flag App.jsx's commented cruft once uncommented code drifts), no-console as a warning to catch CartContext.jsx debug logs, and add Prettier or eslint --fix to a CI/pre-commit step so the erratic indentation in App.jsx cannot land. This is the enforcement seam for every style/dead-code issue flagged in this group.

#### `frontend/.gitignore`  — config, 34 LOC

*What it is.* The frontend git-ignore rules. Covers node_modules, dist, editor files, plus Python/venv/sqlite/env/log patterns.

**Issues**

- **P2 · dx** — .gitignore:1-4 node_modules / dist / *.local — No lockfile is force-included and none is committed; combined with the implausible package.json versions, installs are non-reproducible.
- **P3 · design** — .gitignore:17-31 Python, venv, *.sqlite3 patterns — This frontend .gitignore contains backend Python/venv/sqlite rules, indicating it was copied wholesale and does not reflect this directory.

*What it can be.* Trim the Python/venv/sqlite blocks that belong in a backend .gitignore, and confirm package-lock.json is NOT ignored so it can be committed for reproducible installs. Add a '!.env.example' exception to keep an env template tracked while '.env' stays ignored, supporting the VITE_API_URL migration that vite.config.js and CartContext.jsx need.

### 8. Frontend — Auth pages

> **Area verdict.** This group is the entire auth surface of E-Shop, and it is half-built. Only three of six pages contain code (Login, Signup, Account); ForgotPassword, ResetPassword, and VerifyEmail are 0-byte files, so those features do not exist despite Login linking to /forgot-password. The pages that do exist encode the app's core insecurity: Login POSTs plaintext credentials to a hardcoded 127.0.0.1:8000 endpoint that issues no token, then persists the raw server user object (including role) into localStorage, and Account reads that same tamperable object to gate dashboards — meaning any user can grant themselves admin by editing one localStorage key. Every page duplicates fetch/alert/error boilerplate against hardcoded URLs with no shared API client and uses blocking alert() for all UX feedback.

#### `frontend/src/assets/pages/auth/login/Login.jsx`  — active, 119 LOC

*What it is.* React login page: controlled email/password form that POSTs to http://127.0.0.1:8000/login, alerts the returned message, stores the server-returned user object in localStorage, and navigates to a role-specific dashboard. This is the active copy (App.jsx imports it from src/assets/pages/auth/login/Login).

**Issues**

- **P0 · security** — login/Login.jsx:38 localStorage.setItem("user", JSON.stringify(data.user)) — The full server user object including role is written to localStorage with no token, so the client-trusted identity that gates every dashboard is fully attacker-editable.
- **P1 · correctness** — login/Login.jsx:40-46 if (data.user.role === "customer") — Role dispatch assumes data.user.role is always one of three strings; any other/absent role leaves the user on the login page with a success alert and no navigation.
- **P1 · design** — login/Login.jsx:24 fetch("http://127.0.0.1:8000/login" — The backend origin is hardcoded, so the built app only ever works against a local dev server and cannot be pointed at staging or production.
- **P2 · dx** — login/Login.jsx:35 alert(data.message) — All success and error feedback uses blocking alert() dialogs instead of inline UI, which is jarring and untestable.
- **P2 · correctness** — login/Login.jsx:91 <input type="checkbox" /> Remember Me — The Remember Me checkbox is uncontrolled and read by nothing, so it is a decorative control that silently does nothing.
- **P3 · correctness** — login/Login.jsx:95 <Link to="/forgot-password"> — This links to /forgot-password, but ForgotPassword.jsx is an empty file with no route, so the link is dead.

*What it can be.* Login should call a shared api client (e.g. src/api/client.js exposing login(credentials)) that reads the base URL from import.meta.env.VITE_API_URL instead of the hardcoded 127.0.0.1:8000 string repeated across every auth page. Once the backend issues a real token, this handler should store only that token and a minimal non-authoritative profile, replacing the localStorage.setItem("user", ...) trust chain that Account.jsx currently depends on. Replace alert() with inline error state (a useState errorMessage rendered near the form) and a submitting flag to disable the button, and drive the role redirect from a lookup map with a safe default route instead of the if/else ladder. Wire the Remember Me checkbox into controlled state so it actually influences token persistence.

#### `frontend/src/assets/pages/auth/signup/Signup.jsx`  — active, 300 LOC

*What it is.* React registration page: controlled form (name/email/phone/password/confirm/role/agree) with a live client-side password-strength checklist, that POSTs to http://127.0.0.1:8000/signup and lets the user self-select a customer or seller role. Active copy per App.jsx import.

**Issues**

- **P1 · security** — signup/Signup.jsx:67-73 body: JSON.stringify({ ... role: formData.role }) — Role is submitted straight from client state to a backend that trusts it, so registration is the entry point for the documented self-service privilege escalation.
- **P1 · design** — signup/Signup.jsx:59 fetch("http://127.0.0.1:8000/signup" — Backend origin is hardcoded identically to Login, duplicating the un-deployable URL with no shared config.
- **P2 · validation** — signup/Signup.jsx:5-11 special: /[!@#$%^&*(),.?":{}|<>]/.test(password) — Password strength is enforced only in the browser and trivially bypassed by any direct API call, giving false assurance about stored password quality.
- **P2 · dx** — signup/Signup.jsx:43 alert("Please accept the Terms & Conditions.") — Every validation and network outcome is surfaced via blocking alert(), so there is no inline field-level error rendering.
- **P3 · validation** — signup/Signup.jsx:153-160 type="tel" name="phone" placeholder="03XX XXXXXXX" — The phone field has no pattern or format validation despite the specific placeholder, so arbitrary strings are accepted and sent.
- **P3 · accessibility** — signup/Signup.jsx:179-197 {rules.length ? "✓" : "✗"} At least 8 characters — Password rule status is conveyed only by color class and a symbol with no aria-live region, so screen-reader users get no feedback as they type.

*What it can be.* Signup should route through the same shared api client and env-based base URL as Login rather than repeating the fetch/headers/alert boilerplate. The role selector must be treated as a request the server validates and defaults to customer; a seller signup should ideally become a pending application rather than an instantly-trusted role, closing the escalation path. Extract the passwordRules helper into a shared validation module reused by the (currently empty) ResetPassword page, and mirror it with a matching backend check so strength is enforced somewhere real. Swap the alert() gauntlet for inline error state and add an aria-live wrapper around the password-rules list so the live checklist is accessible.

#### `frontend/src/assets/pages/auth/account/Account.jsx`  — active, 120 LOC

*What it is.* React account page: reads the 'user' object from localStorage; if present, renders name/email/role plus a role-gated dashboard link and a logout button that clears localStorage; otherwise shows a login/signup call-to-action. Active copy per App.jsx import.

**Issues**

- **P0 · security** — account/Account.jsx:9 JSON.parse(localStorage.getItem("user")) — Identity and role are read from unauthenticated localStorage, so a user who edits the 'user' key to role:admin is treated as that role with no verification.
- **P1 · correctness** — account/Account.jsx:9 JSON.parse(localStorage.getItem("user")) — JSON.parse is called unguarded on the raw localStorage value, so any malformed/corrupted 'user' string throws and crashes the whole page render.
- **P2 · correctness** — account/Account.jsx:47-63 {user.role === "customer" && ...} {user.role === "seller" && ...} — An admin (or any other role) sees no dashboard link at all, leaving admins with only a Logout button on this page.
- **P3 · design** — account/Account.jsx:65-70 onClick={handleLogout} className="signup-btn" — Logout reuses the signup-btn CSS class, coupling unrelated actions to the same style so restyling one silently restyles the other.

*What it can be.* Account should derive its identity from a single shared auth hook/context (e.g. useAuth() backed by a token) rather than each page independently JSON.parse-ing localStorage, so authorization is centralized and verifiable. At minimum wrap the read in a try/catch that treats a bad payload as logged-out, eliminating the render crash. When real auth exists, this page should fetch fresh profile data from the backend using the token instead of trusting a cached role, and the dashboard-link block should be a role-to-route map that includes admin. Give logout its own semantic class instead of borrowing signup-btn.

#### `frontend/src/assets/pages/auth/forgotPassword/ForgotPassword.jsx`  — empty-stub, 0 LOC

*What it is.* Intended forgot-password page. The file is 0 bytes: the feature does not exist. Login.jsx links to /forgot-password but no route or component backs it.

**Issues**

- **P2 · dead-code** — forgotPassword/ForgotPassword.jsx:0 (empty file, 0 bytes) — The file is empty so the password-reset entry point promised by Login's Forgot Password link is a dead link to a non-existent feature.

*What it can be.* This should become a real page with a controlled email input that POSTs to a backend /forgot-password endpoint (which itself does not yet exist) to trigger a reset token, then shows a neutral confirmation regardless of whether the email exists to avoid account enumeration. It should reuse the shared api client and env base URL introduced for Login/Signup rather than hardcoding 127.0.0.1:8000. A route must be registered in App.jsx so Login.jsx:95's Link resolves. Pair it with the ResetPassword page below to form a complete flow.

#### `frontend/src/assets/pages/auth/resetPassword/ResetPassword.jsx`  — empty-stub, 0 LOC

*What it is.* Intended reset-password page (consume a reset token, set a new password). The file is 0 bytes: the feature does not exist and nothing routes to it.

**Issues**

- **P2 · dead-code** — resetPassword/ResetPassword.jsx:0 (empty file, 0 bytes) — The file is empty, so the second half of the password-reset flow implied by ForgotPassword has no implementation.

*What it can be.* This should read a reset token from the URL (useSearchParams) and render a new-password + confirm form that reuses Signup's passwordRules helper (once extracted to a shared module) for consistent strength enforcement. On submit it POSTs the token and new password to a backend reset endpoint via the shared api client, then redirects to /login on success. It needs a route in App.jsx and only makes sense alongside a real backend token-issuance flow, which currently does not exist.

#### `frontend/src/assets/pages/auth/verifyEmail/VerifyEmail.jsx`  — empty-stub, 0 LOC

*What it is.* Intended email-verification page. The file is 0 bytes: the feature does not exist, no route references it, and signup performs no verification.

**Issues**

- **P3 · dead-code** — verifyEmail/VerifyEmail.jsx:0 (empty file, 0 bytes) — The file is empty and unreferenced, so email verification is entirely absent and Signup treats every address as valid on creation.

*What it can be.* This should become a page that reads a verification token from the URL, calls a backend verify endpoint on mount, and shows success/failure/expired states with a resend option. It only has value once Signup and the backend actually issue verification tokens and gate login on verified status, none of which exists today. Wire it to a route in App.jsx and the shared api client. Until the backend supports verification, deleting this empty file would be more honest than leaving a stub that implies the feature exists.

### 9. Frontend — Seller pages

> **Area verdict.** These five files are the live seller-facing pages (confirmed active: App.jsx imports each from src/assets/pages/seller). They are hand-rolled CRUD screens that each independently JSON.parse localStorage 'user', trust its .id as the seller identity, hardcode http://127.0.0.1:8000, and hit the backend directly with fetch. Every mutating action (create/edit/delete product, change order status) sends a client-controlled id or product/order id with no ownership proof, so the frontend is the front door for IDOR. UX is uniformly alert()-driven with no loading/disabled states on submit, money is rendered as raw floats, and product.image is treated inconsistently (stored as a full URL in AddProduct but rendered as /images/${image} everywhere else, guaranteeing broken images).

#### `frontend/src/assets/pages/seller/AddProduct.jsx`  — active, 439 LOC

*What it is.* Seller 'Add Product' form. Fetches categories from GET /categories, holds a controlled product object in state, and POSTs to /products with seller_id pulled from localStorage on submit.

**Issues**

- **P1 · security** — AddProduct.jsx:6 `JSON.parse(localStorage.getItem("user"))` — Seller identity is read from client-controlled localStorage and sent as seller_id, so anyone can create products as any seller.
- **P1 · security** — AddProduct.jsx:81 `seller_id: seller?.id` — seller?.id is trusted from the browser with no token, letting a forged localStorage user attribute products to arbitrary sellers.
- **P2 · correctness** — AddProduct.jsx:166 `<form onSubmit={handleSubmit}>` — No submitting/disabled state means a double-click fires two POSTs and creates duplicate products.
- **P2 · validation** — AddProduct.jsx:77-79 `price: Number(product.price)` — price and stock are coerced with Number() and sent with no lower-bound or NaN check, allowing negative or non-numeric values.
- **P2 · correctness** — AddProduct.jsx:404 placeholder="https://example.com/image.jpg" — image is captured as a full external URL here but siblings render it as /images/${image}, so saved products display broken images.
- **P2 · design** — AddProduct.jsx:35 `"http://127.0.0.1:8000/categories"` — Base URL is hardcoded in every fetch with no API client, so this file cannot target a deployed backend.
- **P3 · design** — AddProduct.jsx:157 `<div className="add-product-page">` — Unlike EditProduct/SellerDashboard this page renders no Navbar/Footer, so the seller loses navigation chrome mid-flow.
- **P3 · dx** — AddProduct.jsx:86 `console.log("Payload:", payload);` — Debug console.log of the full payload is left in production code.
- **P3 · dx** — AddProduct.jsx:114 `alert("Product Added Successfully");` — Success and error feedback both use blocking alert() instead of inline UI.

*What it can be.* This should submit through a shared api client (e.g. src/api/products.js) that owns the base URL and injects the seller from an auth context/session rather than localStorage, dropping seller_id from the body entirely once the backend derives it from a token. Add a `submitting` state to disable the button (line 417) and a numeric guard so price/stock reject negatives and NaN before POST. Decide one image contract and honor it consistently with Products.jsx/EditProduct.jsx — either store full URLs and render them directly, or accept a filename and render /images/${image}. Wrap the page in the same Navbar/Footer layout EditProduct.jsx uses and replace alert() with an inline toast/message region.

#### `frontend/src/assets/pages/seller/EditProduct.jsx`  — active, 252 LOC

*What it is.* Seller 'Edit Product' page. Reads :id from the route, GETs /products/:id to prefill a form, and PUTs the edited fields back; wraps content in Navbar/Footer and navigates to /seller/products on success.

**Issues**

- **P1 · security** — EditProduct.jsx:91 `http://127.0.0.1:8000/products/${id}` — PUT targets any product id from the URL with no ownership check, so any user can edit another seller's product (IDOR).
- **P2 · correctness** — EditProduct.jsx:47 `category: data.category || ""` — Reads/sends a `category` string while AddProduct sends category_id, so the two forms disagree on the field and edits can drop the real category link.
- **P2 · correctness** — EditProduct.jsx:227 `src={`/images/${product.image}`}` — Prepends /images/ to a value that AddProduct stores as a full https URL, producing a broken preview image.
- **P2 · correctness** — EditProduct.jsx:26-30 `useEffect(() => { fetchProduct(); }, []);` — Empty dependency array with id used inside means navigating between edit routes without remount won't refetch the product.
- **P2 · design** — EditProduct.jsx:37 `http://127.0.0.1:8000/products/${id}` — Hardcoded base URL duplicated across fetches with no shared client.
- **P2 · correctness** — EditProduct.jsx:159 `<form onSubmit={handleSubmit}>` — No submitting/disabled state, so a double submit fires two PUTs before navigation.
- **P3 · dead-code** — EditProduct.jsx:6 `import { Link } from "react-router-dom";` — Link is imported but never used in the component.
- **P3 · dx** — EditProduct.jsx:127 `alert(data.detail);` — All feedback paths use blocking alert() instead of inline error/success UI.

*What it can be.* Add `id` to the useEffect dependency array and route the GET/PUT through the same shared products api module AddProduct should use, so the base URL and error handling live in one place. Reconcile the category field with AddProduct: fetch category_id, render the same <select> populated from GET /categories, and PUT category_id so create and edit are symmetric. Fix the image render to match the chosen contract (line 227) and add a `saving` flag to disable the Update button during the request. Replace alert() with inline messaging consistent with the layout it already imports (Navbar/Footer).

#### `frontend/src/assets/pages/seller/Products.jsx`  — active, 203 LOC

*What it is.* Seller product-list page. GETs /seller/products/:userId using the localStorage user's id, renders a table of the seller's products, and supports per-row Edit links and a DELETE-with-confirm action.

**Issues**

- **P1 · security** — Products.jsx:26 `http://127.0.0.1:8000/seller/products/${user.id}` — The seller whose products load is chosen by a client-controlled localStorage id, so any user can list any seller's inventory.
- **P1 · security** — Products.jsx:65 `http://127.0.0.1:8000/products/${id}` — DELETE fires on any product id with no ownership proof, letting any user delete another seller's product (IDOR + data loss).
- **P2 · correctness** — Products.jsx:149 `src={`/images/${product.image}`}` — Renders /images/${image} for a value stored as a full URL by AddProduct, so thumbnails break.
- **P2 · design** — Products.jsx:160 `<td>${product.price}</td>` — Money is printed as a raw backend float with no formatting, exposing values like $12.100000000000001.
- **P2 · design** — Products.jsx:25 `http://127.0.0.1:8000/seller/products/${user.id}` — Hardcoded base URL with no shared API client.
- **P3 · design** — Products.jsx:97 `<div className="products-page">` — No Navbar/Footer wrapper, inconsistent with EditProduct/SellerDashboard, so navigation disappears on this page.
- **P3 · dx** — Products.jsx:44 `alert("Unable to load products.");` — Loading and delete errors surface only through blocking alert().
- **P3 · correctness** — Products.jsx:20-23 `if (!user) { alert(...); return; }` — When no user is present it returns before setLoading(false)'s dependent UI, leaving the page stuck without redirecting to login.

*What it can be.* Move the list fetch and delete into a shared products api module and derive the seller from an auth context so /seller/products/:id and DELETE stop trusting a URL id. Add an optimistic or filtered local update on delete instead of a full refetch (line 77), and format price via a shared money helper (e.g. Intl.NumberFormat) rather than `${product.price}`. Align the image render with the project-wide contract used by AddProduct/EditProduct so thumbnails resolve. Wrap the page in Navbar/Footer for layout parity and redirect unauthenticated users to /login instead of alert-and-return.

#### `frontend/src/assets/pages/seller/SellerDashboard.jsx`  — active, 197 LOC

*What it is.* Seller dashboard. Fetches /seller/orders/:userId, derives summary cards (product count, order count, revenue, pending) from the orders array, renders a sidebar of seller links and a recent-orders table.

**Issues**

- **P1 · security** — SellerDashboard.jsx:29 `http://127.0.0.1:8000/seller/orders/${user.id}` — Dashboard data is scoped by a client-controlled localStorage id, so any user can view any seller's orders.
- **P2 · correctness** — SellerDashboard.jsx:95 `new Set(orders.map(o => o.product_id)).size` — 'Total Products' counts only distinct products that have orders, understating actual catalog size.
- **P2 · correctness** — SellerDashboard.jsx:82 `<NavLink to="/">Logout</NavLink>` — Logout is a plain link to / that never clears the localStorage user, so the 'session' persists after logout.
- **P2 · design** — SellerDashboard.jsx:78-81 `<NavLink to="/seller/customers">` — Sidebar links to /seller/customers, /analytics, /earnings, /settings which have no corresponding pages, producing dead navigation.
- **P2 · correctness** — SellerDashboard.jsx:53-56 `sum + Number(order.total)` — Revenue sums backend floats, accumulating rounding error and rendering unformatted currency at line 105.
- **P2 · design** — SellerDashboard.jsx:28 `http://127.0.0.1:8000/seller/orders/${user.id}` — Hardcoded base URL, duplicated with SellerOrders.jsx which hits the same endpoint.
- **P3 · dx** — SellerDashboard.jsx:21 `console.log("Seller User:", user);` — Debug console.log of the user object left in production.
- **P3 · design** — SellerDashboard.jsx:105 `<h2>${totalRevenue}</h2>` — Revenue rendered with no currency formatting or fixed decimals.

*What it can be.* The card metrics should come from purpose-built endpoints (a product count, an aggregated revenue) rather than being reverse-engineered from the orders array, so 'Total Products' reflects the real catalog. Share the /seller/orders fetch with SellerOrders.jsx via one hook/api module instead of duplicating the endpoint and base URL. Make Logout a real handler that clears localStorage and navigates, and either build or remove the dead sidebar routes (customers/analytics/earnings/settings). Format revenue through a shared money helper and drop the debug console.log.

#### `frontend/src/assets/pages/seller/SellerOrders.jsx`  — active, 265 LOC

*What it is.* Seller orders page. Fetches /seller/orders/:userId, renders each order row with image/price/total/status, and lets the seller change status via a <select> that PUTs to /seller/orders/:orderId/status then refetches.

**Issues**

- **P1 · security** — SellerOrders.jsx:71 `/seller/orders/${orderId}/status` — Status updates target any order id with no ownership proof, letting any user change any seller's order status (IDOR).
- **P1 · security** — SellerOrders.jsx:32 `http://127.0.0.1:8000/seller/orders/${user.id}` — Order list is scoped by a client-controlled localStorage id, exposing any seller's orders.
- **P2 · correctness** — SellerOrders.jsx:176 `src={`/images/${order.image}`}` — Prepends /images/ to image values that may be full URLs, breaking order thumbnails.
- **P2 · design** — SellerOrders.jsx:192 `${order.price}` — price and total are rendered as raw backend floats with no currency formatting.
- **P2 · design** — SellerOrders.jsx:31 `http://127.0.0.1:8000/seller/orders/${user.id}` — Hardcoded base URL, duplicating SellerDashboard.jsx's identical endpoint call.
- **P3 · performance** — SellerOrders.jsx:95 `fetchOrders();` — Every status change refetches the entire order list instead of updating the single changed row.
- **P3 · dx** — SellerOrders.jsx:37 `console.log("Seller Orders:", data);` — Debug console.log of the full orders payload left in production.
- **P3 · dx** — SellerOrders.jsx:93 `alert("Order status updated.");` — Every status update pops a blocking alert() rather than inline feedback.

*What it can be.* Route both the list fetch and the status PUT through a shared seller-orders api module (co-owned with SellerDashboard.jsx) that derives the seller from auth rather than a URL id and stops the IDOR on /status. Replace the full refetch after each update (line 95) with an optimistic local state patch of that order's status, reverting on error. Standardize image rendering against the project image contract and format price/total via a shared money helper. Remove the debug console.log and swap alerts for inline status feedback.

### 10. Frontend — Shopping flow (cart → checkout → orders)

> **Area verdict.** This group is the entire customer-facing shopping flow (cart, checkout, product detail, category/search browsing, order confirmation, customer dashboard) built as React 19 function components in plain JSX. Every file hardcodes the API origin http://127.0.0.1:8000 inline and trusts a client-supplied user.id read from localStorage, so all cart/order mutations are unauthenticated and addressable by raw id. Beyond the systemic auth gaps, the flow is functionally broken in several places: the checkout form collects a delivery address it never sends, ProductDetails' "Add to Cart" button does nothing, OrderSuccess ignores the real order and shows a hardcoded number, and SearchResults loses all data on refresh. The code is littered with leftover console.log/alert debugging and unguarded response parsing that will crash .map on error payloads.

#### `frontend/src/assets/pages/cart/Cart.jsx`  — active, 226 LOC

*What it is.* Cart page: reads the logged-in user from localStorage, GETs /cart/{user.id}, computes a client-side subtotal, and renders CartItem rows plus a CartSummary. Handles loading and empty/error states.

**Issues**

- **P1 · security** — Cart.jsx:38 `http://127.0.0.1:8000/cart/${user.id}` — Cart is fetched by a client-supplied user.id from localStorage with no auth, so any id enumerates any user's cart.
- **P2 · correctness** — Cart.jsx:55-57 `catch (error) { console.error(error);` — A network failure is swallowed with no setError, so the page silently renders as an empty cart instead of showing a connection error.
- **P3 · dx** — Cart.jsx:129-130 `console.log("cartItems state:", cartItems)` — Multiple leftover debug console.log statements (lines 27,35,43,50,129,130) run on every render in production.
- **P2 · design** — Cart.jsx:38 `http://127.0.0.1:8000/cart/` — API origin is hardcoded inline instead of using a shared client/base-URL, so the page cannot target any non-local backend.

*What it can be.* Cart should pull its data from a shared cart context/hook rather than re-fetching in isolation, so CartItem mutations and the navbar badge stay in sync without prop-drilling onCartUpdate. Replace the raw fetch with an apiClient.get('/cart') that injects identity from an auth token instead of interpolating user.id, and set the error state inside the catch so connection failures are visible. Strip all console.log lines and derive subtotal from a shared cents-based helper so the same number is trusted at checkout. Long term this becomes a thin view over a useCart() hook that also feeds CheckOut and CartSummary.

#### `frontend/src/assets/pages/checkout/CheckOut.jsx`  — active, 570 LOC

*What it is.* Checkout page: fetches the user's cart, renders a delivery-info form (name, phone, address, city, postal), a COD payment radio, and an order summary, then POSTs /orders and navigates to /order-success with the returned orderId/totalAmount.

**Issues**

- **P1 · correctness** — CheckOut.jsx:160-162 `body: JSON.stringify({ user_id: user.id })` — The entire delivery form (address, city, postal_code) is required and collected but never sent to the backend, so every order is placed with no shipping address.
- **P2 · correctness** — CheckOut.jsx:414-420 `type="radio" ... defaultChecked` — The payment method radio is uncontrolled and its value is never read, so payment choice is decorative and cannot ever be anything but implicit COD.
- **P1 · security** — CheckOut.jsx:131-161 `const user = JSON.parse(localStorage.getItem("user"))` — Order ownership is set from a client-supplied localStorage user.id, so anyone can place orders as any user id.
- **P3 · dx** — CheckOut.jsx:125 `alert("Your cart is empty.")` — User-facing errors use blocking alert() (lines 125,138,178,201) instead of inline UI, which is jarring and untestable.
- **P2 · design** — CheckOut.jsx:55 and CheckOut.jsx:152 `http://127.0.0.1:8000` — Two hardcoded API origins block any non-local deployment and duplicate the base URL.

*What it can be.* The delivery form must actually drive the order: include formData in the POST /orders body (or a preceding /addresses call) so the address the user typed is persisted, and read the payment radio into controlled state so it is submitted too. Move the fetch onto the shared apiClient with token-derived identity instead of user.id, and swap the alert() calls for the same inline checkout-error block already present at lines 251-255. Since this file re-implements the same cart fetch and subtotal as Cart.jsx, both should consume a single useCart() hook so the summary here can never disagree with the cart page. This is the highest-value file to fix because it currently produces addressless orders.

#### `frontend/src/assets/pages/customer/CustomerDashboard.jsx`  — active, 327 LOC

*What it is.* Customer account dashboard with a sidebar (Dashboard / My Orders / several inert menu items) and a main panel showing order stats and an orders table with per-order cancel (DELETE /orders/{orderId}).

**Issues**

- **P1 · security** — CustomerDashboard.jsx:74 `http://127.0.0.1:8000/orders/${orderId}` — Cancel issues an unauthenticated DELETE keyed only on orderId with no ownership check, so any user can cancel any order by guessing ids.
- **P2 · correctness** — CustomerDashboard.jsx:152-154 `<li className="logout">Logout</li>` — The Logout item has no onClick handler, so logging out is impossible from this dashboard.
- **P2 · dead-code** — CustomerDashboard.jsx:146-150 `<li>Wishlist</li>` — Wishlist, Shopping Cart, Addresses, Payment Methods, and Account Settings are static list items with no handlers or routes, presenting features that do not exist.
- **P2 · correctness** — CustomerDashboard.jsx:117-121 `src="https://i.pravatar.cc/120" ... <h2>Customer</h2>` — The profile card shows a stock avatar and the literal string 'Customer' instead of the logged-in user's real name/photo.
- **P3 · correctness** — CustomerDashboard.jsx:269 `order.status.toLowerCase()` — A null/undefined order.status throws and blanks the whole table since there is no guard.
- **P3 · style** — CustomerDashboard.jsx:182-186 `total + Number(order.total_amount), 0` — Total Spent is summed with no toFixed, so float storage produces long decimal artifacts in the stat card.

*What it can be.* Wire the real user object into the profile card (name, email) and give Logout an onClick that clears localStorage and navigates to /login, matching the identity handling used across the flow. Either implement the inert sidebar items as routed tabs or remove them so the UI stops advertising missing features. Cancel should call apiClient.delete scoped to the authenticated user so the backend can enforce ownership, and status rendering should guard against null. Format money through a shared currency helper (the same one Cart/CheckOut need) so Total Spent reads as $123.45.

#### `frontend/src/assets/pages/productDetails/ProductDetails.jsx`  — active, 103 LOC

*What it is.* Product detail page: reads :id from the route, GETs /products/{id}, and renders image, category, name, brand, description, price, stock, and an Add-to-Cart button.

**Issues**

- **P1 · correctness** — ProductDetails.jsx:88-93 `<button className="add-cart-btn" disabled={product.stock === 0}>` — The Add to Cart button has no onClick, so the primary action of the product page does nothing.
- **P2 · correctness** — ProductDetails.jsx:54-56 `product.image?.startsWith("http") ? product.image : placehold` — Any non-http image (a stored filename) always falls back to a placeholder, unlike CartItem.jsx:94-97 which serves /images/{file}, so real product images never display here.
- **P3 · style** — ProductDetails.jsx:1-3 imports omit Navbar/Footer — Unlike every sibling page this component renders no Navbar or Footer, so the detail page loses global chrome and looks broken.
- **P3 · style** — ProductDetails.jsx:79 `${product.price}` — Price is rendered raw with no toFixed(2), exposing float artifacts from the Float-typed backend column.

*What it can be.* Give Add to Cart a handler that POSTs to /cart via the shared cart hook and reflects success (matching how CartItem mutates quantity), passing the quantity and product id. Reuse the /images/{file} fallback logic from CartItems.jsx so local product images render instead of a placeholder, ideally factored into a shared resolveImage() util used by all four image sites in this group. Add the Navbar/Footer wrapper for consistency and format price through the common currency helper. This file is one onClick away from being the funnel entry that actually feeds the cart it currently only describes.

#### `frontend/src/assets/pages/searchResults/SearchResults.jsx`  — active, 62 LOC

*What it is.* Search results page: reads products and keyword from react-router location.state and renders them as a ProductCard grid, or a no-results message.

**Issues**

- **P2 · correctness** — SearchResults.jsx:12-13 `location.state?.products || []` — Results live only in navigation state, so a page refresh, back/forward, or shared /search link always shows '0 results found'.
- **P3 · dx** — SearchResults.jsx:6 `from "../../../../src/productSection/productCard"` — ProductCard is imported via a fragile four-level relative path that also re-enters src/, signalling the duplicated src vs src/assets tree.

*What it can be.* Drive search from the URL instead of router state: read ?q= from useSearchParams and fetch /products?search=q inside a useEffect, mirroring CategoryProducts.jsx's fetch pattern, so results survive refresh and are linkable. Add loading and error states like the other data pages. Normalize the ProductCard import through a path alias (@/productSection/productCard) to eliminate the ../../../../ traversal once the duplicated directories are collapsed.

#### `frontend/src/assets/pages/categoryProducts/CategoryProducts.jsx`  — active, 101 LOC

*What it is.* Category listing page: reads :id, fetches /categories/{id} for the name and /categories/{id}/products for the grid, and renders ProductCards with a count.

**Issues**

- **P2 · correctness** — CategoryProducts.jsx:50-52 `const data = await response.json(); setProducts(data)` — Neither fetch checks response.ok, so an error payload ({detail:...}) is passed straight to setProducts and then .map at line 80 throws.
- **P2 · correctness** — CategoryProducts.jsx:34-38 `catch (error) { console.error(error) }` — There is no loading or error UI, so a failed category fetch just renders an empty grid with a stale/blank title.
- **P3 · performance** — CategoryProducts.jsx:18-19 `fetchCategory(); fetchCategoryProducts();` — Two sequential round-trips for one page where the products endpoint could return the category name, doubling latency.
- **P2 · design** — CategoryProducts.jsx:27 and CategoryProducts.jsx:47 `http://127.0.0.1:8000` — Hardcoded API origin duplicated across both fetches.

*What it can be.* Add response.ok guards and loading/error state so an error body can never reach .map, matching the defensive pattern Cart.jsx attempts. Collapse the two requests into one /categories/{id} response that embeds products, or run them with Promise.all so they are concurrent rather than sequential. Route both calls through the shared apiClient to drop the hardcoded origin. With ProductCard shared across this file and SearchResults, extract a single ProductGrid component to own the empty/loading/grid rendering.

#### `frontend/src/assets/pages/orderSuccess/OrderSuccess.jsx`  — active, 51 LOC

*What it is.* Static order confirmation page rendered after checkout, showing a success icon, thank-you copy, an order number, and links to orders / home.

**Issues**

- **P1 · correctness** — OrderSuccess.jsx:28 `Order Number: <strong>#ESHOP-1001</strong>` — The order number is a hardcoded constant; CheckOut passes real orderId/totalAmount via navigate state but this page ignores it, so every customer sees the same fake order.
- **P3 · correctness** — OrderSuccess.jsx:33 `<Link to="/orders">` — 'View My Orders' links to /orders, but the customer order view lives on the dashboard, so the link likely dead-ends.

*What it can be.* Read useLocation().state for the orderId and totalAmount that CheckOut already sends and display the real values, redirecting to home if state is absent (a direct hit). Point 'View My Orders' at the actual customer dashboard orders tab so the confirmation flows into order history. This turns a static placeholder into a genuine receipt with almost no new data plumbing since the upstream navigate already carries the payload.

#### `frontend/src/assets/components/CartItems.jsx`  — active, 165 LOC

*What it is.* Single cart-row component: renders image/name/brand/price, quantity +/- controls that PUT /cart/{cart_id}, and a Remove button that DELETEs /cart/{cart_id}, calling onCartUpdate to refresh.

**Issues**

- **P1 · security** — CartItems.jsx:12 `http://127.0.0.1:8000/cart/${item.cart_id}` — PUT and DELETE act on a raw cart_id with no auth or ownership check, so anyone can edit or delete any user's cart rows by id.
- **P2 · validation** — CartItems.jsx:131-137 `updateQuantity(Number(item.quantity) + 1)` — The increment button has no upper bound against product stock, allowing quantities beyond available inventory.
- **P3 · correctness** — CartItems.jsx:96 ``/images/${item.image}`` — When item.image is undefined the src becomes '/images/undefined', producing a broken request instead of a placeholder.
- **P3 · dx** — CartItems.jsx:26 `console.log("PUT response:", data)` — Leftover debug logs (lines 26 and 64) fire on every cart mutation.
- **P3 · performance** — CartItems.jsx:115-140 quantity buttons — Buttons are never disabled during the in-flight PUT, so rapid clicks fire overlapping requests that race on the same row.

*What it can be.* Route the PUT/DELETE through the shared apiClient with token identity so the backend can verify the cart row belongs to the caller, removing the id-addressable mutation. Add optimistic local state plus a disabled-while-pending guard so quantity clicks don't race, and cap increments at item.stock. Reuse a shared resolveImage(item.image) helper (the same one ProductDetails and CheckOut need) so the undefined case yields a real placeholder. Drop the console.logs. This component is the natural home for the mutation half of a useCart() hook.

#### `frontend/src/assets/components/CartSummary.jsx`  — active, 44 LOC

*What it is.* Presentational cart totals box: shows subtotal, free shipping, total, and a Link to /checkout.

**Issues**

- **P2 · correctness** — CartSummary.jsx:15 `<span>${subtotal}</span>` — subtotal is rendered raw with no toFixed(2) (lines 15 and 31), so Float math surfaces values like $19.990000000001 to the shopper.
- **P3 · design** — CartSummary.jsx:22-24 `<span>Free</span>` — Shipping is hardcoded 'Free' and there is no tax line, so the summary can never reflect real fees.

*What it can be.* Format subtotal/total through the shared currency helper the whole flow needs so money always renders as $19.99, and accept shipping/tax as props so the box can show real charges once the backend computes them. Since CheckOut.jsx re-implements this exact summary markup at lines 494-533, extract one OrderSummary component consumed by both the cart and checkout to keep the numbers and layout identical.

### 11. Frontend — Marketing & shared components

> **Area verdict.** This group is the public-facing "marketing" surface of E-Shop: the landing page composition, hero/features/promo banners, footer, navbar, contact form, static customer-review wall, category grid, and a new-arrivals page. App.jsx routes "/", "/newarrivals", "/contact", "/customerreview" to the assets/ copies read here, so these are the active copies (the parallel src/components duplicates are the dead ones). The dominant problems are inert UI (Contact form, footer links, hero/promo buttons do nothing), hardcoded http://127.0.0.1:8000 fetches with no API client, unescaped search input, fabricated review/testimonial data presented as real, and pervasive missing loading/error handling plus form accessibility. Nothing here is exploitable server-side on its own, but the navbar/categories fetches leak the backend's total absence of validation to the client.

#### `frontend/src/assets/pages/Home/Home.jsx`  — active, 25 LOC

*What it is.* Landing-page composition component; renders Navbar, Hero, Features, Products, Categories, FlashSale, PromotionalBanner and Footer in sequence for the '/' route.

**Issues**

- **P3 · design** — Home/Home.jsx:4 import Products from "../../../productSection/products" — Deep ../../../ relative imports crossing assets/ and src/ boundaries make this file brittle to any directory move.
- **P3 · design** — Home/Home.jsx:11-22 <><Navbar /><Hero />...</> — Page layout is a flat hardcoded fragment with no shared page shell, so every route re-imports Navbar and Footer independently.

*What it can be.* This should stay a thin composition file but delegate the repeated Navbar+Footer wrapper to a shared <Layout> component (a sibling to this file) that Contact.jsx, CustomerReview.jsx and NewArrivals.jsx also consume, eliminating the four separate Navbar/Footer imports across this group. The deep ../../../productSection and ../../categorySection imports should resolve through a Vite path alias (e.g. '@/productSection/products') so the file survives directory reorganization. Section order (Products before Categories before FlashSale) could be data-driven from a small config array to make the homepage reorderable without editing JSX.

#### `frontend/src/assets/components/hero.jsx`  — active, 31 LOC

*What it is.* Static hero banner: heading, marketing paragraph, a 'Shop Now' button, and a hero image loaded from /images/hero.jpg.

**Issues**

- **P2 · correctness** — hero.jsx:16 <button>Shop Now</button> — The primary hero CTA has no onClick or Link, so the main call-to-action does nothing when clicked.
- **P3 · dead-code** — hero.jsx:2 // import "../" — A commented-out stub import is left in the file as noise.
- **P3 · accessibility** — hero.jsx:21-22 src="/images/hero.jpg" alt="Hero Product" — Hardcoded image path with generic alt text and no width/height, causing layout shift and a meaningless screen-reader label.

*What it can be.* The 'Shop Now' button should become a react-router <Link to="/newarrivals"> (or to a products anchor) matching how navbar.jsx and categoriesCard.jsx already use Link, so the hero actually drives traffic. Delete the dead import on line 2. The image should carry explicit width/height (or an aspect-ratio container) and descriptive alt text, and ideally the hero copy/image should come from a small props or CMS-like config object so marketing can change the headline without a code deploy.

#### `frontend/src/assets/components/features.jsx`  — active, 54 LOC

*What it is.* Renders a four-item value-proposition strip (Responsive, Secure, Free Shipping, Transparent) from a local array using react-icons.

**Issues**

- **P3 · correctness** — features.jsx:38 key={index} — Uses array index as React key; harmless for this static list but sets a copied-around anti-pattern.
- **P3 · validation** — features.jsx:19-20 title: "Secure", text: "100% Safe Payments" — Claims '100% Safe Payments' while the system has no auth and stores passwords in plaintext, a false marketing assertion baked into the UI.

*What it can be.* This is a clean presentational component; its main fix is honesty and reuse. The 'Secure / 100% Safe Payments' and 'Transparent / No hidden charges' claims should be softened or substantiated given the backend has no authentication, so the UI does not assert security guarantees the platform cannot meet. The features array could be lifted into a shared content module alongside the hero copy, and keys should use a stable feature.title instead of the array index. Otherwise this file is fine as-is.

#### `frontend/src/assets/components/navbar.jsx`  — active, 132 LOC

*What it is.* Global navigation header: logo, nav links, a product search box that GETs /products/search and navigates to /search with results, and cart/account icons with a live cart-count badge from CartContext.

**Issues**

- **P2 · security** — navbar.jsx:27 `.../products/search?keyword=${search}` — Raw user search text is interpolated into the query string with no encodeURIComponent, so '&', '#', or spaces corrupt the request and reflect unescaped input.
- **P2 · design** — navbar.jsx:26-28 fetch("http://127.0.0.1:8000/products/search...") — Hardcoded localhost API base in a shared component means search breaks in any non-local deployment.
- **P3 · dx** — navbar.jsx:43 alert(data.detail); ... :50 alert("Unable to connect to server.") — User-facing errors are surfaced via blocking alert() instead of inline UI.
- **P3 · design** — navbar.jsx:120 <Link to="/account"> — Account icon always routes to /account regardless of login state, since there is no auth-aware conditional.

*What it can be.* Search should build the URL with `encodeURIComponent(search)` and route through a shared api client module (e.g. api.searchProducts(keyword)) that centralizes the base URL from import.meta.env.VITE_API_URL, killing the hardcoded 127.0.0.1 here and in categories.jsx. The alert() error paths should become an inline error/empty state on the results view, and the search handler could debounce or disable the button while in-flight. The account link should read the localStorage user and point to /login vs /account/customer-dashboard/seller-dashboard based on presence and role, mirroring the role logic that already exists in the auth pages.

#### `frontend/src/assets/pages/Contact/Contact.jsx`  — active, 80 LOC

*What it is.* Contact page: static company address/phone/email block plus a name/email/subject/message form, wrapped in Navbar and Footer.

**Issues**

- **P2 · correctness** — Contact.jsx:42 <form className="contact-form"> ... :64 <button type="submit"> — Form has no onSubmit handler and no state, so submitting triggers a full-page reload and silently discards the message.
- **P2 · validation** — Contact.jsx:44-62 <input .../> <textarea ...> — None of the inputs are controlled or marked required, and there is no validation, so empty/garbage submissions are unconstrained.
- **P2 · accessibility** — Contact.jsx:44-47 <input type="text" placeholder="Your Name" /> — Fields use placeholders as their only labels with no <label>/htmlFor, failing screen-reader labeling.

*What it can be.* This should become a working controlled form: useState for name/email/subject/message, an onSubmit with e.preventDefault(), client-side required/email validation, and a POST to a real /contact backend endpoint (which does not yet exist and would need to be added) through the shared api client. Each input needs an associated <label htmlFor> for accessibility, and the submit button should show a pending/success/error state instead of the current silent page reload. The hardcoded Lahore address/phone/email could live in the same shared content module suggested for the footer so contact details are defined once.

#### `frontend/src/assets/pages/customerReview/CustomerReview.jsx`  — active, 97 LOC

*What it is.* Testimonials page rendering six hardcoded reviews (name, star rating, quote) in a grid, wrapped in Navbar and Footer.

**Issues**

- **P2 · design** — CustomerReview.jsx:8-51 const reviews = [ { name: "Ali Khan", rating: 5 ... } ] — All 'customer reviews' are fabricated static data presented to shoppers as genuine testimonials.
- **P3 · correctness** — CustomerReview.jsx:74 [...Array(review.rating)].map((_, index) => (<FaStar ... — Renders only filled stars up to the rating with no empty-star track, so a 4-star and 5-star review are visually indistinguishable in width without context.

*What it can be.* Reviews should be fetched from a real backend endpoint (e.g. GET /products/{id}/reviews or a site-wide /reviews) via the shared api client, using the useEffect+useState fetch pattern already in categories.jsx, so the wall reflects actual purchases rather than invented names. Until such data exists, the hardcoded array should at minimum be labeled as sample content, not real testimonials. The star renderer should draw a fixed five-star track (filled up to rating, muted for the remainder) for honest visual comparison, and each card could show the reviewed product and date.

#### `frontend/src/assets/pages/newArrivals/NewArrivals.jsx`  — active, 40 LOC

*What it is.* New Arrivals page mapping a local newArrivals data array into ProductCard components, wrapped in Navbar and Footer.

**Issues**

- **P2 · design** — NewArrivals.jsx:7 import newArrivals from "../../data/newArrivals" — New arrivals come from a static bundled JS file, not the products API, so the page never reflects real inventory.
- **P3 · design** — NewArrivals.jsx:6 import ProductCard from "../../../../src/productSection/productCard" — Four-level ../../../../src path reaching back into src/ is fragile and inconsistent with sibling imports.

*What it can be.* This page should fetch recent products from the backend (e.g. GET /products?sort=created_desc&limit=N, an ordering the API would need to support) through the shared api client, replacing the static ../../data/newArrivals import, and render loading/empty/error states like a real listing. Reuse the same ProductCard the main product grid uses, imported via a path alias rather than the ../../../../src climb. Given the backend has no created_at ordering guarantee, this is also a prompt to add a proper timestamp/sort to the products endpoint.

#### `frontend/src/Footer/footer.jsx`  — active, 67 LOC

*What it is.* Global site footer: brand blurb, Quick Links list, Customer Service list, social icons, and a copyright bar.

**Issues**

- **P2 · correctness** — footer.jsx:28-32 <li>Home</li><li>Products</li>... — Every 'Quick Link' and 'Customer Service' entry is a plain <li> with no Link/href, so the entire footer navigation is non-functional.
- **P3 · accessibility** — footer.jsx:50-53 <FaFacebook /><FaInstagram />... — Social icons are bare SVGs with no links, no aria-labels, and no keyboard focusability.
- **P3 · style** — footer.jsx:60 © 2026 E-Shop. All Rights Reserved. — Copyright year is hardcoded and will silently go stale.

*What it can be.* The Quick Links and Customer Service lists should become react-router <Link> elements (Home->'/', Products->products anchor, Contact Us->'/contact', matching navbar routes) and the social icons should be anchor tags with real hrefs and aria-labels so the footer is actually navigable and accessible. The copyright year should be computed via new Date().getFullYear(). Because Footer lives under src/Footer while pages live under src/assets, consider moving it beside the other shared components and folding it into the shared <Layout> so it is imported once rather than by every page.

#### `frontend/src/categorySection/categories.jsx`  — active, 62 LOC

*What it is.* Homepage 'Shop by Category' section that fetches GET /categories on mount and renders each as a CategoryCard.

**Issues**

- **P2 · design** — categories.jsx:17-19 fetch("http://127.0.0.1:8000/categories") — Hardcoded localhost base URL means the category grid is empty in any non-local environment.
- **P2 · correctness** — categories.jsx:23 setCategories(data) — Response is stored without checking response.ok or that data is an array, so an error object crashes the .map on line 43.
- **P3 · design** — categories.jsx:9-11 useEffect(() => { fetchCategories(); }, []) — No loading or error UI state, so failures render a silently empty section with only a console.error.

*What it can be.* Route this fetch through the shared api client (api.getCategories()) reading the base URL from VITE_API_URL, and guard with `if (!response.ok) throw` plus `Array.isArray(data)` before setState so a backend error can never crash the map. Add loading (skeleton cards) and error states via useState so the section degrades gracefully. This is the cleanest fetch pattern in the group, so it is the natural template to standardize; navbar.jsx's search should adopt the same client and error handling.

#### `frontend/src/categorySection/categoriesCard.jsx`  — active, 26 LOC

*What it is.* Presentational card for a single category: a Link to /category/:id wrapping the category image and name.

**Issues**

- **P3 · correctness** — categoriesCard.jsx:13-16 <img src={category.image} alt={category.name} /> — Renders category.image directly with no fallback, so a null/broken image URL shows a broken-image icon.
- **P3 · performance** — categoriesCard.jsx:14 src={category.image} — No loading="lazy" or dimensions on category images, hurting LCP and causing layout shift in the grid.

*What it can be.* Add loading="lazy", explicit width/height (or an aspect-ratio wrapper), and an onError fallback to a placeholder so missing category.image values do not render broken icons. If category.image is a backend-relative path, resolve it against the same VITE_API_URL base used by the api client rather than assuming an absolute URL. The component is otherwise a solid, minimal presentational card and needs no structural change.

#### `frontend/src/promotionalBanner/PromoBanner.jsx`  — active, 24 LOC

*What it is.* Static 'Summer Mega Sale' promotional banner with heading, subtext, and a 'Shop Now' button.

**Issues**

- **P2 · correctness** — PromoBanner.jsx:16 <button>Shop Now</button> — The promo CTA has no onClick or Link, so the 'Save up to 50%' banner button does nothing.
- **P3 · design** — PromoBanner.jsx:9-14 <h2>Summer Mega Sale</h2> — Sale title, discount, and 'limited time' copy are hardcoded with no tie to any real promotion or expiry.

*What it can be.* The 'Shop Now' button should be a react-router <Link> to the flash-sale or discounted-products view so the banner converts, matching the Link usage in categoriesCard.jsx. The banner copy (title, discount percentage, expiry) should be driven by a promotion config or a backend /promotions endpoint so marketing can change or retire the sale without a deploy, and a real countdown could back the 'Limited time offer' claim. As a static component this is otherwise trivial and correct.


### 12. Frontend — Product grid, flash sale, chatbot & fixture data

> **Area verdict.** A real, unauthenticated API layer (`products.jsx`, `ProductCard`'s `/cart` POST, `ChatBot`'s `/chatbot`) is intermixed with hardcoded fixture data (`FlashSale.jsx`, `products.js`, `categories.js`, `newArrivals.js`) that was never removed. The defining bug is fixture ids `1..N` being POSTed as real `product_id`s to `/cart` — dead in `products.js`, latent in `FlashSale`, but **live and user-facing via `newArrivals.js`** — compounded by `ProductCard` rendering `category`/`rating` fields the real API never returns. Cross-cutting rot: a duplicated add-to-cart handler (`productCard` vs `FlashSaleCard`), an ignored `disabled` prop in `ChatInput` that lets users spam the chatbot, stray `console.log`s, no chatbot message cap, and the hardcoded `127.0.0.1:8000` origin everywhere.

#### `frontend/src/productSection/products.jsx`  — active, 115 LOC

*What it is.* The Featured-products section (imported by `Home.jsx`). Fetches a page of real products from `/products?page=&limit=12` plus a separate `/products/count`, stores them in state, and renders a `ProductCard` grid with Prev/Next pagination.

**Issues**

- **P1 · correctness** — productSection/products.jsx:38 `setProducts(productsData)` — No `Array.isArray` guard, so if the API returns an error object instead of a list, `products.map` at line 72 throws and blanks the page.
- **P2 · performance** — productSection/products.jsx:32 `"…/products/count"` — The invariant total count is refetched on every page change (same `[page]` effect), doubling requests per pagination click for data that never changes.
- **P2 · correctness** — productSection/products.jsx:41 `} catch (error) {` — A failed fetch only `console.error`s then renders an empty grid with no error message — silent failure indistinguishable from "no products".
- **P2 · correctness** — productSection/products.jsx:26 `await fetch(` — No `AbortController`; rapid Prev/Next clicks race and can resolve out of order, painting a stale page over the current one.
- **P3 · dx** — productSection/products.jsx:27 `http://127.0.0.1:8000/products?page=` — Hardcoded origin, no shared API client — the anti-pattern repeated across the whole frontend.

*What it can be.* Guard the response (`setProducts(Array.isArray(productsData) ? productsData : [])`) and surface a real error state instead of an empty grid. Split the count fetch into its own `[]`-deps effect so it runs once. Wire an `AbortController` into the effect cleanup. Longer term, this and `categorySection/categories.jsx` should both consume a single `api.get('/products', {page, limit})` module instead of hardcoding the origin.

#### `frontend/src/productSection/productCard.jsx`  — active, 136 LOC

*What it is.* The presentational product card used by **both** real API data (Featured Products) and fixture data (New Arrivals). Renders image/name/category/price/rating and an Add-to-Cart button that reads `localStorage.user` and POSTs `{user_id, product_id, quantity:1}` to `/cart`.

**Issues**

- **P0 · security** — productSection/productCard.jsx:34 `user_id: user.id` — Identity is a client-supplied localStorage value with no auth token, so any client adds items to any user's cart by changing `id`.
- **P1 · correctness** — productSection/productCard.jsx:95 `{product.category}` — The real `/products` API never returns `category`, so for Featured Products this renders empty; it only shows for fixtures — a real data-shape mismatch.
- **P1 · correctness** — productSection/productCard.jsx:109 `{product.rating || "5.0"}` — Real API rows have no `rating`, so every real product silently displays a fabricated "5.0" star rating.
- **P2 · correctness** — productSection/productCard.jsx:35 `product_id: product.id` — When fed a fixture (New Arrivals ids 1–4), it POSTs that fixture id, colliding with unrelated real DB product rows.
- **P2 · design** — productSection/productCard.jsx:12 `const handleAddToCart = async () => {` — This entire handler is duplicated near-verbatim in `FlashSaleCard.jsx`.
- **P3 · design** — productSection/productCard.jsx:52 `alert("Product added to cart.")` — A blocking native `alert` on the normal success path is jarring for a common action.

*What it can be.* Stop rendering `category`/`rating` unless the source actually provides them (conditionally render, or normalize fixtures and API into one shape) so real products don't show blanks and fake stars. Extract the add-to-cart logic into a shared `useAddToCart(product)` hook so this file and `FlashSaleCard.jsx` stop diverging. Replace the `alert()` success with the toast/badge pattern `refreshCart()` already implies. The `user.id` identity problem is systemic and belongs in a real auth layer, but this component is where it surfaces.

#### `frontend/src/flashSale/FlashSale.jsx`  — active, 127 LOC

*What it is.* The Home-page flash-sale section (live copy; a stale duplicate exists at `src/assets/flashSale/FlashSale.jsx`). Defines a hardcoded 4-item `flashProducts` array (ids 1–4), renders a countdown timer counting down from 2 hours via `setInterval`, and maps each fixture to a `FlashSaleCard`.

**Issues**

- **P1 · correctness** — flashSale/FlashSale.jsx:5 `const flashProducts = [` — Hardcoded fixtures with ids 1–4 that `FlashSaleCard` POSTs straight to the real `/cart`, colliding with real DB `product_id`s.
- **P2 · dx** — flashSale/FlashSale.jsx:65 `console.log(timeLeft);` — Stray debug log firing on every one-second render tick in production.
- **P2 · design** — flashSale/FlashSale.jsx:43 `useState(2 * 60 * 60)` — The countdown resets to a fresh 2 hours on every mount/refresh, so "ends in 2 hours" is fictional — not anchored to a real end timestamp.
- **P3 · correctness** — flashSale/FlashSale.jsx:86 `<button className="shop-btn">` — The "Shop All" button has no `onClick` — a dead control.
- **P3 · design** — flashSale/FlashSale.jsx:12 `image: "/images/hero.jpg"` — Every product uses the same placeholder hero image.

*What it can be.* Either drive the flash sale from the real `/products` API (with a real sale-end time from the backend so the timer survives refresh) or clearly quarantine it as demo content that never touches `/cart`. Delete the line-65 `console.log`. Give "Shop All" a route (`navigate('/products')`) or remove it. Delete the stale `src/assets/flashSale/` twin so edits aren't made twice.

#### `frontend/src/flashSale/FlashSaleCard.jsx`  — active, 97 LOC

*What it is.* The presentational flash-sale card. Renders discount badge, image, name, new/old price, and an Add-to-Cart button whose handler is a near-exact copy of `productCard.jsx`'s.

**Issues**

- **P0 · security** — flashSale/FlashSaleCard.jsx:11 `JSON.parse(localStorage.getItem("user"))` — Same unauthenticated client-supplied identity as `productCard` — trivially spoofable `user_id`.
- **P2 · correctness** — flashSale/FlashSaleCard.jsx:29 `product_id: product.id` — Posts the fixture id (1–4) to the real `/cart`, adding whatever real DB row has that id instead of the shown product.
- **P2 · design** — flashSale/FlashSaleCard.jsx:9 `const handleAddToCart = async () => {` — Copy-pasted from `productCard.jsx` (same URL, body, alerts, catch) — two copies to maintain.
- **P3 · design** — flashSale/FlashSaleCard.jsx:41 `alert("Product added to cart.")` — Blocking native alert on the success path.

*What it can be.* Collapse this handler and `productCard`'s into one shared `useAddToCart` hook, so the cart contract lives in one place. The fixture-id-to-real-cart collision is only truly fixed once flash-sale items carry real backend product ids. Swap the success `alert` for the shared toast pattern.

#### `frontend/src/assets/components/chatbot/ChatBot.jsx`  — active, 148 LOC

*What it is.* The floating AI shopping-assistant widget (rendered globally in `App.jsx`). Holds a message list, POSTs `{message}` to `/chatbot`, appends the bot's `data.reply`, shows a "Thinking..." bubble while loading, and toggles open/closed.

**Issues**

- **P2 · validation** — chatbot/ChatBot.jsx:22 `if (!text.trim()) return;` — Only checks non-empty; no maximum length, so an arbitrarily long message is sent straight to the backend LLM endpoint.
- **P2 · dx** — chatbot/ChatBot.jsx:49 `console.log("Status:", response.status)` — Debug logging of every request status and full response body (line 53) left in production.
- **P2 · dx** — chatbot/ChatBot.jsx:35 `"http://127.0.0.1:8000/chatbot"` — Hardcoded origin again, no API client.
- **P3 · correctness** — chatbot/ChatBot.jsx:112 `key={index}` — Array index used as React key for the message list — fragile.
- **P3 · design** — chatbot/ChatBot.jsx:123 `text: "Thinking..."` — The loading state is faked as a normal bot message rather than a distinct typing indicator, so it reads identically to real replies.

*What it can be.* Remove the two `console.log`s. Add a length guard (`text.length > 500`) before sending, paired with a `maxLength` on `ChatInput`. Render "Thinking..." as a dedicated typing indicator rather than a `ChatMessage`. Since `ChatBot` already computes `loading` and passes `disabled={loading}` to `ChatInput`, the fix is completed by `ChatInput` actually honoring that prop.

#### `frontend/src/assets/components/chatbot/ChatInput.jsx`  — active, 50 LOC

*What it is.* The controlled chat text input plus Send button. Tracks local `text`, calls `onSend(text)` on click or Enter, then clears the field.

**Issues**

- **P1 · dead-code** — chatbot/ChatInput.jsx:3 `function ChatInput({ onSend })` — Destructures only `onSend` and ignores the `disabled={loading}` prop `ChatBot` passes, so input and Send are never disabled and the user can fire concurrent requests.
- **P2 · correctness** — chatbot/ChatInput.jsx:33 `e.key === "Enter" && handleSend()` — Because `disabled` is ignored, Enter can submit repeatedly during loading, spamming `/chatbot`.
- **P3 · validation** — chatbot/ChatInput.jsx:21 `<input` — No `maxLength` — the client half of the missing message cap.
- **P3 · accessibility** — chatbot/ChatInput.jsx:21 `type="text"` — Placeholder only, no `<label>`/`aria-label` for screen readers.

*What it can be.* Accept and apply the prop — `function ChatInput({ onSend, disabled })` — set `disabled={disabled}` on both `<input>` and `<button>`, and short-circuit `handleSend`/Enter when disabled. Add `maxLength={500}` and an `aria-label`. A one-line-contract fix: `ChatBot` already sends the prop; the component just drops it.

#### `frontend/src/assets/components/chatbot/ChatMessage.jsx`  — active, 20 LOC

*What it is.* A stateless single-bubble renderer. Applies `message user` or `message bot` by `message.sender` and renders `message.text`. Small and mostly clean.

**Issues**

- **P3 · accessibility** — chatbot/ChatMessage.jsx:5 `<div className={` — No `role`/`aria-live` on the container, so screen readers get no announcement as bubbles arrive.
- **P3 · correctness** — chatbot/ChatMessage.jsx:13 `{message.text}` — No handling if `message.text` is undefined; renders raw text only, so future markdown/links in replies won't render.
- **P3 · style** — chatbot/ChatMessage.jsx:1 `function ChatMessage({ message })` — No PropTypes/JSDoc; the `{sender, text}` contract is implicit.

*What it can be.* Keep it presentational but add an `aria-live="polite"` wrapper (better at the `chat-body` level) so assistive tech announces replies. If bot replies ever include links/formatting, this is the single choke point to add safe rendering. Otherwise this file needs the least work of the group.

#### `frontend/src/assets/data/products.js`  — dead-or-duplicate, 110 LOC

*What it is.* Exports a hardcoded array of 12 product fixtures (ids 1–12) with category/rating/oldPrice. Grep confirms it is imported nowhere in `src` — leftover mock data superseded by the real `/products` API.

**Issues**

- **P2 · dead-code** — data/products.js:1 `export const products = [` — Not imported by any module — dead fixture file.
- **P2 · correctness** — data/products.js:3 `id: 1` — These ids would collide with real DB `product_id`s on `/cart` if ever wired to `ProductCard` (same class of bug as FlashSale/newArrivals).
- **P3 · correctness** — data/products.js:39 `name: "AirPods Pro"` — Ids 5–12 are identical copy-pasted "AirPods Pro" filler, not a real catalog.
- **P3 · design** — data/products.js:6 `category: "Smartphone"` — This file is the template origin of the `category`/`rating` shape `ProductCard` still renders for real API data that lacks those fields.

*What it can be.* Delete it — the live path is `products.jsx` fetching `/products`. If retained for Storybook/demo, move it under a clearly-named `__fixtures__` directory and never let it reach the cart POST. Its existence is what keeps the `category`/`rating` render shape alive in `ProductCard`.

#### `frontend/src/assets/data/categories.js`  — dead-or-duplicate, 42 LOC

*What it is.* Exports 8 hardcoded category fixtures (Phones/Laptops/… with placeholder images). Imported only by the orphaned duplicate `src/assets/categorySection/categories.jsx`; the live `src/categorySection/categories.jsx` fetches `/categories`.

**Issues**

- **P2 · dead-code** — data/categories.js:1 `export const categories = [` — Consumed only by a dead duplicate component, not the active category section.
- **P3 · correctness** — data/categories.js:4 `name: "Phones"` — This static list will drift from whatever the real `/categories` endpoint serves.
- **P3 · design** — data/categories.js:5 `image: "/images/hero.jpg"` — All eight categories share the same placeholder image.

*What it can be.* Delete this file and its orphaned consumer `src/assets/categorySection/categories.jsx`, since the live category section already fetches from the API. Part of the broader `src`-vs-`src/assets` duplication cleanup (§13).

#### `frontend/src/assets/data/newArrivals.js`  — active, 39 LOC

*What it is.* Exports 4 hardcoded "new arrival" fixtures (ids 1–4). **Actively rendered**: the `/newarrivals` route maps these through the real `ProductCard`, so these fixtures reach the real `/cart`.

**Issues**

- **P0 · correctness** — data/newArrivals.js:4 `id: 1` — This fixture id (and 2–4) is POSTed as `product_id` to the real `/cart` by `ProductCard`, so "adding" the Samsung Galaxy actually stores whatever real DB product #1 is — a live, user-facing wrong-item bug.
- **P2 · correctness** — data/newArrivals.js:6 `category: "Smartphone"` / :8 `rating: 4.8` — These fixture-only fields are exactly why `ProductCard` shows category/rating on New Arrivals but blank/"5.0" on real products — an inconsistent data model across pages.
- **P2 · dead-code** — data/newArrivals.js:31 `name: "AirPods Pro"` — Duplicates the shape and content of the dead `products.js`.
- **P3 · design** — data/newArrivals.js:1 `const newArrivals = [` — A static array can never be "new"; the page is a permanent mock, images all `/images/hero.jpg`.

*What it can be.* This is the highest-priority data file because it is live and reaches the cart. Replace it with a real `/products?sort=newest` fetch in `NewArrivals.jsx` (mirroring `products.jsx`) so cards carry genuine DB ids and the collision disappears. Until then the New Arrivals Add-to-Cart buttons actively store wrong products. Aligning its shape with the real API also resolves the `ProductCard` category/rating inconsistency.


### 13. Cross-cutting — Duplicate directories & near-empty style files

> **Area verdict.** This group is the accumulated debris of a project that was reorganized (files "moved to frontend folder" per the latest commit) without deleting the originals. Four component directories exist in duplicate across src/ and src/assets/; the live copy is whichever path Home.jsx happens to import, and it is inconsistent (categorySection and promotionalBanner and Footer resolve into assets/, but flashSale resolves back up to src/), leaving one dead twin of each. A shared style layer (styles/global.css, reset.css, variable.css) exists but is imported by nothing, and several CSS files (Home.css plus three auth CSS) are 0-byte stubs. A compiled Python bytecode file is also committed. None of this affects runtime behavior; it is pure confusion and repo bloat that a .gitignore plus deletions would erase.

#### `frontend/src/Footer`  — dead-or-duplicate, 66 LOC

*What it is.* Duplicate Footer component (footer.jsx + footer.css) rendering the site footer. This src/-level copy is the DEAD twin; every page imports Footer via "../../Footer/footer" from src/assets/pages/*, which resolves to src/assets/Footer, not this directory.

**Issues**

- **P2 · dead-code** — frontend/src/assets/pages/Home/Home.jsx:8: import Footer from "../../Footer/footer"; — This import resolves to src/assets/Footer, so src/Footer/footer.jsx is imported by nobody and is dead.
- **P3 · dead-code** — frontend/src/Footer/footer.jsx:67: export default Footer; — An exported-but-never-imported component that duplicates the live src/assets/Footer byte-for-byte.

*What it can be.* Delete this directory outright; the live copy is src/assets/Footer and no import references src/Footer. Before deleting, diff footer.jsx against src/assets/Footer/footer.jsx to confirm they are identical (both are 66 lines). Longer term, Footer should live in a single src/components/ or src/shared/ folder and be imported by an absolute alias (e.g. @/components/Footer) instead of the fragile "../../Footer/footer" relative chains that made this duplication invisible in the first place.

#### `frontend/src/categorySection`  — dead-or-duplicate, 61 LOC

*What it is.* Duplicate category-grid component (categories.jsx + categoriesCard.jsx). Notably this DEAD copy is the API-driven one: categories.jsx fetches http://127.0.0.1:8000/categories at runtime, whereas the live src/assets/categorySection copy renders hardcoded static data.

**Issues**

- **P2 · dead-code** — frontend/src/assets/pages/Home/Home.jsx:5: import Categories from "../../categorySection/categories"; — Home imports categorySection from src/assets/, leaving this API-backed src/categorySection copy dead.
- **P1 · design** — frontend/src/categorySection/categories.jsx:18: "http://127.0.0.1:8000/categories" — The better, backend-driven implementation is the dead one; the app ships the static-data twin instead.

*What it can be.* This is the wrong copy to delete: it is the version that actually fetches live categories from the backend. The correct cleanup is to promote this file's fetch logic into the live src/assets/categorySection/categories.jsx (which currently imports a static '../data/categories'), then delete this directory. The result should be a single categorySection that pulls from the /categories endpoint, ideally through a shared api client instead of a hardcoded 127.0.0.1:8000 string (the same URL is duplicated in AddProduct.jsx and CategoryProducts.jsx).

#### `frontend/src/assets/flashSale`  — dead-or-duplicate, 83 LOC

*What it is.* Duplicate flash-sale carousel (FlashSale.jsx + FlashSaleCard.jsx). This assets/ copy is the DEAD twin and is the smaller/older one (FlashSale.jsx 83 lines, FlashSaleCard.jsx 37 lines) versus the live src/flashSale copy (127 and 98 lines).

**Issues**

- **P2 · dead-code** — frontend/src/assets/pages/Home/Home.jsx:6: import FlashSale from "../../../flashSale/FlashSale"; — The triple-dot path escapes assets/ up to src/flashSale, so this assets/flashSale copy is dead.
- **P3 · correctness** — frontend/src/assets/flashSale/FlashSaleCard.jsx:4: function FlashSaleCard({ product }) { — This dead card is 37 lines vs the live 98-line version, so the twins have diverged and can silently rot.

*What it can be.* Delete this directory; the live copy is src/flashSale (reached by the "../../../flashSale/FlashSale" import in Home.jsx). The inconsistency worth fixing is directional: flashSale is the only one of the four components whose live copy sits in src/ rather than src/assets/, while categorySection/promotionalBanner/Footer live under assets/. Pick one home for all shared components and move flashSale there too, so the import roots stop zig-zagging between src/ and src/assets/.

#### `frontend/src/promotionalBanner`  — dead-or-duplicate, 23 LOC

*What it is.* Duplicate promotional banner component (PromoBanner.jsx). This src/-level copy is DEAD, and it even reaches across into the assets tree for its stylesheet, importing "../assets/promotionalBanner/PromoBanner.css".

**Issues**

- **P2 · dead-code** — frontend/src/assets/pages/Home/Home.jsx:7: import PromotionalBanner from "../../promotionalBanner/PromoBanner"; — Home imports the assets/ banner, so this src/promotionalBanner/PromoBanner.jsx is never rendered.
- **P3 · design** — frontend/src/promotionalBanner/PromoBanner.jsx:1: import "../assets/promotionalBanner/PromoBanner.css"; — The dead copy pulls its CSS from the assets copy, so the two are entangled and confusing to reason about.

*What it can be.* Delete this directory; the live copy is src/assets/promotionalBanner (imported by Home.jsx via "../../promotionalBanner/PromoBanner"). Its cross-tree CSS import is a smell that proves someone half-migrated it. After deletion, only src/assets/promotionalBanner/PromoBanner.jsx and its co-located PromoBanner.css remain, which is self-consistent.

#### `frontend/src/assets/styles/global.css`  — dead-or-duplicate, 3 LOC

*What it is.* Intended global base stylesheet: sets body margin 0 and a default Arial font stack. It is a 3-line stub and is imported by no file in the project.

**Issues**

- **P3 · dead-code** — frontend/src/assets/styles/global.css:2: margin: 0; — A global stylesheet that nothing imports (grep for 'global.css' across frontend returns zero references).

*What it can be.* Either wire this into src/main.jsx as the single global base (import './assets/styles/global.css') alongside reset.css and variable.css, or delete it. Right now index.css exists at src/ and is the de facto global while this file is orphaned. Consolidate to one global entry point imported once in main.jsx and remove the dead duplicate so there is a single obvious place for base styles.

#### `frontend/src/assets/styles/reset.css`  — dead-or-duplicate, 4 LOC

*What it is.* Intended CSS reset: universal selector zeroing margin/padding and setting box-sizing: border-box. 4-line stub, imported nowhere.

**Issues**

- **P3 · dead-code** — frontend/src/assets/styles/reset.css:4: box-sizing: border-box; — A reset stylesheet that is never imported, so the box-sizing reset it defines does not actually apply.

*What it can be.* Import this once at the top of main.jsx before any component CSS so the border-box reset actually takes effect app-wide, or fold its three rules into a single consolidated base stylesheet with global.css and variable.css. As-is it is dead intent; components each redefine their own box model implicitly. Decide on one reset and import it exactly once.

#### `frontend/src/assets/styles/variable.css`  — dead-or-duplicate, 4 LOC

*What it is.* Intended design-token file declaring :root CSS custom properties (--primary-color, --font-size). 4-line stub, imported nowhere; --primary-color is even set to the invalid value #ffff.

**Issues**

- **P3 · dead-code** — frontend/src/assets/styles/variable.css:1: :root{ — A design-token file that nothing imports, so var(--primary-color)/var(--font-size) resolve nowhere in the app.
- **P3 · correctness** — frontend/src/assets/styles/variable.css:2: --primary-color:#ffff; — #ffff is not a valid hex color (needs 3, 4, 6, or 8 digits), so the token would be white or ignored.

*What it can be.* This should become the real design-system token layer: import it once in main.jsx, fix --primary-color to a valid hex (e.g. #ffffff or the brand color), and expand it with spacing/radius/color tokens that the many component CSS files currently hardcode. Then refactor Login.css/Signup.css/Account.css to consume var(--primary-color) instead of literal colors. Right now it is aspirational dead code with a broken value.

#### `frontend/src/assets/pages/Home/Home.css`  — empty-stub, 0 LOC

*What it is.* Stylesheet stub for the Home page. The file is 0 bytes; the Home page styling it implies does not exist.

**Issues**

- **P3 · dead-code** — frontend/src/assets/pages/Home/Home.css:0: (0-byte file, no content) — An empty CSS file that promises Home-page styling which was never written.

*What it can be.* Either delete this 0-byte file (Home.jsx composes already-styled child components: Categories, FlashSale, PromoBanner, Footer, so it may need no styles of its own), or give it the actual Home layout rules (section spacing, hero wrapper) if Home should own page-level layout. Check whether Home.jsx even imports it; if not, deletion is the honest move.

#### `frontend/src/assets/pages/auth/forgotPassword/ForgotPassword.css`  — empty-stub, 0 LOC

*What it is.* Stylesheet stub for a Forgot Password screen. 0 bytes. Combined with the no-auth facts about this system, it signals a password-reset feature that is UI-scaffolded but non-functional.

**Issues**

- **P3 · dead-code** — frontend/src/assets/pages/auth/forgotPassword/ForgotPassword.css:0: (0-byte file) — Empty stylesheet for a forgot-password flow that has no backend support and no styling.

*What it can be.* Do not style this in isolation; the forgot-password flow has no backend behind it (there is no auth or token issuance anywhere in the system). Either delete the empty CSS along with a decision to defer the feature, or, if password reset is built for real, style it to match the working Login.css/Signup.css (77 and 79 lines) so the auth screens share one visual language. As a 0-byte file it is a promise the app cannot keep.

#### `frontend/src/assets/pages/auth/resetPassword/ResetPassword.css`  — empty-stub, 0 LOC

*What it is.* Stylesheet stub for a Reset Password screen. 0 bytes. Part of the same non-functional auth scaffold as forgotPassword and verifyEmail.

**Issues**

- **P3 · dead-code** — frontend/src/assets/pages/auth/resetPassword/ResetPassword.css:0: (0-byte file) — Empty stylesheet for a reset-password screen with no working reset flow behind it.

*What it can be.* Same treatment as ForgotPassword.css: this belongs to a reset flow that cannot work given the plaintext-password, no-token backend. Either delete it as part of formally shelving password reset, or, when the flow is implemented properly, style it consistently with the existing Login/Signup CSS. Leaving a 0-byte file gives a false impression that the screen is designed.

#### `frontend/src/assets/pages/auth/verifyEmail/VerifyEmail.css`  — empty-stub, 0 LOC

*What it is.* Stylesheet stub for an email-verification screen. 0 bytes. There is no email-sending or verification logic in the backend, so this is decorative scaffolding.

**Issues**

- **P3 · dead-code** — frontend/src/assets/pages/auth/verifyEmail/VerifyEmail.css:0: (0-byte file) — Empty stylesheet for an email-verification screen that has no verification backend.

*What it can be.* Delete alongside a decision to drop email verification, or build the feature end-to-end (token issuance, an email provider with an outbound HTTP timeout, a verify endpoint) and then style this screen to match Login.css/Signup.css. Until the backend can actually verify email, the empty CSS and its parent screen are pure facade; the honest state is either a real feature or no file.

#### `backend/app/services/__pycache__/chatbot_service.cpython-314.pyc`  — generated, 0 LOC

*What it is.* Compiled Python bytecode for chatbot_service, produced by CPython 3.14 and committed to git. It is a generated build artifact, not source.

**Issues**

- **P2 · dx** — backend/app/services/__pycache__/chatbot_service.cpython-314.pyc: tracked in git ls-files — A compiled .pyc bytecode file is checked into version control, which is noise and can go stale against its source.
- **P3 · security** — backend/app/services/__pycache__/chatbot_service.cpython-314.pyc: cpython-314 bytecode blob — Committed bytecode can silently diverge from chatbot_service.py and may embed inlined constants that outlive source edits.

*What it can be.* Remove from tracking with `git rm --cached backend/app/services/__pycache__/chatbot_service.cpython-314.pyc` and add a backend .gitignore containing `__pycache__/` and `*.pyc` (the repo currently has no root README or backend dependency manifest either, so a proper .gitignore is overdue). The commit history shows a prior 'Remove Python cache files' commit, so this one slipped back in; a .gitignore is the durable fix so cache artifacts never re-enter the tree.


---

### Appendix A — Complete file inventory

Every tracked file, with line count and status. Binary images and `package-lock.json` are listed for completeness but not audited. "DEAD (duplicate)" marks the unused copy of a directory duplicated between `src/` and `src/assets/` (see §13).

| File | LOC | Status |
|---|---:|---|
| **Backend** | | |
| `backend/app/config.py` | 8 | active |
| `backend/app/database.py` | 23 | active |
| `backend/app/main.py` | 48 | active |
| `backend/app/models/cart.py` | 15 | active |
| `backend/app/models/categories.py` | 17 | active |
| `backend/app/models/order_Item.py` | 17 | active |
| `backend/app/models/orders.py` | 33 | active |
| `backend/app/models/product.py` | 35 | active |
| `backend/app/models/user.py` | 16 | active |
| `backend/app/prompts/e-prompts.py` | 0 | empty stub |
| `backend/app/routes/account.py` | 78 | active |
| `backend/app/routes/cart.py` | 206 | active |
| `backend/app/routes/categories.py` | 102 | active |
| `backend/app/routes/chatbot.py` | 27 | active |
| `backend/app/routes/orders.py` | 289 | active |
| `backend/app/routes/product.py` | 196 | active |
| `backend/app/schemas/cart.py` | 19 | active |
| `backend/app/schemas/categories.py` | 4 | active |
| `backend/app/schemas/order.py` | 20 | active |
| `backend/app/schemas/product.py` | 38 | active |
| `backend/app/schemas/user.py` | 14 | active |
| `backend/app/services/__pycache__/chatbot_service.cpython-314.pyc` | 38 | generated (tracked — remove) |
| `backend/app/services/account_servoce.py` | 0 | empty stub |
| `backend/app/services/ai_services.py` | 0 | empty stub |
| `backend/app/services/chatbot_service.py` | 120 | active |
| `backend/app/test_db.py` | 8 | active |
| `backend/app/utils/pexels.py` | 36 | active |
| `backend/app/utils/product_search.py` | 0 | empty stub |
| `backend/seeders/__init__.py` | 0 | empty stub |
| `backend/seeders/seed_products.py` | 55 | active |
| `backend/seeders/seed_users.py` | 34 | active |
| **Frontend — src/** | | |
| `frontend/src/App.css` | 191 | stylesheet |
| `frontend/src/App.jsx` | 102 | active |
| `frontend/src/Footer/footer.css` | 67 | DEAD (duplicate) |
| `frontend/src/Footer/footer.jsx` | 67 | DEAD (duplicate) |
| `frontend/src/assets/Footer/footer.css` | 67 | stylesheet |
| `frontend/src/assets/Footer/footer.jsx` | 67 | active |
| `frontend/src/assets/categorySection/categories.css` | 22 | stylesheet |
| `frontend/src/assets/categorySection/categories.jsx` | 31 | active |
| `frontend/src/assets/categorySection/categoriesCard.css` | 30 | stylesheet |
| `frontend/src/assets/categorySection/categoriesCard.jsx` | 37 | active |
| `frontend/src/assets/components/CartItems.jsx` | 165 | active |
| `frontend/src/assets/components/CartSummary.jsx` | 44 | active |
| `frontend/src/assets/components/chatbot/ChatBot.css` | 82 | stylesheet |
| `frontend/src/assets/components/chatbot/ChatBot.jsx` | 149 | active |
| `frontend/src/assets/components/chatbot/ChatInput.jsx` | 51 | active |
| `frontend/src/assets/components/chatbot/ChatMessage.jsx` | 21 | active |
| `frontend/src/assets/components/features.css` | 46 | stylesheet |
| `frontend/src/assets/components/features.jsx` | 54 | active |
| `frontend/src/assets/components/hero.css` | 49 | stylesheet |
| `frontend/src/assets/components/hero.jsx` | 31 | active |
| `frontend/src/assets/components/navbar.css` | 156 | stylesheet |
| `frontend/src/assets/components/navbar.jsx` | 132 | active |
| `frontend/src/assets/data/categories.js` | 42 | active |
| `frontend/src/assets/data/newArrivals.js` | 40 | active |
| `frontend/src/assets/data/products.js` | 110 | active |
| `frontend/src/assets/flashSale/FlashSale.css` | 56 | DEAD (duplicate) |
| `frontend/src/assets/flashSale/FlashSale.jsx` | 84 | DEAD (duplicate) |
| `frontend/src/assets/flashSale/FlashSaleCard.css` | 73 | DEAD (duplicate) |
| `frontend/src/assets/flashSale/FlashSaleCard.jsx` | 37 | DEAD (duplicate) |
| `frontend/src/assets/pages/Contact/Contact.css` | 91 | stylesheet |
| `frontend/src/assets/pages/Contact/Contact.jsx` | 80 | active |
| `frontend/src/assets/pages/Home/Home.css` | 0 | empty stub |
| `frontend/src/assets/pages/Home/Home.jsx` | 25 | active |
| `frontend/src/assets/pages/auth/account/Account.css` | 70 | stylesheet |
| `frontend/src/assets/pages/auth/account/Account.jsx` | 120 | active |
| `frontend/src/assets/pages/auth/forgotPassword/ForgotPassword.css` | 0 | empty stub |
| `frontend/src/assets/pages/auth/forgotPassword/ForgotPassword.jsx` | 0 | empty stub |
| `frontend/src/assets/pages/auth/login/Login.css` | 78 | stylesheet |
| `frontend/src/assets/pages/auth/login/Login.jsx` | 119 | active |
| `frontend/src/assets/pages/auth/resetPassword/ResetPassword.css` | 0 | empty stub |
| `frontend/src/assets/pages/auth/resetPassword/ResetPassword.jsx` | 0 | empty stub |
| `frontend/src/assets/pages/auth/signup/Signup.css` | 80 | stylesheet |
| `frontend/src/assets/pages/auth/signup/Signup.jsx` | 300 | active |
| `frontend/src/assets/pages/auth/verifyEmail/VerifyEmail.css` | 0 | empty stub |
| `frontend/src/assets/pages/auth/verifyEmail/VerifyEmail.jsx` | 0 | empty stub |
| `frontend/src/assets/pages/cart/Cart.css` | 90 | stylesheet |
| `frontend/src/assets/pages/cart/Cart.jsx` | 226 | active |
| `frontend/src/assets/pages/categoryProducts/CategoryProducts.css` | 57 | stylesheet |
| `frontend/src/assets/pages/categoryProducts/CategoryProducts.jsx` | 101 | active |
| `frontend/src/assets/pages/checkout/CheckOut.css` | 145 | stylesheet |
| `frontend/src/assets/pages/checkout/CheckOut.jsx` | 570 | active |
| `frontend/src/assets/pages/customer/CustomerDashboard.css` | 185 | stylesheet |
| `frontend/src/assets/pages/customer/CustomerDashboard.jsx` | 327 | active |
| `frontend/src/assets/pages/customerReview/CustomerReview.css` | 62 | stylesheet |
| `frontend/src/assets/pages/customerReview/CustomerReview.jsx` | 97 | active |
| `frontend/src/assets/pages/newArrivals/NewArrivals.css` | 88 | stylesheet |
| `frontend/src/assets/pages/newArrivals/NewArrivals.jsx` | 40 | active |
| `frontend/src/assets/pages/orderSuccess/OrderSuccess.css` | 78 | stylesheet |
| `frontend/src/assets/pages/orderSuccess/OrderSuccess.jsx` | 51 | active |
| `frontend/src/assets/pages/productDetails/ProductDetails.css` | 105 | stylesheet |
| `frontend/src/assets/pages/productDetails/ProductDetails.jsx` | 103 | active |
| `frontend/src/assets/pages/searchResults/SearchResults.css` | 66 | stylesheet |
| `frontend/src/assets/pages/searchResults/SearchResults.jsx` | 62 | active |
| `frontend/src/assets/pages/seller/AddProduct.css` | 107 | stylesheet |
| `frontend/src/assets/pages/seller/AddProduct.jsx` | 439 | active |
| `frontend/src/assets/pages/seller/EditProduct.css` | 98 | stylesheet |
| `frontend/src/assets/pages/seller/EditProduct.jsx` | 252 | active |
| `frontend/src/assets/pages/seller/Products.css` | 83 | stylesheet |
| `frontend/src/assets/pages/seller/Products.jsx` | 203 | active |
| `frontend/src/assets/pages/seller/SellerDashboard.css` | 168 | stylesheet |
| `frontend/src/assets/pages/seller/SellerDashboard.jsx` | 197 | active |
| `frontend/src/assets/pages/seller/SellerOrders.css` | 50 | stylesheet |
| `frontend/src/assets/pages/seller/SellerOrders.jsx` | 267 | active |
| `frontend/src/assets/promotionalBanner/PromoBanner.css` | 62 | stylesheet |
| `frontend/src/assets/promotionalBanner/PromoBanner.jsx` | 24 | active |
| `frontend/src/assets/styles/global.css` | 4 | stylesheet |
| `frontend/src/assets/styles/reset.css` | 5 | stylesheet |
| `frontend/src/assets/styles/variable.css` | 5 | stylesheet |
| `frontend/src/cartContext/CartContext.jsx` | 63 | active |
| `frontend/src/categorySection/categories.css` | 22 | DEAD (duplicate) |
| `frontend/src/categorySection/categories.jsx` | 62 | DEAD (duplicate) |
| `frontend/src/categorySection/categoriesCard.css` | 39 | DEAD (duplicate) |
| `frontend/src/categorySection/categoriesCard.jsx` | 26 | DEAD (duplicate) |
| `frontend/src/flashSale/FlashSale.css` | 56 | stylesheet |
| `frontend/src/flashSale/FlashSale.jsx` | 128 | active |
| `frontend/src/flashSale/FlashSaleCard.css` | 72 | stylesheet |
| `frontend/src/flashSale/FlashSaleCard.jsx` | 98 | active |
| `frontend/src/index.css` | 111 | stylesheet |
| `frontend/src/main.jsx` | 10 | active |
| `frontend/src/productSection/productCard.css` | 90 | stylesheet |
| `frontend/src/productSection/productCard.jsx` | 137 | active |
| `frontend/src/productSection/products.css` | 32 | stylesheet |
| `frontend/src/productSection/products.jsx` | 116 | active |
| `frontend/src/promotionalBanner/PromoBanner.css` | 62 | DEAD (duplicate) |
| `frontend/src/promotionalBanner/PromoBanner.jsx` | 24 | DEAD (duplicate) |
| **Frontend — root/config** | | |
| `frontend/.gitignore` | 34 | config |
| `frontend/README.md` | 16 | config |
| `frontend/eslint.config.js` | 21 | config |
| `frontend/index.html` | 13 | config |
| `frontend/package-lock.json` | 2525 | lockfile |
| `frontend/package.json` | 29 | config |
| `frontend/public/favicon.svg` | 1 | binary asset |
| `frontend/public/icons.svg` | 24 | binary asset |
| `frontend/public/images/banner.png` | 8833 | binary asset |
| `frontend/public/images/hero.jpg` | 4655 | binary asset |
| `frontend/public/images/iphone.jpg` | 6103 | binary asset |
| `frontend/vite.config.js` | 7 | config |
