import "./Contact.css";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";

import { FaMapMarkerAlt, FaPhoneAlt, FaEnvelope } from "react-icons/fa";

function Contact() {
  return (
    <>
      <Navbar />

      <section className="contact">
        <div className="container-contact">

          <div className="contact-header">
            <h1>Contact Us</h1>
            <p>Have questions? We'd love to hear from you.</p>
          </div>

          <div className="contact-content">

            <div className="contact-info">
              <h2>Get in Touch</h2>

              <div className="info">
                <FaMapMarkerAlt />
                <span>Lahore, Pakistan</span>
              </div>

              <div className="info">
                <FaPhoneAlt />
                <span>04201023045</span>
              </div>

              <div className="info">
                <FaEnvelope />
                <span>support@eshop.com</span>
              </div>
            </div>

            <form className="contact-form">

              <input
                type="text"
                placeholder="Your Name"
              />

              <input
                type="email"
                placeholder="Your Email"
              />

              <input
                type="text"
                placeholder="Subject"
              />

              <textarea
                rows="6"
                placeholder="Your Message"
              ></textarea>

              <button type="submit">
                Send Message
              </button>

            </form>

          </div>

        </div>
      </section>

      <Footer />
    </>
  );
}

export default Contact;