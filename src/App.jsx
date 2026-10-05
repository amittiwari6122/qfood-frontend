import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Spinner } from './components/ui';
import AppLayout from './components/AppLayout';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import DonateFood from './pages/DonateFood';
import { MyDonations, Available, Requests, Matches } from './pages/Lists';
import QuantumEngine from './pages/QuantumEngine';
import { Deliveries, Track } from './pages/Deliveries';
import Chat from './pages/Chat';
import { Notifications, Feedback, Market, Profile } from './pages/Misc';
import { Admin, Analytics } from './pages/Admin';
import Waste from './pages/Waste';

function Guard({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner className="h-8 w-8" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={user ? <Navigate to="/app" replace /> : <Auth />} />
      <Route path="/app" element={<Guard><AppLayout /></Guard>}>
        <Route index element={<Dashboard />} />
        <Route path="donate" element={<Guard roles={['DONOR']}><DonateFood /></Guard>} />
        <Route path="donations" element={<Guard roles={['DONOR']}><MyDonations /></Guard>} />
        <Route path="available" element={<Guard roles={['NGO', 'BENEFICIARY', 'ADMIN']}><Available /></Guard>} />
        <Route path="requests" element={<Guard roles={['NGO', 'BENEFICIARY']}><Requests /></Guard>} />
        <Route path="matches" element={<Guard roles={['NGO', 'BENEFICIARY']}><Matches /></Guard>} />
        <Route path="quantum" element={<Guard roles={['ADMIN', 'NGO', 'DONOR']}><QuantumEngine /></Guard>} />
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="track/:id" element={<Track />} />
        <Route path="chat" element={<Chat />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="waste" element={<Guard roles={['DONOR', 'WASTE_PARTNER', 'ADMIN']}><Waste /></Guard>} />
        <Route path="market" element={<Guard roles={['NGO', 'BENEFICIARY']}><Market /></Guard>} />
        <Route path="profile" element={<Profile />} />
        <Route path="admin" element={<Guard roles={['ADMIN']}><Admin /></Guard>} />
        <Route path="analytics" element={<Guard roles={['ADMIN']}><Analytics /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
