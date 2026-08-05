import "./FlashSaleCard.css";
import { FaShoppingCart } from "react-icons/fa";
import { useCart } from "../../src/cartContext/CartContext";

function FlashSaleCard({ product }) {

  const { refreshCart } = useCart();

  const handleAddToCart = async () => {

    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
      alert("Please login first.");
      return;
    }

    try {

      const response = await fetch(
        "http://127.0.0.1:8000/cart",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user.id,
            product_id: product.id,
            quantity: 1,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {

        refreshCart();

        alert("Product added to cart.");

      } else {

        alert(data.detail || "Unable to add product.");

      }

    } catch (error) {

      console.error(error);
      alert("Unable to connect to server.");

    }

  };

  return (

    <div className="flash-card">

      <div className="sale-badge">
        -{product.discount}%
      </div>

      <img
        src={product.image}
        alt={product.name}
      />

      <h3>{product.name}</h3>

      <div className="price">

        <span className="new-price">
          ${product.price}
        </span>

        <span className="old-price">
          ${product.oldPrice}
        </span>

      </div>

      <button onClick={handleAddToCart}>

        <FaShoppingCart />

        Add to Cart

      </button>

    </div>

  );
}

export default FlashSaleCard;