import "./productCard.css";
import { FaShoppingCart, FaStar } from "react-icons/fa";
import { useCart } from "../../src/cartContext/CartContext";


function ProductCard({ product }) {


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


        // Update Navbar cart badge
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

    <div className="home-product-card">

      <div className="home-product-image">

        <img
          src={product.image}
          alt={product.name}
        />

      </div>


      <div className="home-product-details">


        <h3 className="home-product-name">
          {product.name}
        </h3>


        <p className="home-product-category">
          {product.category}
        </p>


        <div className="home-product-price">
          ${product.price}
        </div>


        <div className="home-product-rating">

          <FaStar />

          <span>
            {product.rating || "5.0"}
          </span>

        </div>


        <button
          className="home-cart-btn"
          onClick={handleAddToCart}
        >

          <FaShoppingCart />

          Add to Cart

        </button>


      </div>


    </div>

  );

}


export default ProductCard;