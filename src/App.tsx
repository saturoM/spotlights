import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import SpotlightCenter from './components/SpotlightCenter'
import SpotlightDetail from './components/SpotlightDetail'

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<SpotlightCenter />} />
          <Route path="/spotlight/:id" element={<SpotlightDetail />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

