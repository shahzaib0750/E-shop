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

      <section className="reviews">
        <div className="review-container">

          <div className="reviews-header">
            <h1>Customer Reviews</h1>
            <p>See what our happy customers say about us.</p>
          </div>

          <div className="reviews-grid">

            {reviews.map((review) => (
              <div
                className="review-card"
                key={review.id}
              >
                <div className="stars">
                  {[...Array(review.rating)].map((_, index) => (
                    <FaStar key={index} />
                  ))}
                </div>

                <p className="review-text">
                  "{review.review}"
                </p>

                <h3>{review.name}</h3>
              </div>
            ))}

          </div>

        </div>
      </section>

      <Footer />
    </>
  );
}

export default CustomerReview;