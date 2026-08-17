import "./Products.css";
import { useEffect, useState } from "react";
import ProductCard from "../../../../src/productSection/productCard";

const LIMIT = 12;

function Products() {
    const [products, setProducts] = useState([]);
    const [page, setPage] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const loadProducts = async () => {
            setLoading(true);

            try {
                const productsResponse = await fetch(
                    `http://127.0.0.1:8000/products?page=${page}&limit=${LIMIT}`
                );

                if (!productsResponse.ok) {
                    throw new Error("Unable to load products.");
                }

                const productsData = await productsResponse.json();

                const countResponse = await fetch(
                    "http://127.0.0.1:8000/products/count"
                );

                if (!countResponse.ok) {
                    throw new Error("Unable to load product count.");
                }

                const countData = await countResponse.json();

                if (cancelled) {
                    return;
                }

                setProducts(
                    Array.isArray(productsData) ? productsData : []
                );

                setTotalProducts(
                    Number(countData.total) || 0
                );
            } catch (error) {
                if (!cancelled) {
                    console.error(
                        "Load products error:",
                        error
                    );

                    setProducts([]);
                    setTotalProducts(0);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadProducts();

        return () => {
            cancelled = true;
        };
    }, [page]);

    const totalPages = Math.ceil(
        totalProducts / LIMIT
    );

    const goToPreviousPage = () => {
        if (page > 1) {
            setPage((currentPage) => currentPage - 1);
        }
    };

    const goToNextPage = () => {
        if (page < totalPages) {
            setPage((currentPage) => currentPage + 1);
        }
    };

    return (
        <section className="products">
            <div className="products-container">

                <div className="products-header">
                    <div>
                        <span className="products-label">
                            OUR COLLECTION
                        </span>

                        <h2>
                            Featured Products
                        </h2>

                        <p>
                            Discover our latest products
                            and find something you'll love.
                        </p>
                    </div>

                    {!loading && totalProducts > 0 && (
                        <div className="products-count">
                            <strong>
                                {totalProducts}
                            </strong>

                            <span>
                                Products
                            </span>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="products-loading">
                        <div className="loading-spinner"></div>

                        <p>
                            Loading products...
                        </p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="products-empty">
                        <div className="empty-product-icon">
                            📦
                        </div>

                        <h3>
                            No Products Found
                        </h3>

                        <p>
                            There are currently no products
                            available.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="products-grid">
                            {products.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                />
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    type="button"
                                    disabled={page === 1}
                                    onClick={goToPreviousPage}
                                >
                                    ← Previous
                                </button>

                                <div className="pagination-info">
                                    <span>
                                        Page
                                    </span>

                                    <strong>
                                        {page}
                                    </strong>

                                    <span>
                                        of {totalPages}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    disabled={
                                        page === totalPages
                                    }
                                    onClick={goToNextPage}
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}

export default Products;