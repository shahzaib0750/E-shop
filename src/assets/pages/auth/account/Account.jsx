import "./Account.css";

import { Link, useNavigate } from "react-router-dom";

function Account() {

  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {

    localStorage.removeItem("user");

    navigate("/login");

  };

  if (user) {

    return (

      <div className="account-page">

        <div className="account-card">

          <h1>My Account</h1>

          <div className="account-info">

            <p>
              <strong>Name:</strong> {user.full_name}
            </p>

            <p>
              <strong>Email:</strong> {user.email}
            </p>

            <p>
              <strong>Role:</strong> {user.role}
            </p>

          </div>

          <div className="account-buttons">

            {user.role === "customer" && (
              <Link
                to="/customer-dashboard"
                className="login-btn"
              >
                Customer Dashboard
              </Link>
            )}

            {user.role === "seller" && (
              <Link
                to="/seller-dashboard"
                className="login-btn"
              >
                Seller Dashboard
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="signup-btn"
            >
              Logout
            </button>

          </div>

        </div>

      </div>

    );

  }

  return (

    <div className="account-page">

      <div className="account-card">

        <h1>Welcome to E-Shop</h1>

        <p>
          Login to your account or create a new one to continue shopping.
        </p>

        <div className="account-buttons">

          <Link
            to="/login"
            className="login-btn"
          >
            Login
          </Link>

          <Link
            to="/signup"
            className="signup-btn"
          >
            Create Account
          </Link>

        </div>

      </div>

    </div>

  );

}

export default Account;