import "./footer.css";

import {
    FaFacebook,
    FaInstagram,
    FaLinkedin,
    FaTwitter,
} from "react-icons/fa";

function Footer() {
    return (
        <footer className="eshop-footer">

            <div className="eshop-footer-container">

                {/* Brand */}
                <div className="eshop-footer-section">

                    <h2>E-Shop</h2>

                    <p>
                        Your one-stop destination for
                        electronics, fashion, home essentials
                        and much more.
                    </p>

                </div>


                {/* Quick Links */}
                <div className="eshop-footer-section">

                    <h3>Quick Links</h3>

                    <ul>
                        <li>Home</li>
                        <li>Products</li>
                        <li>Categories</li>
                        <li>Flash Sale</li>
                    </ul>

                </div>


                {/* Customer Service */}
                <div className="eshop-footer-section">

                    <h3>Customer Service</h3>

                    <ul>
                        <li>Contact Us</li>
                        <li>FAQs</li>
                        <li>Privacy Policy</li>
                        <li>Terms & Conditions</li>
                    </ul>

                </div>


                {/* Social Media */}
                <div className="eshop-footer-section">

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

                © 2026 E-Shop. All Rights Reserved.

            </div>

        </footer>
    );
}

export default Footer;