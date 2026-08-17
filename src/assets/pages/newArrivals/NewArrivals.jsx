import "./NewArrivals.css";

import { useEffect, useState } from "react";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";
import ProductCard from "../../../../src/productSection/productCard";

import { apiFetch } from "../../../api/api";

function NewArrivals() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchNewArrivals = async () => {
      try {
        setLoading(true);

        const response = await apiFetch(
          "/products?page=1&limit=12",
          {
            method: "GET",
          }
        );

        const data = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          console.error(
            data.detail || "Unable to load products."
          );

          setProducts([]);
          return;
        }

        setProducts(
          Array.isArray(data) ? data : []
        );
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Fetch new arrivals error:",
            error
          );

          setProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchNewArrivals();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Navbar />

      <main className="new-arrivals-page">
        <div className="new-arrivals-container">

          {/* ================================
              PAGE HEADER
          ================================= */}

          <div className="new-arrivals-header">
            <span className="section-label">
              LATEST COLLECTION
            </span>

            <h1>
              New Arrivals
            </h1>

            <p>
              Discover the latest products and
              fresh additions to our store.
            </p>
          </div>

          {/* ================================
              LOADING
          ================================= */}

          {loading ? (
            <div className="new-arrivals-loading">

              <div className="loading-spinner"></div>

              <p>
                Loading new arrivals...
              </p>

            </div>

          ) : products.length === 0 ? (

            /* ================================
               EMPTY STATE
            ================================= */

            <div className="no-arrivals">

              <div className="no-arrivals-icon">
                📦
              </div>

              <h2>
                No New Arrivals
              </h2>

              <p>
                Check back soon for new products.
              </p>

            </div>

          ) : (

            /* ================================
               PRODUCTS
            ================================= */

            <div className="new-arrivals-grid">

              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}

            </div>
          )}

        </div>
      </main>

      <Footer />
    </>
  );
}

export default NewArrivals;