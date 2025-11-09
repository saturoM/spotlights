import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import SpotlightCenter from './components/SpotlightCenter'
import SpotlightDetail from './components/SpotlightDetail'
import TopUpPage from './components/TopUpPage'
import AdminDashboard from './components/AdminDashboard'
import DepositsPage from './components/DepositsPage'
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
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/deposits" element={<DepositsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App

