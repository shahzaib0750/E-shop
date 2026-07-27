import "./hero.css";
// import "../"
function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">

        <div className="hero-text">
          <h1>Welcome to E-Shop Online Shopping Centre</h1>

          <p>
            Shop the latest products available here in
            E-Shop at discounted prices every day.
          </p>

          <button>Shop Now</button>
        </div>

        <div className="hero-image">
          <img
            src="/images/hero.jpg"
            alt="Hero Product"
          />
        </div>

      </div>
    </section>
  );
}

export default Hero;