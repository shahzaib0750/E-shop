import "./SellerOrders.css";
import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";
import { useEffect, useState } from "react";

function SellerOrders() {

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {

    try {

      const user = JSON.parse(
        localStorage.getItem("user")
      );

      if (!user) {

        alert("Please login first.");

        return;

      }

      const response = await fetch(
        `http://127.0.0.1:8000/seller/orders/${user.id}`
      );

      const data = await response.json();

      console.log("Seller Orders:", data);

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

  const updateOrderStatus = async (
    orderId,
    status
  ) => {

    try {

      const response = await fetch(
        `http://127.0.0.1:8000/seller/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {

        alert(data.detail);

        return;

      }

      alert("Order status updated.");

      fetchOrders();

    } catch (error) {

      console.log(error);

      alert("Unable to update order.");

    }

  };

  return (

    <>

      <Navbar />

      <section className="seller-orders">

        <div className="container">

          <h1>Seller Orders</h1>

          {loading ? (

            <h2>Loading Orders...</h2>

          ) : orders.length === 0 ? (

            <h2>No Orders Found</h2>

          ) : (

            <table>

              <thead>

                <tr>

                  <th>Order ID</th>

                  <th>Customer</th>

                  <th>Image</th>

                  <th>Product</th>

                  <th>Quantity</th>

                  <th>Price</th>

                  <th>Total</th>

                  <th>Status</th>

                  <th>Update Status</th>

                </tr>

              </thead>

              <tbody>

                {orders.map((order) => (

                  <tr
                    key={`${order.order_id}-${order.product_id}`}
                  >

                    <td>
                      #{order.order_id}
                    </td>

                    <td>
                      {order.customer_id}
                    </td>

                    <td>

                      <img
                        src={`/images/${order.image}`}
                        alt={order.product_name}
                        width="70"
                      />

                    </td>

                    <td>
                      {order.product_name}
                    </td>

                    <td>
                      {order.quantity}
                    </td>

                    <td>
                      ${order.price}
                    </td>

                    <td>
                      ${order.total}
                    </td>

                    <td>

                      <span
                        className={`status ${order.status}`}
                      >
                        {order.status}
                      </span>

                    </td>

                    <td>

                      <select
                        value={order.status}
                        onChange={(e) =>
                          updateOrderStatus(
                            order.order_id,
                            e.target.value
                          )
                        }
                      >

                        <option value="pending">
                          Pending
                        </option>

                        <option value="processing">
                          Processing
                        </option>

                        <option value="shipped">
                          Shipped
                        </option>

                        <option value="delivered">
                          Delivered
                        </option>

                        <option value="cancelled">
                          Cancelled
                        </option>

                      </select>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </div>

      </section>

      <Footer />

    </>

  );

}

export default SellerOrders;