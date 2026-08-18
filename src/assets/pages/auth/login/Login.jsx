import "./Login.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { apiFetch } from "../../../../api/api";
import { useAuth } from "../../../../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiFetch("/login", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Save JWT Token
        localStorage.setItem("token", data.access_token);

        // Save User
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );

        // Keep the AuthContext in sync
        login(data.user);

        if (data.user.role === "customer") {
          navigate(
            location.state?.from || "/customer-dashboard"
          );
        } else if (data.user.role === "seller") {
          navigate(
            location.state?.from || "/seller-dashboard"
          );
        }
      } else {
        const message = Array.isArray(data.detail)
          ? data.detail
              .map((error) => {
                const field =
                  error.loc?.[error.loc.length - 1] || "field";
                return `${field}: ${error.msg}`;
              })
              .join("\n")
          : data.detail || "Invalid email or password";

        alert(message);
      }
    } catch (error) {
      console.error(error);
      alert("Unable to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Login</h1>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="login-options">
            <label>
              <input type="checkbox" />
              Remember Me
            </label>
          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={submitting}
          >
            {submitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="bottom-text">
          Don't have an account?{" "}
          <Link to="/signup">Create Account</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
