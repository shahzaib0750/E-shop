import "./products.css";
import ProductCard from "./productCard";
import {products} from "../data/products";


function Products() {
  return (
    <section className="products">
      <div className="products-container">
        <h2>Featured Products</h2>

        <p>Discover our latest products</p>

        <div className="products-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Products;