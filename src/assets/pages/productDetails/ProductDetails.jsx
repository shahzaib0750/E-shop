import "./ProductDetails.css";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function ProductDetails() {
    const { id } = useParams();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await fetch(
                    `http://127.0.0.1:8000/products/${id}`
                );

                if (!response.ok) {
                    throw new Error("Product not found");
                }

                const data = await response.json();

                setProduct(data);

            } catch (error) {
                console.error(error);
                setError("Unable to load product.");
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    if (loading) {
        return <h2>Loading Product...</h2>;
    }

    if (error) {
        return <h2>{error}</h2>;
    }

    return (
        <div className="product-details-page">

            <div className="product-details-card">

                <div className="product-details-image">
                    <img
                        src={
                            product.image?.startsWith("http")
                                ? product.image
                                : "https://placehold.co/500x500?text=No+Image"
                        }
                        alt={product.name}
                    />
                </div>

                <div className="product-details-info">

                    <p className="product-category">
                        {product.category}
                    </p>

                    <h1>{product.name}</h1>

                    <p className="product-brand">
                        Brand: {product.brand}
                    </p>

                    <p className="product-description">
                        {product.description}
                    </p>

                    <h2 className="product-details-price">
                        ${product.price}
                    </h2>

                    <p className="product-stock">
                        {product.stock > 0
                            ? `${product.stock} items available`
                            : "Out of stock"}
                    </p>

                    <button
                        className="add-cart-btn"
                        disabled={product.stock === 0}
                    >
                        Add to Cart
                    </button>

                </div>

            </div>

        </div>
    );
}

export default ProductDetails;