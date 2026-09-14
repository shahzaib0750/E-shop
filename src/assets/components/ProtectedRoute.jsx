import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
/**
 * Client-side route guard. Redirects logged-out visitors to /login and
 * keeps the requested path so login can send them back.
 *
 * Optional `role` ("customer" | "seller") further restricts a route to
 * that account type. The backend still enforces all authorization —
 * this only improves the UX for people hitting protected URLs directly.
 */
function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  if (role && user.role !== role) {
    const fallback =
      user.role === "seller"
        ? "/seller-dashboard"
        : "/customer-dashboard";

    return <Navigate to={fallback} replace />;
  }

  return children;
}

export default ProtectedRoute;
