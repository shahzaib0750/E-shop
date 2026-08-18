import "./SellerOrders.css";

import {
    useCallback,
    useEffect,
    useState
} from "react";

import { useNavigate } from "react-router-dom";

import SellerSidebar from "./SellerSidebar";
import { apiFetch } from "../../../api/api";

function SellerOrders() {
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingOrder, setUpdatingOrder] =
        useState(null);

    const fetchOrders = useCallback(async () => {
        const token = localStorage.getItem("token");

        if (!token) {
            alert("Please login first.");
            navigate("/login");
            return;
        }

        try {
            setLoading(true);

            const response = await apiFetch(
                "/seller/orders",
                {
                    method: "GET",
                }
            );

            const data =
                await response.json();

            if (response.status === 401) {
                alert(
                    "Your session has expired. Please login again."
                );

                navigate("/login");
                return;
            }

            if (response.status === 403) {
                alert(
                    "You are not authorized to access seller orders."
                );

                return;
            }

            if (!response.ok) {
                alert(
                    data.detail ||
                    "Unable to load seller orders."
                );

                return;
            }

            setOrders(
                Array.isArray(data)
                    ? data
                    : []
            );
        } catch (error) {
            console.error(
                "Fetch seller orders error:",
                error
            );

            alert(
                "Unable to connect to server."
            );
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchOrders();
        }, 0);

        return () => clearTimeout(timer);
    }, [fetchOrders]);

    const updateOrderStatus = async (
        orderId,
        status
    ) => {
        const token =
            localStorage.getItem("token");

        if (!token) {
            alert("Please login first.");
            navigate("/login");
            return;
        }

        try {
            setUpdatingOrder(orderId);

            const response = await apiFetch(
                `/seller/orders/${orderId}/status`,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        status
                    })
                }
            );

            const data =
                await response.json();

            if (response.status === 401) {
                alert(
                    "Your session has expired. Please login again."
                );

                navigate("/login");
                return;
            }

            if (response.status === 403) {
                alert(
                    "You are not authorized to update this order."
                );

                return;
            }

            if (!response.ok) {
                alert(
                    data.detail ||
                    "Unable to update order status."
                );

                return;
            }

            alert(
                "Order status updated."
            );

            await fetchOrders();
        } catch (error) {
            console.error(
                "Update order status error:",
                error
            );

            alert(
                "Unable to update order."
            );
        } finally {
            setUpdatingOrder(null);
        }
    };

    return (
        <div className="seller-layout">
            <SellerSidebar />

            <main className="seller-main-content">
                <div className="seller-orders-page">
                    <div className="orders-header">
                        <div>
                            <p className="page-label">
                                SELLER CENTER
                            </p>

                            <h1>
                                Orders
                            </h1>

                            <p className="page-description">
                                Manage and process your
                                customer orders.
                            </p>
                        </div>

                        <div className="orders-count">
                            <span>
                                {orders.length}
                            </span>

                            <small>
                                Total Orders
                            </small>
                        </div>
                    </div>

                    <div className="orders-card">
                        <div className="orders-card-header">
                            <div>
                                <h2>
                                    Recent Orders
                                </h2>

                                <p>
                                    View and manage
                                    orders from your
                                    store.
                                </p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="orders-empty-state">
                                <div className="loading-icon">
                                    ⏳
                                </div>

                                <h3>
                                    Loading Orders...
                                </h3>

                                <p>
                                    Please wait while
                                    we load your
                                    orders.
                                </p>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="orders-empty-state">
                                <div className="empty-icon">
                                    🛍️
                                </div>

                                <h3>
                                    No Orders Yet
                                </h3>

                                <p>
                                    Orders will appear
                                    here when customers
                                    purchase your
                                    products.
                                </p>
                            </div>
                        ) : (
                            <div className="orders-table-wrapper">
                                <table className="orders-table">
                                    <thead>
                                        <tr>
                                            <th>
                                                Order
                                            </th>

                                            <th>
                                                Customer
                                            </th>

                                            <th>
                                                Product
                                            </th>

                                            <th>
                                                Quantity
                                            </th>

                                            <th>
                                                Price
                                            </th>

                                            <th>
                                                Total
                                            </th>

                                            <th>
                                                Status
                                            </th>

                                            <th>
                                                Update
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {orders.map(
                                            (order) => (
                                                <tr
                                                    key={`${order.order_id}-${order.product_id}`}
                                                >
                                                    <td>
                                                        <span className="order-id">
                                                            #
                                                            {
                                                                order.order_id
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span className="customer-id">
                                                            {
                                                                order.customer_id
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="product-info">
                                                            <div className="product-image">
                                                                <img
                                                                    src={
                                                                        order.image?.startsWith(
                                                                            "http"
                                                                        )
                                                                            ? order.image
                                                                            : order.image
                                                                              ? `/images/${order.image}`
                                                                              : "/images/placeholder.png"
                                                                    }
                                                                    alt={
                                                                        order.product_name ||
                                                                        "Product"
                                                                    }
                                                                />
                                                            </div>

                                                            <span>
                                                                {
                                                                    order.product_name
                                                                }
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <span className="quantity">
                                                            {
                                                                order.quantity
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span className="price">
                                                            Rs{" "}
                                                            {Number(
                                                                order.price ||
                                                                0
                                                            ).toFixed(
                                                                2
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <strong className="total">
                                                            Rs{" "}
                                                            {Number(
                                                                order.total ||
                                                                0
                                                            ).toFixed(
                                                                2
                                                            )}
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`status-badge ${String(
                                                                order.status ||
                                                                ""
                                                            ).toLowerCase()}`}
                                                        >
                                                            <span className="status-dot"></span>

                                                            {
                                                                order.status
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <select
                                                            className="status-select"
                                                            value={
                                                                order.status
                                                            }
                                                            disabled={
                                                                updatingOrder ===
                                                                order.order_id
                                                            }
                                                            onChange={(
                                                                e
                                                            ) =>
                                                                updateOrderStatus(
                                                                    order.order_id,
                                                                    e
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                        >
                                                            <option value="pending">
                                                                Pending
                                                            </option>

                                                            <option value="processing">
                                                                Processing
                                                            </option>

                                                            <option value="shipped">
                                                                Shipped
                                                            </option>

                                                            <option value="delivered">
                                                                Delivered
                                                            </option>

                                                            <option value="cancelled">
                                                                Cancelled
                                                            </option>
                                                        </select>
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default SellerOrders;