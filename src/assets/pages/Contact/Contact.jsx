import "./Contact.css";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";

import {
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
} from "react-icons/fa";

function Contact() {
  return (
    <>
      <Navbar />

      <main className="contact-page">
        <div className="contact-container">

          {/* HEADER */}
          <div className="contact-header">

            <span className="contact-label">
              GET IN TOUCH
            </span>

            <h1>Contact Us</h1>

            <p>
              Have a question, need help with an order, or just
              want to say hello? We'd love to hear from you.
            </p>

          </div>

          {/* CONTENT */}
          <div className="contact-content">

            {/* LEFT SIDE */}
            <div className="contact-info-card">

              <div className="contact-info-header">
                <h2>Let's talk</h2>

                <p>
                  Our support team is here to help you with
                  your shopping experience.
                </p>
              </div>

              <div className="contact-info-list">

                <div className="contact-info-item">

                  <div className="contact-icon">
                    <FaMapMarkerAlt />
                  </div>

                  <div>
                    <span>Our Location</span>
                    <p>Lahore, Pakistan</p>
                  </div>

                </div>

                <div className="contact-info-item">

                  <div className="contact-icon">
                    <FaPhoneAlt />
                  </div>

                  <div>
                    <span>Phone Number</span>
                    <p>04201023045</p>
                  </div>

                </div>

                <div className="contact-info-item">

                  <div className="contact-icon">
                    <FaEnvelope />
                  </div>

                  <div>
                    <span>Email Address</span>
                    <p>support@eshop.com</p>
                  </div>

                </div>

              </div>

              <div className="contact-help-box">

                <strong>Need quick help?</strong>

                <p>
                  Send us a message and our team will get back
                  to you as soon as possible.
                </p>

              </div>

            </div>

            {/* RIGHT SIDE */}
            <div className="contact-form-card">

              <div className="contact-form-header">
                <h2>Send us a message</h2>

                <p>
                  Fill out the form below and we'll get back
                  to you shortly.
                </p>
              </div>

              <form className="contact-form">

                <div className="contact-form-row">

                  <div className="contact-field">
                    <label>Your Name</label>

                    <input
                      type="text"
                      placeholder="Enter your name"
                      required
                    />
                  </div>

                  <div className="contact-field">
                    <label>Email Address</label>

                    <input
                      type="email"
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                </div>

                <div className="contact-field">

                  <label>Subject</label>

                  <input
                    type="text"
                    placeholder="What can we help you with?"
                    required
                  />

                </div>

                <div className="contact-field">

                  <label>Message</label>

                  <textarea
                    rows="6"
                    placeholder="Write your message..."
                    required
                  />

                </div>

                <button
                  type="submit"
                  className="contact-submit-btn"
                >
                  Send Message
                </button>

              </form>

            </div>

          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}

export default Contact;