import "./Cart.css";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";

import CartItem from "../../components/CartItems";
import CartSummary from "../../components/CartSummary";

const cartItems = [
  {
    id: 1,
    name: "iPhone 16 Pro",
    image: "/images/hero.jpg",
    price: 999,
    quantity: 1,
  },
  {
    id: 2,
    name: "MacBook Air",
    image: "/images/hero.jpg",
    price: 1299,
    quantity: 2,
  },
];

function Cart() {

  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  return (
    <>
      <Navbar />

      <section className="cart-page">

        <div className="container">

          <h1>Shopping Cart</h1>

          <div className="cart-container">

            <div className="cart-items">

              {cartItems.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                />
              ))}

            </div>

            <CartSummary subtotal={subtotal} />

          </div>

        </div>

      </section>

      <Footer />
    </>
  );
}

export default Cart;