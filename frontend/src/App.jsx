import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Navbar           from './components/Navbar';
import Home             from './pages/Home';
import { Login, Register } from './pages/Auth';
import Dashboard        from './pages/Dashboard';
import CreateRaffle     from './pages/CreateRaffle';
import RaffleDetail     from './pages/RaffleDetail';
import PaymentResult    from './pages/PaymentResult';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/"               element={<Home />} />
          <Route path="/login"          element={<Login />} />
          <Route path="/register"       element={<Register />} />
          <Route path="/raffle/:id"     element={<RaffleDetail />} />
          <Route path="/payment/result" element={<PaymentResult />} />
          <Route path="/dashboard"      element={<Protected><Dashboard /></Protected>} />
          <Route path="/create"         element={<Protected><CreateRaffle /></Protected>} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
