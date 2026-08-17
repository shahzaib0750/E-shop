import "./hero.css";
import { useNavigate } from "react-router-dom";

function Hero() {
    const navigate = useNavigate();

    const handleShopNow = () => {
        navigate("/newarrivals");
    };

    return (
        <section className="hero">

            <div className="hero-container">

                {/* =========================
                    HERO TEXT
                ========================= */}

                <div className="hero-text">

                    <span className="hero-label">
                        WELCOME TO E-SHOP
                    </span>

                    <h1>
                        Everything You Need,
                        <span> All in One Place.</span>
                    </h1>

                    <p>
                        Discover the latest products at great prices.
                        Shop quality products, enjoy amazing deals,
                        and get everything delivered to your door.
                    </p>

                    <div className="hero-actions">

                        <button
                            className="hero-btn"
                            onClick={handleShopNow}
                        >
                            Shop Now
                            <span>→</span>
                        </button>

                        <div className="hero-trust">

                            <div className="hero-trust-icon">
                                ✓
                            </div>

                            <div>
                                <strong>
                                    Quality Products
                                </strong>

                                <small>
                                    Great prices every day
                                </small>
                            </div>

                        </div>

                    </div>

                </div>


                {/* =========================
                    HERO IMAGE
                ========================= */}

                <div className="hero-image">

                    <div className="hero-image-bg"></div>

                    <img
                        src="/images/hero.jpg"
                        alt="E-Shop products"
                    />

                    {/* Floating offer */}

                    <div className="hero-offer">

                        <span className="offer-icon">
                            %
                        </span>

                        <div>
                            <strong>
                                Great Deals
                            </strong>

                            <small>
                                Every Day
                            </small>
                        </div>

                    </div>

                </div>

            </div>

        </section>
    );
}

export default Hero;