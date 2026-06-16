import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh', background: 'var(--navy)' }}>
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
                <Route path="/support" element={<Support />} />
                <Route path="/roadmap" element={<Roadmap />} />
              </Routes>
            </main>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}
