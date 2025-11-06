import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './SpotlightCenter.css'
import * as Icons from 'lucide-react'

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

function SpotlightCenter() {
  const [spotlights, setSpotlights] = useState<Spotlight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        <h2>✨ Spotlight Center</h2>
        <p className="subtitle">Manage your spotlights</p>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Spotlights List */}
      <div className="spotlights-list">
        {loading ? (
          <div className="loading">Loading spotlights...</div>
        ) : spotlights.length === 0 ? (
          <div className="empty-state">
            <p>No spotlights yet. Add your first one above!</p>
          </div>
        ) : (
          spotlights.map((spotlight) => {
            // Log each spotlight for debugging
            console.log('Rendering spotlight:', spotlight)
            
            return (
              <div key={spotlight.id} className="spotlight-card">
                <div className="spotlight-content">
                  {(spotlight.icon || spotlight.img) && (
                    <div className="spotlight-icon" style={{ marginBottom: '0.5em', display: 'flex', justifyContent: 'center' }}>
                      {spotlight.img ? (
                        <img src={spotlight.img} alt="Spotlight image" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                      ) : (
                        renderIcon(spotlight.icon)
                      )}
                    </div>
                  )}
                  <div className="spotlight-id">ID: {spotlight.id}</div>
                  <h3>
                    {spotlight.title || spotlight.name || 'Untitled'}
                    {spotlight.snug && ` (${spotlight.snug})`}
                  </h3>
                  {spotlight.description && (
                    <p className="spotlight-description">{spotlight.description}</p>
                  )}
                  {spotlight.created_at && (
                    <p className="spotlight-date">
                      {new Date(spotlight.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                  
                  {/* Display all other fields */}
                  <div className="spotlight-extra-data">
                    {Object.entries(spotlight).map(([key, value]) => {
                      // Skip already displayed fields
                      if (['id', 'title', 'name', 'description', 'created_at', 'icon', 'img', 'snug'].includes(key)) {
                        return null
                      }
                      return (
                        <div key={key} className="data-field">
                          <strong>{key}:</strong> {renderFieldValue(value)}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="spotlight-count">
        Total: {spotlights.length} spotlight{spotlights.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

export default SpotlightCenter

