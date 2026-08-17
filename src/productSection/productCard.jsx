import "./productCard.css";

import {
    FaShoppingCart,
    FaStar,
    FaHeart,
} from "react-icons/fa";

import {
    useEffect,
    useState,
} from "react";

import { useCart } from "../../src/cartContext/UseCart";
import { apiFetch } from "../api/api";

function ProductCard({ product }) {
    const { refreshCart } = useCart();

    const [notice, setNotice] = useState("");
    const [inWishlist, setInWishlist] = useState(false);
    const [wishlistLoading, setWishlistLoading] =
        useState(false);

    // ==========================================
    // CHECK WISHLIST
    // ==========================================

    useEffect(() => {
        let cancelled = false;

        const checkWishlist = async () => {
            const token =
                localStorage.getItem("token");

            const user = JSON.parse(
                localStorage.getItem("user") ||
                    "null"
            );

            if (
                !token ||
                user?.role === "seller"
            ) {
                if (!cancelled) {
                    setInWishlist(false);
                }

                return;
            }

            try {
                const response = await apiFetch(
                    `/wishlist/check/${product.id}`,
                    {
                        method: "GET",
                    }
                );

                if (!response.ok) {
                    if (!cancelled) {
                        setInWishlist(false);
                    }

                    return;
                }

                const data =
                    await response.json();

                if (!cancelled) {
                    setInWishlist(
                        data.in_wishlist === true
                    );
                }
            } catch (error) {
                if (!cancelled) {
                    console.error(
                        "Wishlist check error:",
                        error
                    );
                }
            }
        };

        checkWishlist();

        return () => {
            cancelled = true;
        };
    }, [product.id]);

    // ==========================================
    // ADD TO CART
    // ==========================================

    const handleAddToCart = async () => {
        const token =
            localStorage.getItem("token");

        const user = JSON.parse(
            localStorage.getItem("user") ||
                "null"
        );

        if (!token) {
            setNotice(
                "Please login first."
            );
            return;
        }

        if (user?.role === "seller") {
            setNotice(
                "Seller accounts cannot add products to cart."
            );
            return;
        }

        try {
            const response = await apiFetch(
                "/cart",
                {
                    method: "POST",
                    body: JSON.stringify({
                        product_id: product.id,
                        quantity: 1,
                    }),
                }
            );

            const data =
                await response.json();

            if (response.ok) {
                await refreshCart();

                setNotice(
                    "Product added to cart."
                );
            } else {
                setNotice(
                    data.detail ||
                        "Unable to add product."
                );
            }
        } catch (error) {
            console.error(
                "Add to cart error:",
                error
            );

            setNotice(
                "Unable to connect to server."
            );
        }
    };

    // ==========================================
    // WISHLIST
    // ==========================================

    const handleWishlist = async () => {
        const token =
            localStorage.getItem("token");

        const user = JSON.parse(
            localStorage.getItem("user") ||
                "null"
        );

        if (!token) {
            setNotice(
                "Please login first."
            );
            return;
        }

        if (user?.role === "seller") {
            setNotice(
                "Seller accounts cannot use wishlist."
            );
            return;
        }

        if (wishlistLoading) {
            return;
        }

        setWishlistLoading(true);

        try {
            const response = await apiFetch(
                `/wishlist/${product.id}`,
                {
                    method: inWishlist
                        ? "DELETE"
                        : "POST",
                }
            );

            const data =
                await response.json();

            if (response.status === 401) {
                localStorage.removeItem(
                    "token"
                );

                localStorage.removeItem(
                    "user"
                );

                setNotice(
                    "Your session has expired. Please login again."
                );

                setInWishlist(false);

                return;
            }

            if (response.ok) {
                if (inWishlist) {
                    setInWishlist(false);

                    setNotice(
                        "Product removed from wishlist."
                    );
                } else {
                    setInWishlist(true);

                    setNotice(
                        "Product added to wishlist."
                    );
                }
            } else {
                setNotice(
                    data.detail ||
                        "Unable to update wishlist."
                );
            }
        } catch (error) {
            console.error(
                "Wishlist error:",
                error
            );

            setNotice(
                "Unable to connect to server."
            );
        } finally {
            setWishlistLoading(false);
        }
    };

    // ==========================================
    // UI
    // ==========================================

    return (
        <article className="home-product-card">

            <div className="home-product-image">

                <img
                    src={product.image}
                    alt={product.name}
                />

                <button
                    type="button"
                    className={`wishlist-btn ${
                        inWishlist
                            ? "wishlist-active"
                            : ""
                    }`}
                    onClick={handleWishlist}
                    disabled={
                        wishlistLoading
                    }
                    aria-label={
                        inWishlist
                            ? "Remove from wishlist"
                            : "Add to wishlist"
                    }
                    title={
                        inWishlist
                            ? "Remove from wishlist"
                            : "Add to wishlist"
                    }
                >
                    <FaHeart />
                </button>

            </div>

            <div className="home-product-details">

                <span className="home-product-category">
                    {product.category ||
                        "Product"}
                </span>

                <h3 className="home-product-name">
                    {product.name}
                </h3>

                <div className="home-product-price">
                    $
                    {Number(
                        product.price
                    ).toFixed(2)}
                </div>

                <div className="home-product-rating">

                    <FaStar />

                    <span>
                        {product.rating ||
                            "5.0"}
                    </span>

                </div>

                <button
                    type="button"
                    className="home-cart-btn"
                    onClick={
                        handleAddToCart
                    }
                >
                    <FaShoppingCart />

                    <span>
                        Add to Cart
                    </span>
                </button>

                {notice && (
                    <p
                        className="cart-notice"
                        role="status"
                    >
                        {notice}
                    </p>
                )}

            </div>

        </article>
    );
}

export default ProductCard;