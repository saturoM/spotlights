import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import SpotlightCenter from './components/SpotlightCenter'
import SpotlightDetail from './components/SpotlightDetail'
import TopUpPage from './components/TopUpPage'
import WithdrawPage from './components/WithdrawPage'
import AdminDashboard from './components/AdminDashboard'
import DepositsPage from './components/DepositsPage'
import WithdrawalsPage from './components/WithdrawalsPage'
import AllocationPage from './components/AllocationPage'
import AdminAllocationsPage from './components/AdminAllocationsPage'
import Header from './components/Header'

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<SpotlightCenter />} />
            <Route path="/spotlight/:id" element={<SpotlightDetail />} />
            <Route path="/topup" element={<TopUpPage />} />
            <Route path="/withdraw" element={<WithdrawPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/deposits" element={<DepositsPage />} />
            <Route path="/withdrawals" element={<WithdrawalsPage />} />
            <Route path="/allocation" element={<AllocationPage />} />
            <Route path="/admin/allocations" element={<AdminAllocationsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App

