import "./CheckOut.css";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function CheckOut() {

  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
  });


  useEffect(() => {

    const fetchCart = async () => {

      try {

        const user = JSON.parse(
          localStorage.getItem("user")
        );

        if (!user) {

          setError("Please login before checkout.");

          setLoading(false);

          return;
        }


        setFormData((previous) => ({
          ...previous,
          full_name: user.full_name || "",
          phone: user.phone || "",
        }));


        const response = await fetch(
          `http://127.0.0.1:8000/cart/${user.id}`
        );


        const data = await response.json();


        if (!response.ok) {

          setError(
            data.detail || "Unable to load cart."
          );

          return;
        }


        setCartItems(data);

      } catch (error) {

        console.error(
          "Checkout cart error:",
          error
        );

        setError(
          "Unable to connect to server."
        );

      } finally {

        setLoading(false);

      }

    };


    fetchCart();

  }, []);


  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

  };


  const subtotal = cartItems.reduce(
    (total, item) =>
      total +
      Number(item.price) *
      Number(item.quantity),
    0
  );


  const handlePlaceOrder = async (e) => {

    e.preventDefault();


    if (cartItems.length === 0) {

      alert("Your cart is empty.");

      return;
    }


    const user = JSON.parse(
      localStorage.getItem("user")
    );


    if (!user) {

      alert("Please login first.");

      navigate("/login");

      return;
    }


    setPlacingOrder(true);


    try {

      const response = await fetch(
        "http://127.0.0.1:8000/orders",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            user_id: user.id,
          }),
        }
      );


      const data = await response.json();


      console.log(
        "Order response:",
        data
      );


      if (!response.ok) {

        alert(
          data.detail ||
          "Unable to place order."
        );

        return;
      }


      navigate("/order-success", {
        state: {
          orderId: data.order_id,
          totalAmount: data.total_amount,
        },
      });

    } catch (error) {

      console.error(
        "Place order error:",
        error
      );

      alert(
        "Unable to connect to server."
      );

    } finally {

      setPlacingOrder(false);

    }

  };


  if (loading) {

    return (
      <>
        <Navbar />

        <section className="checkout-page">

          <div className="checkout-container">

            <h1>Checkout</h1>

            <h3>Loading checkout...</h3>

          </div>

        </section>

        <Footer />
      </>
    );

  }


  if (error) {

    return (
      <>
        <Navbar />

        <section className="checkout-page">

          <div className="checkout-container">

            <h1>Checkout</h1>

            <div className="checkout-error">

              <h3>{error}</h3>

            </div>

          </div>

        </section>

        <Footer />
      </>
    );

  }


  return (

    <>
      <Navbar />


      <section className="checkout-page">

        <div className="checkout-container">

          <h1>Checkout</h1>


          {cartItems.length === 0 ? (

            <div className="empty-checkout">

              <h2>Your cart is empty.</h2>

              <button
                type="button"
                onClick={() => navigate("/")}
              >
                Continue Shopping
              </button>

            </div>

          ) : (

            <form
              className="checkout-content"
              onSubmit={handlePlaceOrder}
            >


              <div className="checkout-left">


                <div className="checkout-box">

                  <h2>Delivery Information</h2>


                  <div className="form-group">

                    <label>
                      Full Name
                    </label>

                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      required
                    />

                  </div>


                  <div className="form-group">

                    <label>
                      Phone Number
                    </label>

                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Enter your phone number"
                      required
                    />

                  </div>


                  <div className="form-group">

                    <label>
                      Address
                    </label>

                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Enter your complete address"
                      rows="4"
                      required
                    />

                  </div>


                  <div className="checkout-row">

                    <div className="form-group">

                      <label>
                        City
                      </label>

                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="City"
                        required
                      />

                    </div>


                    <div className="form-group">

                      <label>
                        Postal Code
                      </label>

                      <input
                        type="text"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleChange}
                        placeholder="Postal Code"
                        required
                      />

                    </div>

                  </div>

                </div>


                <div className="checkout-box">

                  <h2>Payment Method</h2>

                  <div className="payment-option">

                    <input
                      type="radio"
                      id="cod"
                      name="payment"
                      value="cod"
                      defaultChecked
                    />

                    <label htmlFor="cod">
                      Cash on Delivery
                    </label>

                  </div>

                </div>


              </div>


              <div className="checkout-right">

                <div className="checkout-box order-summary">

                  <h2>
                    Order Summary
                  </h2>


                  <div className="checkout-products">

                    {cartItems.map((item) => (

                      <div
                        className="checkout-product"
                        key={item.cart_id}
                      >

                        <img
  src={
    item.image
      ? (
          item.image.startsWith("http")
            ? item.image
            : `/images/${item.image}`
        )
      : "https://placehold.co/100x100?text=No+Image"
  }
  alt={item.name}
/>


                        <div>

                          <h3>
                            {item.name}
                          </h3>

                          <p>
                            Qty: {item.quantity}
                          </p>

                        </div>


                        <strong>
                          $
                          {(
                            Number(item.price) *
                            Number(item.quantity)
                          ).toFixed(2)}
                        </strong>

                      </div>

                    ))}

                  </div>


                  <div className="summary-line">

                    <span>
                      Subtotal
                    </span>

                    <span>
                      ${subtotal.toFixed(2)}
                    </span>

                  </div>


                  <div className="summary-line">

                    <span>
                      Delivery
                    </span>

                    <span>
                      Free
                    </span>

                  </div>


                  <hr />


                  <div className="summary-total">

                    <span>
                      Total
                    </span>

                    <strong>
                      ${subtotal.toFixed(2)}
                    </strong>

                  </div>


                  <button
                    type="submit"
                    className="place-order-btn"
                    disabled={placingOrder}
                  >

                    {placingOrder
                      ? "Placing Order..."
                      : "Place Order"}

                  </button>

                </div>

              </div>


            </form>

          )}

        </div>

      </section>


      <Footer />

    </>

  );

}

export default CheckOut;