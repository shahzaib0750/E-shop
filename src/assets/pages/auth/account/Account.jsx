import "./Account.css";
import { Link, useNavigate } from "react-router-dom";

function Account() {
    const navigate = useNavigate();

    const storedUser = localStorage.getItem("user");

    const user = storedUser
        ? JSON.parse(storedUser)
        : null;

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/login");
    };

    if (user) {
        return (
            <main className="account-page">
                <section className="account-card">

                    <div className="account-header">
                        <span className="account-label">
                            MY ACCOUNT
                        </span>

                        <h1>
                            Welcome back, {user.full_name}
                        </h1>

                        <p>
                            Manage your E-Shop account and dashboard.
                        </p>
                    </div>

                    <div className="account-info">
                        <div className="account-info-row">
                            <span>Name</span>
                            <strong>{user.full_name}</strong>
                        </div>

                        <div className="account-info-row">
                            <span>Email</span>
                            <strong>{user.email}</strong>
                        </div>

                        <div className="account-info-row">
                            <span>Account Type</span>

                            <strong className="role-badge">
                                {user.role}
                            </strong>
                        </div>
                    </div>

                    <div className="account-buttons">

                        {user.role === "customer" && (
                            <Link
                                to="/customer-dashboard"
                                className="account-dashboard-btn"
                            >
                                Go to Dashboard →
                            </Link>
                        )}

                        {user.role === "seller" && (
                            <Link
                                to="/seller-dashboard"
                                className="account-dashboard-btn"
                            >
                                Go to Seller Dashboard →
                            </Link>
                        )}

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="account-logout-btn"
                        >
                            Logout
                        </button>

                    </div>

                </section>
            </main>
        );
    }

    return (
        <main className="account-page">
            <section className="account-card">

                <div className="account-header">

                    <span className="account-label">
                        WELCOME TO E-SHOP
                    </span>

                    <h1>
                        Everything You Need,
                        <br />

                        <span>
                            All in One Place.
                        </span>
                    </h1>

                    <p>
                        Login to your account or create a new account
                        to start shopping.
                    </p>

                </div>

                <div className="account-buttons">

                    <Link
                        to="/login"
                        className="account-login-btn"
                    >
                        Login
                        <span>→</span>
                    </Link>

                    <Link
                        to="/signup"
                        className="account-create-btn"
                    >
                        Create Account
                        <span>→</span>
                    </Link>

                </div>

            </section>
        </main>
    );
}

export default Account;