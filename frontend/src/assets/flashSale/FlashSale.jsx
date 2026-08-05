import "./FlashSale.css";
import FlashSaleCard from "./FlashSaleCard";

const flashProducts = [
  {
    id: 1,
    name: "Gaming Mouse",
    price: 35,
    oldPrice: 50,
    discount: 30,
    image: "/images/hero.jpg",
  },
  {
    id: 2,
    name: "Mechanical Keyboard",
    price: 80,
    oldPrice: 110,
    discount: 27,
    image: "/images/hero.jpg",
  },
  {
    id: 3,
    name: "Headphones",
    price: 45,
    oldPrice: 65,
    discount: 31,
    image: "/images/hero.jpg",
  },
  {
    id: 4,
    name: "Monitor",
    price: 220,
    oldPrice: 280,
    discount: 22,
    image: "/images/hero.jpg",
  },
];

function FlashSale() {
  return (
    <section className="flash-sale">

      <div className="flash-container">

        <div className="flash-header">

          <h2>🔥 Flash Sale</h2>

          <button className="shop-btn">
            Shop All
          </button>

        </div>

        <div className="countdown">

          <span>Ending In:</span>

          <div className="timer">
            <span>02</span> :
            <span>15</span> :
            <span>45</span>
          </div>

        </div>

        <div className="flash-grid">

          {flashProducts.map((product) => (
            <FlashSaleCard
              key={product.id}
              product={product}
            />
          ))}

        </div>

      </div>

    </section>
  );
}

export default FlashSale;