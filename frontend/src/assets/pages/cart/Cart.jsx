import "./Cart.css";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";

import CartItem from "../../components/CartItems";
import CartSummary from "../../components/CartSummary";

import { useEffect, useState } from "react";

function Cart() {

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  // =========================
  // GET CART
  // =========================
const fetchCart = async () => {

  try {

    const user = JSON.parse(localStorage.getItem("user"));

    console.log("Logged in user:", user);

    if (!user) {
      setError("Please login to view your cart.");
      setLoading(false);
      return;
    }

    console.log("Fetching cart for user:", user.id);

    const response = await fetch(
      `http://127.0.0.1:8000/cart/${user.id}`
    );

    const data = await response.json();

    console.log("Cart API Response:", data);

    if (!response.ok) {
      setError(data.detail || "Unable to load cart.");
      return;
    }

    console.log("Setting cart items:", data);

    setCartItems(data);
    setError("");

  } catch (error) {

    console.error(error);

  } finally {

    setLoading(false);

  }

};


  // =========================
  // LOAD CART WHEN PAGE OPENS
  // =========================

  useEffect(() => {
    // console.log("Fetching cart for user:", user.id);
    fetchCart();

  }, []);


  // =========================
  // CALCULATE SUBTOTAL
  // =========================

  const subtotal = cartItems.reduce(
    (total, item) => {

      return (
        total +
        Number(item.price) *
        Number(item.quantity)
      );

    },
    0
  );


  // =========================
  // LOADING
  // =========================

  if (loading) {

    return (
      <>
        <Navbar />

        <section className="cart-page">

          <div className="container">

            <h1>Shopping Cart</h1>

            <h3>Loading cart...</h3>

          </div>

        </section>

        <Footer />
      </>
    );

  }


  // =========================
  // PAGE
  // =========================
console.log("cartItems state:", cartItems)
console.log("cartItems length:", cartItems.length)

  return (

    <>
      <Navbar />


      <section className="cart-page">

        <div className="container">

          <h1>Shopping Cart</h1>


          {/* ERROR */}

          {error && (

            <div className="cart-error">

              <h3>{error}</h3>

            </div>

          )}


          {/* EMPTY CART */}

          {!error &&
            cartItems.length === 0 && (

              <div className="empty-cart">

                <h3>
                  Your cart is empty.
                </h3>

                <p>
                  Add some products to your cart.
                </p>

              </div>

            )}


          {/* CART */}

          {!error &&
            cartItems.length > 0 && (

              <div className="cart-container">


                <div className="cart-items">

                  {cartItems.map((item) => (

                    <CartItem

                      key={item.cart_id}

                      item={item}

                      onCartUpdate={fetchCart}

                    />

                  ))}

                </div>


                <CartSummary
                  subtotal={subtotal}
                />

              </div>

            )}

        </div>

      </section>


      <Footer />

    </>

  );

}

export default Cart;