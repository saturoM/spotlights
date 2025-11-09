import { useEffect, useMemo, useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generateCoinSchedule } from '../lib/coinSchedule'
import './AdminDashboard.css'

const STORAGE_KEY = 'spotlight_user'

type TabKey = 'users' | 'deposits'

interface StoredUser {
  email: string
  type?: string
}

interface SpotlightUserRecord {
  email: string
  type?: string | null
  balance?: number | string | null
  created_at?: string
}

interface SpotlightDepositRecord {
  email: string
  amount: string | null
  created_at?: string
}

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('users')
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null)
  const [users, setUsers] = useState<SpotlightUserRecord[]>([])
  const [deposits, setDeposits] = useState<SpotlightDepositRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [depositSearch, setDepositSearch] = useState('')
  const [balanceModalOpen, setBalanceModalOpen] = useState(false)
  const [balanceEmail, setBalanceEmail] = useState<string | null>(null)
  const [balanceInput, setBalanceInput] = useState('')
  const [balanceError, setBalanceError] = useState('')
  const [balanceStatus, setBalanceStatus] = useState('')
  const [balanceLoading, setBalanceLoading] = useState(false)
  const coinSchedule = useMemo(() => generateCoinSchedule({ eventCount: 30 }), [])

  const parseBalanceValue = (value: unknown): number | null => {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(',', '.'))
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
        return parsed
      }
    }
    return null
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: StoredUser | null = JSON.parse(stored)
        if (parsed?.type === 'admin') {
          setCurrentUser(parsed)
          return
        }
      }
    } catch (parseError) {
      console.error('Не удалось прочитать данные пользователя', parseError)
    }

    navigate('/', { replace: true })
  }, [navigate])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('spotlights_users')
        .select('email, type, balance, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      const normalizedUsers =
        data?.map((item) => ({
          ...item,
          balance: parseBalanceValue(item.balance)
        })) ?? []
      setUsers(normalizedUsers)
    } catch (err: any) {
      console.error('Ошибка загрузки пользователей', err)
      setError(err.message || 'Не удалось загрузить пользователей.')
    } finally {
      setLoading(false)
    }
  }

  const fetchDeposits = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('spotlights_deposits')
        .select('email, amount, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDeposits(data ?? [])
    } catch (err: any) {
      console.error('Ошибка загрузки депозитов', err)
      setError(err.message || 'Не удалось загрузить депозиты.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!currentUser) return

    if (activeTab === 'users') {
      fetchUsers()
    } else {
      fetchDeposits()
    }
  }, [activeTab, currentUser])

  const filteredDeposits = useMemo(() => {
    const value = depositSearch.trim().toLowerCase()
    if (!value) return deposits
    return deposits.filter((item) => item.email.toLowerCase().includes(value))
  }, [deposits, depositSearch])

  const openBalanceModal = async (email: string) => {
    setBalanceEmail(email)
    setBalanceError('')
    setBalanceStatus('')
    setBalanceInput('')
    setBalanceLoading(true)
    setBalanceModalOpen(true)
    try {
      const { data, error } = await supabase
        .from('spotlights_users')
        .select('balance')
        .eq('email', email)
        .maybeSingle()

      if (error) throw error
      const balanceValue = parseBalanceValue(data?.balance)
      setBalanceInput(balanceValue !== null ? balanceValue.toString() : '0')
    } catch (err: any) {
      console.error('Не удалось получить баланс пользователя', err)
      setBalanceError(err.message || 'Не удалось получить текущий баланс.')
    } finally {
      setBalanceLoading(false)
    }
  }

  const closeBalanceModal = () => {
    setBalanceModalOpen(false)
    setBalanceEmail(null)
    setBalanceError('')
    setBalanceStatus('')
    setBalanceInput('')
    setBalanceLoading(false)
  }

  const handleBalanceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!balanceEmail) return

    const normalized = balanceInput.replace(',', '.').trim()
    if (!normalized) {
      setBalanceError('Введите значение баланса.')
      return
    }

    const numeric = parseFloat(normalized)
    if (Number.isNaN(numeric)) {
      setBalanceError('Введите корректное числовое значение баланса.')
      return
    }

    setBalanceError('')
    setBalanceStatus('')
    setBalanceLoading(true)
    try {
      const { error } = await supabase
        .from('spotlights_users')
        .update({ balance: numeric })
        .eq('email', balanceEmail)

      if (error) throw error

      setBalanceStatus('Баланс успешно обновлён.')
      setBalanceLoading(false)
      fetchDeposits()

      if (typeof window !== 'undefined') {
        const storedRaw = window.localStorage.getItem(STORAGE_KEY)
        if (storedRaw) {
          try {
            const parsed: StoredUser & { balance?: number | string | null } = JSON.parse(storedRaw)
            if (parsed?.email === balanceEmail) {
              const updated = { ...parsed, balance: numeric }
              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
            }
          } catch (storageError) {
            console.error('Не удалось обновить локальные данные пользователя', storageError)
          }
        }
      }

      setTimeout(() => {
        closeBalanceModal()
      }, 1200)
    } catch (err: any) {
      console.error('Ошибка обновления баланса', err)
      setBalanceError(err.message || 'Не удалось обновить баланс.')
      setBalanceLoading(false)
    }
  }

  const formatDate = (value?: string | null) => {
    if (!value) return '—'
    try {
      return new Date(value).toLocaleString('ru-RU')
    } catch (err) {
      return value
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-header">
          <div>
            <h1>Админ панель</h1>
            <p>Управление пользователями и заявками на пополнение и вывод</p>
          </div>
          <div className="admin-header-controls">
            <button className="admin-back-button" onClick={() => navigate('/')}>← На главную</button>
            <div className="admin-shortcuts">
              <button className="admin-subtle-button" type="button" onClick={() => navigate('/deposits')}>
                Заявки на пополнение
              </button>
              <button className="admin-primary-button" type="button" onClick={() => navigate('/withdrawals')}>
                Заявки на вывод
              </button>
            </div>
          </div>
        </div>

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
            type="button"
          >
            Пользователи
          </button>
          <button
            className={`admin-tab ${activeTab === 'deposits' ? 'active' : ''}`}
            onClick={() => setActiveTab('deposits')}
            type="button"
          >
            Депозиты
          </button>
        </div>

        {error && <div className="admin-error">{error}</div>}

        <div className="admin-content">
          {loading ? (
            <div className="admin-loading">Загрузка...</div>
          ) : activeTab === 'users' ? (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Роль</th>
                    <th>Баланс</th>
                    <th>Создан</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty-cell">Пользователи не найдены</td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const normalizedBalance = parseBalanceValue(user.balance)
                      return (
                        <tr key={`${user.email}-${user.created_at}`}>
                          <td>{user.email}</td>
                          <td>{user.type ?? 'user'}</td>
                          <td>{normalizedBalance !== null ? `${normalizedBalance.toFixed(2)} USDT` : '—'}</td>
                          <td>{formatDate(user.created_at)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-deposits-panel">
              <div className="admin-deposits-actions">
                <input
                  className="admin-search"
                  type="search"
                  placeholder="Поиск по email"
                  value={depositSearch}
                  onChange={(event) => setDepositSearch(event.target.value)}
                />
                <div className="admin-deposits-buttons">
                  <button className="admin-subtle-button" onClick={fetchDeposits} disabled={loading}>
                    Обновить
                  </button>
                  <button className="admin-primary-button" onClick={() => navigate('/topup')}>
                    Пополнить
                  </button>
                </div>
              </div>

              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Сумма</th>
                      <th>Создан</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeposits.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="empty-cell">Заявки на пополнение отсутствуют</td>
                      </tr>
                    ) : (
                      filteredDeposits.map((deposit, index) => (
                        <tr key={`${deposit.email}-${deposit.created_at ?? index}`}>
                          <td>{deposit.email}</td>
                          <td>{deposit.amount ?? '—'} USDT</td>
                          <td>{formatDate(deposit.created_at)}</td>
                          <td>
                            <button
                              className="admin-action-button"
                              type="button"
                              onClick={() => openBalanceModal(deposit.email)}
                            >
                              Изменить баланс
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {balanceModalOpen && (
        <div className="balance-modal-overlay" onClick={closeBalanceModal}>
          <div className="balance-modal" onClick={(event) => event.stopPropagation()}>
            <div className="balance-modal-header">
              <h2>Изменить баланс</h2>
              <button className="balance-close" type="button" onClick={closeBalanceModal}>
                ×
              </button>
            </div>
            <p className="balance-email">{balanceEmail}</p>
            <form className="balance-form" onSubmit={handleBalanceSubmit}>
              <label htmlFor="adminBalanceInput">Баланс (USDT)</label>
              <input
                id="adminBalanceInput"
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="Введите баланс"
                value={balanceInput}
                onChange={(event) => setBalanceInput(event.target.value)}
                disabled={balanceLoading}
              />
              {balanceError && <p className="balance-error">{balanceError}</p>}
              {balanceStatus && <p className="balance-success">{balanceStatus}</p>}
              <button type="submit" className="balance-submit" disabled={balanceLoading}>
                {balanceLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </form>
          </div>
        </div>
      )}
      <section className="admin-positions">
        <div className="admin-positions-header">
          <div>
            <h2>Розклад монет</h2>
            <p>
              Оновлено: {new Date(coinSchedule.metadata.generatedAt).toLocaleString('ru-RU')} · Активних:{' '}
              {coinSchedule.metadata.activeCoins} із {coinSchedule.metadata.totalCoins} · Ротація кожні{' '}
              {coinSchedule.metadata.stepHours.toFixed(2)} год.
            </p>
          </div>
        </div>

        <div className="admin-positions-grid">
          {coinSchedule.initialState.active.map((coin) => (
            <div key={coin.id} className="admin-coin-card admin-coin-card--active">
              <div className="admin-coin-card-header">
                <span className="admin-coin-id">Монета #{coin.id.toString().padStart(2, '0')}</span>
                <span className="admin-coin-status is-active">Активна</span>
              </div>
              <div className="admin-coin-card-body">
                <div>
                  <span className="admin-coin-label">Старт</span>
                  <span className="admin-coin-value">
                    {coin.activatedAt ? new Date(coin.activatedAt).toLocaleString('ru-RU') : '—'}
                  </span>
                </div>
                <div>
                  <span className="admin-coin-label">Завершення</span>
                  <span className="admin-coin-value">
                    {coin.expiresAt ? new Date(coin.expiresAt).toLocaleString('ru-RU') : '—'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="admin-positions-grid admin-positions-grid--inactive">
          {coinSchedule.initialState.inactive.map((coin) => (
            <div key={coin.id} className="admin-coin-card admin-coin-card--inactive">
              <div className="admin-coin-card-header">
                <span className="admin-coin-id">Монета #{coin.id.toString().padStart(2, '0')}</span>
                <span className="admin-coin-status is-inactive">Неактивна</span>
              </div>
              <div className="admin-coin-card-body">
                <span className="admin-coin-wait">Очікує черги на активацію</span>
              </div>
            </div>
          ))}
        </div>

        <div className="admin-positions-events">
          <h3>Найближчі ротації</h3>
          <div className="admin-positions-event-list">
            {coinSchedule.events.map((event) => (
              <div key={event.index} className="admin-positions-event">
                <div className="admin-positions-event-date">
                  #{event.index.toString().padStart(2, '0')} ·{' '}
                  {new Date(event.timestamp).toLocaleString('ru-RU')}
                </div>
                <div className="admin-positions-event-details">
                  <span className="expire">
                    Завершує: #{event.expiringCoin.toString().padStart(2, '0')}
                  </span>
                  <span className="activate">
                    Активується: #{event.activatingCoin.toString().padStart(2, '0')}
                  </span>
                  <span className="expire-at">
                    До: {new Date(event.activationEndsAt).toLocaleString('ru-RU')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
