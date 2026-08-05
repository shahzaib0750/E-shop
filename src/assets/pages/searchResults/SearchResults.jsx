import "./SearchResults.css";
import { useLocation } from "react-router-dom";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";
import ProductCard from "../../../../src/productSection/productCard";

function SearchResults() {

    const location = useLocation();

    const products = location.state?.products || [];
    const keyword = location.state?.keyword || "";

    return (
        <>
            <Navbar />

            <div className="search-page">

                <div className="search-container">

                    <h1>Search Results</h1>

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

                                <ProductCard
                                    key={product.id}
                                    product={product}
                                />

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