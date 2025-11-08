import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import SpotlightCenter from './components/SpotlightCenter'
import SpotlightDetail from './components/SpotlightDetail'
import TopUpPage from './components/TopUpPage'
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
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App

