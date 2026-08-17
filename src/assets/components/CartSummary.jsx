import { Link } from "react-router-dom";


function CartSummary({ subtotal }) {
    return (
        <div className="cart-summary">

            <div className="cart-summary-header">
                <p className="summary-label">
                    CART
                </p>

                <h2>
                    Order Summary
                </h2>
            </div>


            <div className="summary-details">

                <div className="summary-row">

                    <span>
                        Subtotal
                    </span>

                    <span>
                        $ {Number(subtotal).toFixed(2)}
                    </span>

                </div>


                <div className="summary-row">

                    <span>
                        Shipping
                    </span>

                    <span className="free-shipping">
                        Free
                    </span>

                </div>

            </div>


            <div className="summary-divider"></div>


            <div className="summary-row total">

                <span>
                    Total
                </span>

                <strong>
                    $ {Number(subtotal).toFixed(2)}
                </strong>

            </div>


            <Link
                to="/checkout"
                className="checkout-btn"
            >
                <span>
                    Proceed to Checkout
                </span>

                <span className="checkout-arrow">
                    →
                </span>
            </Link>


            <p className="secure-checkout">
                🔒 Secure checkout
            </p>

        </div>
    );
}

export default CartSummary;