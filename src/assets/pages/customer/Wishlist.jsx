import "./Wishlist.css";

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiFetch } from "../../../api/api";

function Wishlist() {
  const navigate = useNavigate();

  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [addingToCartId, setAddingToCartId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // ==========================================
  // FETCH WISHLIST
  // ==========================================

  const fetchWishlist = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setNotice("");

      const response = await apiFetch("/wishlist", {
        method: "GET",
      });

      const data = await response.json();

      // Unauthorized
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      // Forbidden
      if (response.status === 403) {
        setError(
          "Only customer accounts can access the wishlist."
        );
        return;
      }

      if (!response.ok) {
        setError(
          data.detail || "Unable to load wishlist."
        );
        return;
      }

      setWishlist(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error("Wishlist error:", error);

      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // ==========================================
  // REMOVE FROM WISHLIST
  // ==========================================

  const removeFromWishlist = async (productId) => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setRemovingId(productId);
      setError("");
      setNotice("");

      const response = await apiFetch(
        `/wishlist/${productId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      // Unauthorized
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        setError(
          data.detail ||
            "Unable to remove product."
        );
        return;
      }

      setWishlist((currentWishlist) =>
        currentWishlist.filter(
          (item) =>
            item.product_id !== productId
        )
      );

      setNotice(
        "Product removed from wishlist."
      );
    } catch (error) {
      console.error(
        "Remove wishlist error:",
        error
      );

      setError(
        "Unable to connect to server."
      );
    } finally {
      setRemovingId(null);
    }
  };

  // ==========================================
  // ADD TO CART
  // ==========================================

  const addToCart = async (product) => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    if (product.stock <= 0) {
      setError(
        "This product is out of stock."
      );
      return;
    }

    try {
      setAddingToCartId(
        product.product_id
      );

      setError("");
      setNotice("");

      const response = await apiFetch(
        "/cart",
        {
          method: "POST",
          body: JSON.stringify({
            product_id: product.product_id,
            quantity: 1,
          }),
        }
      );

      const data = await response.json();

      // Unauthorized
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        setError(
          data.detail ||
            "Unable to add product to cart."
        );
        return;
      }

      setNotice(
        "Product added to cart."
      );
    } catch (error) {
      console.error(
        "Add to cart error:",
        error
      );

      setError(
        "Unable to connect to server."
      );
    } finally {
      setAddingToCartId(null);
    }
  };

  // ==========================================
  // FORMAT PRICE
  // ==========================================

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(Number(price || 0));
  };

  // ==========================================
  // IMAGE URL
  // ==========================================

  const getImageUrl = (image) => {
    if (!image) {
      return "/images/placeholder.png";
    }

    if (
      image.startsWith("http://") ||
      image.startsWith("https://")
    ) {
      return image;
    }

    return `/images/${image}`;
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <main className="wishlist-page">
      <div className="wishlist-container">

        {/* ================================
            HEADER
        ================================= */}

        <header className="wishlist-header">
          <div>
            <span className="wishlist-label">
              CUSTOMER CENTER
            </span>

            <h1>My Wishlist</h1>

            <p>
              Save your favorite products and
              come back to them anytime.
            </p>
          </div>

          {!loading &&
            wishlist.length > 0 && (
              <div className="wishlist-count">
                <strong>
                  {wishlist.length}
                </strong>

                <span>
                  Saved Items
                </span>
              </div>
            )}
        </header>

        {/* ================================
            NOTICE
        ================================= */}

        {notice && (
          <div
            className="wishlist-notice"
            role="status"
          >
            {notice}
          </div>
        )}

        {/* ================================
            LOADING
        ================================= */}

        {loading ? (
          <div className="wishlist-state">

            <div className="wishlist-spinner"></div>

            <h3>
              Loading Wishlist...
            </h3>

            <p>
              Please wait while we load your
              saved products.
            </p>

          </div>

        ) : error ? (

          /* ================================
             ERROR
          ================================= */

          <div
            className="wishlist-state wishlist-error"
          >
            <div className="wishlist-state-icon">
              ⚠️
            </div>

            <h3>
              Unable to Load Wishlist
            </h3>

            <p>{error}</p>

            <button
              type="button"
              onClick={fetchWishlist}
            >
              Try Again
            </button>
          </div>

        ) : wishlist.length === 0 ? (

          /* ================================
             EMPTY WISHLIST
          ================================= */

          <div className="wishlist-state">

            <div className="wishlist-state-icon">
              ♡
            </div>

            <h2>
              Your Wishlist is Empty
            </h2>

            <p>
              You haven't saved any products yet.
              Start exploring and add your
              favorites.
            </p>

            <button
              type="button"
              className="browse-products-btn"
              onClick={() => navigate("/")}
            >
              Browse Products
            </button>

          </div>

        ) : (

          /* ================================
             WISHLIST PRODUCTS
          ================================= */

          <section className="wishlist-grid">

            {wishlist.map((item) => (
              <article
                className="wishlist-card"
                key={item.id}
              >

                {/* IMAGE */}

                <div className="wishlist-image-wrapper">

                  <img
                    src={getImageUrl(item.image)}
                    alt={item.name}
                    className="wishlist-image"
                  />

                  <button
                    type="button"
                    className="remove-wishlist-btn"
                    onClick={() =>
                      removeFromWishlist(
                        item.product_id
                      )
                    }
                    disabled={
                      removingId ===
                      item.product_id
                    }
                    aria-label={`Remove ${item.name} from wishlist`}
                  >
                    {removingId ===
                    item.product_id
                      ? "..."
                      : "♥"}
                  </button>

                </div>

                {/* CONTENT */}

                <div className="wishlist-card-content">

                  <span className="wishlist-brand">
                    {item.brand}
                  </span>

                  <h2>
                    {item.name}
                  </h2>

                  <p className="wishlist-description">
                    {item.description}
                  </p>

                  <div className="wishlist-price">
                    {formatPrice(item.price)}
                  </div>

                  {/* STOCK */}

                  <div className="wishlist-stock">

                    {item.stock > 0 ? (
                      <span className="in-stock">
                        ✓ In Stock
                      </span>
                    ) : (
                      <span className="out-of-stock">
                        Out of Stock
                      </span>
                    )}

                  </div>

                  {/* CART */}

                  <button
                    type="button"
                    className="wishlist-cart-btn"
                    disabled={
                      item.stock <= 0 ||
                      addingToCartId ===
                        item.product_id
                    }
                    onClick={() =>
                      addToCart(item)
                    }
                  >
                    {addingToCartId ===
                    item.product_id
                      ? "Adding..."
                      : item.stock > 0
                      ? "Add to Cart"
                      : "Out of Stock"}
                  </button>

                </div>

              </article>
            ))}

          </section>
        )}

      </div>
    </main>
  );
}

export default Wishlist;