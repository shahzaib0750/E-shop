import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./assets/pages/Home/Home";
import NewArrivals from "./assets/pages/newArrivals/NewArrivals";
import Contact from '././assets/pages/Contact/Contact';
import CustomerReview from "./assets/pages/customerReview/CustomerReview";
import Cart from './assets/pages/cart/Cart';
import EditProduct from "../src/assets/pages/seller/EditProduct";
import CheckOut from "../src/assets/pages/checkout/CheckOut";
import OrderSuccess from "../src/assets/pages/orderSuccess/OrderSuccess";
// import OrderSuccess from "./assets/pages/orderSuccess/OrderSuccess";
import Account from "../src/assets/pages/auth/account/Account";
import Login from "../src/assets/pages/auth/login/Login";
import Signup from "../src/assets/pages/auth/signup/Signup";
import CustomerDashboard from "./assets/pages/customer/CustomerDashboard";
import SellerDashboard from "./assets/pages/seller/SellerDashboard";
import Products from "./assets/pages/seller/Products";
import AddProduct from "./assets/pages/seller/AddProduct";
import ProductDetails from "./assets/pages/productDetails/ProductDetails";
import SellerOrders  from "./assets/pages/seller/SellerOrders";
import SearchResults from "../src/assets/pages/searchResults/SearchResults";
import ChatBot from "../src/assets/components/chatbot/ChatBot";




function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/newarrivals"
          element={<NewArrivals />}
        />
        <Route
        path="/contact"
        element={<Contact/>}
      />
      <Route path="/customerreview" element={<CustomerReview/>}/>
      {/* <Route path="/home" element={<Home/>}/> */}
      

<Route
    path="/cart" element={<Cart />}
/>
<Route path="/checkout" element={<CheckOut/>} />

<Route path="/order-success" element={<OrderSuccess/>}/>

<Route
    path="/account"
    element={<Account/>}
/>
    <Route path="/login" element={<Login />} />
<Route path="/signup" element={<Signup />} />
<Route path="/customer-dashboard" element={<CustomerDashboard />} />
<Route path="/seller-dashboard" element={<SellerDashboard />} />
<Route path="/seller/products" element={<Products />}/>
<Route path="/seller/add-product" element={<AddProduct />} />
<Route path="/product/:id" element={<ProductDetails />}/>
<Route
  path="/seller/orders"
  element={<SellerOrders />}
/>

<Route
    path="/seller/edit-product/:id"
    element={<EditProduct />}
/>
<Route
    path="/search"
    element={<SearchResults />}
/>

      </Routes>
      <ChatBot/>
    
    

    </BrowserRouter>
  );
}

export default App;