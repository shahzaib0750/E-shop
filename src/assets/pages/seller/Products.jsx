import "./Products.css";

import {
    useCallback,
    useEffect,
    useState
} from "react";

import { useNavigate } from "react-router-dom";

import SellerSidebar from "./SellerSidebar";
import { apiFetch, readJson } from "../../../api/api";

function Products() {
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);

    const fetchProducts = useCallback(async () => {
        const token = localStorage.getItem("token");

        if (!token) {
            alert("Please login first.");
            navigate("/login");
            return;
        }

        try {
            setLoading(true);

            const response = await apiFetch(
                "/seller/products",
                {
                    method: "GET",
                }
            );

            const data = await readJson(response);

            if (response.status === 401) {
                alert(
                    "Your session has expired. Please login again."
                );

                navigate("/login");
                return;
            }

            if (response.status === 403) {
                alert(
                    "Only sellers can access their products."
                );

                return;
            }

            if (!response.ok) {
                alert(
                    data.detail ||
                    "Unable to load your products."
                );

                return;
            }

            setProducts(
                Array.isArray(data) ? data : []
            );
        } catch (error) {
            console.error(
                "Fetch seller products error:",
                error
            );

            alert(
                "Unable to connect to server."
            );
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProducts();
        }, 0);

        return () => clearTimeout(timer);
    }, [fetchProducts]);

    const handleDelete = async (product) => {
        const confirmed = window.confirm(
            `Delete "${product.name}"? This cannot be undone.`
        );

        if (!confirmed) {
            return;
        }

        if (deletingId) {
            return;
        }

        setDeletingId(product.id);

        try {
            const response = await apiFetch(
                `/products/${product.id}`,
                {
                    method: "DELETE",
                }
            );

            const data = await readJson(response);

            if (response.status === 401) {
                alert(
                    "Your session has expired. Please login again."
                );

                navigate("/login");
                return;
            }

            if (!response.ok) {
                alert(
                    data.detail ||
                    "Unable to delete product."
                );

                return;
            }

            setProducts((current) =>
                current.filter(
                    (item) => item.id !== product.id
                )
            );

            alert(
                data.message ||
                "Product deleted successfully."
            );
        } catch (error) {
            console.error(
                "Delete product error:",
                error
            );

            alert(
                "Unable to connect to server."
            );
        } finally {
            setDeletingId(null);
        }
    };

    const getCategoryName = (product) => {
        if (product.category?.name) {
            return product.category.name;
        }

        return `Category #${product.category_id}`;
    };

    const getImageUrl = (image) => {
        if (!image) {
            return "/images/placeholder.png";
        }

        if (
            image.startsWith("http://") ||
            image.startsWith("https://")
        ) {
            return image;
        }

        return `/images/${image}`;
    };

    const getStockClass = (stock) => {
        if (Number(stock) <= 0) {
            return "stock-badge out";
        }

        if (Number(stock) < 10) {
            return "stock-badge low";
        }

        return "stock-badge";
    };

    const getStockLabel = (stock) => {
        if (Number(stock) <= 0) {
            return "Out";
        }

        return `${stock} in stock`;
    };

    return (
        <div className="seller-layout">
            <SellerSidebar />

            <main className="seller-main-content">
                <div className="products-page">
                    <div className="products-header">
                        <div>
                            <p className="page-label">
                                SELLER CENTER
                            </p>

                            <h1>Products</h1>

                            <p className="page-description">
                                Manage your product catalog.
                            </p>
                        </div>

                        <a
                            href="/seller/add-product"
                            className="add-product-link"
                        >
                            <button
                                type="button"
                                className="add-btn"
                            >
                                + Add Product
                            </button>
                        </a>
                    </div>

                    <div className="products-card">
                        <div className="products-card-header">
                            <div>
                                <h2>My Products</h2>

                                <p>
                                    View, edit and remove
                                    products from your store.
                                </p>
                            </div>

                            <div className="product-count">
                                <span>
                                    {products.length}
                                </span>

                                <small>Products</small>
                            </div>
                        </div>

                        {loading ? (
                            <div className="products-empty-state">
                                <div className="loading-icon">
                                    ⏳
                                </div>

                                <h3>
                                    Loading Products...
                                </h3>

                                <p>
                                    Please wait while we
                                    load your products.
                                </p>
                            </div>
                        ) : products.length === 0 ? (
                            <div className="products-empty-state">
                                <div className="empty-icon">
                                    📦
                                </div>

                                <h3>
                                    No Products Yet
                                </h3>

                                <p>
                                    Add your first product to
                                    start selling on your
                                    store.
                                </p>

                                <a
                                    href="/seller/add-product"
                                    className="empty-add-link"
                                >
                                    + Add Product
                                </a>
                            </div>
                        ) : (
                            <div className="products-table-wrapper">
                                <table className="products-table">
                                    <thead>
                                        <tr>
                                            <th>
                                                Product
                                            </th>

                                            <th>
                                                Category
                                            </th>

                                            <th>
                                                Price
                                            </th>

                                            <th>
                                                Stock
                                            </th>

                                            <th>
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {products.map(
                                            (product) => (
                                                <tr
                                                    key={product.id}
                                                >
                                                    <td>
                                                        <div className="product-info">
                                                            <div className="product-image-wrapper">
                                                                <img
                                                                    src={getImageUrl(
                                                                        product.image
                                                                    )}
                                                                    alt={product.name}
                                                                    className="product-image"
                                                                />
                                                            </div>

                                                            <div className="product-name">
                                                                <strong>
                                                                    {product.name}
                                                                </strong>

                                                                <span>
                                                                    {
                                                                        product.brand
                                                                    }
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <span className="category-badge">
                                                            {getCategoryName(
                                                                product
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span className="product-price">
                                                            Rs{" "}
                                                            {Number(
                                                                product.price ||
                                                                0
                                                            ).toFixed(
                                                                2
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={getStockClass(
                                                                product.stock
                                                            )}
                                                        >
                                                            {getStockLabel(
                                                                product.stock
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="product-actions">
                                                            <button
                                                                type="button"
                                                                className="edit-btn"
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/seller/edit-product/${product.id}`
                                                                    )
                                                                }
                                                            >
                                                                Edit
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="delete-btn"
                                                                disabled={
                                                                    deletingId ===
                                                                    product.id
                                                                }
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        product
                                                                    )
                                                                }
                                                            >
                                                                {deletingId ===
                                                                product.id
                                                                    ? "Deleting..."
                                                                    : "Delete"}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Products;
