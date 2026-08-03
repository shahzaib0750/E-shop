import "./SearchResults.css";
import { useLocation, Link } from "react-router-dom";
import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";

function SearchResults() {

    const location = useLocation();

    const products = location.state?.products || [];

    const keyword = location.state?.keyword || "";

    return (

        <>
            <Navbar />

            <div className="search-page">

                <div className="search-container">

                    <h1>
                        Search Results
                    </h1>

                    <p>
                        {products.length} result(s) found for
                        <strong> "{keyword}"</strong>
                    </p>

                    {products.length === 0 ? (

                        <div className="no-products">

                            <h2>No Products Found</h2>

                        </div>

                    ) : (

                        <div className="products-grid">

                            {products.map((product) => (

                                <div
                                    className="product-card"
                                    key={product.id}
                                >

                                   <img
    src={
        product.image?.startsWith("http")
            ? product.image
            : `/images/${product.image}`
    }
    alt={product.name}
/>

                                    <h3>{product.name}</h3>

                                    <p>{product.brand}</p>

                                    <p>{product.category}</p>

                                    <h2>${product.price}</h2>

                                    <Link
                                        to={`/product/${product.id}`}
                                    >

                                        <button>
                                            View Product
                                        </button>

                                    </Link>

                                </div>

                            ))}

                        </div>

                    )}

                </div>

            </div>

            <Footer />

        </>

    );

}

export default SearchResults;