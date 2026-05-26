import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Navbar           from './components/Navbar';
import Home             from './pages/Home';
import { Login, Register } from './pages/Auth';
import Dashboard        from './pages/Dashboard';
import CreateRaffle     from './pages/CreateRaffle';
import RaffleDetail     from './pages/RaffleDetail';
import PaymentResult    from './pages/PaymentResult';
import ValidateTicket   from './pages/ValidateTicket';
import DrawRaffle       from './pages/DrawRaffle';

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
          <Route path="/raffle/:id/draw" element={<Protected><DrawRaffle /></Protected>} />
          <Route path="/payment/result" element={<PaymentResult />} />
          <Route path="/validate/:code" element={<ValidateTicket />} />
          <Route path="/dashboard"      element={<Protected><Dashboard /></Protected>} />
          <Route path="/create"         element={<Protected><CreateRaffle /></Protected>} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
