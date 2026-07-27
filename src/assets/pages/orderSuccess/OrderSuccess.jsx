import "./OrderSuccess.css";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";

import { Link } from "react-router-dom";

function OrderSuccess() {
  return (
    <>
      <Navbar />

      <main className="order-success">
        <div className="success-container">

          <div className="success-icon">
            ✓
          </div>

          <h1>Order Placed Successfully!</h1>

          <p>
            Thank you for your order. Your order has been
            successfully placed.
          </p>

          <p className="order-number">
            Order Number: <strong>#ESHOP-1001</strong>
          </p>

          <div className="success-buttons">

            <Link to="/orders" className="view-orders-btn">
              View My Orders
            </Link>

            <Link to="/" className="continue-shopping-btn">
              Continue Shopping
            </Link>

          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}

export default OrderSuccess;