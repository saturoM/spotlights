import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './SpotlightDetail.css'

interface Spotlight {
  id: number
  created_at?: string
  name?: string
  symbol?: string
  total_supply?: number
  market_cap?: number
  price?: number
  trading_volume?: number
  img?: string
  description?: string
  [key: string]: any
}

// Function to convert image reference to proper URL
const getImageUrl = (img: string): string => {
  if (!img) return ''
  
  // If it's already a full URL (http/https), return as is
  if (img.startsWith('http://') || img.startsWith('https://')) {
    // Check if it's a Google Drive URL
    const driveMatch = img.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (driveMatch && driveMatch[1]) {
      const fileId = driveMatch[1]
      return `https://drive.google.com/uc?export=view&id=${fileId}`
    }
    return img
  }
  
  // If it's a local image reference (like "image1", "image2"), add path and extension
  if (img.match(/^image\d+$/)) {
    return `/${img}.jpeg`
  }
  
  // If it already has extension, just add leading slash
  if (img.includes('.')) {
    return img.startsWith('/') ? img : `/${img}`
  }
  
  // Default: assume it's in public folder
  return `/${img}`
}

function SpotlightDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSpotlight = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('spotlights')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error

        setSpotlight(data)
        setError(null)
      } catch (err: any) {
        setError(err.message)
        console.error('Error fetching spotlight:', err)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchSpotlight()
    }
  }, [id])

  if (loading) {
    return (
      <div className="spotlight-detail">
        <div className="loading">Загрузка...</div>
      </div>
    )
  }

  if (error || !spotlight) {
    return (
      <div className="spotlight-detail">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Назад
        </button>
        <div className="error-message">
          <strong>Ошибка:</strong> {error || 'Проект не найден'}
        </div>
      </div>
    )
  }

  return (
    <div className="spotlight-detail">
      <button className="back-button" onClick={() => navigate('/')}>
        ← Назад к списку
      </button>

      <div className="detail-container">
        <div className="detail-header">
          {spotlight.img && (
            <div className="detail-image-container">
              <img 
                src={getImageUrl(spotlight.img)} 
                alt={spotlight.name || 'Spotlight'} 
                className="detail-image"
              />
            </div>
          )}
          
          <div className="detail-title-section">
            <h1 className="detail-title">{spotlight.name || 'Untitled'}</h1>
            {spotlight.symbol && (
              <span className="detail-symbol">({spotlight.symbol})</span>
            )}
          </div>
        </div>

        {spotlight.description && (
          <div className="detail-section">
            <h2>Описание</h2>
            <p className="detail-description">{spotlight.description}</p>
          </div>
        )}

        {(spotlight.price || spotlight.total_supply || spotlight.market_cap || spotlight.trading_volume) && (
          <div className="detail-section">
            <h2>Финансовые показатели</h2>
            <div className="detail-stats">
              {spotlight.price !== undefined && (
                <div className="stat-card">
                  <div className="stat-label">Цена</div>
                  <div className="stat-value">${spotlight.price}</div>
                </div>
              )}
              {spotlight.market_cap !== undefined && (
                <div className="stat-card">
                  <div className="stat-label">Рыночная капитализация</div>
                  <div className="stat-value">${spotlight.market_cap.toLocaleString()}</div>
                </div>
              )}
              {spotlight.total_supply !== undefined && (
                <div className="stat-card">
                  <div className="stat-label">Общее предложение</div>
                  <div className="stat-value">{spotlight.total_supply.toLocaleString()}</div>
                </div>
              )}
              {spotlight.trading_volume !== undefined && (
                <div className="stat-card">
                  <div className="stat-label">Объем торгов</div>
                  <div className="stat-value">${spotlight.trading_volume.toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Removed auxiliary metadata block per request */}
      </div>
    </div>
  )
}

export default SpotlightDetail

