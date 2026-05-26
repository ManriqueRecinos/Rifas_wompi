import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import useIsMobile from './hooks/useIsMobile';
import Navbar           from './components/Navbar';
import Home             from './pages/Home';
import { Login, Register } from './pages/Auth';
import Dashboard        from './pages/Dashboard';
import CreateRaffle     from './pages/CreateRaffle';
import RaffleDetail     from './pages/RaffleDetail';
import PaymentResult    from './pages/PaymentResult';
import ValidateTicket   from './pages/ValidateTicket';
import ValidateWinner   from './pages/ValidateWinner';
import DrawRaffle       from './pages/DrawRaffle';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

function DesktopOnly({ children }) {
  const isMobile = useIsMobile();
  if (isMobile) return <Navigate to="/" replace />;
  return children;
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
          <Route path="/raffle/:id/draw" element={<Protected><DesktopOnly><DrawRaffle /></DesktopOnly></Protected>} />
          <Route path="/payment/result" element={<PaymentResult />} />
          <Route path="/validate/:code" element={<ValidateTicket />} />
          <Route path="/validar-ganador" element={<Protected><DesktopOnly><ValidateWinner /></DesktopOnly></Protected>} />
          <Route path="/dashboard"      element={<Protected><DesktopOnly><Dashboard /></DesktopOnly></Protected>} />
          <Route path="/create"         element={<Protected><CreateRaffle /></Protected>} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
