import "./CustomerDashboard.css";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

function CustomerDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(
    location.state?.tab || "dashboard"
  );

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const showMessage = useCallback((text, type = "error") => {
    setMessage(text);
    setMessageType(type);
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        showMessage("Please login to view your orders.");
        navigate("/login");
        return;
      }

      const response = await fetch(
        "http://127.0.0.1:8000/orders",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        showMessage(
          "Your session has expired. Please login again."
        );

        navigate("/login");
        return;
      }

      if (!response.ok) {
        showMessage(
          data.detail || "Unable to load orders."
        );
        return;
      }

      setOrders(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error("Fetch orders error:", error);

      showMessage(
        "Unable to connect to server."
      );
    } finally {
      setLoadingOrders(false);
    }
  }, [navigate, showMessage]);

  useEffect(() => {
    if (location.state?.tab !== "orders") {
      return;
    }

    const timer = setTimeout(() => {
      fetchOrders();
    }, 0);

    return () => clearTimeout(timer);
  }, [location.state?.tab, fetchOrders]);

  const cancelOrder = async (orderId) => {
    setMessage("");

    const token = localStorage.getItem("token");

    if (!token) {
      showMessage("Please login to continue.");
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/orders/${orderId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        showMessage(
          "Your session has expired. Please login again."
        );

        navigate("/login");
        return;
      }

      if (!response.ok) {
        showMessage(
          data.detail ||
            "Unable to cancel order."
        );
        return;
      }

      showMessage(
        data.message ||
          "Order cancelled successfully.",
        "success"
      );

      await fetchOrders();
    } catch (error) {
      console.error(
        "Cancel order error:",
        error
      );

      showMessage(
        "Unable to connect to server."
      );
    }
  };

  const handleCancelOrder = (orderId) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this order?"
    );

    if (confirmed) {
      cancelOrder(orderId);
    }
  };

  const handleOrdersTab = async () => {
    setActiveTab("orders");
    await fetchOrders();
  };

  const handleDashboardTab = () => {
    setActiveTab("dashboard");
    setMessage("");
  };

  const totalSpent = orders.reduce(
    (total, order) =>
      total +
      Number(order.total_amount || 0),
    0
  );

  const pendingOrders = orders.filter(
    (order) =>
      String(order.status || "")
        .toLowerCase() === "pending"
  ).length;

  const getStatusClass = (status) => {
    const normalizedStatus = String(
      status || ""
    )
      .toLowerCase()
      .replace(/\s+/g, "-");

    return `order-status ${normalizedStatus}`;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  return (
    <>
      <Navbar />

      {message && (
        <div
          className={`customer-dashboard-message ${messageType}`}
          role="status"
        >
          <span>{message}</span>

          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Close message"
          >
            ×
          </button>
        </div>
      )}

      <div className="customer-dashboard-page">
        <div className="customer-dashboard-container">
          <aside className="customer-sidebar">
            <div className="customer-profile">
              <div className="customer-avatar">
                👤
              </div>

              <h2>Customer</h2>
              <p>My Account</p>
            </div>

            <nav className="customer-menu">
              <button
                type="button"
                className={
                  activeTab === "dashboard"
                    ? "customer-menu-item active"
                    : "customer-menu-item"
                }
                onClick={handleDashboardTab}
              >
                <span>▦</span>
                Dashboard
              </button>

              <button
                type="button"
                className={
                  activeTab === "orders"
                    ? "customer-menu-item active"
                    : "customer-menu-item"
                }
                onClick={handleOrdersTab}
              >
                <span>▤</span>
                My Orders
              </button>

              <button
                type="button"
                className="customer-menu-item"
                onClick={() =>
                  navigate("/wishlist")
                }
              >
                <span>♡</span>
                Wishlist
              </button>

              <button
                type="button"
                className="customer-menu-item"
                onClick={() =>
                  navigate("/cart")
                }
              >
                <span>🛒</span>
                Shopping Cart
              </button>

              <button
                type="button"
                className="customer-menu-item"
              >
                <span>⌂</span>
                Addresses
              </button>

              <button
                type="button"
                className="customer-menu-item"
              >
                <span>▣</span>
                Payment Methods
              </button>

              <button
                type="button"
                className="customer-menu-item"
              >
                <span>⚙</span>
                Account Settings
              </button>

              <button
                type="button"
                className="customer-menu-item logout-item"
                onClick={handleLogout}
              >
                <span>↪</span>
                Logout
              </button>
            </nav>
          </aside>

          <main className="customer-dashboard-content">
            {activeTab === "dashboard" && (
              <>
                <div className="customer-dashboard-header">
                  <div>
                    <p className="dashboard-label">
                      CUSTOMER PANEL
                    </p>

                    <h1>Welcome Back 👋</h1>

                    <p>
                      Manage your orders and
                      shopping activity.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="continue-shopping-btn"
                    onClick={() => navigate("/")}
                  >
                    Continue Shopping
                  </button>
                </div>

                <div className="customer-stats-grid">
                  <div className="customer-stat-card">
                    <div className="stat-icon orders-icon">
                      ▤
                    </div>

                    <div>
                      <span>Total Orders</span>
                      <strong>
                        {orders.length}
                      </strong>
                    </div>
                  </div>

                  <div className="customer-stat-card">
                    <div className="stat-icon spent-icon">
                      $
                    </div>

                    <div>
                      <span>Total Spent</span>
                      <strong>
                        ${totalSpent.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <div className="customer-stat-card">
                    <div className="stat-icon wishlist-icon">
                      ♡
                    </div>

                    <div>
                      <span>Wishlist Items</span>
                      <strong>0</strong>
                    </div>
                  </div>

                  <div className="customer-stat-card">
                    <div className="stat-icon pending-icon">
                      ◷
                    </div>

                    <div>
                      <span>Pending Orders</span>
                      <strong>
                        {pendingOrders}
                      </strong>
                    </div>
                  </div>
                </div>

                <section className="customer-overview-card">
                  <div className="section-heading">
                    <div>
                      <h2>Recent Orders</h2>

                      <p>
                        Your latest shopping
                        activity.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="view-orders-btn"
                      onClick={handleOrdersTab}
                    >
                      View All Orders
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <div className="empty-dashboard">
                      <div className="empty-icon">
                        🛍️
                      </div>

                      <h3>No orders yet</h3>

                      <p>
                        Start shopping and your
                        orders will appear here.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          navigate("/")
                        }
                        className="shop-now-btn"
                      >
                        Shop Now
                      </button>
                    </div>
                  ) : (
                    <div className="recent-orders-list">
                      {orders
                        .slice(0, 5)
                        .map((order) => (
                          <div
                            className="recent-order-row"
                            key={order.order_id}
                          >
                            <div>
                              <strong>
                                #{order.order_id}
                              </strong>

                              <span>
                                {new Date(
                                  order.created_at
                                ).toLocaleDateString()}
                              </span>
                            </div>

                            <span
                              className={getStatusClass(
                                order.status
                              )}
                            >
                              {order.status}
                            </span>

                            <strong>
                              $
                              {Number(
                                order.total_amount ||
                                  0
                              ).toFixed(2)}
                            </strong>
                          </div>
                        ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {activeTab === "orders" && (
              <section className="customer-orders-card">
                <div className="section-heading">
                  <div>
                    <p className="dashboard-label">
                      ORDER MANAGEMENT
                    </p>

                    <h1>My Orders</h1>

                    <p>
                      Track and manage all your
                      orders.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="continue-shopping-btn"
                    onClick={() => navigate("/")}
                  >
                    Continue Shopping
                  </button>
                </div>

                {loadingOrders ? (
                  <div className="orders-loading">
                    <div className="loading-spinner"></div>

                    <p>
                      Loading your orders...
                    </p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="empty-dashboard">
                    <div className="empty-icon">
                      📦
                    </div>

                    <h3>No Orders Found</h3>

                    <p>
                      You haven't placed any
                      orders yet.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        navigate("/")
                      }
                      className="shop-now-btn"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  <div className="customer-orders-table-wrapper">
                    <table className="customer-orders-table">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Total</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {orders.map((order) => (
                          <tr
                            key={order.order_id}
                          >
                            <td>
                              <strong>
                                #{order.order_id}
                              </strong>
                            </td>

                            <td>
                              <strong>
                                $
                                {Number(
                                  order.total_amount ||
                                    0
                                ).toFixed(2)}
                              </strong>
                            </td>

                            <td>
                              <span
                                className={getStatusClass(
                                  order.status
                                )}
                              >
                                {order.status}
                              </span>
                            </td>

                            <td>
                              {new Date(
                                order.created_at
                              ).toLocaleDateString()}
                            </td>

                            <td>
                              <div className="order-actions">
                                <Link
                                  to={`/order/${order.order_id}`}
                                  className="details-btn"
                                >
                                  View Details
                                </Link>

                                {String(
                                  order.status
                                ).toLowerCase() ===
                                  "pending" && (
                                  <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={() =>
                                      handleCancelOrder(
                                        order.order_id
                                      )
                                    }
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default CustomerDashboard;