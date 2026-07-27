import Navbar from "../../components/navbar";
import Hero from "../../components/hero";
import Features from "../../components/features";
import Products from "../../productSection/products";
import Categories from "../../categorySection/categories";
import FlashSale from "../../flashSale/FlashSale";
import PromotionalBanner from "../../promotionalBanner/PromoBanner";
import Footer from "../../Footer/footer";

function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <Products />
      <Categories />
      <FlashSale />
      <PromotionalBanner />
      <Footer />
    </>
  );
}

export default Home;