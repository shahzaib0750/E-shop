import "./productCard.css";
import { FaShoppingCart, FaStar } from "react-icons/fa";

function ProductCard({ product }) {
  return (
    <div className="product-card">

      <div className="product-image">
        <img src={product.image} alt={product.name} />
      </div>

      <div className="product-details">

        <h3 className="product-name">
          {product.name}
        </h3>

        <p className="product-category">
          {product.category}

          
        </p>

        <div className="product-price">
          <span className="current-price">
            ${product.price}
          </span>

          {/* <span className="old-price">
            ${product.oldPrice}
          </span> */}
        </div>

        <div className="product-rating">
          <FaStar />
          <span>{product.rating}</span>
        </div>

        <button className="cart-btn">
          <FaShoppingCart />
          Add to Cart
        </button>

      </div>

    </div>
  );
}

export default ProductCard;