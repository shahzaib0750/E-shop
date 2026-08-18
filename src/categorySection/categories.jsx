import "./categories.css";
import CategoryCard from "./categoriesCard";
import {
    useCallback,
    useEffect,
    useState,
} from "react";
import { apiFetch } from "../api/api";

function Categories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchCategories = useCallback(async () => {
        try {
            const response = await apiFetch(
                "/categories"
            );

            const data = await response.json();

            if (!response.ok) {
                console.error(
                    data.detail ||
                    "Unable to load categories."
                );
                return;
            }

            setCategories(
                Array.isArray(data) ? data : []
            );
        } catch (error) {
            console.error(
                "Fetch categories error:",
                error
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCategories();
        }, 0);

        return () => {
            clearTimeout(timer);
        };
    }, [fetchCategories]);

    return (
        <section className="categories">
            <div className="categories-container">

                <div className="categories-header">
                    <span className="categories-label">
                        EXPLORE
                    </span>

                    <h2>
                        Shop by Category
                    </h2>

                    <p>
                        Browse our collection by category
                        and find exactly what you need.
                    </p>
                </div>

                {loading ? (
                    <div className="categories-loading">
                        Loading categories...
                    </div>
                ) : categories.length === 0 ? (
                    <div className="categories-empty">
                        No categories available.
                    </div>
                ) : (
                    <div className="categories-grid">
                        {categories.map((category) => (
                            <CategoryCard
                                key={category.id}
                                category={category}
                            />
                        ))}
                    </div>
                )}

            </div>
        </section>
    );
}

export default Categories;