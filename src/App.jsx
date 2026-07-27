import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./assets/pages/Home/Home";
import NewArrivals from "./assets/pages/newArrivals/NewArrivals";
import Contact from '././assets/pages/Contact/Contact';
import CustomerReview from "./assets/pages/customerReview/CustomerReview";
import Cart from './assets/pages/cart/Cart';
import CheckOut from "../src/assets/pages/checkout/CheckOut";
import OrderSuccess from "../src/assets/pages/orderSuccess/OrderSuccess";
// import OrderSuccess from "./assets/pages/orderSuccess/OrderSuccess";
import Account from "../src/assets/pages/auth/account/Account";
import Login from "../src/assets/pages/auth/login/Login";
import Signup from "../src/assets/pages/auth/signup/Signup";


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
      </Routes>
    
    

    </BrowserRouter>
  );
}

export default App;