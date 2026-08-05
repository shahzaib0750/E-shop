import "./FlashSale.css";
import { useEffect, useState } from "react";
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

  // Flash Sale ends in 2 hours
  const [timeLeft, setTimeLeft] = useState(2 * 60 * 60);

  useEffect(() => {

    const timer = setInterval(() => {

      setTimeLeft((prev) => {

        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }

        return prev - 1;

      });

    }, 1000);

    return () => clearInterval(timer);

  }, []);
console.log(timeLeft);
  const hours = String(Math.floor(timeLeft / 3600)).padStart(2, "0");

  const minutes = String(
    Math.floor((timeLeft % 3600) / 60)
  ).padStart(2, "0");

  const seconds = String(
    timeLeft % 60
  ).padStart(2, "0");

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

            <span>{hours}</span> :

            <span>{minutes}</span> :

            <span>{seconds}</span>

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