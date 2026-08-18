import "./ProductDetails.css";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../../../api/api";

function ProductDetails() {
    const { id } = useParams();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await apiFetch(
                    `/products/${id}`
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.detail || "Product not found"
                    );
                }

                setProduct(data);
            } catch (err) {
                console.error(err);
                setError("Unable to load product.");
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    const handleAddToCart = async () => {
        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user") || "null");

        if (!token || !user) {
            setNotice("Please login first.");
            return;
        }

        if (user.role === "seller") {
            setNotice("Seller accounts cannot add products to cart. Please use a customer account.");
            return;
        }

        if (adding) {
            return;
        }

        setAdding(true);
        setNotice("");

        try {
            const response = await apiFetch("/cart", {
                method: "POST",
                body: JSON.stringify({
                    product_id: product.id,
                    quantity: 1,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setNotice("Product added to cart.");
            } else {
                setNotice(
                    data.detail || "Unable to add product to cart."
                );
            }
        } catch (err) {
            console.error(err);
            setNotice("Unable to connect to server.");
        } finally {
            setAdding(false);
        }
    };

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
                        disabled={product.stock === 0 || adding}
                        onClick={handleAddToCart}
                    >
                        {adding ? "Adding..." : "Add to Cart"}
                    </button>

                    {notice && (
                        <p style={{ marginTop: "10px", color: "#b45309", fontSize: "14px" }}>
                            {notice}
                        </p>
                    )}

                </div>

            </div>

        </div>
    );
}

export default ProductDetails;
