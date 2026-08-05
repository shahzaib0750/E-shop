import "./CustomerDashboard.css";
import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";
import { useState } from "react";

function CustomerDashboard() {

  const [activeTab, setActiveTab] = useState("dashboard");
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // =========================
  // FETCH ORDERS
  // =========================

  const fetchOrders = async () => {

    try {

      setLoadingOrders(true);

      const user = JSON.parse(localStorage.getItem("user"));

      if (!user) {
        alert("Please login first.");
        return;
      }

      const response = await fetch(
        `http://127.0.0.1:8000/orders/${user.id}`
      );

      const data = await response.json();

      if (response.ok) {

        setOrders(data);

      } else {

        alert(data.detail);

      }

    } catch (error) {

      console.log(error);

      alert("Unable to connect to server.");

    } finally {

      setLoadingOrders(false);

    }

  };

  // =========================
  // CANCEL ORDER
  // =========================

  const cancelOrder = async (orderId) => {

    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this order?"
    );

    if (!confirmCancel) return;

    try {

      const response = await fetch(
        `http://127.0.0.1:8000/orders/${orderId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {

        alert(data.detail);

        return;

      }

      alert(data.message);

      fetchOrders();

    } catch (error) {

      console.log(error);

      alert("Unable to connect to server.");

    }

  };

  return (
    <>
      <Navbar />

      <div className="dashboard-page">

        <div className="dashboard-container">

          <aside className="dashboard-sidebar">

            <div className="profile-card">

              <img
                src="https://i.pravatar.cc/120"
                alt="Profile"
              />

              <h2>Customer</h2>

              <p>Customer</p>

            </div>

            <ul className="dashboard-menu">

              <li
                className={activeTab === "dashboard" ? "active" : ""}
                onClick={() => setActiveTab("dashboard")}
              >
                Dashboard
              </li>

              <li
                className={activeTab === "orders" ? "active" : ""}
                onClick={() => {
                  setActiveTab("orders");
                  fetchOrders();
                }}
              >
                My Orders
              </li>

              <li>Wishlist</li>
              <li>Shopping Cart</li>
              <li>Addresses</li>
              <li>Payment Methods</li>
              <li>Account Settings</li>

              <li className="logout">
                Logout
              </li>

            </ul>

          </aside>

          <main className="dashboard-content">

            {activeTab === "dashboard" && (

              <>

                <h1>Welcome Back 👋</h1>

                <p className="subtitle">
                  Manage your orders and shopping activity.
                </p>

                <div className="stats-grid">

                  <div className="stat-card">
                    <h2>{orders.length}</h2>
                    <p>Total Orders</p>
                  </div>

                  <div className="stat-card">
                    <h2>
                      $
                      {orders.reduce(
                        (total, order) =>
                          total + Number(order.total_amount),
                        0
                      )}
                    </h2>
                    <p>Total Spent</p>
                  </div>

                  <div className="stat-card">
                    <h2>0</h2>
                    <p>Wishlist Items</p>
                  </div>

                  <div className="stat-card">
                    <h2>
                      {
                        orders.filter(
                          (o) => o.status === "pending"
                        ).length
                      }
                    </h2>
                    <p>Pending Orders</p>
                  </div>

                </div>

                <section className="orders-section">

                  <h2>Dashboard</h2>

                  <p>
                    Select <strong>My Orders</strong> to view all your orders.
                  </p>

                </section>

              </>

            )}

            {activeTab === "orders" && (

              <section className="orders-section">

                <h2>My Orders</h2>

                {loadingOrders ? (

                  <h3>Loading Orders...</h3>

                ) : orders.length === 0 ? (

                  <h3>No Orders Found.</h3>

                ) : (

                  <table>

                    <thead>

                      <tr>

                        <th>Order ID</th>

                        <th>Total</th>

                        <th>Status</th>

                        <th>Date</th>

                        <th>Action</th>

                      </tr>

                    </thead>

                    <tbody>

                      {orders.map((order) => (

                        <tr key={order.order_id}>

                          <td>#{order.order_id}</td>

                          <td>${order.total_amount}</td>

                          <td className={order.status.toLowerCase()}>
                            {order.status}
                          </td>

                          <td>
                            {new Date(
                              order.created_at
                            ).toLocaleDateString()}
                          </td>

                          <td>

                            {order.status === "pending" ? (

                              <button
                                className="cancel-btn"
                                onClick={() =>
                                  cancelOrder(order.order_id)
                                }
                              >
                                Cancel Order
                              </button>

                            ) : (

                              <span>-</span>

                            )}

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

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