
import "./Signup.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { apiFetch } from "../../../../api/api";

function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
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
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [termsError, setTermsError] = useState("");

  const [rules, setRules] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (name === "password") {
      setRules({
        length: value.length >= 8,
        uppercase: /[A-Z]/.test(value),
        lowercase: /[a-z]/.test(value),
        number: /[0-9]/.test(value),
        special: /[^A-Za-z0-9]/.test(value),
      });
    }

    if (name === "agree" && checked) {
      setTermsError("");
    }

    if (successMessage) {
      setSuccessMessage("");
    }

    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const passwordsMatch =
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;

  const passwordsDoNotMatch =
    formData.confirmPassword.length > 0 &&
    formData.password !== formData.confirmPassword;

  const allPasswordRulesPassed =
    rules.length &&
    rules.uppercase &&
    rules.lowercase &&
    rules.number &&
    rules.special;

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");
    setTermsError("");

    if (!allPasswordRulesPassed) {
      setErrorMessage("Please meet all password requirements.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!formData.agree) {
      setTermsError("Please agree to the Terms & Conditions.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch("/signup", {
        method: "POST",
        body: JSON.stringify({
          full_name: formData.name,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          business_name:
            formData.role === "seller"
              ? formData.business_name
              : null,
          business_type:
            formData.role === "seller"
              ? formData.business_type
              : null,
          category:
            formData.role === "seller"
              ? formData.category
              : null,
          cnic:
            formData.role === "seller"
              ? formData.cnic
              : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessageText =
          "Account creation failed. Please try again.";

        if (Array.isArray(data.detail)) {
          errorMessageText = data.detail
            .map((error) => {
              const field =
                Array.isArray(error.loc) && error.loc.length > 0
                  ? error.loc[error.loc.length - 1]
                  : "Field";

              return `${field}: ${error.msg}`;
            })
            .join(", ");
        } else if (typeof data.detail === "string") {
          errorMessageText = data.detail;
        } else if (data.detail) {
          errorMessageText = JSON.stringify(data.detail);
        }

        throw new Error(errorMessageText);
      }

      setSuccessMessage(
        "Account created successfully! Redirecting to login..."
      );

      setFormData({
        name: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "customer",
        business_name: "",
        business_type: "",
        category: "",
        cnic: "",
        agree: false,
      });

      setRules({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
      });

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      console.error("Signup error:", error);

      setErrorMessage(
        error.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div
        className={`signup-card ${
          formData.role === "seller" ? "seller-mode" : ""
        }`}
      >
        <div className="signup-header">
          <h1>Create Account</h1>

          <p className="signup-intro">
            Create your account to get started with E-Shop.
          </p>
        </div>

        {successMessage && (
          <div className="signup-success">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="signup-error">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Account Type */}
          <div className="account-type">
            <label className="section-label">Account Type</label>

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

          {/* Main Information */}
          <div className="form-grid">
            {/* Name */}
            <div className="input-group">
              <label>Name</label>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
                maxLength={100}
                required
              />
            </div>

            {/* Phone */}
            <div className="input-group">
              <label>Phone</label>

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                maxLength={20}
                required
              />
            </div>

            {/* Email */}
            <div className="input-group">
              <label>Email</label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                maxLength={150}
                required
              />
            </div>

            {/* Password */}
            <div className="input-group password-field">
              <label>Password</label>

              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                maxLength={128}
                required
              />

              <div className="password-rules">
                <span className={rules.length ? "valid" : "invalid"}>
                  {rules.length ? "✓" : "○"} 8+
                </span>

                <span className={rules.uppercase ? "valid" : "invalid"}>
                  {rules.uppercase ? "✓" : "○"} Uppercase
                </span>

                <span className={rules.lowercase ? "valid" : "invalid"}>
                  {rules.lowercase ? "✓" : "○"} Lowercase
                </span>

                <span className={rules.number ? "valid" : "invalid"}>
                  {rules.number ? "✓" : "○"} Number
                </span>

                <span className={rules.special ? "valid" : "invalid"}>
                  {rules.special ? "✓" : "○"} Special
                </span>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="input-group">
              <label>Confirm Password</label>

              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                maxLength={128}
                required
                className={
                  passwordsMatch
                    ? "password-match"
                    : passwordsDoNotMatch
                      ? "password-mismatch"
                      : ""
                }
              />

              {passwordsMatch && (
                <p className="password-status match">
                  <span>✓</span>
                  Passwords match
                </p>
              )}

              {passwordsDoNotMatch && (
                <p className="password-status mismatch">
                  <span>✕</span>
                  Passwords do not match
                </p>
              )}
            </div>
          </div>

          {/* Seller Information */}
          {formData.role === "seller" && (
            <div className="seller-section">
              <div className="seller-heading">
                Seller Information
              </div>

              <div className="seller-grid">
                {/* Business Name */}
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

                {/* Business Type */}
                <div className="input-group">
                  <label>Business Type</label>

                  <input
                    type="text"
                    name="business_type"
                    value={formData.business_type}
                    onChange={handleChange}
                    placeholder="e.g. Sole Proprietor, LLC"
                    maxLength={100}
                    required
                  />
                </div>

                {/* Category */}
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

                {/* CNIC */}
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
              </div>
            </div>
          )}

          {/* Terms */}
          <div className="checkbox">
            <label>
              <input
                type="checkbox"
                name="agree"
                checked={formData.agree}
                onChange={handleChange}
              />

              <span>I agree to the Terms & Conditions</span>
            </label>

            {termsError && (
              <p className="terms-error">
                {termsError}
              </p>
            )}
          </div>

          {/* Submit */}
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
          <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;

