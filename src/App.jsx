import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import { TenderList, TenderDetail } from './pages/Tenders';
import CreateTender from './pages/CreateTender';
import AIAnalysis from './pages/AIAnalysis';
import { DepositCalculator, TrustRating } from './pages/DepositTrust';
import Profile from './pages/Profile';
import Marketplace from './pages/Marketplace';
import SupplierScorecard from './pages/SupplierScorecard';
import RFIModule from './pages/RFIModule';
import AIBots from './pages/AIBots';
import Onboarding from './pages/Onboarding';
import Legal from './pages/Legal';
import Support from './pages/Support';
import Roadmap from './pages/Roadmap';
import RelationshipManager from './pages/RelationshipManager';
import Analytics from './pages/Analytics';
import AccountVerification from './pages/AccountVerification';
import DocumentCenter from './pages/DocumentCenter';
import AccountSelect from './pages/AccountSelect';
import LegalAI from './pages/LegalAI';
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/ErrorBoundary';
import { AccountProvider, useAccountType } from './context/AccountContext';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// Все роуты кроме /account-select и /onboarding закрыты до выбора роли
function AuthGuard({ children }) {
  const { accountType } = useAccountType();
  const location = useLocation();
  if (!accountType) {
    return <Navigate to="/account-select" replace state={{ from: location }} />;
  }
  return children;
}

// Главный layout (сайдбар + контент) — только для авторизованных
function AppLayout() {
  return (
    <AuthGuard>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main className="app-main" style={{ marginLeft: 220, flex: 1, minHeight: '100vh', background: 'var(--navy)' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/tenders" element={<TenderList />} />
            <Route path="/tenders/:id" element={<TenderDetail />} />
            <Route path="/create" element={<CreateTender />} />
            <Route path="/ai-analysis" element={<AIAnalysis />} />
            <Route path="/deposit" element={<DepositCalculator />} />
            <Route path="/trust" element={<TrustRating />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/suppliers" element={<SupplierScorecard />} />
            <Route path="/rfi" element={<RFIModule />} />
            <Route path="/ai-bots" element={<AIBots />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/legal-ai" element={<LegalAI />} />
            <Route path="/support" element={<Support />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/manager" element={<RelationshipManager />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/accounts" element={<AccountVerification />} />
            <Route path="/documents" element={<DocumentCenter />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </AuthGuard>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
    <AccountProvider>
    <CartProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/account-select" element={<AccountSelect />} />
        <Route path="*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
    </CartProvider>
    </AccountProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}
