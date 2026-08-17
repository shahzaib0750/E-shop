import "./FlashSale.css";
import { useEffect, useState } from "react";
import FlashSaleCard from "./FlashSaleCard";

const flashProducts = [
    {
        id: 1,
        name: "Gaming Mouse",
        price: 35,
        oldPrice: 50,
        discount: 30,
        image: "/images/hero.jpg",
    },
    {
        id: 2,
        name: "Mechanical Keyboard",
        price: 80,
        oldPrice: 110,
        discount: 27,
        image: "/images/hero.jpg",
    },
    {
        id: 3,
        name: "Headphones",
        price: 45,
        oldPrice: 65,
        discount: 31,
        image: "/images/hero.jpg",
    },
    {
        id: 4,
        name: "Monitor",
        price: 220,
        oldPrice: 280,
        discount: 22,
        image: "/images/hero.jpg",
    },
];

function FlashSale() {

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

                <div className="flash-grid">

                    {flashProducts.map((product) => (

                        <FlashSaleCard
                            key={product.id}
                            product={product}
                        />

                    ))}

                </div>

            </div>

        </section>
    );
}

export default FlashSale;