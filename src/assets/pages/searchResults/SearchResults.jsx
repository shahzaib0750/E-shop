import "./SearchResults.css";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";
import ProductCard from "../../../../src/productSection/productCard";
import { apiFetch } from "../../../api/api";

function SearchResults() {

    const [searchParams] = useSearchParams();

    const keyword = searchParams.get("q") || "";

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const runSearch = async () => {
            setLoading(true);
            setError("");

            if (!keyword) {
                if (!cancelled) {
                    setProducts([]);
                    setLoading(false);
                }
                return;
            }

            try {
                const response = await apiFetch(
                    `/products/search?keyword=${encodeURIComponent(keyword)}`
                );

                if (cancelled) {
                    return;
                }

                if (!response.ok) {
                    setError(
                        "Unable to load search results."
                    );
                    return;
                }

                const data = await response.json();

                setProducts(
                    Array.isArray(data) ? data : []
                );
            } catch (err) {
                if (!cancelled) {
                    console.error(
                        "Search error:",
                        err
                    );
                    setError(
                        "Unable to connect to server."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        runSearch();

        return () => {
            cancelled = true;
        };
    }, [keyword]);

    return (
        <>
            <Navbar />

            <div className="search-page">

                <div className="search-container">

                    <h1>Search Results</h1>

                    <p>
                        {loading
                            ? "Searching..."
                            : `${products.length} result(s) found for`}
                        {!loading && (
                            <strong> "{keyword}"</strong>
                        )}
                    </p>

                    {loading ? (
                        <div className="no-products">
                            <h2>Loading...</h2>
                        </div>
                    ) : error ? (
                        <div className="no-products">
                            <h2>{error}</h2>
                        </div>
                    ) : products.length === 0 ? (
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
