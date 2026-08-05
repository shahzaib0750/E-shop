import "./footer.css";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaTwitter,
} from "react-icons/fa";

function Footer() {
  return (
    <footer className="footer">

      <div className="container footer-container">

        <div className="footer-section">
          <h2>E-Shop</h2>

          <p>
            Your one-stop destination for electronics,
            fashion, home essentials and much more.
          </p>
        </div>

        <div className="footer-section">
          <h3>Quick Links</h3>

          <ul>
            <li>Home</li>
            <li>Products</li>
            <li>Categories</li>
            <li>Flash Sale</li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Customer Service</h3>

          <ul>
            <li>Contact Us</li>
            <li>FAQs</li>
            <li>Privacy Policy</li>
            <li>Terms & Conditions</li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Follow Us</h3>

          <div className="social-icons">
            <FaFacebook />
            <FaInstagram />
            <FaLinkedin />
            <FaTwitter />
          </div>
        </div>

      </div>

      <div className="footer-bottom">
        © 2026 E-Shop. All Rights Reserved.
      </div>

    </footer>
  );
}

export default Footer;