import "./EditProduct.css";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";
import { Link } from "react-router-dom";

function EditProduct() {

    const { id } = useParams();

    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);

    const [product, setProduct] = useState({
        name: "",
        description: "",
        category: "",
        brand: "",
        price: "",
        stock: "",
        image: ""
    });

    useEffect(() => {

        fetchProduct();

    }, []);

    const fetchProduct = async () => {

        try {

            const response = await fetch(
                `http://127.0.0.1:8000/products/${id}`
            );

            const data = await response.json();

            if (response.ok) {

                setProduct({
                    name: data.name || "",
                    description: data.description || "",
                    category: data.category || "",
                    brand: data.brand || "",
                    price: data.price || "",
                    stock: data.stock || "",
                    image: data.image || ""
                });

            } else {

                alert(data.detail);

            }

        } catch (error) {

            console.log(error);

            alert("Unable to load product.");

        } finally {

            setLoading(false);

        }

    };

    const handleChange = (e) => {

        setProduct({
            ...product,
            [e.target.name]: e.target.value
        });

    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            const response = await fetch(

                `http://127.0.0.1:8000/products/${id}`,

                {

                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        name: product.name,
                        description: product.description,
                        category: product.category,
                        brand: product.brand,
                        price: Number(product.price),
                        stock: Number(product.stock),
                        image: product.image

                    })

                }

            );

            const data = await response.json();

            if (response.ok) {

                alert("Product Updated Successfully");

                navigate("/seller/products");

            } else {

                alert(data.detail);

            }

        } catch (error) {

            console.log(error);

            alert("Unable to connect to server.");

        }

    };

    if (loading) {

        return <h2 style={{ textAlign: "center" }}>Loading...</h2>;

    }

    return (

        <>

            <Navbar />

            <div className="edit-product-page">

                <div className="edit-product-container">

                    <h1>Edit Product</h1>

                    <form onSubmit={handleSubmit}>

                        <label>Product Name</label>

                        <input
                            type="text"
                            name="name"
                            value={product.name}
                            onChange={handleChange}
                            required
                        />

                        <label>Description</label>

                        <textarea
                            name="description"
                            value={product.description}
                            onChange={handleChange}
                        />

                        <label>Category</label>

                        <input
                            type="text"
                            name="category"
                            value={product.category}
                            onChange={handleChange}
                        />

                        <label>Brand</label>

                        <input
                            type="text"
                            name="brand"
                            value={product.brand}
                            onChange={handleChange}
                        />

                        <label>Price</label>

                        <input
                            type="number"
                            name="price"
                            value={product.price}
                            onChange={handleChange}
                            required
                        />

                        <label>Stock</label>

                        <input
                            type="number"
                            name="stock"
                            value={product.stock}
                            onChange={handleChange}
                            required
                        />

                        <label>Image</label>

                        <input
                            type="text"
                            name="image"
                            value={product.image}
                            onChange={handleChange}
                        />

                        <img
                            src={`/images/${product.image}`}
                            alt={product.name}
                            width="180"
                        />

                        <button type="submit">

                            Update Product

                        </button>

                    </form>

                </div>

            </div>

            <Footer />

        </>

    );

}

export default EditProduct;