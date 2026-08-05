import "../components/navbar.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  FaSearch,
  FaShoppingCart,
  FaUser,
} from "react-icons/fa";

import { useCart } from "../../../src/cartContext/CartContext";

function Navbar() {

  const [search, setSearch] = useState("");

  const { cartCount } = useCart();

  const navigate = useNavigate();

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

        alert(data.detail);

      }

    } catch (error) {

      console.error(error);
      alert("Unable to connect to server.");

    }

  };

  return (

    <header className="navbar">

      <div className="logo">
        <Link to="/">E-Shop</Link>
      </div>

      <nav className="nav-links">

        <Link to="/">Home</Link>

        <Link to="/newarrivals">
          New Arrivals
        </Link>

        <Link to="/customerreview">
          Customer Review
        </Link>

        <Link to="/contact">
          Contact
        </Link>

        <Link to="/cart">
          Cart
        </Link>

      </nav>

      <div className="search-box">

        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
        />

        <button onClick={handleSearch}>
          <FaSearch />
        </button>

      </div>

      <div className="nav-icons">

        <Link to="/cart" className="cart-icon">

          <FaShoppingCart className="icon" />

          {cartCount > 0 && (
            <span className="cart-badge">
              {cartCount}
            </span>
          )}

        </Link>

        <Link to="/account">
          <FaUser className="icon" />
        </Link>

      </div>

    </header>

  );

}

export default Navbar;