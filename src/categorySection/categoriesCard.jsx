import "./categoriesCard.css";
import { Link } from "react-router-dom";

function CategoryCard({ category }) {
  return (
    <Link
      to={`/category/${category.id}`}
      className="category-link"
    >
      <div className="category-card">

        <div className="category-image">
          <img
            src={category.image}
            alt={category.name}
          />
        </div>

        <h3>{category.name}</h3>

      </div>
    </Link>
  );
}

export default CategoryCard;