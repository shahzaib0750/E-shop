import "./categories.css";
import CategoryCard from "./categoriesCard";
import { useEffect, useState } from "react";

function Categories() {

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {

    try {

      const response = await fetch(
        "http://127.0.0.1:8000/categories"
      );

      const data = await response.json();

      setCategories(data);

    } catch (error) {

      console.error(error);

    }

  };

  return (

    <section className="categories">

      <div className="container">

        <h2>Shop by Category</h2>

        <div className="categories-grid">

          {categories.map((category) => (

            <CategoryCard
              key={category.id}
              category={category}
            />

          ))}

        </div>

      </div>

    </section>

  );

}

export default Categories;