import "./Account.css";

import { Link } from "react-router-dom";

function Account() {
  return (
    <div className="account-page">

      <div className="account-card">

        <h1>Welcome to E-Shop</h1>

        <p>
          Login to your account or create a new one to continue shopping.
        </p>

        <div className="account-buttons">

          <Link to="/login" className="login-btn">
            Login
          </Link>

          <Link to="/signup" className="signup-btn">
            Create Account
          </Link>

        </div>

      </div>

    </div>
  );
}

export default Account;