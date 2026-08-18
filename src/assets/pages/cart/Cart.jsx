import "./Cart.css";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";

import CartItem from "../../components/CartItems";
import CartSummary from "../../components/CartSummary";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, readJson } from "../../../api/api";

function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCart = useCallback(async () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    if (!token) {
      setError("Please login to view your cart.");
      setLoading(false);
      return;
    }

    if (user?.role === "seller") {
      setError(
        "Seller accounts cannot access the customer cart."
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await apiFetch("/cart", {
        method: "GET",
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");
        setError("Your session has expired. Please login again.");
        return;
      }

      if (!response.ok) {
        setError(
          data.detail || "Unable to load cart."
        );
        return;
      }

      setCartItems(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error("Cart Error:", error);
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCart = async () => {
      const token = localStorage.getItem("token");
      const user = JSON.parse(
        localStorage.getItem("user") || "null"
      );

      if (!token) {
        if (!cancelled) {
          setError("Please login to view your cart.");
          setLoading(false);
        }
        return;
      }

      if (user?.role === "seller") {
        if (!cancelled) {
          setError(
            "Seller accounts cannot access the customer cart."
          );
          setLoading(false);
        }
        return;
      }

      try {
        const response = await apiFetch("/cart", {
          method: "GET",
        });

        const data = await readJson(response);

        if (cancelled) {
          return;
        }

        if (response.status === 401) {
          localStorage.removeItem("token");
          setError(
            "Your session has expired. Please login again."
          );
          setLoading(false);
          return;
        }

        if (!response.ok) {
          setError(
            data.detail || "Unable to load cart."
          );
          setLoading(false);
          return;
        }

        setCartItems(
          Array.isArray(data) ? data : []
        );
        setError("");
        setLoading(false);
      } catch (error) {
        if (!cancelled) {
          console.error("Cart Error:", error);
          setError("Unable to connect to server.");
          setLoading(false);
        }
      }
    };

    loadCart();

    return () => {
      cancelled = true;
    };
  }, []);

  const subtotal = cartItems.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) *
        Number(item.quantity || 0),
    0
  );

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="cart-page">
          <div className="cart-wrapper">
            <div className="cart-heading">
              <span>Your Shopping Cart</span>
              <h1>Shopping Cart</h1>
            </div>

            <div className="cart-loading">
              <div className="loading-spinner"></div>
              <p>Loading your cart...</p>
            </div>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="cart-page">
        <div className="cart-wrapper">
          <div className="cart-heading">
            <span>Your Shopping Cart</span>

            <h1>Shopping Cart</h1>

            {!error && cartItems.length > 0 && (
              <p>
                {cartItems.length}{" "}
                {cartItems.length === 1
                  ? "item"
                  : "items"}{" "}
                in your cart
              </p>
            )}
          </div>

          {error && (
            <div className="cart-message error">
              <div className="message-icon">!</div>

              <div>
                <h3>Unable to load cart</h3>
                <p>{error}</p>
              </div>
            </div>
          )}

          {!error && cartItems.length === 0 && (
            <div className="cart-message empty">
              <div className="empty-icon">🛒</div>

              <h2>Your cart is empty</h2>

              <p>
                You haven't added any products yet.
              </p>

              <a
                href="/products"
                className="continue-shopping"
              >
                Continue Shopping
              </a>
            </div>
          )}

          {!error && cartItems.length > 0 && (
            <div className="cart-layout">
              <section className="cart-items-section">
                <div className="cart-section-header">
                  <h2>Cart Items</h2>

                  <span>
                    {cartItems.length}{" "}
                    {cartItems.length === 1
                      ? "item"
                      : "items"}
                  </span>
                </div>

                <div className="cart-items-list">
                  {cartItems.map((item) => (
                    <CartItem
                      key={item.cart_id}
                      item={item}
                      onCartUpdate={fetchCart}
                    />
                  ))}
                </div>

                <a
                  href="/products"
                  className="continue-shopping-link"
                >
                  ← Continue Shopping
                </a>
              </section>

              <aside className="cart-summary-section">
                <CartSummary subtotal={subtotal} />
              </aside>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

export default Cart;