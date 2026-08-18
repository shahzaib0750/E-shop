
import "./Signup.css";
import { Link } from "react-router-dom";
import { useState } from "react";
import { apiFetch } from "../../../../api/api";

const passwordRules = (password) => ({
  length: password.length >= 8,
  uppercase: /[A-Z]/.test(password),
  lowercase: /[a-z]/.test(password),
  number: /[0-9]/.test(password),
  special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
});

function Signup() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",

    role: "customer",

    business_name: "",
    business_type: "",
    category: "",
    cnic: "",

    agree: false,
  });

  const [loading, setLoading] = useState(false);

  const rules = passwordRules(formData.password);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    if (!formData.agree) {
      alert("Please accept the Terms & Conditions.");
      return;
    }

    if (!Object.values(rules).every(Boolean)) {
      alert("Please create a stronger password.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    const fullName = formData.full_name.trim();
    const email = formData.email.trim().toLowerCase();
    const phone = formData.phone.trim();

    if (fullName.length < 2) {
      alert("Full name must contain at least 2 characters.");
      return;
    }

    if (phone.length < 11) {
      alert("Phone number must contain at least 11 characters.");
      return;
    }

    const payload = {
      full_name: fullName,
      email: email,
      phone: phone,
      password: formData.password,
      role: formData.role,
    };

    if (formData.role === "customer") {
      payload.customer_type = "standard";
    }

    if (formData.role === "seller") {
      const businessName = formData.business_name.trim();
      const businessType = formData.business_type.trim();
      const category = formData.category.trim();
      const cnic = formData.cnic.trim();

      if (!businessName) {
        alert("Business name is required.");
        return;
      }

      if (!businessType) {
        alert("Business type is required.");
        return;
      }

      if (!category) {
        alert("Business category is required.");
        return;
      }

      if (!cnic) {
        alert("CNIC is required.");
        return;
      }

      payload.business_name = businessName;
      payload.business_type = businessType;
      payload.category = category;
      payload.cnic = cnic;
    }

    setLoading(true);

    try {
      const response = await apiFetch("/signup", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Account created successfully!");

        setFormData({
          full_name: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",

          role: "customer",

          business_name: "",
          business_type: "",
          category: "",
          cnic: "",

          agree: false,
        });

        return;
      }

      if (response.status === 422) {
        if (Array.isArray(data.detail)) {
          const messages = data.detail
            .map((error) => {
              const field =
                error.loc?.[error.loc.length - 1] || "field";

              return `${field}: ${error.msg}`;
            })
            .join("\n");

          alert(messages);
        } else {
          alert(data.detail || "Invalid signup data.");
        }

        return;
      }

      if (response.status === 400) {
        alert(
          data.detail ||
            "Unable to create account."
        );

        return;
      }

      if (response.status === 500) {
        console.error("Server error:", data);

        alert(
          data.detail ||
            "Server error. Check the FastAPI terminal."
        );

        return;
      }

      alert(
        data.detail ||
          "Unable to create account."
      );
    } catch (error) {
      console.error("Signup request error:", error);

      alert(
        "Unable to connect to the backend server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-card">

        <h1>Create Account</h1>

        <p className="signup-intro">
          {formData.role === "seller"
            ? "Create a seller account to manage products, orders, and your store."
            : "Create a customer account to browse products and place orders."}
        </p>

        <form onSubmit={handleSubmit} noValidate>

          <div className="input-group">
            <label>
              {formData.role === "seller"
                ? "Store Owner Name"
                : "Full Name"}
            </label>

            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder={
                formData.role === "seller"
                  ? "Enter your store owner name"
                  : "Enter your full name"
              }
              minLength={2}
              maxLength={100}
              required
            />
          </div>

          <div className="input-group">
            <label>Email</label>

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="input-group">
            <label>
              {formData.role === "seller"
                ? "Business Phone Number"
                : "Phone Number"}
            </label>

            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="03XX XXXXXXX"
              minLength={11}
              maxLength={15}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>

            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create password"
              minLength={8}
              maxLength={128}
              required
            />

            <div className="password-rules">
              <p className={rules.length ? "valid" : "invalid"}>
                {rules.length ? "✓" : "✗"} At least 8 characters
              </p>

              <p className={rules.uppercase ? "valid" : "invalid"}>
                {rules.uppercase ? "✓" : "✗"} One uppercase letter
              </p>

              <p className={rules.lowercase ? "valid" : "invalid"}>
                {rules.lowercase ? "✓" : "✗"} One lowercase letter
              </p>

              <p className={rules.number ? "valid" : "invalid"}>
                {rules.number ? "✓" : "✗"} One number
              </p>

              <p className={rules.special ? "valid" : "invalid"}>
                {rules.special ? "✓" : "✗"} One special character
              </p>
            </div>
          </div>

          <div className="input-group">
            <label>Confirm Password</label>

            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
              maxLength={128}
              required
            />
          </div>

          {formData.role === "seller" && (
            <>
              <div className="input-group">
                <label>Business Name</label>

                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                  placeholder="Enter your business name"
                  maxLength={150}
                  required
                />
              </div>

              <div className="input-group">
                <label>Business Type</label>

                <input
                  type="text"
                  name="business_type"
                  value={formData.business_type}
                  onChange={handleChange}
                  placeholder="e.g. Sole Proprietor, LLC, Pvt Ltd"
                  maxLength={100}
                  required
                />
              </div>

              <div className="input-group">
                <label>Category</label>

                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="e.g. Electronics, Fashion"
                  maxLength={100}
                  required
                />
              </div>

              <div className="input-group">
                <label>CNIC</label>

                <input
                  type="text"
                  name="cnic"
                  value={formData.cnic}
                  onChange={handleChange}
                  placeholder="Enter your CNIC"
                  maxLength={20}
                  required
                />
              </div>
            </>
          )}

          <div className="input-group">
            <label>Account Type</label>

            <div className="roles">

              <label
                className={
                  formData.role === "customer"
                    ? "role-option active"
                    : "role-option"
                }
              >
                <input
                  type="radio"
                  name="role"
                  value="customer"
                  checked={formData.role === "customer"}
                  onChange={handleChange}
                />

                <span>Customer</span>
              </label>

              <label
                className={
                  formData.role === "seller"
                    ? "role-option active"
                    : "role-option"
                }
              >
                <input
                  type="radio"
                  name="role"
                  value="seller"
                  checked={formData.role === "seller"}
                  onChange={handleChange}
                />

                <span>Seller</span>
              </label>

            </div>
          </div>

          <div className="checkbox">
            <label>
              <input
                type="checkbox"
                name="agree"
                checked={formData.agree}
                onChange={handleChange}
              />

              I agree to the Terms & Conditions
            </label>
          </div>

          <button
            type="submit"
            className="signup-btn"
            disabled={loading}
          >
            {loading
              ? "Creating Account..."
              : formData.role === "seller"
                ? "Create Seller Account"
                : "Create Customer Account"}
          </button>

        </form>

        <p className="bottom-text">
          Already have an account?{" "}

          <Link to="/login">
            Login
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Signup;
