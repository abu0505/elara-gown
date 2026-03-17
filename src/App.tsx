import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";

// Lazy-loaded routes — only downloaded when visited
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const SizeGuide = lazy(() => import("./pages/SizeGuide"));
const Returns = lazy(() => import("./pages/Returns"));
const Shipping = lazy(() => import("./pages/Shipping"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const Support = lazy(() => import("./pages/Support"));
const OrderLookup = lazy(() => import("./pages/OrderLookup"));
const ReturnRequest = lazy(() => import("./pages/ReturnRequest"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin routes — completely separate chunk
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const RequireAdmin = lazy(() => import("./components/admin/RequireAdmin").then(m => ({ default: m.RequireAdmin })));
const RequireMainAdmin = lazy(() => import("./components/admin/RequireAdmin").then(m => ({ default: m.RequireMainAdmin })));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Orders = lazy(() => import("./pages/admin/Orders"));
const OrderDetail = lazy(() => import("./pages/admin/OrderDetail"));
const Inventory = lazy(() => import("./pages/admin/Inventory"));
const ProductForm = lazy(() => import("./pages/admin/ProductForm"));
const Coupons = lazy(() => import("./pages/admin/Coupons"));
const AdminReturns = lazy(() => import("./pages/admin/Returns"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminCategories = lazy(() => import("./pages/admin/Categories"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:productId" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/success" element={<OrderSuccess />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/size-guide" element={<SizeGuide />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/returns/request" element={<ReturnRequest />} />
              <Route path="/shipping" element={<Shipping />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/support" element={<Support />} />
              <Route path="/account/orders" element={<OrderLookup />} />
            </Route>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:orderId" element={<OrderDetail />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="inventory/new" element={<ProductForm />} />
              <Route path="inventory/:productId/edit" element={<ProductForm />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="coupons" element={<Coupons />} />
              <Route path="returns" element={<AdminReturns />} />
              <Route path="settings" element={<RequireMainAdmin><AdminSettings /></RequireMainAdmin>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
