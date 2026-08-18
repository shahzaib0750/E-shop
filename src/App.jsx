import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./cartContext/CartContext";
import ProtectedRoute from "./assets/components/ProtectedRoute";

import Home from "./assets/pages/Home/Home";
import NewArrivals from "./assets/pages/newArrivals/NewArrivals";
import Contact from "./assets/pages/Contact/Contact";
import CustomerReview from "./assets/pages/customerReview/CustomerReview";
import Cart from "./assets/pages/cart/Cart";
import EditProduct from "./assets/pages/seller/EditProduct";
import CheckOut from "./assets/pages/checkout/CheckOut";
import OrderSuccess from "./assets/pages/orderSuccess/OrderSuccess";
import Account from "./assets/pages/auth/account/Account";
import Login from "./assets/pages/auth/login/Login";
import Signup from "./assets/pages/auth/signup/Signup";
import CustomerDashboard from "./assets/pages/customer/CustomerDashboard";
import SellerDashboard from "./assets/pages/seller/SellerDashboard";
import Products from "./assets/pages/seller/Products";
import AddProduct from "./assets/pages/seller/AddProduct";
import ProductDetails from "./assets/pages/productDetails/ProductDetails";
import SellerOrders from "./assets/pages/seller/SellerOrders";
import SearchResults from "./assets/pages/searchResults/SearchResults";
import ChatBot from "./assets/components/chatbot/ChatBot";
import CategoryProducts from "./assets/pages/categoryProducts/CategoryProducts";
import OrderDetails from "./assets/pages/orderDetails/OrderDetails";
import Wishlist from "./assets/pages/customer/Wishlist";

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/newarrivals" element={<NewArrivals />} />

            <Route path="/contact" element={<Contact />} />

            <Route
              path="/customerreview"
              element={<CustomerReview />}
            />

            <Route
              path="/cart"
              element={
                <ProtectedRoute role="customer">
                  <Cart />
                </ProtectedRoute>
              }
            />

            <Route
              path="/checkout"
              element={
                <ProtectedRoute role="customer">
                  <CheckOut />
                </ProtectedRoute>
              }
            />

            <Route
              path="/order-success"
              element={
                <ProtectedRoute role="customer">
                  <OrderSuccess />
                </ProtectedRoute>
              }
            />

            <Route path="/account" element={<Account />} />

            <Route path="/login" element={<Login />} />

            <Route path="/signup" element={<Signup />} />

            <Route
              path="/customer-dashboard"
              element={
                <ProtectedRoute role="customer">
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/seller-dashboard"
              element={
                <ProtectedRoute role="seller">
                  <SellerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/seller/products"
              element={
                <ProtectedRoute role="seller">
                  <Products />
                </ProtectedRoute>
              }
            />

            <Route
              path="/seller/add-product"
              element={
                <ProtectedRoute role="seller">
                  <AddProduct />
                </ProtectedRoute>
              }
            />

            <Route
              path="/product/:id"
              element={<ProductDetails />}
            />

            <Route
              path="/seller/orders"
              element={
                <ProtectedRoute role="seller">
                  <SellerOrders />
                </ProtectedRoute>
              }
            />

            <Route
              path="/seller/edit-product/:id"
              element={
                <ProtectedRoute role="seller">
                  <EditProduct />
                </ProtectedRoute>
              }
            />

            <Route path="/search" element={<SearchResults />} />

            <Route
              path="/category/:id"
              element={<CategoryProducts />}
            />

            <Route
              path="/order/:id"
              element={
                <ProtectedRoute role="customer">
                  <OrderDetails />
                </ProtectedRoute>
              }
            />

            <Route
              path="/wishlist"
              element={
                <ProtectedRoute role="customer">
                  <Wishlist />
                </ProtectedRoute>
              }
            />
          </Routes>

          <ChatBot />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
