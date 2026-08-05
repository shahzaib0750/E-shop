import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {

    const [cartCount, setCartCount] = useState(0);


    const fetchCartCount = async () => {

    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
        setCartCount(0);
        return;
    }


    try {

        const response = await fetch(
            `http://127.0.0.1:8000/cart/count/${user.id}`
        );


        const data = await response.json();


        console.log("Backend cart count:", data);


        setCartCount(data.count);


    } catch(error) {

        console.log("Cart count error:", error);

    }

};
    useEffect(() => {
        fetchCartCount();
    }, []);


    return (
        <CartContext.Provider
            value={{
                cartCount,
                refreshCart: fetchCartCount
            }}
        >
            {children}
        </CartContext.Provider>
    );
}


export function useCart() {
    return useContext(CartContext);
}