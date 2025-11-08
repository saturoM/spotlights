import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NETWORKS, NetworkKey } from '../constants/topupNetworks'
import './TopUpPage.css'

const STORAGE_KEY = 'spotlight_user'

const TopUpPage = () => {
  const navigate = useNavigate()
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey>('bsc')
  const [copyStatus, setCopyStatus] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const storedUser = window.localStorage.getItem(STORAGE_KEY)
      if (storedUser) {
        const parsed = JSON.parse(storedUser)
        if (parsed?.email) {
          setUserEmail(parsed.email)
          return
        }
      }
    } catch (error) {
      console.error('Не удалось прочитать данные пользователя', error)
    }

    navigate('/', { replace: true })
  }, [navigate])

  const handleCopyAddress = async () => {
    const address = NETWORKS[selectedNetwork].address
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(address)
        setCopyStatus('Адрес скопирован')
      } else {
        throw new Error('Clipboard API недоступен')
      }
    } catch (error) {
      setCopyStatus('Не удалось скопировать. Скопируйте вручную.')
    }

    setTimeout(() => setCopyStatus(''), 3000)
  }

  return (
    <div className="topup-page">
      <div className="topup-card">
        <div className="topup-header">
          <div className="topup-titles">
            <h1>Пополнение аккаунта</h1>
            <p>Выберите сеть и переведите средства на указанный адрес</p>
            {userEmail && <span className="topup-user">Ваш аккаунт: {userEmail}</span>}
          </div>
          <button className="back-button" onClick={() => navigate('/')}>← Назад</button>
        </div>

        <div className="topup-body">
          <div className="topup-networks">
            <h2>Доступные сети</h2>
            <div className="topup-network-grid">
              {Object.entries(NETWORKS).map(([key, network]) => (
                <button
                  key={key}
                  type="button"
                  className={`topup-network ${selectedNetwork === key ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedNetwork(key as NetworkKey)
                    setCopyStatus('')
                  }}
                >
                  <span className="network-label">{network.label}</span>
                  <span className="network-description">{network.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="topup-address-block">
            <h2>Адрес для перевода</h2>
            <div className="topup-address-box">
              <span className="topup-address">{NETWORKS[selectedNetwork].address}</span>
              <button className="copy-address-button" type="button" onClick={handleCopyAddress}>
                Скопировать
              </button>
            </div>
            {copyStatus && <p className="topup-status">{copyStatus}</p>}
            <p className="topup-warning">
              Отправляйте только совместимые активы в выбранной сети. Пополнение в другой сети может привести к потере средств.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TopUpPage
