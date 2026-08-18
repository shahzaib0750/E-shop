import "./FlashSale.css";
import { useEffect, useState } from "react";
import FlashSaleCard from "./FlashSaleCard";
import { apiFetch } from "../api/api";

const FLASH_DISCOUNT_PERCENT = 20;

function FlashSale() {

    // ==========================================
    // PRODUCTS (fetched from the API)
    // ==========================================

    const [products, setProducts] = useState([]);
    const [loadError, setLoadError] = useState("");


    useEffect(() => {

        let cancelled = false;


        const loadFlashProducts = async () => {

            try {

                const response = await apiFetch(
                    "/products?page=1&limit=4"
                );


                if (!cancelled) {

                    if (!response.ok) {

                        setLoadError(
                            "Unable to load flash sale products."
                        );

                        return;
                    }


                    const data = await response.json();


                    setProducts(
                        Array.isArray(data)
                            ? data.map((product) => {

                                const price =
                                    Number(product.price) || 0;

                                // Real products have no "old price"
                                // or discount; compute a sale price
                                // from a flat flash-sale discount.

                                const oldPrice =
                                    Math.round(
                                        price / (1 - FLASH_DISCOUNT_PERCENT / 100)
                                    );


                                return {
                                    ...product,
                                    oldPrice,
                                    discount: FLASH_DISCOUNT_PERCENT,
                                };
                            })
                            : []
                    );
                }

            } catch (error) {

                if (!cancelled) {

                    console.error(
                        "Flash sale products error:",
                        error
                    );

                    setLoadError(
                        "Unable to connect to server."
                    );
                }
            }
        };


        loadFlashProducts();


        return () => {
            cancelled = true;
        };

    }, []);


    // ==========================================
    // COUNTDOWN
    // ==========================================

    const [timeLeft, setTimeLeft] = useState(
        2 * 60 * 60
    );


    useEffect(() => {

        const timer = setInterval(() => {

            setTimeLeft((previousTime) => {

                if (previousTime <= 1) {

                    clearInterval(timer);

                    return 0;
                }

                return previousTime - 1;
            });

        }, 1000);


        return () => {
            clearInterval(timer);
        };

    }, []);


    // ==========================================
    // FORMAT TIME
    // ==========================================

    const hours = String(
        Math.floor(timeLeft / 3600)
    ).padStart(2, "0");


    const minutes = String(
        Math.floor(
            (timeLeft % 3600) / 60
        )
    ).padStart(2, "0");


    const seconds = String(
        timeLeft % 60
    ).padStart(2, "0");


    // ==========================================
    // UI
    // ==========================================

    return (

        <section className="flash-sale">

            <div className="flash-container">


                {/* ==================================
                    HEADER
                ================================== */}

                <div className="flash-header">

                    <div className="flash-heading">

                        <span className="flash-label">
                            LIMITED TIME OFFER
                        </span>

                        <h2>
                            🔥 Flash Sale
                        </h2>

                        <p>
                            Grab these deals before
                            they're gone.
                        </p>

                    </div>


                    <button
                        type="button"
                        className="shop-btn"
                    >
                        Shop All
                    </button>

                </div>


                {/* ==================================
                    COUNTDOWN
                ================================== */}

                <div className="countdown">

                    <span className="countdown-label">
                        Ending In
                    </span>

                    <div className="timer">

                        <span>
                            {hours}
                        </span>

                        <b>:</b>

                        <span>
                            {minutes}
                        </span>

                        <b>:</b>

                        <span>
                            {seconds}
                        </span>

                    </div>

                </div>


                {/* ==================================
                    PRODUCTS
                ================================== */}

                {loadError ? (

                    <p className="flash-load-error">
                        {loadError}
                    </p>

                ) : products.length === 0 ? (

                    <p className="flash-load-error">
                        Loading flash sale products...
                    </p>

                ) : (

                    <div className="flash-grid">

                        {products.map((product) => (

                            <FlashSaleCard
                                key={product.id}
                                product={product}
                            />

                        ))}

                    </div>

                )}

            </div>

        </section>
    );
}

export default FlashSale;
