import "./AddProduct.css";
import { useState, useEffect } from "react";

function AddProduct() {

    const seller = JSON.parse(localStorage.getItem("user"));

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


    // Fetch categories
    useEffect(() => {

        fetchCategories();

    }, []);



    const fetchCategories = async () => {

        try {

            const response = await fetch(
                "http://127.0.0.1:8000/categories"
            );

            const data = await response.json();

            setCategories(data);

        } catch(error) {

            console.log(error);

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


            const payload = {

                ...product,

                category_id: Number(product.category_id),

                price: Number(product.price),

                stock: Number(product.stock),

                seller_id: seller?.id

            };


            console.log("Payload:", payload);



            const response = await fetch(
                "http://127.0.0.1:8000/products",
                {

                    method:"POST",

                    headers:{
                        "Content-Type":"application/json"
                    },

                    body:JSON.stringify(payload)

                }
            );



            const data = await response.json();



            if(response.ok){


                alert("Product Added Successfully");


                setProduct({

                    name:"",
                    description:"",
                    category_id:"",
                    brand:"",
                    price:"",
                    stock:"",
                    image:""

                });


            }
            else{

                console.log(data);

                alert(JSON.stringify(data.detail));

            }



        }
        catch(error){

            console.log(error);

            // alert("Unable to connect to server.");

        }


    };



    return (

        <div className="add-product-page">


            <div className="product-card">


                <h1>Add Product</h1>


                <form onSubmit={handleSubmit}>


                    <div className="form-group">

                        <label>
                            Product Name
                        </label>


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


                        <label>
                            Description
                        </label>


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



                                {categories.map((category)=>(

                                    <option

                                        key={category.id}

                                        value={category.id}

                                    >

                                        {category.name}

                                    </option>

                                ))}


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

                                placeholder="Apple"

                                required

                            />


                        </div>


                    </div>





                    <div className="row">


                        <div className="form-group">


                            <label>
                                Price
                            </label>


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


                            <label>
                                Stock
                            </label>


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


                        <label>
                            Image URL
                        </label>


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