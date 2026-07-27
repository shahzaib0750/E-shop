import "./FlashSaleCard.css";
import { FaShoppingCart } from "react-icons/fa";

function FlashSaleCard({ product }) {
  return (
    <div className="flash-card">

      <div className="sale-badge">
        -{product.discount}%
      </div>

      <img src={product.image} alt={product.name} />

      <h3>{product.name}</h3>

      <div className="price">

        <span className="new-price">
          ${product.price}
        </span>

        <span className="old-price">
          ${product.oldPrice}
        </span>

      </div>

      <button>
        <FaShoppingCart />
        Add to Cart
      </button>

    </div>
  );
}

export default FlashSaleCard;