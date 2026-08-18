import "./CategoryProducts.css";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";
import ProductCard from "../../../productSection/productCard";
import { apiFetch } from "../../../api/api";

function CategoryProducts() {
  const { id } = useParams();

  const [products, setProducts] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadCategoryData = async () => {
      setLoading(true);

      try {
        const [categoryResponse, productsResponse] =
          await Promise.all([
            apiFetch(`/categories/${id}`),
            apiFetch(`/categories/${id}/products`),
          ]);

        if (!categoryResponse.ok) {
          console.error(
            "Unable to load category."
          );
        } else {
          const categoryData =
            await categoryResponse.json();

          if (!cancelled) {
            setCategoryName(
              categoryData.name || ""
            );
          }
        }

        if (!productsResponse.ok) {
          console.error(
            "Unable to load category products."
          );
        } else {
          const productsData =
            await productsResponse.json();

          if (!cancelled) {
            setProducts(
              Array.isArray(productsData)
                ? productsData
                : []
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Category products error:",
            error
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCategoryData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <Navbar />

      <section className="category-products-page">
        <div className="container">
          <div className="category-title">
            <h1>{categoryName || "Category"}</h1>

            <p>
              {loading
                ? "Loading..."
                : `${products.length} ${
                    products.length === 1
                      ? "Product"
                      : "Products"
                  } Found`}
            </p>
          </div>

          {loading ? (
            <div className="products-loading">
              <div className="loading-spinner"></div>

              <p>Loading products...</p>
            </div>
          ) : (
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}

export default CategoryProducts;