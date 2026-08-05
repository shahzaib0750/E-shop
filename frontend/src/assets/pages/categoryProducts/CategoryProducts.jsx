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
    fetchCategory();
    fetchCategoryProducts();
  }, [id]);

  const fetchCategory = async () => {

    try {

      const response = await fetch(
        `http://127.0.0.1:8000/categories/${id}`
      );

      const data = await response.json();

      setCategoryName(data.name);

    } catch (error) {

      console.error(error);

    }

  };

  const fetchCategoryProducts = async () => {

    try {

      const response = await fetch(
        `http://127.0.0.1:8000/categories/${id}/products`
      );

      const data = await response.json();

      setProducts(data);

    } catch (error) {

      console.error(error);

    }

  };

  return (
    <>
      <Navbar />

      <section className="category-products-page">

        <div className="container">

          <div className="category-title">

            <h1>{categoryName}</h1>

            <p>{products.length} Products Found</p>

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