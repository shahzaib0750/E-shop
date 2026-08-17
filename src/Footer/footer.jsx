import "./footer.css";

import {
    FaFacebook,
    FaInstagram,
    FaLinkedin,
    FaTwitter,
} from "react-icons/fa";

import { Link } from "react-router-dom";

function Footer() {
    return (
        <footer className="eshop-footer">

            <div className="eshop-footer-container">

                {/* Brand */}
                <div className="eshop-footer-brand">

                    <h2>E-Shop</h2>

                    <p>
                        Your one-stop destination for
                        electronics, fashion, home essentials
                        and much more.
                    </p>

                </div>


                {/* Quick Links */}
                <div className="eshop-footer-column">

                    <h3>Quick Links</h3>

                    <Link to="/">Home</Link>

                    <Link to="/products">Products</Link>

                    <Link to="/categories">Categories</Link>

                    <Link to="/flash-sale">Flash Sale</Link>

                </div>


                {/* Customer Service */}
                <div className="eshop-footer-column">

                    <h3>Customer Service</h3>

                    <Link to="/contact">Contact Us</Link>

                    <Link to="/faq">FAQs</Link>

                    <Link to="/privacy">Privacy Policy</Link>

                    <Link to="/terms">
                        Terms & Conditions
                    </Link>

                </div>


                {/* Social */}
                <div className="eshop-footer-column">

                    <h3>Follow Us</h3>

                    <div className="eshop-social-icons">

                        <a href="#" aria-label="Facebook">
                            <FaFacebook />
                        </a>

                        <a href="#" aria-label="Instagram">
                            <FaInstagram />
                        </a>

                        <a href="#" aria-label="LinkedIn">
                            <FaLinkedin />
                        </a>

                        <a href="#" aria-label="Twitter">
                            <FaTwitter />
                        </a>

                    </div>

                </div>

            </div>


            {/* Bottom */}
            <div className="eshop-footer-bottom">

                <p>
                    © 2026 E-Shop. All Rights Reserved.
                </p>

            </div>

        </footer>
    );
}

export default Footer;