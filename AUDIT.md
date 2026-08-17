# E-Shop — Code Review: latest pull

**Date:** 2026-08-06 · **Reviewed range:** `8c552b3..22600ab` — commit `22600ab` *"feat: add API utility for fetching data with authorization"* · **Effort:** high (recall-focused)

> Note: an earlier repo-wide audit and a production-readiness roadmap were written to the working tree in a prior session; the pull that introduced `22600ab` cleaned those untracked files, so this file starts fresh and covers **only the latest pull**.

## Verdict

This commit is a near-complete rewrite (95 files, +16.6k/−4.4k) and a genuine turnaround. It closes most of the previously-identified P0s:

- **Real authentication** — JWT (`auth/jwt_handler.py`) with an explicit algorithm allowlist (`config.py:38-45`, blocks `alg` confusion), argon2 password hashing (`auth/security.py`), a `get_current_user` dependency (`dependencies.py`), and Bearer-token login (`account.py:173`).
- **Authorization enforced in the query** — ownership predicates in cart/orders/products (e.g. `cart.py:156-157`, `orders.py:173-174`, `product.py:179`), role gates on every mutating route. IDOR is closed.
- **Order integrity** — single-transaction checkout with `with_for_update()` row locks and one commit (`orders.py:31-117`), `Numeric(12,2)` money, shipping address persisted.
- **Schema hardening** — `CheckConstraint`s (`price > 0`, `stock >= 0`), FK indexes, wishlist unique constraint, cascade rules, fail-fast config, `pool_pre_ping`.

No P0/P1-critical defects survived review. The findings below are correctness gaps, consistency issues, and polish.

## Findings

| # | Sev | Category | Location | Summary |
|---|:--:|---|---|---|
| 1 | P2 | correctness | `backend/app/routes/product.py:278` | Deleting a product that has order history raises 500 |
| 2 | P2 | correctness | `backend/app/routes/orders.py:385` | Seller status→`cancelled` does not restore stock |
| 3 | P2 | correctness | `src/assets/pages/seller/SellerDashboard.jsx:40` (+14 files) | 15 files hardcode `127.0.0.1:8000` while `apiFetch` uses `VITE_API_URL` |
| 4 | P2 | correctness | `src/assets/pages/seller/Products.jsx:21` | `/seller/products` page lists all sellers' products |
| 5 | P2 | security | `backend/app/main.py:35` | CORS `allow_origins=["*"]` with `allow_credentials=True` |
| 6 | P3 | security | `backend/app/routes/account.py:152` | Login timing reveals whether an email is registered |
| 7 | P3 | security | `backend/app/routes/account.py:129` | `signup` returns raw exception text to the client |
| 8 | P3 | frontend/dead-code | `src/App.jsx:36` | Empty `ProtectedRoute`/`AuthContext`; no client route guards |
| 9 | P3 | correctness | `src/api/api.js:1` | `apiFetch` has no fallback if `VITE_API_URL` is unset |
| 10 | P3 | efficiency | `backend/app/routes/orders.py:51` | `create_order` re-locks each product redundantly (N+1) |
| 11 | P3 | efficiency | `backend/app/routes/wishlist.py:44` | `get_wishlist` N+1 lazy-loads each product |

---

## Detail

### 1. Deleting an ordered product raises 500 — P2 / correctness
**Evidence:** `backend/app/routes/product.py:278` `db.delete(product)`; `backend/app/models/order_Item.py:23-28` (`product_id` `nullable=False`, plain FK); `backend/app/models/product.py:83-86` (`order_items` relationship, no delete cascade).

**Failure scenario:** A seller deletes a product that appears in any past order. On `db.delete(product)`, SQLAlchemy tries to disassociate the related `order_items` by setting `order_items.product_id = NULL` (or the DB FK RESTRICTs the delete). Because `product_id` is `NOT NULL`, this raises `IntegrityError`, the `except` returns HTTP 500 "Unable to delete product", and the seller can **never** delete a product that has ever been ordered.

**Fix:** Prefer a soft delete (`is_active` flag) so order history is preserved, or explicitly block deletion with a clear 409 when `order_items` exist. If hard delete is truly intended, it needs `ondelete` behavior and a decision about what happens to historical line items.

### 2. Seller status→`cancelled` does not restore stock — P2 / correctness
**Evidence:** `backend/app/routes/orders.py:385` `order.status = new_status` (accepts `"cancelled"`, no restock) vs `orders.py:255-266` (the DELETE `cancel_order` path does `product.stock += item.quantity`).

**Failure scenario:** A seller `PUT`s `/seller/orders/{id}/status` with `status="cancelled"`. The order is marked cancelled but reserved stock is never added back — unlike the customer DELETE path. Inventory permanently leaks by the cancelled order's quantities, and the two cancellation routes leave the DB inconsistent for the same logical action.

**Fix:** Route both cancellations through one `cancel_order(order, db)` helper that restores stock exactly once, or reject `cancelled` from the status-update endpoint and require the dedicated cancel path.

### 3. Split API base URL: 15 files hardcode `127.0.0.1:8000` — P2 / correctness
**Evidence:** `src/api/api.js:1` uses `import.meta.env.VITE_API_URL`, adopted by 9 files. The other 15 still hardcode `http://127.0.0.1:8000`: `assets/pages/seller/{SellerDashboard,SellerOrders,Products,AddProduct,EditProduct}.jsx`, `assets/pages/customer/CustomerDashboard.jsx`, `assets/pages/orderDetails/OrderDetails.jsx`, `assets/pages/categoryProducts/CategoryProducts.jsx`, `assets/pages/productDetails/ProductDetails.jsx`, `assets/components/navbar.jsx`, `assets/components/chatbot/ChatBot.jsx`, `categorySection/categories.jsx`, `flashSale/FlashSaleCard.jsx`, `assets/pages/auth/{login/Login,signup/Signup}.jsx`.

**Failure scenario:** Deployed anywhere other than the dev machine (staging/prod, or a teammate on another host), the 9 `apiFetch` calls target `VITE_API_URL` while the 15 hardcoded calls still hit `http://127.0.0.1:8000` and fail. Half the app works and half is dead, with no single place to change the origin.

**Note:** These 15 files *do* attach `Authorization: Bearer` manually, so auth itself is not broken — the defect is the hardcoded host and the duplicated header logic. **Fix:** route every call through `apiFetch` (which already handles both the base URL and the token).

### 4. `/seller/products` lists all sellers' products — P2 / correctness
**Evidence:** `src/assets/pages/seller/Products.jsx:20-31` fetches `http://127.0.0.1:8000/products?page=` (the public catalog) and renders customer `ProductCard` (add-to-cart) tiles. The seller-scoped endpoint `GET /seller/products` exists (`backend/app/routes/product.py:292`) and is used by `SellerDashboard`, but not here.

**Failure scenario:** A seller opens "My Products" (`/seller/products`) to manage their inventory and instead sees **every** seller's products as customer-style add-to-cart cards, with no edit/delete controls and no `seller_id` filter.

**Fix:** Fetch `GET /seller/products` (with the token) and render management rows (edit/delete), not `ProductCard`.

### 5. CORS `allow_origins=["*"]` with `allow_credentials=True` — P2 / security
**Evidence:** `backend/app/main.py:33-39`.

**Failure scenario:** Starlette responds to this combination by reflecting the caller's `Origin` and setting `Access-Control-Allow-Credentials: true`, making every website a permitted credentialed origin. It is relatively low-impact **today** because auth is a Bearer token in `localStorage` (not a cookie), but it is a regression from a proper allowlist and becomes an open CSRF/credential hole the moment cookie or session auth is introduced. `allow_credentials=True` is also meaningless paired with the wildcard.

**Fix:** Replace with an explicit origin allowlist sourced from config; keep credentials only if actually needed.

### 6. Login timing reveals whether an email exists — P3 / security
**Evidence:** `backend/app/routes/account.py:152-171` — returns 401 immediately when the email is not found, but runs the (intentionally slow) argon2 `verify_password` when it is found.

**Failure scenario:** An attacker submits logins for a wordlist and measures latency: unknown emails return in ~1 ms, known emails take argon2's tens of ms. This enumerates valid accounts despite the identical "Invalid email or password" message.

**Fix:** Always run `verify_password` against a fixed dummy hash when the user is absent, so timing does not distinguish.

### 7. `signup` returns raw exception text to the client — P3 / security
**Evidence:** `backend/app/routes/account.py:122-130` — generic `except Exception as e:` returns `detail=str(e)` and `print`s it.

**Failure scenario:** Any unexpected error (driver error, constraint message, internal detail) is serialized verbatim into the 500 body and printed to stdout, leaking schema/internal information to callers and logs.

**Fix:** Return a generic message; log the detail server-side only.

### 8. Empty `ProtectedRoute`/`AuthContext`; no client route guards — P3 / frontend
**Evidence:** `src/assets/components/ProtectedRoute.jsx`, `src/context/AuthContext.jsx`, `src/services/api.js` are 0-byte stubs; `src/App.jsx:36-97` wraps no route in a guard.

**Failure scenario:** A logged-out visitor navigates directly to `/seller/add-product`, `/wishlist`, `/checkout`, or `/customer-dashboard`; the page mounts and then fails piecemeal on 401s from the protected API instead of redirecting to `/login`. The scaffolding that would fix this was committed empty and never wired. (Backend still enforces auth, so this is UX, not a data hole.)

**Fix:** Implement `AuthContext` (bootstrap from the token / a `/auth/me` call) and a `ProtectedRoute` wrapper, and gate the protected routes in `App.jsx`.

### 9. `apiFetch` has no fallback if `VITE_API_URL` is unset — P3 / correctness
**Evidence:** `src/api/api.js:1-2` — `const API_URL = import.meta.env.VITE_API_URL;` (no default) plus a leftover `console.log("API URL:", API_URL)`; no `.env.example` is committed.

**Failure scenario:** A developer clones the repo without a frontend `.env`; `VITE_API_URL` is `undefined`, so `apiFetch` requests `undefined/cart`, which the browser resolves against the dev origin (`http://localhost:5173/undefined/cart`) and every authorized call 404s with no obvious cause.

**Fix:** Provide a fallback (e.g. `?? "http://127.0.0.1:8000"`), commit a `.env.example`, and remove the debug `console.log`.

### 10. `create_order` re-locks each product redundantly — P3 / efficiency
**Evidence:** `backend/app/routes/orders.py:32-38` already joins `Product` with `.with_for_update()`; the loop at `orders.py:50-56` issues a separate `SELECT ... FOR UPDATE` per cart line for the same rows.

**Failure scenario:** For a cart of N items, checkout performs 1 locking join plus N additional per-product locking round-trips to rows already locked — N redundant queries and lock acquisitions every checkout.

**Fix:** Use the `Product` already returned (and locked) by the join, or select `FOR UPDATE OF products` once and skip the per-item re-query.

### 11. `get_wishlist` N+1 lazy-loads each product — P3 / efficiency
**Evidence:** `backend/app/routes/wishlist.py:32-55` selects `WishlistItem` rows then dereferences `item.product.*` per row in the comprehension.

**Failure scenario:** A customer with M wishlist items causes 1 query for the items plus M lazy-load queries for products (M+1 total).

**Fix:** `db.query(WishlistItem).options(joinedload(WishlistItem.product))` or an explicit join to fetch products in one round-trip.

---

## What improved since the prior state (credit)

- SQL injection: still none — all filters bound.
- Passwords: now argon2-hashed, no longer plaintext.
- Identity: derived from a verified JWT, no longer a client-supplied `user_id`.
- Authorization: ownership enforced inside queries; role gates on mutations.
- Orders: atomic single-commit transaction, row locks, `Numeric` money, persisted shipping address.
- Data model: `CheckConstraint`s, FK indexes, cascade rules, wishlist unique constraint.
- Config: fail-fast on missing `DATABASE_URL`/`SECRET_KEY`; JWT algorithm allowlist.

---

# Part 2 — Full-codebase mentor sweep

**Scope:** the whole codebase at `22600ab` (backend routes/services/seeders/config + every frontend page/component + repo hygiene), hunting for issues **beyond** the 11 diff findings above. Framed as mentor feedback: real bugs, recurring habits worth coaching, hygiene debt, and what to praise.

**Additional issues found:** ~35 (2 P1 · 18 P2 · 15 P3), which collapse to a handful of teachable themes (§B).

## A. New bugs that matter

### Must-fix first

| # | Sev | Location | Bug |
|---|:--:|---|---|
| M1 | P1 | `backend/app/services/chatbot_service.py:49` | Chatbot 500s on every message — `.ilike()` is called on `Product.category` (a **relationship**), not a column. Filter on `Category.name` via a join. |
| M2 | P1 | `src/assets/pages/auth/account/Account.jsx:13` | Logout doesn't log you out — `handleLogout` removes only `"user"` and leaves `"token"`; the JWT survives and `apiFetch` keeps sending it. Also clear `token`. |

### Correctness / UX (P2)

- **Customer dashboard stats never load** — `src/assets/pages/customer/CustomerDashboard.jsx:94-104`: orders are fetched only when the "My Orders" tab is clicked, so landing on `/customer-dashboard` shows 0 orders / $0 spent for a customer who has orders.
- **Order details white-screens** — `src/assets/pages/orderDetails/OrderDetails.jsx:40-48`: sets `error = data.detail`; when an error body has no string `detail` (a 500, or a 422 array), `error` is falsy, the guard is skipped, and it runs `order.items.map` on `null`. Compounded at `:188` where `item.image.startsWith(...)` has no `?.` and crashes on a null image.
- **Product-detail "Add to Cart" is a no-op** — `src/assets/pages/productDetails/ProductDetails.jsx:39-54`: the button only shows a notice; it never calls `/cart`.
- **Flash-sale items add the wrong product** — `src/flashSale/FlashSale.jsx:5-38` are hardcoded fixtures (ids 1–4); `FlashSaleCard` POSTs `product_id` to the real `/cart`, adding whatever DB product owns that id (or 404). The displayed price is fiction the backend never sees.
- **`POST /categories` has no auth** — `backend/app/routes/categories.py:14-40`: every other route is role-gated; this one lets any anonymous client create categories.
- **Seller dashboard metrics are wrong** — `src/assets/pages/seller/SellerDashboard.jsx:127-143`: "Completed" filters `status === "completed"` but the app only ever sets `"delivered"` (always 0); "Total Orders" counts line-items (a 3-item order counts as 3, rows keyed `${order_id}-${product_id}`); revenue sums every row regardless of status, so cancelled orders still count.
- **DELETE responses parsed as JSON** — `src/assets/components/CartItems.jsx:49`, `src/assets/pages/customer/CustomerDashboard.jsx:128`: `response.json()` on a delete/cancel; a `204 No Content` has an empty body → `.json()` throws → a *successful* delete looks like a failure and the refresh never runs.
- **Pexels helper: no timeout, no error handling, dead fallback** — `backend/app/utils/pexels.py:23,35`: `requests.get(...)` has no `timeout=` (hangs a worker) and no `try/except`; the fallback `via.placeholder.com` is a shut-down service, and `image` is `NOT NULL`.
- **Product seeder crashes on a fresh DB** — `backend/seeders/seed_products.py:36,30,47`: `choice(categories)` with **no category seeder** → `IndexError`; `seller_ids = range(1,21)` hardcoded → FK error if run before `seed_users`; not idempotent (run twice → 1000 duplicates); no `try/except/rollback`.
- **Category create-then-insert race** — `backend/app/routes/categories.py:20-38`: passes the `existing` check then hits the `unique` constraint on concurrent duplicates → uncaught 500 instead of the clean 400.

### Smaller (P3)

- `src/assets/components/navbar.jsx:33` — search keyword interpolated with no `encodeURIComponent`; breaks on `&`, `#`, `?`, spaces.
- `src/assets/pages/categoryProducts/CategoryProducts.jsx:31-35` — `.json()` awaited before the `response.ok` check; a non-JSON error page throws and hides the real status. Also no `loading` state → flashes "0 Products Found" before data resolves.
- `src/assets/pages/searchResults/SearchResults.jsx:12` — results live only in `location.state`; a refresh or shared `/search` URL resets to `0 result(s) found for ""`. Use a query param.
- `src/assets/pages/auth/login/Login.jsx:71` — `alert(data.detail)` shows `[object Object]` on a 422 (Signup handles this shape; Login doesn't). Also no in-flight/disabled guard (double-submit).
- `src/assets/pages/seller/AddProduct.jsx:64-159` — no submit guard; a double-click fires two POSTs (EditProduct guards correctly).
- `src/assets/pages/cart/Cart.jsx:37-68,155` — `fetchCart` sets `loading:true`, so every +/- or Remove blanks the whole cart to a full-page spinner and reflows.
- `src/assets/pages/seller/SellerOrders.jsx:331` — `order.image?.startsWith("http")` falls through to `/images/${order.image}` → literally `/images/null` when image is absent; no `onError`.
- `backend/app/models/cart.py:6-14` — no unique constraint on `(user_id, product_id)`; duplicate cart rows are only prevented by route logic.

## B. Recurring habits to coach (higher-value than any single bug)

1. **Use the `apiFetch` helper that already exists.** ~15 files hand-roll `fetch` + hardcoded `http://127.0.0.1:8000` + a manual `Authorization` header. That duplication is the root of K3, K9, M2, and the DELETE-json bug. One transport layer gives base URL + token + 401 handling everywhere for free.
2. **Debug logging left in — including secrets.** 11 `console.log` (src) + 12 `print` (backend). Two are serious: `src/assets/pages/auth/signup/Signup.jsx:125` logs the **plaintext password**; `src/assets/pages/auth/login/Login.jsx:41` logs the **JWT**. Never log credentials; route-level logging belongs in a real logger.
3. **`setTimeout(fn, 0)` around every fetch effect** (AddProduct, EditProduct, SellerDashboard, categories…): defers one tick and its cleanup cannot cancel an in-flight request — cargo-cult. Use a `cancelled` flag / `AbortController` (as `Products.jsx` and `NewArrivals.jsx` already do).
4. **`.json()` before `response.ok` and on `204`** — non-JSON error pages and empty delete bodies both throw; guard on status/content before parsing.
5. **Duplicated logic that has already drifted:** `Cart.jsx` has two copies of its fetch (`fetchCart` sets loading, `loadCart` doesn't); Add vs Edit product have divergent validation and different category inputs (dropdown vs raw ID box). Extract shared helpers.
6. **Dead UI dressed as real:** "Remember Me" wired to nothing (`Login.jsx:118`), the Contact form has no `onSubmit` (`Contact.jsx:119` — reloads, sends nothing), "Shop All" has no handler (`FlashSale.jsx:133`), hardcoded seller avatar/name (`SellerSidebar.jsx:24-30`), "Wishlist Items" stat hardcoded `0` (`CustomerDashboard.jsx:396`).
7. **Model the delete/cascade policy when you write the relationship** — K1 (product delete 500) is one instance; `cart` and `categories` relationships have the same latent FK error waiting for their delete routes.
8. **Consistency:** index `key` on the growing chat-messages array (`ChatBot.jsx:116`); `<label>` without `htmlFor`/`id` (Contact, Add/Edit product); `alert()` for errors while the app has inline notice UI; `../src/...` self-referential import paths (App.jsx:8-24, and `../../../../src/...` in NewArrivals/SearchResults/Products) — add a `@/` path alias + Prettier.

## C. Hygiene / housekeeping

- **No `requirements.txt`/`pyproject.toml`, no real README, no `.env.example`.** A teammate can't reproduce the env or know which vars are required (`DATABASE_URL`, `SECRET_KEY`, `PEXELS_API_KEY`, `VITE_API_URL`). README is still the Vite template.
- **DB password in git history** — `git show ea57228:backend/.env` reveals `postgresql://postgres:<pw>@localhost:5432/eshop`. It is a localhost dev credential and the current tree correctly tracks no `.env`, but rotate it and consider scrubbing history before the repo is public. *(Resolves a contradiction between two sweep agents: the working tree is clean; the secret is only in history.)*
- **A `.pyc` is still tracked** — `backend/app/services/__pycache__/chatbot_service.cpython-314.pyc`, despite `.gitignore`. Run `git rm -r --cached`.
- **Misnamed / empty stub files:** `prompts/e-prompts.py` (hyphen → un-importable module), `services/account_servoce.py` (typo), `models/order_Item.py` (mixed case — can break on case-sensitive Linux CI), plus empty `ProtectedRoute.jsx` / `AuthContext.jsx` / `services/api.js` and the `forgotPassword` / `resetPassword` / `verifyEmail` stubs.
- **Diverged duplicate components** under `src/assets/` (Footer, categorySection, flashSale, promotionalBanner): the live copies are the top-level `src/…` ones, and the two sets have drifted (the dead `src/assets/categorySection` still imports static data; the live one fetches the API). Editing the dead copy changes nothing.
- **No migrations** (`create_all` at import), and the "tests" aren't tests — `test_db.py` has no assertions; `test_signup_role_tables.py` writes to the real DB with no teardown.

## D. What's done well (lead with these)

- **JWT algorithm allowlist** — `backend/app/config.py:38-45` (HS256 only): the correct defense against algorithm-confusion, failing fast at boot.
- **Fail-fast config validation** (`config.py:12-29,52-72`) and **argon2 hashing**; the **user seeder** is idempotent with `try/rollback/finally` and hashed passwords — the pattern the product seeder should copy.
- **`cancelled`-flag async cleanup** done correctly in Cart, Products, NewArrivals, CategoryProducts; `useCart` throws when used outside its provider (`UseCart.js:7-11`).
- **Signup's error handling** (422-array flattening, 400, 500 with readable messages, `Signup.jsx:171-208`) — a model the Login form should copy.
- **CheckOut** detects 401 → clears token → redirects, with clean loading/empty/error states and image fallback; **per-item** loading state in Wishlist/SellerOrders avoids freezing the whole grid; consistent `aria-label`s and `role="status"` on icon controls and notices.
- **`pool_pre_ping=True`** on the engine; clean backend package layout; thorough `.gitignore`; a strong anti-hallucination chatbot system prompt.
