import "./CategoryProducts.css";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";
import ProductCard from "../../../productSection/productCard";

function CategoryProducts() {
  const { id } = useParams();

  const [products, setProducts] = useState([]);
  const [categoryName, setCategoryName] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadCategoryData = async () => {
      try {
        const [categoryResponse, productsResponse] =
          await Promise.all([
            fetch(
              `http://127.0.0.1:8000/categories/${id}`
            ),
            fetch(
              `http://127.0.0.1:8000/categories/${id}/products`
            ),
          ]);

        const categoryData =
          await categoryResponse.json();

        const productsData =
          await productsResponse.json();

        if (cancelled) {
          return;
        }

        if (!categoryResponse.ok) {
          console.error(
            categoryData.detail ||
              "Unable to load category."
          );
        } else {
          setCategoryName(
            categoryData.name || ""
          );
        }

        if (!productsResponse.ok) {
          console.error(
            productsData.detail ||
              "Unable to load category products."
          );
        } else {
          setProducts(
            Array.isArray(productsData)
              ? productsData
              : []
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Category products error:",
            error
          );
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
            <h1>{categoryName}</h1>

            <p>
              {products.length}{" "}
              {products.length === 1
                ? "Product"
                : "Products"}{" "}
              Found
            </p>
          </div>

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

      <Footer />
    </>
  );
}

export default CategoryProducts;