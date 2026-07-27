import "./Login.css";
import { Link } from "react-router-dom";

function Login() {
  return (
    <div className="login-page">

      <div className="login-card">

        <h1>Login</h1>

        <form>

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
            />
          </div>

          <div className="login-options">

            <label>
              <input type="checkbox" />
              Remember Me
            </label>

            <Link to="/forgot-password">
              Forgot Password?
            </Link>

          </div>

          <button className="login-btn">
            Login
          </button>

        </form>

        <p className="bottom-text">
          Don't have an account?

          <Link to="/signup">
            Create Account
          </Link>
        </p>

      </div>

    </div>
  );
}

export default Login;