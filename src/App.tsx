
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./components/AuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Navigation from "./components/Navigation";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Video from "./pages/Video";
import Videos from "./pages/Videos";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import "./App.css";
import { useAuth } from "./components/AuthProvider";

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/" />;
  }
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (user) {
    return <Navigate to="/dashboard" />;
  }
  return <>{children}</>;
};

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Navigation />
          <Routes>
            <Route 
              path="/" 
              element={
                <AuthRoute>
                  <Index />
                </AuthRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/auth" 
              element={
                <AuthRoute>
                  <Auth />
                </AuthRoute>
              } 
            />
            <Route 
              path="/videos" 
              element={
                <PrivateRoute>
                  <Videos />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/videos/:id" 
              element={
                <PrivateRoute>
                  <Video />
                </PrivateRoute>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          <Sonner />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
