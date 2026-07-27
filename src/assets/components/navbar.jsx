import "../components/navbar.css";
import { Link } from "react-router-dom";

import {
  FaSearch,
  FaShoppingCart,
  FaUser,
} from "react-icons/fa";

function Navbar() {
  return (
    <header className="navbar">

      <div className="logo">
        E-Shop
      </div>

      <nav className="nav-links">
        {/* <a href="#">Home</a> */}
        <Link to="/">Home</Link>
        {/* <a href="#">New Arrivals</a> */}
        <Link to="/newarrivals">New Arrivals</Link>
        {/* <a href="#">Customer Reivew</a> */}
        <Link to="/customerreview">Customer Review</Link>
        {/* <a href="#">Contact</a> */}
        <Link to="/contact">Contact</Link>

        <Link to="/cart">Cart</Link>
      </nav>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search products..."
        />
        <button>
          <FaSearch />
        </button>
      </div>

      <div className="nav-icons">
          <Link to="/cart" className="cart-icon">
        <FaShoppingCart className="icon" />
        </Link>
        <Link to="/Account">
        <FaUser className="icon" />
        </Link>
      </div>

    </header>
  );
}

export default Navbar;