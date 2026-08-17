import "./AddProduct.css";
import { useState, useEffect, useCallback } from "react";
import SellerSidebar from "./SellerSidebar";

function AddProduct() {
    const [categories, setCategories] = useState([]);

    const [product, setProduct] = useState({
        name: "",
        description: "",
        category_id: "",
        brand: "",
        price: "",
        stock: "",
        image: ""
    });

    const fetchCategories = useCallback(async () => {
        try {
            const response = await fetch(
                "http://127.0.0.1:8000/categories"
            );

            const data = await response.json();

            if (!response.ok) {
                alert(
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

            alert(
                "Unable to connect to server."
            );
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCategories();
        }, 0);

        return () => clearTimeout(timer);
    }, [fetchCategories]);

    const handleChange = (e) => {
        setProduct({
            ...product,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const token = localStorage.getItem("token");

        if (!token) {
            alert("Please login first.");
            return;
        }

        const payload = {
            name: product.name.trim(),
            description: product.description.trim(),
            category_id: Number(product.category_id),
            brand: product.brand.trim(),
            price: Number(product.price),
            stock: Number(product.stock),
            image: product.image.trim()
        };

        try {
            const response = await fetch(
                "http://127.0.0.1:8000/products",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                }
            );

            const contentType =
                response.headers.get("content-type") || "";

            const data =
                contentType.includes("application/json")
                    ? await response.json()
                    : {
                          detail: await response.text()
                      };

            if (response.status === 401) {
                alert(
                    "Your session has expired. Please login again."
                );
                return;
            }

            if (response.status === 403) {
                alert(
                    "Only sellers can add products."
                );
                return;
            }

            if (!response.ok) {
                if (Array.isArray(data.detail)) {
                    alert(
                        data.detail
                            .map((error) => error.msg)
                            .join("\n")
                    );
                } else {
                    alert(
                        data.detail ||
                        "Unable to add product."
                    );
                }

                return;
            }

            alert("Product Added Successfully");

            setProduct({
                name: "",
                description: "",
                category_id: "",
                brand: "",
                price: "",
                stock: "",
                image: ""
            });
        } catch (error) {
            console.error(
                "Add product error:",
                error
            );

            alert(
                "Unable to connect to server."
            );
        }
    };

    return (
        <div className="seller-layout">
            <SellerSidebar />

            <main className="seller-main-content">
                <div className="add-product-page">
                    <div className="add-product-header">
                        <div>
                            <p className="page-label">
                                SELLER CENTER
                            </p>

                            <h1>Add Product</h1>

                            <p className="page-description">
                                Add a new product to your store.
                            </p>
                        </div>
                    </div>

                    <form
                        className="add-product-form"
                        onSubmit={handleSubmit}
                    >
                        <div className="form-card">
                            <div className="form-card-header">
                                <div className="form-icon purple">
                                    📦
                                </div>

                                <div>
                                    <h2>
                                        Product Information
                                    </h2>

                                    <p>
                                        Enter the basic information
                                        about your product.
                                    </p>
                                </div>
                            </div>

                            <div className="form-content">
                                <div className="form-group full-width">
                                    <label>
                                        Product Name
                                    </label>

                                    <input
                                        type="text"
                                        name="name"
                                        value={product.name}
                                        onChange={handleChange}
                                        placeholder="Enter product name"
                                        required
                                    />
                                </div>

                                <div className="form-group full-width">
                                    <label>
                                        Description
                                    </label>

                                    <textarea
                                        name="description"
                                        value={product.description}
                                        onChange={handleChange}
                                        rows="5"
                                        placeholder="Describe your product..."
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>
                                        Category
                                    </label>

                                    <select
                                        name="category_id"
                                        value={product.category_id}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">
                                            Select Category
                                        </option>

                                        {categories.map(
                                            (category) => (
                                                <option
                                                    key={category.id}
                                                    value={category.id}
                                                >
                                                    {category.name}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>
                                        Brand
                                    </label>

                                    <input
                                        type="text"
                                        name="brand"
                                        value={product.brand}
                                        onChange={handleChange}
                                        placeholder="e.g. Apple"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-card">
                            <div className="form-card-header">
                                <div className="form-icon green">
                                    💰
                                </div>

                                <div>
                                    <h2>
                                        Pricing & Inventory
                                    </h2>

                                    <p>
                                        Set the price and available
                                        stock for your product.
                                    </p>
                                </div>
                            </div>

                            <div className="form-content">
                                <div className="form-group">
                                    <label>
                                        Price
                                    </label>

                                    <div className="input-with-prefix">
                                        <span>Rs</span>

                                        <input
                                            type="number"
                                            name="price"
                                            value={product.price}
                                            onChange={handleChange}
                                            placeholder="999"
                                            min="0.01"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>
                                        Stock Quantity
                                    </label>

                                    <input
                                        type="number"
                                        name="stock"
                                        value={product.stock}
                                        onChange={handleChange}
                                        placeholder="25"
                                        min="0"
                                        required
                                    />
                                </div>

                                <div className="form-group full-width">
                                    <label>
                                        Product Image URL
                                    </label>

                                    <input
                                        type="text"
                                        name="image"
                                        value={product.image}
                                        onChange={handleChange}
                                        placeholder="https://example.com/image.jpg"
                                        required
                                    />

                                    <small>
                                        Add a direct URL to your
                                        product image.
                                    </small>
                                </div>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="cancel-btn"
                                onClick={() =>
                                    window.history.back()
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="add-product-btn"
                            >
                                + Add Product
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}

export default AddProduct;