import "./categoriesCard.css";

function CategoryCard({ category }) {
  return (
    <div className="category-card">

      <div className="category-image">
        <img
          src={category.image}
          alt={category.name}
        />
      </div>

      <h3>{category.name}</h3>

    </div>
  );
}

export default CategoryCard;