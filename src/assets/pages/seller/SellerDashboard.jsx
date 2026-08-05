import "./SellerDashboard.css";
import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

function SellerDashboard() {

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {

    try {

      const user = JSON.parse(localStorage.getItem("user"));
      console.log("Seller User:", user);

      if (!user) {
        alert("Please login first.");
        return;
      }

      const response = await fetch(
        `http://127.0.0.1:8000/seller/orders/${user.id}`
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

      setLoading(false);

    }

  };

  const totalRevenue = orders.reduce(
    (sum, order) => sum + Number(order.total),
    0
  );

  const pendingOrders = orders.filter(
    order => order.status === "pending"
  ).length;

  return (
    <>
      <Navbar />

      <div className="seller-dashboard">

        <aside className="seller-sidebar">

          <h2>E-Shop Seller</h2>

          <ul>

            <li><NavLink to="/seller-dashboard">Dashboard</NavLink></li>
            <li><NavLink to="/seller/products">Products</NavLink></li>
            <li><NavLink to="/seller/add-product">Add Product</NavLink></li>
            <li><NavLink to="/seller/orders">Orders</NavLink></li>
            <li><NavLink to="/seller/customers">Customers</NavLink></li>
            <li><NavLink to="/seller/analytics">Analytics</NavLink></li>
            <li><NavLink to="/seller/earnings">Earnings</NavLink></li>
            <li><NavLink to="/seller/settings">Settings</NavLink></li>
            <li><NavLink to="/">Logout</NavLink></li>

          </ul>

        </aside>

        <main className="seller-content">

          <h1>Seller Dashboard</h1>

          <div className="seller-cards">

            <div className="card">
              <h2>{new Set(orders.map(o => o.product_id)).size}</h2>
              <p>Total Products</p>
            </div>

            <div className="card">
              <h2>{orders.length}</h2>
              <p>Total Orders</p>
            </div>

            <div className="card">
              <h2>${totalRevenue}</h2>
              <p>Total Revenue</p>
            </div>

            <div className="card">
              <h2>{pendingOrders}</h2>
              <p>Pending Orders</p>
            </div>

          </div>

          <div className="recent-orders">

            <h2>Recent Orders</h2>

            {loading ? (

              <h3>Loading...</h3>

            ) : orders.length === 0 ? (

              <h3>No Orders Found</h3>

            ) : (

              <table>

                <thead>

                  <tr>

                    <th>Order</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Image</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Amount</th>

                  </tr>

                </thead>

                <tbody>

                  {orders.map((order) => (

                    <tr key={`${order.order_id}-${order.product_id}`}>

                      <td>#{order.order_id}</td>

                      <td>{order.customer_id}</td>

                      <td>{order.product_name}</td>

                      <td>

                        <img
                          src={`/images/${order.image}`}
                          alt={order.product_name}
                          width="70"
                        />

                      </td>

                      <td>{order.quantity}</td>

                      <td>{order.status}</td>

                      <td>${order.total}</td>

                    </tr>

                  ))}

                </tbody>

              </table>

            )}

          </div>

        </main>

      </div>

      <Footer />
    </>
  );
}

export default SellerDashboard;