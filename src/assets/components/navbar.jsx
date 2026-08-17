import "../components/navbar.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import {
    FaSearch,
    FaShoppingCart,
    FaUser,
} from "react-icons/fa";

import { useCart } from "../../../src/cartContext/UseCart"

function Navbar() {

    const [search, setSearch] = useState("");

    const { cartCount } = useCart();

    const navigate = useNavigate();


    // ==========================================
    // SEARCH
    // ==========================================

    const handleSearch = async () => {

        if (!search.trim()) return;

        try {

            const response = await fetch(
                `http://127.0.0.1:8000/products/search?keyword=${search}`
            );

            const data = await response.json();

            if (response.ok) {

                navigate("/search", {
                    state: {
                        products: data,
                        keyword: search,
                    },
                });

            } else {

                alert(
                    data.detail ||
                    "Unable to search products."
                );

            }

        } catch (error) {

            console.error(error);

            alert(
                "Unable to connect to server."
            );
        }
    };


    return (

        <header className="navbar">


            {/* ==================================
                LOGO
            ================================== */}

            <div className="logo">

                <Link to="/">
                    E-Shop
                </Link>

            </div>


            {/* ==================================
                NAVIGATION
            ================================== */}

            <nav className="nav-links">

                <Link to="/">
                    Home
                </Link>

                <Link to="/newarrivals">
                    New Arrivals
                </Link>

                <Link to="/customerreview">
                    Customer Review
                </Link>

                <Link to="/contact">
                    Contact
                </Link>

            </nav>


            {/* ==================================
                SEARCH
            ================================== */}

            <div className="search-box">

                <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) =>
                        setSearch(e.target.value)
                    }
                    onKeyDown={(e) => {

                        if (e.key === "Enter") {
                            handleSearch();
                        }

                    }}
                />

                <button
                    type="button"
                    onClick={handleSearch}
                    aria-label="Search"
                >
                    <FaSearch />
                </button>

            </div>


            {/* ==================================
                ACTIONS
            ================================== */}

            <div className="nav-icons">


                {/* Cart */}

                <Link
                    to="/cart"
                    className="nav-action cart-icon"
                    aria-label="Shopping cart"
                >

                    <FaShoppingCart />

                    {cartCount > 0 && (

                        <span className="cart-badge">
                            {cartCount}
                        </span>

                    )}

                </Link>


                {/* Account */}

                <Link
                    to="/account"
                    className="nav-action"
                    aria-label="Account"
                >

                    <FaUser />

                </Link>

            </div>

        </header>
    );
}

export default Navbar;