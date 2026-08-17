import {
  createContext,
  useEffect,
  useState,
} from "react";

import { apiFetch } from "../api/api";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadCartCount = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        if (!cancelled) {
          setCartCount(0);
        }
        return;
      }

      try {
        const response = await apiFetch(
          "/cart/count"
        );

        if (!response.ok) {
          if (!cancelled) {
            setCartCount(0);
          }
          return;
        }

        const data = await response.json();

        if (!cancelled) {
          setCartCount(
            Number(data.count) || 0
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Cart count error:",
            error
          );

          setCartCount(0);
        }
      }
    };

    const timer = setTimeout(() => {
      loadCartCount();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const refreshCart = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setCartCount(0);
      return;
    }

    try {
      const response = await apiFetch(
        "/cart/count"
      );

      if (!response.ok) {
        setCartCount(0);
        return;
      }

      const data = await response.json();

      setCartCount(
        Number(data.count) || 0
      );
    } catch (error) {
      console.error(
        "Refresh cart error:",
        error
      );

      setCartCount(0);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartCount,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export { CartContext };