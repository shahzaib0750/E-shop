import "./CheckOut.css";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiFetch } from "../../../api/api";

function CheckOut() {
    const navigate = useNavigate();

    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        full_name: "",
        phone: "",
        address: "",
        city: "",
        postal_code: "",
    });

    const getImageUrl = (image) => {
        if (!image) {
            return "/images/placeholder.jpg";
        }

        if (
            image.startsWith("http://") ||
            image.startsWith("https://") ||
            image.startsWith("/")
        ) {
            return image;
        }

        return `/images/${image}`;
    };

    useEffect(() => {
        const fetchCart = async () => {
            try {
                const token = localStorage.getItem("token");
                const user = JSON.parse(
                    localStorage.getItem("user") || "null"
                );

                if (!token || !user) {
                    setError(
                        "Please login before checkout."
                    );
                    return;
                }

                if (user.role === "seller") {
                    setError(
                        "Seller accounts cannot place orders. Please use a customer account."
                    );
                    return;
                }

                setFormData((prev) => ({
                    ...prev,
                    full_name: user.full_name || "",
                    phone: user.phone || "",
                }));

                const response = await apiFetch("/cart");

                const data = await response.json();

                if (response.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");

                    setError(
                        "Your session has expired. Please login again."
                    );

                    return;
                }

                if (!response.ok) {
                    setError(
                        data.detail ||
                            "Unable to load your cart."
                    );

                    return;
                }

                setCartItems(
                    Array.isArray(data) ? data : []
                );
            } catch (error) {
                console.error(
                    "Checkout cart error:",
                    error
                );

                setError(
                    "Unable to connect to the server."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchCart();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const subtotal = cartItems.reduce(
        (total, item) =>
            total +
            Number(item.price || 0) *
                Number(item.quantity || 0),
        0
    );

    const shipping = 0;
    const total = subtotal + shipping;

    const handlePlaceOrder = async (e) => {
        e.preventDefault();

        setError("");

        if (cartItems.length === 0) {
            setError("Your cart is empty.");
            return;
        }

        const token = localStorage.getItem("token");
        const user = JSON.parse(
            localStorage.getItem("user") || "null"
        );

        if (!token || !user) {
            navigate("/login");
            return;
        }

        if (user.role === "seller") {
            setError(
                "Seller accounts cannot place orders."
            );
            return;
        }

        if (!formData.full_name.trim()) {
            setError("Please enter your full name.");
            return;
        }

        if (!formData.phone.trim()) {
            setError("Please enter your phone number.");
            return;
        }

        if (!formData.address.trim()) {
            setError(
                "Please enter your delivery address."
            );
            return;
        }

        if (!formData.city.trim()) {
            setError("Please enter your city.");
            return;
        }

        if (!formData.postal_code.trim()) {
            setError("Please enter your postal code.");
            return;
        }

        const shippingAddress = [
            formData.address.trim(),
            formData.city.trim(),
            formData.postal_code.trim(),
        ].join(", ");

        setPlacingOrder(true);

        try {
            const response = await apiFetch("/orders", {
                method: "POST",
                body: JSON.stringify({
                    shipping_address: shippingAddress,
                }),
            });

            const data = await response.json();

            if (response.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");

                setError(
                    "Your session has expired. Please login again."
                );

                navigate("/login");
                return;
            }

            if (response.status === 403) {
                setError(
                    data.detail ||
                        "You are not allowed to place orders."
                );

                return;
            }

            if (!response.ok) {
                setError(
                    data.detail ||
                        "Unable to place your order."
                );

                return;
            }

            navigate("/order-success", {
                state: {
                    orderId: data.order_id,
                    totalAmount: data.total_amount,
                },
            });
        } catch (error) {
            console.error(
                "Place order error:",
                error
            );

            setError(
                "Unable to connect to the server."
            );
        } finally {
            setPlacingOrder(false);
        }
    };

    if (loading) {
        return (
            <>
                <Navbar />

                <main className="checkout-page">
                    <div className="checkout-wrapper">
                        <div className="checkout-loading">
                            <div className="checkout-spinner"></div>

                            <h2>
                                Preparing your checkout...
                            </h2>

                            <p>
                                Please wait while we load
                                your cart.
                            </p>
                        </div>
                    </div>
                </main>

                <Footer />
            </>
        );
    }

    if (error && cartItems.length === 0) {
        return (
            <>
                <Navbar />

                <main className="checkout-page">
                    <div className="checkout-wrapper">
                        <div className="checkout-error">
                            <div className="error-icon">
                                !
                            </div>

                            <h2>
                                Unable to continue
                            </h2>

                            <p>{error}</p>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/cart")
                                }
                            >
                                ← Back to Cart
                            </button>
                        </div>
                    </div>
                </main>

                <Footer />
            </>
        );
    }

    if (cartItems.length === 0) {
        return (
            <>
                <Navbar />

                <main className="checkout-page">
                    <div className="checkout-wrapper">
                        <div className="checkout-empty">
                            <div className="empty-icon">
                                🛒
                            </div>

                            <h2>
                                Your cart is empty
                            </h2>

                            <p>
                                Add some products before
                                proceeding to checkout.
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/products")
                                }
                            >
                                Continue Shopping
                            </button>
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

            <main className="checkout-page">
                <div className="checkout-wrapper">
                    <div className="checkout-header">
                        <div>
                            <span>
                                Secure Checkout
                            </span>

                            <h1>
                                Complete Your Order
                            </h1>

                            <p>
                                Enter your delivery
                                information and review
                                your order before placing it.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="back-cart-btn"
                            onClick={() =>
                                navigate("/cart")
                            }
                        >
                            ← Back to Cart
                        </button>
                    </div>

                    {error && (
                        <div className="checkout-inline-error">
                            <strong>
                                Unable to place order
                            </strong>

                            <span>{error}</span>
                        </div>
                    )}

                    <form
                        className="checkout-layout"
                        onSubmit={handlePlaceOrder}
                    >
                        <section className="checkout-main">
                            <div className="checkout-card">
                                <div className="card-heading">
                                    <div className="heading-icon">
                                        01
                                    </div>

                                    <div>
                                        <h2>
                                            Delivery
                                            Information
                                        </h2>

                                        <p>
                                            Where should we
                                            deliver your order?
                                        </p>
                                    </div>
                                </div>

                                <div className="form-grid">
                                    <div className="form-group full">
                                        <label>
                                            Full Name
                                        </label>

                                        <input
                                            type="text"
                                            name="full_name"
                                            value={
                                                formData.full_name
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Enter your full name"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>
                                            Phone Number
                                        </label>

                                        <input
                                            type="tel"
                                            name="phone"
                                            value={
                                                formData.phone
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="03XX XXXXXXX"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>
                                            City
                                        </label>

                                        <input
                                            type="text"
                                            name="city"
                                            value={
                                                formData.city
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Enter your city"
                                            required
                                        />
                                    </div>

                                    <div className="form-group full">
                                        <label>
                                            Delivery Address
                                        </label>

                                        <textarea
                                            name="address"
                                            value={
                                                formData.address
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="House / apartment number, street, area..."
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>
                                            Postal Code
                                        </label>

                                        <input
                                            type="text"
                                            name="postal_code"
                                            value={
                                                formData.postal_code
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="e.g. 54000"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="checkout-card">
                                <div className="card-heading">
                                    <div className="heading-icon">
                                        02
                                    </div>

                                    <div>
                                        <h2>
                                            Payment Method
                                        </h2>

                                        <p>
                                            Your current
                                            payment option
                                        </p>
                                    </div>
                                </div>

                                <div className="payment-option active">
                                    <div className="payment-radio">
                                        ✓
                                    </div>

                                    <div>
                                        <strong>
                                            Cash on Delivery
                                        </strong>

                                        <p>
                                            Pay when your order
                                            arrives.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <aside className="checkout-sidebar">
                            <div className="order-summary-card">
                                <div className="summary-heading">
                                    <div>
                                        <span>
                                            Your Order
                                        </span>

                                        <h2>
                                            Order Summary
                                        </h2>
                                    </div>

                                    <strong>
                                        {cartItems.length}
                                    </strong>
                                </div>

                                <div className="checkout-products">
                                    {cartItems.map(
                                        (item) => (
                                            <div
                                                className="checkout-product"
                                                key={
                                                    item.cart_id
                                                }
                                            >
                                                <div className="checkout-image-wrapper">
                                                    <img
                                                        src={getImageUrl(
                                                            item.image
                                                        )}
                                                        alt={
                                                            item.name
                                                        }
                                                        onError={(
                                                            e
                                                        ) => {
                                                            e.currentTarget.src =
                                                                "/images/placeholder.jpg";
                                                        }}
                                                    />

                                                    <span>
                                                        {
                                                            item.quantity
                                                        }
                                                    </span>
                                                </div>

                                                <div className="checkout-product-info">
                                                    <h3>
                                                        {
                                                            item.name
                                                        }
                                                    </h3>

                                                    <p>
                                                        Rs{" "}
                                                        {Number(
                                                            item.price ||
                                                                0
                                                        ).toFixed(
                                                            2
                                                        )}{" "}
                                                        each
                                                    </p>
                                                </div>

                                                <strong>
                                                    Rs{" "}
                                                    {(
                                                        Number(
                                                            item.price ||
                                                                0
                                                        ) *
                                                        Number(
                                                            item.quantity ||
                                                                0
                                                        )
                                                    ).toFixed(
                                                        2
                                                    )}
                                                </strong>
                                            </div>
                                        )
                                    )}
                                </div>

                                <div className="summary-breakdown">
                                    <div>
                                        <span>
                                            Subtotal
                                        </span>

                                        <strong>
                                            Rs{" "}
                                            {subtotal.toFixed(
                                                2
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Shipping
                                        </span>

                                        <strong className="free">
                                            Free
                                        </strong>
                                    </div>
                                </div>

                                <div className="summary-total">
                                    <span>
                                        Total
                                    </span>

                                    <strong>
                                        Rs{" "}
                                        {total.toFixed(
                                            2
                                        )}
                                    </strong>
                                </div>

                                <button
                                    className="place-order-btn"
                                    type="submit"
                                    disabled={
                                        placingOrder
                                    }
                                >
                                    {placingOrder
                                        ? "Placing Order..."
                                        : "Place Order →"}
                                </button>

                                <div className="secure-note">
                                    🔒 Secure checkout
                                </div>
                            </div>
                        </aside>
                    </form>
                </div>
            </main>

            <Footer />
        </>
    );
}

export default CheckOut;