import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminRoute } from "@/components/AdminRoute";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import VendorSetup from "./pages/VendorSetup.tsx";
import VendorPublic from "./pages/VendorPublic.tsx";
import BookingForm from "./pages/BookingForm.tsx";
import VendorDashboard from "./pages/VendorDashboard.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminLayout from "./layouts/AdminLayout.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AdminVendors from "./pages/AdminVendors.tsx";
import AdminOrders from "./pages/AdminOrders.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/vendor/setup" element={<VendorSetup />} />
            <Route path="/vendor/dashboard" element={<VendorDashboard />} />
            <Route path="/v/:slug" element={<VendorPublic />} />
            <Route path="/v/:slug/book" element={<BookingForm />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="vendors" element={<AdminVendors />} />
              <Route path="orders" element={<AdminOrders />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
