import "./features.css";

import {
  FaMobileAlt,
  FaShieldAlt,
  FaShippingFast,
  FaEye,
} from "react-icons/fa";

function Features() {
  const features = [
    {
      icon: <FaMobileAlt />,
      title: "Responsive",
      text: "Optimized for all devices",
    },
    {
      icon: <FaShieldAlt />,
      title: "Secure",
      text: "100% Safe Payments",
    },
    {
      icon: <FaShippingFast />,
      title: "Free Shipping",
      text: "On orders over $100",
    },
    {
      icon: <FaEye />,
      title: "Transparent",
      text: "No hidden charges",
    },
  ];

  return (
    <section className="features">
      <div className="container">
        {features.map((feature, index) => (
          <div className="feature-card" key={index}>
            <div className="feature-icon">
              {feature.icon}
            </div>

            <div className="feature-info">
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Features;