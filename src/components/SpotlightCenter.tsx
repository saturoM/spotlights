import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './SpotlightCenter.css'
import * as Icons from 'lucide-react'
import { generateCoinSchedule } from '../lib/coinSchedule'

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

// Function to dynamically render icon from icon name or URL
const renderIcon = (iconValue: string) => {
  if (!iconValue) return null
  
  const strValue = String(iconValue).trim()
  
  // Check if it's a URL (image) - check for http/https or common image patterns
  if (strValue.startsWith('http://') || 
      strValue.startsWith('https://') || 
      strValue.includes('coinmarketcap.com') ||
      /\.(jpeg|jpg|gif|png|svg|webp|bmp|ico)/i.test(strValue)) {
    return <img src={strValue} alt="Icon" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
  }
  
  // Try to render as Lucide icon
  const iconKey = strValue.charAt(0).toUpperCase() + strValue.slice(1)
  const IconComponent = (Icons as any)[iconKey]
  
  if (IconComponent) {
    return <IconComponent size={48} />
  }
  
  // Fallback: display as emoji or text (for emojis like ✨)
  return <span style={{ fontSize: '48px' }}>{strValue}</span>
}

// Function to check if a string is an image URL
const isImageUrl = (str: string): boolean => {
  if (typeof str !== 'string') return false
  return str.match(/\.(jpeg|jpg|gif|png|svg|webp|bmp|ico)(\?.*)?$/i) !== null || 
         str.includes('coinmarketcap.com/static/img')
}

// Function to render field value (as image if it's an image URL)
const renderFieldValue = (value: any) => {
  const strValue = String(value)
  
  // If it's an image URL, render as image
  if (isImageUrl(strValue)) {
    return <img src={strValue} alt="Field image" style={{ width: '32px', height: '32px', objectFit: 'contain', verticalAlign: 'middle' }} />
  }
  
  // Otherwise render as text
  return strValue
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

function SpotlightCenter() {
  const navigate = useNavigate()
  const [spotlights, setSpotlights] = useState<Spotlight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const coinSchedule = useMemo(() => generateCoinSchedule({ eventCount: 20 }), [])
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
    []
  )

  const preparedSpotlights = useMemo(() => {
    const activeCoinsById = new Map<number, (typeof coinSchedule.initialState.active)[number]>()
    coinSchedule.initialState.active.forEach((coin) => {
      activeCoinsById.set(coin.id, coin)
    })

    return spotlights
      .map((spotlight) => {
        const positionRaw = spotlight.position ?? spotlight.positions ?? spotlight.order ?? spotlight.coin_id
        const position = typeof positionRaw === 'number' ? positionRaw : parseInt(String(positionRaw), 10)
        const activeCoin = Number.isFinite(position) ? activeCoinsById.get(Number(position)) : undefined
        const expiresTime = activeCoin ? new Date(activeCoin.expiresAt!).getTime() : Number.MAX_SAFE_INTEGER
        return { spotlight, position, activeCoin, expiresTime }
      })
      .sort((a, b) => a.expiresTime - b.expiresTime)
  }, [spotlights, coinSchedule])

  const formatRemaining = (iso?: string | null) => {
    if (!iso) return null
    const target = new Date(iso).getTime()
    const now = Date.now()
    const diffMs = target - now
    if (diffMs <= 0) return 'менее минуты'
    const totalMinutes = Math.floor(diffMs / (60 * 1000))
    const days = Math.floor(totalMinutes / (60 * 24))
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
    const minutes = totalMinutes % 60
    const parts = []
    if (days > 0) parts.push(`${days} д`)
    if (hours > 0) parts.push(`${hours} ч`)
    if (minutes > 0 && days === 0) parts.push(`${minutes} мин`)
    return parts.join(' ') || 'менее минуты'
  }

  // Fetch spotlights from Supabase
  const fetchSpotlights = async () => {
    try {
      setLoading(true)
      console.log('Fetching spotlights from Supabase...')
      
      const { data, error } = await supabase
        .from('spotlights')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Fetched spotlights:', data)
      console.log('Number of spotlights:', data?.length || 0)
      
      setSpotlights(data || [])
      setError(null)
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching spotlights:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSpotlights()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('spotlight_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spotlight' },
        (payload) => {
          console.log('Change received!', payload)
          fetchSpotlights()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="spotlight-center">
      <div className="spotlight-header">
        <div>
          <h2>✨ Центр Spotlight</h2>
          <p className="subtitle">Управление вашими проектами</p>
        </div>
        <button className="allocation-button" onClick={() => navigate('/allocation')}>
          Добавить аллокацию
        </button>
      </div>

      {error && (
        <div className="error-message">
          <strong>Ошибка:</strong> {error}
        </div>
      )}

      {/* Spotlights List */}
      <div className="spotlights-list">
        {loading ? (
          <div className="loading">Загрузка проектов...</div>
        ) : spotlights.length === 0 ? (
          <div className="empty-state">
            <p>Проекты пока отсутствуют</p>
          </div>
        ) : (
          preparedSpotlights.map(({ spotlight, position, activeCoin }) => (
            <div
              key={spotlight.id}
              className="spotlight-card"
              onClick={() => navigate(`/spotlight/${spotlight.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="spotlight-content">
                {(spotlight.icon || spotlight.img) && (
                  <div className="spotlight-icon" style={{ marginBottom: '0.5em', display: 'flex', justifyContent: 'center' }}>
                    {spotlight.img ? (
                      <img src={getImageUrl(spotlight.img)} alt="Spotlight image" style={{ width: '250px', height: '250px', objectFit: 'cover', display: 'block', borderRadius: '20%' }} />
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'center' }}>{renderIcon(spotlight.icon)}</div>
                    )}
                  </div>
                )}
                <h3>
                  {spotlight.title || spotlight.name || 'Untitled'}
                  {spotlight.snug && ` (${spotlight.snug})`}
                </h3>
                {spotlight.description && (
                  <p className="spotlight-description">{spotlight.description}</p>
                )}
                <div className="spotlight-extra-data">
                  {Object.entries(spotlight).map(([key, value]) => {
                    if (
                      [
                        'id',
                        'title',
                        'name',
                        'description',
                        'created_at',
                        'icon',
                        'img',
                        'snug',
                        'total_supply',
                        'market_cap',
                        'symbol',
                        'price',
                        'trading_volume',
                        'position',
                        'positions',
                        'order',
                        'coin_id'
                      ].includes(key)
                    ) {
                      return null
                    }
                    return (
                      <div key={key} className="data-field">
                        <strong>{key}:</strong> {renderFieldValue(value)}
                      </div>
                    )
                  })}
                </div>
                {Number.isFinite(position) && (
                  <div
                    className={`spotlight-coin-schedule ${
                      activeCoin ? 'spotlight-coin-schedule--active' : 'spotlight-coin-schedule--inactive'
                    }`}
                  >
                    <div className="spotlight-coin-schedule-header">
                      <span className="spotlight-coin-schedule-status">
                        {activeCoin ? 'Активна' : 'Неактивна'}
                      </span>
                    </div>
                    {activeCoin ? (
                      <div className="spotlight-coin-schedule-body">
                        <div>
                          <span className="spotlight-coin-label">Старт</span>
                          <span className="spotlight-coin-value">
                            {dateFormatter.format(new Date(activeCoin.activatedAt!))}
                          </span>
                        </div>
                        <div>
                          <span className="spotlight-coin-label">Завершение</span>
                          <span className="spotlight-coin-value">
                            {dateFormatter.format(new Date(activeCoin.expiresAt!))}
                          </span>
                        </div>
                        <div className="spotlight-coin-countdown">
                          Осталось: {formatRemaining(activeCoin.expiresAt)}
                        </div>
                      </div>
                    ) : (
                      <div className="spotlight-coin-schedule-body">
                        <div className="spotlight-coin-wait">Неактивна</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
 
    </div>
  )
}

export default SpotlightCenter

