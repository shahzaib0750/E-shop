import "./SellerSidebar.css";
import { NavLink, useNavigate } from "react-router-dom";

function SellerSidebar() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/login");
    };

    return (
        <aside className="seller-sidebar">

            {/* =========================
                PROFILE
            ========================= */}

            <div className="seller-profile">

                <div className="seller-avatar">
                    <img
                        src="https://i.pravatar.cc/120"
                        alt="Seller"
                    />
                </div>

                <h2>Seller</h2>

                <p>Seller Dashboard</p>

            </div>


            {/* =========================
                NAVIGATION
            ========================= */}

            <nav className="seller-menu">

                {/* Store */}

                <NavLink
                    to="/"
                    className={({ isActive }) =>
                        isActive
                            ? "seller-menu-item active"
                            : "seller-menu-item"
                    }
                >
                    <span className="menu-icon">⌂</span>

                    <span>
                        Back to Store
                    </span>
                </NavLink>


                {/* Dashboard */}

                <NavLink
                    to="/seller-dashboard"
                    className={({ isActive }) =>
                        isActive
                            ? "seller-menu-item active"
                            : "seller-menu-item"
                    }
                >
                    <span className="menu-icon">▦</span>

                    <span>
                        Dashboard
                    </span>
                </NavLink>


                {/* Products */}

                <NavLink
                    to="/seller/products"
                    className={({ isActive }) =>
                        isActive
                            ? "seller-menu-item active"
                            : "seller-menu-item"
                    }
                >
                    <span className="menu-icon">□</span>

                    <span>
                        My Products
                    </span>
                </NavLink>


                {/* Add Product */}

                <NavLink
                    to="/seller/add-product"
                    className={({ isActive }) =>
                        isActive
                            ? "seller-menu-item active"
                            : "seller-menu-item"
                    }
                >
                    <span className="menu-icon">＋</span>

                    <span>
                        Add Product
                    </span>
                </NavLink>


                {/* Orders */}

                <NavLink
                    to="/seller/orders"
                    className={({ isActive }) =>
                        isActive
                            ? "seller-menu-item active"
                            : "seller-menu-item"
                    }
                >
                    <span className="menu-icon">🛒</span>

                    <span>
                        Orders
                    </span>
                </NavLink>


                {/* Divider */}

                <div className="seller-menu-divider"></div>


                {/* Logout */}

                <button
                    className="seller-menu-item logout-btn"
                    onClick={handleLogout}
                >
                    <span className="menu-icon">↪</span>

                    <span>
                        Logout
                    </span>
                </button>

            </nav>


            {/* =========================
                SIDEBAR FOOTER
            ========================= */}

            <div className="seller-sidebar-footer">

                <span className="footer-dot"></span>

                <span>
                    Seller Center
                </span>

            </div>

        </aside>
    );
}

export default SellerSidebar;