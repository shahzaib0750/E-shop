import { Link } from "react-router-dom";

function CartSummary({ subtotal }) {

  return (

    <div className="cart-summary">

      <h2>Order Summary</h2>

      <div className="summary-row">

        <span>Subtotal</span>

        <span>${subtotal}</span>

      </div>

      <div className="summary-row">

        <span>Shipping</span>

        <span>Free</span>

      </div>

      <div className="summary-row total">

        <span>Total</span>

        <span>${subtotal}</span>

      </div>

      <Link to="/checkout" className="checkout-btn">
        Proceed to Checkout
      </Link>

    </div>

  );
}

export default CartSummary;