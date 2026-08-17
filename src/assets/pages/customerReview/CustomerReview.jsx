import "./CustomerReview.css";

import Navbar from "../../components/navbar";
import Footer from "../../Footer/footer";

import { FaStar } from "react-icons/fa";

const reviews = [
  {
    id: 1,
    name: "Ali Khan",
    rating: 5,
    review:
      "Amazing quality and fast delivery. Highly recommended!",
  },
  {
    id: 2,
    name: "Sara Ahmed",
    rating: 4,
    review:
      "Great customer service and excellent product quality.",
  },
  {
    id: 3,
    name: "Ahmed Raza",
    rating: 5,
    review:
      "One of the best online shopping experiences I've had.",
  },
  {
    id: 4,
    name: "Fatima Noor",
    rating: 5,
    review:
      "The product arrived exactly as shown. Very satisfied.",
  },
  {
    id: 5,
    name: "Usman Ali",
    rating: 4,
    review:
      "Affordable prices and quick delivery.",
  },
  {
    id: 6,
    name: "Ayesha Malik",
    rating: 5,
    review:
      "Excellent packaging and genuine products.",
  },
];

function CustomerReview() {
  return (
    <>
      <Navbar />

      <main className="customer-reviews-page">
        <div className="customer-reviews-container">

          {/* HEADER */}
          <div className="customer-reviews-header">
            <span className="reviews-label">
              CUSTOMER FEEDBACK
            </span>

            <h1>Customer Reviews</h1>

            <p>
              See what our happy customers say about their
              shopping experience with us.
            </p>
          </div>

          {/* REVIEW SUMMARY */}
          <div className="reviews-summary">

            <div className="rating-summary">
              <div className="rating-number">4.8</div>

              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar key={star} />
                ))}
              </div>

              <p>Based on customer reviews</p>
            </div>

            <div className="review-summary-info">
              <h2>What our customers say</h2>

              <p>
                We value every customer's experience. Here's
                what shoppers have to say about our products,
                delivery, and service.
              </p>
            </div>

          </div>

          {/* REVIEWS */}
          <div className="reviews-grid">

            {reviews.map((review) => (
              <article
                className="customer-review-card"
                key={review.id}
              >

                <div className="review-card-top">

                  <div className="review-avatar">
                    {review.name.charAt(0)}
                  </div>

                  <div className="review-customer">

                    <h3>{review.name}</h3>

                    <span>Verified Customer</span>

                  </div>

                </div>

                <div className="review-stars">

                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      className={
                        star <= review.rating
                          ? "star-filled"
                          : "star-empty"
                      }
                    />
                  ))}

                </div>

                <p className="customer-review-text">
                  "{review.review}"
                </p>

              </article>
            ))}

          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}

export default CustomerReview;