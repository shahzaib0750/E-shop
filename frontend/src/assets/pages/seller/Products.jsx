import "./Products.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function Products() {

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {

        try {

            const user = JSON.parse(localStorage.getItem("user"));

            if (!user) {
                alert("Please login first.");
                return;
            }

            const response = await fetch(
                `http://127.0.0.1:8000/seller/products/${user.id}`
            );

            const data = await response.json();

            if (response.ok) {

                setProducts(data);

            } else {

                alert(data.detail);

            }

        } catch (error) {

            console.log(error);
            alert("Unable to load products.");

        } finally {

            setLoading(false);

        }

    };

    const deleteProduct = async (id) => {

        const confirmDelete = window.confirm(
            "Are you sure you want to delete this product?"
        );

        if (!confirmDelete) return;

        try {

            const response = await fetch(
                `http://127.0.0.1:8000/products/${id}`,
                {
                    method: "DELETE",
                }
            );

            const data = await response.json();

            if (response.ok) {

                alert(data.message);

                fetchProducts();

            } else {

                alert(data.detail);

            }

        } catch (error) {

            console.log(error);

            alert("Unable to delete product.");

        }

    };

    return (

        <div className="products-page">

            <div className="products-header">

                <h1>My Products</h1>

                <Link to="/seller/add-product">

                    <button className="add-btn">
                        + Add Product
                    </button>

                </Link>

            </div>

            {loading ? (

                <h2>Loading Products...</h2>

            ) : products.length === 0 ? (

                <h2>No Products Found.</h2>

            ) : (

                <table className="products-table">

                    <thead>

                        <tr>

                            <th>Image</th>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Actions</th>

                        </tr>

                    </thead>

                    <tbody>

                        {products.map((product) => (

                            <tr key={product.id}>

                                <td>

                                    <img
                                        src={`/images/${product.image}`}
                                        alt={product.name}
                                        className="product-image"
                                    />

                                </td>

                                <td>{product.name}</td>

                                <td>{product.category}</td>

                                <td>${product.price}</td>

                                <td>{product.stock}</td>

                                <td>

                                    <Link
                                        to={`/seller/edit-product/${product.id}`}
                                    >

                                        <button className="edit-btn">
                                            Edit
                                        </button>

                                    </Link>

                                    <button
                                        className="delete-btn"
                                        onClick={() =>
                                            deleteProduct(product.id)
                                        }
                                    >
                                        Delete
                                    </button>

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            )}

        </div>

    );

}

export default Products;