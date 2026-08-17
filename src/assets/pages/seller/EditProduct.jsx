import "./EditProduct.css";

import {
    useCallback,
    useEffect,
    useState
} from "react";

import {
    useNavigate,
    useParams
} from "react-router-dom";

import SellerSidebar from "./SellerSidebar";

function EditProduct() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [product, setProduct] = useState({
        name: "",
        description: "",
        category_id: "",
        brand: "",
        price: "",
        stock: "",
        image: ""
    });

    const fetchProduct = useCallback(async () => {
        const token = localStorage.getItem("token");

        if (!token) {
            alert("Please login first.");
            navigate("/login");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                `http://127.0.0.1:8000/products/${id}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (response.status === 401) {
                alert(
                    "Your session has expired. Please login again."
                );

                navigate("/login");
                return;
            }

            if (response.status === 404) {
                setError("Product not found.");
                return;
            }

            if (!response.ok) {
                setError(
                    data.detail ||
                    "Unable to load product."
                );
                return;
            }

            setProduct({
                name: data.name || "",
                description: data.description || "",
                category_id: data.category_id || "",
                brand: data.brand || "",
                price: data.price ?? "",
                stock: data.stock ?? "",
                image: data.image || ""
            });
        } catch (error) {
            console.error(
                "Fetch product error:",
                error
            );

            setError(
                "Unable to connect to server."
            );
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProduct();
        }, 0);

        return () => clearTimeout(timer);
    }, [fetchProduct]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setProduct((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
            alert("Please login first.");
            navigate("/login");
            return;
        }

        const name = product.name.trim();
        const description = product.description.trim();
        const brand = product.brand.trim();
        const image = product.image.trim();

        const price = Number(product.price);
        const stock = Number(product.stock);
        const categoryId = Number(
            product.category_id
        );

        if (name.length < 2) {
            setError(
                "Product name must contain at least 2 characters."
            );
            return;
        }

        if (description.length < 5) {
            setError(
                "Description must contain at least 5 characters."
            );
            return;
        }

        if (brand.length < 2) {
            setError(
                "Brand must contain at least 2 characters."
            );
            return;
        }

        if (
            price <= 0 ||
            !Number.isFinite(price)
        ) {
            setError(
                "Price must be greater than 0."
            );
            return;
        }

        if (
            !Number.isInteger(stock) ||
            stock < 0
        ) {
            setError(
                "Stock must be a whole number and cannot be negative."
            );
            return;
        }

        if (
            !Number.isInteger(categoryId) ||
            categoryId <= 0
        ) {
            setError(
                "Please provide a valid category."
            );
            return;
        }

        if (!image) {
            setError("Image is required.");
            return;
        }

        setSaving(true);

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/products/${id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name,
                        description,
                        category_id: categoryId,
                        brand,
                        price,
                        stock,
                        image
                    })
                }
            );

            const data = await response.json();

            if (response.status === 401) {
                alert(
                    "Your session has expired. Please login again."
                );

                navigate("/login");
                return;
            }

            if (response.status === 403) {
                setError(
                    "You are not allowed to modify this product."
                );
                return;
            }

            if (response.status === 404) {
                setError("Product not found.");
                return;
            }

            if (!response.ok) {
                setError(
                    data.detail ||
                    "Unable to update product."
                );
                return;
            }

            alert(
                "Product updated successfully."
            );

            navigate("/seller/products");
        } catch (error) {
            console.error(
                "Update product error:",
                error
            );

            setError(
                "Unable to connect to server."
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <>
                <SellerSidebar />

                <main className="seller-main-content">
                    <div className="edit-product-page">
                        <h2>
                            Loading product...
                        </h2>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <SellerSidebar />

            <main className="seller-main-content">
                <div className="edit-product-page">
                    <div className="edit-product-container">
                        <h1>
                            Edit Product
                        </h1>

                        {error && (
                            <div className="edit-product-error">
                                {error}
                            </div>
                        )}

                        <form
                            onSubmit={handleSubmit}
                        >
                            <label>
                                Product Name
                            </label>

                            <input
                                type="text"
                                name="name"
                                value={product.name}
                                onChange={handleChange}
                                maxLength={150}
                                required
                            />

                            <label>
                                Description
                            </label>

                            <textarea
                                name="description"
                                value={
                                    product.description
                                }
                                onChange={handleChange}
                                maxLength={2000}
                                required
                            />

                            <label>
                                Category ID
                            </label>

                            <input
                                type="number"
                                name="category_id"
                                value={
                                    product.category_id
                                }
                                onChange={handleChange}
                                min="1"
                                required
                            />

                            <label>
                                Brand
                            </label>

                            <input
                                type="text"
                                name="brand"
                                value={product.brand}
                                onChange={handleChange}
                                maxLength={100}
                                required
                            />

                            <label>
                                Price
                            </label>

                            <input
                                type="number"
                                name="price"
                                value={product.price}
                                onChange={handleChange}
                                min="0.01"
                                step="0.01"
                                required
                            />

                            <label>
                                Stock
                            </label>

                            <input
                                type="number"
                                name="stock"
                                value={product.stock}
                                onChange={handleChange}
                                min="0"
                                step="1"
                                required
                            />

                            <label>
                                Image
                            </label>

                            <input
                                type="text"
                                name="image"
                                value={product.image}
                                onChange={handleChange}
                                maxLength={500}
                                required
                            />

                            {product.image && (
                                <img
                                    src={
                                        product.image.startsWith(
                                            "http"
                                        )
                                            ? product.image
                                            : `/images/${product.image}`
                                    }
                                    alt={
                                        product.name
                                    }
                                    width="180"
                                />
                            )}

                            <button
                                type="submit"
                                disabled={saving}
                            >
                                {saving
                                    ? "Updating..."
                                    : "Update Product"}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </>
    );
}

export default EditProduct;