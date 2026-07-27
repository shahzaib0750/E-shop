import "./CheckOut.css";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";
import { useNavigate } from "react-router-dom";

function Checkout() {
  const cartItems = [
    {
      id: 1,
      name: "iPhone 16 Pro",
      price: 999,
      quantity: 1,
      image: "/images/hero.jpg",
    },
    {
      id: 2,
      name: "MacBook Air",
      price: 1299,
      quantity: 2,
      image: "/images/hero.jpg",
    },
  ];

  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const shipping = 0;
  const total = subtotal + shipping;
  const navigate = useNavigate();

  return (
    <>
      <Navbar />

      <main className="checkout-page">
        <div className="checkout-container">

          <h1>Checkout</h1>

          <div className="checkout-content">

            {/* LEFT SIDE */}
            <div className="checkout-left">

              <section className="checkout-section">
                <h2>Delivery Information</h2>

                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input type="text" placeholder="First Name" />
                  </div>

                  <div className="form-group">
                    <label>Last Name</label>
                    <input type="text" placeholder="Last Name" />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="example@email.com"
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="Phone Number"
                  />
                </div>

                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    placeholder="Street address"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input type="text" placeholder="City" />
                  </div>

                  <div className="form-group">
                    <label>Postal Code</label>
                    <input
                      type="text"
                      placeholder="Postal Code"
                    />
                  </div>
                </div>

              </section>

              {/* PAYMENT */}
              <section className="checkout-section">
                <h2>Payment Method</h2>

                <label className="payment-option">
                  <input
                    type="radio"
                    name="payment"
                    defaultChecked
                  />
                  Cash on Delivery
                </label>

                <label className="payment-option">
                  <input
                    type="radio"
                    name="payment"
                  />
                  Credit / Debit Card
                </label>
              </section>

            </div>

            {/* RIGHT SIDE */}
            <div className="checkout-right">

              <div className="order-summary">

                <h2>Your Order</h2>

                {cartItems.map((item) => (
                  <div
                    className="checkout-product"
                    key={item.id}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                    />

                    <div>
                      <h3>{item.name}</h3>
                      <p>
                        Qty: {item.quantity}
                      </p>
                    </div>

                    <strong>
                      ${item.price * item.quantity}
                    </strong>
                  </div>
                ))}

                <div className="checkout-line">
                  <span>Subtotal</span>
                  <span>${subtotal}</span>
                </div>

                <div className="checkout-line">
                  <span>Shipping</span>
                  <span>
                    {shipping === 0 ? "Free" : `$${shipping}`}
                  </span>
                </div>

                <div className="checkout-total">
                  <span>Total</span>
                  <span>${total}</span>
                </div>

                <button className="place-order-btn"
                onClick={() => navigate("/order-success")}>
                                    Place Order
                                          </button>

              </div>

            </div>

          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}

export default Checkout;