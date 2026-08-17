import "./FlashSaleCard.css";
import { FaShoppingCart } from "react-icons/fa";
import { useState } from "react";
import { useCart } from "../../src/cartContext/UseCart";

function FlashSaleCard({ product }) {

    const { refreshCart } = useCart();

    const [notice, setNotice] = useState("");


    // ==========================================
    // ADD TO CART
    // ==========================================

    const handleAddToCart = async () => {

        const token = localStorage.getItem("token");

        const user = JSON.parse(
            localStorage.getItem("user") || "null"
        );


        // Login check

        if (!token || !user) {
            setNotice("Please login first.");
            return;
        }


        // Seller check

        if (user.role === "seller") {

            setNotice(
                "Seller accounts cannot add products to cart."
            );

            return;
        }


        try {

            const response = await fetch(
                "http://127.0.0.1:8000/cart",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },

                    body: JSON.stringify({
                        product_id: product.id,
                        quantity: 1,
                    }),
                }
            );


            const data = await response.json();


            if (response.ok) {

                refreshCart();

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


    return (

        <article className="flash-card">


            {/* ==================================
                SALE BADGE
            ================================== */}

            <div className="sale-badge">
                -{product.discount}%
            </div>


            {/* ==================================
                IMAGE
            ================================== */}

            <div className="flash-card-image">

                <img
                    src={product.image}
                    alt={product.name}
                />

            </div>


            {/* ==================================
                DETAILS
            ================================== */}

            <div className="flash-card-details">

                <span className="flash-card-label">
                    FLASH DEAL
                </span>


                <h3>
                    {product.name}
                </h3>


                {/* PRICE */}

                <div className="price">

                    <span className="new-price">
                        ${Number(product.price).toFixed(2)}
                    </span>

                    <span className="old-price">
                        ${Number(product.oldPrice).toFixed(2)}
                    </span>

                </div>


                {/* ADD TO CART */}

                <button
                    type="button"
                    onClick={handleAddToCart}
                >

                    <FaShoppingCart />

                    <span>
                        Add to Cart
                    </span>

                </button>


                {/* NOTICE */}

                {notice && (

                    <p
                        className="flash-cart-notice"
                        role="status"
                    >
                        {notice}
                    </p>

                )}

            </div>

        </article>
    );
}

export default FlashSaleCard;