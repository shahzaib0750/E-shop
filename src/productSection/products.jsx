import "./products.css";
import { useEffect, useState } from "react";
import ProductCard from "./productCard";

const LIMIT = 12;

function Products() {

  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    loadProducts();

  }, [page]);

  const loadProducts = async () => {

    setLoading(true);

    try {

      const productsResponse = await fetch(
        `http://127.0.0.1:8000/products?page=${page}&limit=${LIMIT}`
      );

      const productsData = await productsResponse.json();

      const countResponse = await fetch(
        "http://127.0.0.1:8000/products/count"
      );

      const countData = await countResponse.json();

      setProducts(productsData);
      setTotalProducts(countData.total);

    } catch (error) {

      console.error(error);

    }

    setLoading(false);

  };

  const totalPages = Math.ceil(totalProducts / LIMIT);

  return (

    <section className="products">

      <div className="products-container">

        <h2>Featured Products</h2>

        <p>Discover our latest products</p>

        {loading ? (

          <h3>Loading...</h3>

        ) : (

          <>
            <div className="products-grid">

              {products.map((product) => (

                <ProductCard
                  key={product.id}
                  product={product}
                />

              ))}

            </div>

            <div className="pagination">

              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>

              <span>
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>

            </div>
          </>

        )}

      </div>

    </section>

  );

}

export default Products;