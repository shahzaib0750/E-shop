import "./Signup.css";
import { Link } from "react-router-dom";
import { useState } from "react";

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
    agree: false,
  });

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

    try {

      const response = await fetch("http://127.0.0.1:8000/signup", {

        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: formData.role,
        }),

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
          agree: false,
        });

      } else {

        alert(data.detail || "Something went wrong.");

      }

    } catch (error) {

      console.error(error);

      alert("Unable to connect to server.");

    }

  };

  return (

    <div className="signup-page">

      <div className="signup-card">

        <h1>Create Account</h1>

        <form onSubmit={handleSubmit}>

          <div className="input-group">

            <label>Full Name</label>

            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Enter your full name"
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

            <label>Phone Number</label>

            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="03XX XXXXXXX"
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
              required
            />

          </div>

          <div className="role-box">

            <label>Account Type</label>

            <div className="roles">

              <label>

                <input
                  type="radio"
                  name="role"
                  value="customer"
                  checked={formData.role === "customer"}
                  onChange={handleChange}
                />

                Customer

              </label>

              <label>

                <input
                  type="radio"
                  name="role"
                  value="seller"
                  checked={formData.role === "seller"}
                  onChange={handleChange}
                />

                Seller

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
          >
            Create Account
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