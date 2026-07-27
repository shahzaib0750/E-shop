import "./NewArrivals.css";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";

import ProductCard from "../../productSection/productCard";
import newArrivals from "../../data/newArrivals";

function NewArrivals() {
  return (
    <>
      <Navbar />

      <section className="new-arrivals">
        <div className="container-arrivals">

          <div className="page-title">
            <h1>New Arrivals</h1>
            <p>Discover the latest products in our store.</p>
          </div>

          <div className="products-grid">
            {newArrivals.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>

        </div>
      </section>

      <Footer />
    </>
  );
}

export default NewArrivals;

