import { useState, useEffect } from 'react'
import './App.css'
import { supabase } from './lib/supabase'
import SpotlightCenter from './components/SpotlightCenter'

function App() {
  const [count, setCount] = useState(0)
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null)
  const [showSpotlightCenter, setShowSpotlightCenter] = useState(false)

  useEffect(() => {
    // Test Supabase connection
    const testConnection = async () => {
      try {
        await supabase.from('_test').select('count').limit(1)
        // If we get here without error or with a "relation does not exist" error, connection works
        setSupabaseConnected(true)
      } catch (err) {
        setSupabaseConnected(false)
      }
    }
    
    testConnection()
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Welcome to Spotlight</h1>
        <p className="tagline">A modern React application built with Vite</p>
        {supabaseConnected !== null && (
          <div className="connection-status">
            {supabaseConnected ? (
              <span className="status-connected">✓ Supabase Connected</span>
            ) : (
              <span className="status-disconnected">✗ Supabase Connection Failed</span>
            )}
          </div>
        )}
        <button 
          className="spotlight-toggle"
          onClick={() => setShowSpotlightCenter(!showSpotlightCenter)}
        >
          {showSpotlightCenter ? '← Back to Home' : '✨ Open Spotlight Center'}
        </button>
      </header>
      
      <main className="app-main">
        {showSpotlightCenter ? (
          <SpotlightCenter />
        ) : (
          <>
        <div className="card">
          <button 
            className="counter-button"
            onClick={() => setCount((count) => count + 1)}
          >
            Count is {count}
          </button>
          <p className="hint">
            Edit <code>src/App.tsx</code> and save to test HMR
          </p>
        </div>

        <div className="features">
          <div className="feature">
            <h3>⚡️ Fast</h3>
            <p>Lightning-fast HMR with Vite</p>
          </div>
          <div className="feature">
            <h3>🎯 TypeScript</h3>
            <p>Type-safe development</p>
          </div>
          <div className="feature">
            <h3>⚛️ React 18</h3>
            <p>Latest React features</p>
          </div>
          <div className="feature">
            <h3>🗄️ Supabase</h3>
            <p>Backend as a service</p>
          </div>
        </div>
        </>
        )}
      </main>

      <footer className="app-footer">
        <p>Built with React + TypeScript + Vite</p>
      </footer>
    </div>
  )
}

export default App

