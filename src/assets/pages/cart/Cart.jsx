import "./Cart.css";

import { useEffect, useState } from "react";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";

import CartItem from "../../components/CartItems";
import CartSummary from "../../components/CartSummary";

function Cart() {

    const [cartItems, setCartItems] = useState([]);

    const loadCart = async () => {

        const user = JSON.parse(localStorage.getItem("user"));

        if (!user) return;

        try {

            const response = await fetch(
                `http://127.0.0.1:8000/cart/${user.id}`
            );

            const data = await response.json();

            setCartItems(data);

        } catch (error) {

            console.error(error);

        }

    };

    useEffect(() => {

        loadCart();

    }, []);

    const subtotal = cartItems.reduce(

        (total, item) => total + Number(item.price) * Number(item.quantity),

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

                            {cartItems.length === 0 ? (

                                <h2>Your cart is empty.</h2>

                            ) : (

                                cartItems.map((item) => (

                                    <CartItem
                                        key={item.cart_id}
                                        item={item}
                                        onCartUpdate={loadCart}
                                    />

                                ))

                            )}

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