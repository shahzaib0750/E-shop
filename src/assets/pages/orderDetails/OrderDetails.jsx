import "./OrderDetails.css";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

function OrderDetails() {

  const { id } = useParams();

  const navigate = useNavigate();

  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {

    const fetchOrder = async () => {

      try {

        const token = localStorage.getItem("token");

        const response = await fetch(
          `http://127.0.0.1:8000/orders/details/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {

          setError(data.detail);

          return;

        }

        setOrder(data);

      }

      catch (error) {

        console.log(error);

        setError("Unable to load order.");

      }

      finally {

        setLoading(false);

      }

    };

    fetchOrder();

  }, [id]);

  if (loading) {

    return (

      <>
        <Navbar />

        <div className="order-details-page">

          <h2>Loading...</h2>

        </div>

        <Footer />

      </>

    );

  }

  if (error) {

    return (

      <>
        <Navbar />

        <div className="order-details-page">

          <h2>{error}</h2>

        </div>

        <Footer />

      </>

    );

  }

  return (

    <>

      <Navbar />

      <div className="order-details-page">

        <div className="order-details-container">

          <button
            className="back-btn"
            onClick={() => navigate(-1)}
          >

            ← Back

          </button>

          <h1>

            Order #{order.order_id}

          </h1>

          <div className="order-info">

            <div>

              <strong>Status</strong>

              <p>{order.status}</p>

            </div>

            <div>

              <strong>Date</strong>

              <p>

                {new Date(order.created_at).toLocaleString()}

              </p>

            </div>

            <div>

              <strong>Total</strong>

              <p>

                ${Number(order.total_amount).toFixed(2)}

              </p>

            </div>

          </div>

          <h2>Products</h2>

          <div className="products-list">

            {order.items.map((item) => (

              <div
                className="product-card"
                key={item.product_id}
              >

                <img
                  src={
                    item.image.startsWith("http")
                      ? item.image
                      : `/images/${item.image}`
                  }
                  alt={item.name}
                />

                <div className="product-info">

                  <h3>{item.name}</h3>

                  <p>Brand: {item.brand}</p>

                  <p>Quantity: {item.quantity}</p>

                  <p>

                    Price: ${item.price}

                  </p>

                </div>

                <h3>

                  $

                  {Number(item.subtotal).toFixed(2)}

                </h3>

              </div>

            ))}

          </div>

          <div className="order-total">

            Grand Total

            <span>

              ${Number(order.total_amount).toFixed(2)}

            </span>

          </div>

        </div>

      </div>

      <Footer />

    </>

  );

}

export default OrderDetails;