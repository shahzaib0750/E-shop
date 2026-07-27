import "./categories.css";
import CategoryCard from "./categoriesCard";
import {categories} from '../data/categories';


function Categories() {
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