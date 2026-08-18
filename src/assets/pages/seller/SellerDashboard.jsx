import "./SellerDashboard.css";

import {
    useCallback,
    useEffect,
    useState
} from "react";

import { useNavigate } from "react-router-dom";

import SellerSidebar from "./SellerSidebar";
import { apiFetch } from "../../../api/api";

function SellerDashboard() {
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/login");
            return;
        }

        try {
            setLoading(true);

            const [
                ordersResponse,
                productsResponse
            ] = await Promise.all([
                apiFetch("/seller/orders", {
                    method: "GET",
                }),
                apiFetch("/seller/products", {
                    method: "GET",
                })
            ]);

            const ordersData =
                await ordersResponse.json();

            const productsData =
                await productsResponse.json();

            if (
                ordersResponse.status === 401 ||
                productsResponse.status === 401
            ) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");

                navigate("/login");
                return;
            }

            if (
                ordersResponse.status === 403 ||
                productsResponse.status === 403
            ) {
                setOrders([]);
                setProducts([]);
                return;
            }

            if (!ordersResponse.ok) {
                throw new Error(
                    ordersData.detail ||
                    "Unable to load orders."
                );
            }

            if (!productsResponse.ok) {
                throw new Error(
                    productsData.detail ||
                    "Unable to load products."
                );
            }

            setOrders(
                Array.isArray(ordersData)
                    ? ordersData
                    : []
            );

            setProducts(
                Array.isArray(productsData)
                    ? productsData
                    : []
            );
        } catch (error) {
            console.error(
                "Dashboard error:",
                error
            );

            setOrders([]);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDashboardData();
        }, 0);

        return () => clearTimeout(timer);
    }, [fetchDashboardData]);

    // The seller orders endpoint returns one row per line item, so a
    // 3-item order appears 3 times. Count distinct order ids for the
    // "orders" stat and exclude cancelled rows from revenue.
    const orderCount = new Set(
        orders.map((order) => order.order_id)
    ).size;

    const totalRevenue = orders
        .filter(
            (order) =>
                String(order.status || "")
                    .toLowerCase() !== "cancelled"
        )
        .reduce(
            (sum, order) =>
                sum + Number(order.total || 0),
            0
        );

    const pendingOrders = orders.filter(
        (order) =>
            String(order.status || "")
                .toLowerCase() === "pending"
    ).length;

    const completedOrders = orders.filter(
        (order) =>
            String(order.status || "")
                .toLowerCase() === "delivered"
    ).length;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-PK", {
            style: "currency",
            currency: "PKR",
            maximumFractionDigits: 0
        }).format(amount);
    };

    const getStatusClass = (status) => {
        const value = String(status || "")
            .toLowerCase();

        if (value === "completed" || value === "delivered") {
            return "status-completed";
        }

        if (value === "pending") {
            return "status-pending";
        }

        if (value === "processing") {
            return "status-processing";
        }

        if (value === "cancelled") {
            return "status-cancelled";
        }

        if (value === "shipped") {
            return "status-shipped";
        }

        return "status-default";
    };

    const getImageUrl = (image) => {
        if (!image) {
            return "/images/placeholder.png";
        }

        if (
            image.startsWith("http://") ||
            image.startsWith("https://")
        ) {
            return image;
        }

        return `/images/${image}`;
    };

    const recentOrders = orders.slice(0, 8);

    return (
        <div className="seller-layout">
            <SellerSidebar />

            <main className="seller-main-content">
                <div className="seller-dashboard">
                    <header className="dashboard-header">
                        <div>
                            <span className="dashboard-eyebrow">
                                SELLER CENTER
                            </span>

                            <h1>
                                Dashboard
                            </h1>

                            <p>
                                Manage your store,
                                products and orders
                                from one place.
                            </p>
                        </div>

                        <div className="dashboard-header-actions">
                            <button
                                type="button"
                                className="store-button"
                                onClick={() =>
                                    navigate("/")
                                }
                            >
                                <span>↗</span>
                                View Store
                            </button>

                            <button
                                type="button"
                                className="add-product-button"
                                onClick={() =>
                                    navigate(
                                        "/seller/add-product"
                                    )
                                }
                            >
                                <span>+</span>
                                Add Product
                            </button>
                        </div>
                    </header>

                    {loading ? (
                        <div className="dashboard-loading">
                            <div className="loading-spinner"></div>

                            <p>
                                Loading your dashboard...
                            </p>
                        </div>
                    ) : (
                        <>
                            <section className="stats-grid">
                                <div className="stat-card revenue-card">
                                    <div className="stat-card-top">
                                        <div className="stat-icon revenue-icon">
                                            ₨
                                        </div>

                                        <span className="stat-label">
                                            Total Revenue
                                        </span>
                                    </div>

                                    <div className="stat-value">
                                        {formatCurrency(
                                            totalRevenue
                                        )}
                                    </div>

                                    <div className="stat-footer">
                                        <span className="stat-footer-icon">
                                            ↗
                                        </span>

                                        From all orders
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-card-top">
                                        <div className="stat-icon orders-icon">
                                            🛒
                                        </div>

                                        <span className="stat-label">
                                            Total Orders
                                        </span>
                                    </div>

                                    <div className="stat-value">
                                        {orderCount}
                                    </div>

                                    <div className="stat-footer">
                                        <span className="stat-footer-icon">
                                            ✓
                                        </span>

                                        All orders received
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-card-top">
                                        <div className="stat-icon products-icon">
                                            📦
                                        </div>

                                        <span className="stat-label">
                                            Total Products
                                        </span>
                                    </div>

                                    <div className="stat-value">
                                        {products.length}
                                    </div>

                                    <div className="stat-footer">
                                        <span className="stat-footer-icon">
                                            +
                                        </span>

                                        Products in your store
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-card-top">
                                        <div className="stat-icon pending-icon">
                                            ⏱
                                        </div>

                                        <span className="stat-label">
                                            Pending Orders
                                        </span>
                                    </div>

                                    <div className="stat-value">
                                        {pendingOrders}
                                    </div>

                                    <div className="stat-footer">
                                        <span className="stat-footer-icon">
                                            !
                                        </span>

                                        Need your attention
                                    </div>
                                </div>
                            </section>

                            <section className="dashboard-content-grid">
                                <div className="orders-panel">
                                    <div className="panel-header">
                                        <div>
                                            <h2>
                                                Recent Orders
                                            </h2>

                                            <p>
                                                Latest orders
                                                from your
                                                store
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            className="view-all-button"
                                            onClick={() =>
                                                navigate(
                                                    "/seller/orders"
                                                )
                                            }
                                        >
                                            View All →
                                        </button>
                                    </div>

                                    {recentOrders.length ===
                                    0 ? (
                                        <div className="empty-orders">
                                            <div className="empty-orders-icon">
                                                🛍
                                            </div>

                                            <h3>
                                                No orders
                                                yet
                                            </h3>

                                            <p>
                                                Orders will
                                                appear here
                                                when
                                                customers
                                                purchase
                                                your
                                                products.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="orders-table-wrapper">
                                            <table className="orders-table">
                                                <thead>
                                                    <tr>
                                                        <th>
                                                            ORDER
                                                        </th>
                                                        <th>
                                                            PRODUCT
                                                        </th>
                                                        <th>
                                                            CUSTOMER
                                                        </th>
                                                        <th>
                                                            QTY
                                                        </th>
                                                        <th>
                                                            AMOUNT
                                                        </th>
                                                        <th>
                                                            STATUS
                                                        </th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {recentOrders.map(
                                                        (
                                                            order
                                                        ) => (
                                                            <tr
                                                                key={`${order.order_id}-${order.product_id}`}
                                                            >
                                                                <td>
                                                                    <span className="order-number">
                                                                        #
                                                                        {
                                                                            order.order_id
                                                                        }
                                                                    </span>
                                                                </td>

                                                                <td>
                                                                    <div className="product-cell">
                                                                        <img
                                                                            src={getImageUrl(
                                                                                order.image
                                                                            )}
                                                                            alt={
                                                                                order.product_name ||
                                                                                "Product"
                                                                            }
                                                                            className="order-product-image"
                                                                        />

                                                                        <span>
                                                                            {
                                                                                order.product_name ||
                                                                                "Unknown Product"
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </td>

                                                                <td>
                                                                    <span className="customer-id">
                                                                        Customer
                                                                        #
                                                                        {
                                                                            order.customer_id
                                                                        }
                                                                    </span>
                                                                </td>

                                                                <td>
                                                                    <span className="quantity">
                                                                        ×
                                                                        {
                                                                            order.quantity
                                                                        }
                                                                    </span>
                                                                </td>

                                                                <td>
                                                                    <strong className="order-amount">
                                                                        {formatCurrency(
                                                                            Number(
                                                                                order.total ||
                                                                                0
                                                                            )
                                                                        )}
                                                                    </strong>
                                                                </td>

                                                                <td>
                                                                    <span
                                                                        className={`order-status ${getStatusClass(
                                                                            order.status
                                                                        )}`}
                                                                    >
                                                                        <span className="status-dot"></span>

                                                                        {String(
                                                                            order.status ||
                                                                            "Unknown"
                                                                        )}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        )
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                <aside className="dashboard-side-panel">
                                    <div className="quick-actions-card">
                                        <div className="panel-header compact">
                                            <div>
                                                <h2>
                                                    Quick
                                                    Actions
                                                </h2>

                                                <p>
                                                    Manage
                                                    your
                                                    store
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="quick-action"
                                            onClick={() =>
                                                navigate(
                                                    "/seller/add-product"
                                                )
                                            }
                                        >
                                            <span className="quick-action-icon">
                                                +
                                            </span>

                                            <span>
                                                <strong>
                                                    Add
                                                    Product
                                                </strong>

                                                <small>
                                                    Add a
                                                    new
                                                    item
                                                </small>
                                            </span>

                                            <span className="quick-arrow">
                                                →
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            className="quick-action"
                                            onClick={() =>
                                                navigate(
                                                    "/seller/products"
                                                )
                                            }
                                        >
                                            <span className="quick-action-icon">
                                                📦
                                            </span>

                                            <span>
                                                <strong>
                                                    Manage
                                                    Products
                                                </strong>

                                                <small>
                                                    View
                                                    your
                                                    catalog
                                                </small>
                                            </span>

                                            <span className="quick-arrow">
                                                →
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            className="quick-action"
                                            onClick={() =>
                                                navigate(
                                                    "/seller/orders"
                                                )
                                            }
                                        >
                                            <span className="quick-action-icon">
                                                🛒
                                            </span>

                                            <span>
                                                <strong>
                                                    Manage
                                                    Orders
                                                </strong>

                                                <small>
                                                    Process
                                                    customer
                                                    orders
                                                </small>
                                            </span>

                                            <span className="quick-arrow">
                                                →
                                            </span>
                                        </button>
                                    </div>

                                    <div className="store-overview-card">
                                        <div className="store-overview-title">
                                            <span className="overview-icon">
                                                📊
                                            </span>

                                            <div>
                                                <h3>
                                                    Store
                                                    Overview
                                                </h3>

                                                <p>
                                                    Current
                                                    performance
                                                </p>
                                            </div>
                                        </div>

                                        <div className="overview-row">
                                            <span>
                                                Products
                                            </span>

                                            <strong>
                                                {
                                                    products.length
                                                }
                                            </strong>
                                        </div>

                                        <div className="overview-row">
                                            <span>
                                                Orders
                                            </span>

                                            <strong>
                                                {
                                                    orderCount
                                                }
                                            </strong>
                                        </div>

                                        <div className="overview-row">
                                            <span>
                                                Completed
                                            </span>

                                            <strong className="completed-number">
                                                {
                                                    completedOrders
                                                }
                                            </strong>
                                        </div>

                                        <div className="overview-row">
                                            <span>
                                                Pending
                                            </span>

                                            <strong className="pending-number">
                                                {
                                                    pendingOrders
                                                }
                                            </strong>
                                        </div>
                                    </div>
                                </aside>
                            </section>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

export default SellerDashboard;