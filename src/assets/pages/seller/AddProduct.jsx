import "./AddProduct.css";
import { useState } from "react";
import { Link } from "react-router-dom";

function AddProduct() {

    const seller = JSON.parse(localStorage.getItem("user"));

    const [product, setProduct] = useState({
        name: "",
        description: "",
        category: "",
        brand: "",
        price: "",
        stock: "",
        image: ""
    });

    const handleChange = (e) => {
        setProduct({
            ...product,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            const payload = {
    ...product,
    price: Number(product.price),
    stock: Number(product.stock),
    seller_id: seller?.id,
};

console.log("Payload:", payload);

const response = await fetch("http://127.0.0.1:8000/products", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
});
            const data = await response.json();

            if (response.ok) {

                alert("Product Added Successfully");

                setProduct({
                    name: "",
                    description: "",
                    category: "",
                    brand: "",
                    price: "",
                    stock: "",
                    image: ""
                });

            } else {

                alert(data.detail);

            }

        } catch (error) {

            console.log(error);

            alert("Unable to connect to server.");

        }

    };

    return (

        <div className="add-product-page">

            <div className="product-card">

                <h1>Add Product</h1>

                <form onSubmit={handleSubmit}>

                    <div className="form-group">

                        <label>Product Name</label>

                        <input
                            type="text"
                            name="name"
                            value={product.name}
                            onChange={handleChange}
                            placeholder="Enter Product Name"
                            required
                        />

                    </div>

                    <div className="form-group">

                        <label>Description</label>

                        <textarea
                            name="description"
                            value={product.description}
                            onChange={handleChange}
                            rows="5"
                            placeholder="Product Description"
                            required
                        />

                    </div>

                    <div className="row">

                        <div className="form-group">

                            <label>Category</label>

                            <input
                                type="text"
                                name="category"
                                value={product.category}
                                onChange={handleChange}
                                placeholder="Mobiles"
                                required
                            />

                        </div>

                        <div className="form-group">

                            <label>Brand</label>

                            <input
                                type="text"
                                name="brand"
                                value={product.brand}
                                onChange={handleChange}
                                placeholder="Apple"
                                required
                            />

                        </div>

                    </div>

                    <div className="row">

                        <div className="form-group">

                            <label>Price</label>

                            <input
                                type="number"
                                name="price"
                                value={product.price}
                                onChange={handleChange}
                                placeholder="999"
                                required
                            />

                        </div>

                        <div className="form-group">

                            <label>Stock</label>

                            <input
                                type="number"
                                name="stock"
                                value={product.stock}
                                onChange={handleChange}
                                placeholder="25"
                                required
                            />

                        </div>

                    </div>

                    <div className="form-group">

                        <label>Image URL</label>

                        <input
                            type="text"
                            name="image"
                            value={product.image}
                            onChange={handleChange}
                            placeholder="https://example.com/image.jpg"
                            required
                        />

                    </div>

                    <button type="submit">
                        Add Product
                    </button>

                </form>

            </div>

        </div>

    );

}

export default AddProduct;