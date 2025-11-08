import { useState, useEffect, FormEvent, ChangeEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Header.css'

interface FormState {
  email: string
  password: string
  confirmPassword: string
}

type AuthMode = 'signup' | 'login'

type NetworkKey = 'bsc' | 'tron' | 'solana' | 'ton' | 'eth'

const initialFormState: FormState = {
  email: '',
  password: '',
  confirmPassword: ''
}

const hashPassword = async (password: string): Promise<string> => {
  return password
}

const NETWORKS: Record<NetworkKey, { label: string; address: string; description: string }> = {
  bsc: {
    label: 'BSC • BEP20',
    address: '0xBc92de905b59a3C87478BE0b2E7ff37c8a494d8a',
    description: 'Binance Smart Chain (BEP-20)'
  },
  tron: {
    label: 'TRON • TRC20',
    address: 'TQEVdQEawnvGHh4Kmp167USEn3PcCms7in',
    description: 'TRON Network (TRC-20)'
  },
  solana: {
    label: 'Solana',
    address: 'C5e4YhJEnt8aWZvcQ5fXuSdyzaPbsrpCcLst4EonkVDh',
    description: 'Solana Network'
  },
  ton: {
    label: 'TON',
    address: 'UQBQqLqL3pavNGl-Sijhm6EsC1ylN-_zxdx9QTdrSpSPlGvE',
    description: 'TON Blockchain'
  },
  eth: {
    label: 'Ethereum • ERC20',
    address: '0xf945D03eB72Fda50c2CD76b72746f3d2a983773D',
    description: 'Ethereum Network (ERC-20)'
  }
}

const Header = () => {
  const location = useLocation()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formState, setFormState] = useState<FormState>(initialFormState)
  const [errors, setErrors] = useState<string[]>([])
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('signup')
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false)
  const [selectedNetworkKey, setSelectedNetworkKey] = useState<NetworkKey>('bsc')
  const [copyStatus, setCopyStatus] = useState('')

  const STORAGE_KEY = 'spotlight_user'

  useEffect(() => {
    const shouldLock = isModalOpen || isTopUpModalOpen
    if (shouldLock) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isModalOpen, isTopUpModalOpen])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const storedUser = window.localStorage.getItem(STORAGE_KEY)
      if (storedUser) {
        const parsed = JSON.parse(storedUser)
        if (parsed?.email) {
          setCurrentUserEmail(parsed.email)
        }
      }
    } catch (storageError) {
      console.error('Failed to read stored user', storageError)
    }
  }, [])

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = (mode: AuthMode) => {
    const validationErrors: string[] = []
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!formState.email.trim()) {
      validationErrors.push('Введите адрес электронной почты.')
    } else if (!emailRegex.test(formState.email.trim())) {
      validationErrors.push('Введите корректный адрес электронной почты.')
    }

    const password = formState.password
    if (!password) {
      validationErrors.push('Введите пароль.')
    } else if (mode === 'signup') {
      if (password.length < 8) {
        validationErrors.push('Пароль должен содержать минимум 8 символов.')
      }
      if (!/[A-Z]/.test(password)) {
        validationErrors.push('Пароль должен содержать хотя бы одну заглавную букву.')
      }
      if (!/[a-z]/.test(password)) {
        validationErrors.push('Пароль должен содержать хотя бы одну строчную букву.')
      }
      if (!/\d/.test(password)) {
        validationErrors.push('Пароль должен содержать хотя бы одну цифру.')
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        validationErrors.push('Пароль должен содержать хотя бы один специальный символ.')
      }
    }

    if (mode === 'signup' && formState.confirmPassword !== password) {
      validationErrors.push('Пароли должны совпадать.')
    }

    return validationErrors
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationErrors = validateForm(authMode)

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setSuccessMessage('')
      return
    }

    setErrors([])
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      if (authMode === 'signup') {
        const email = formState.email.trim().toLowerCase()

        const { data: existingUsers, error: fetchError } = await supabase
          .from('spotlights_users')
          .select('email')
          .eq('email', email)

        if (fetchError) {
          setErrors([`Не удалось проверить пользователя: ${fetchError.message}`])
          return
        }

        if (existingUsers && existingUsers.length > 0) {
          setErrors(['Пользователь с таким email уже существует.'])
          return
        }

        let passwordHash = ''
        try {
          passwordHash = await hashPassword(formState.password)
        } catch (hashError: any) {
          setErrors(['Не удалось обработать пароль. Попробуйте снова.'])
          return
        }

        const { error: insertError } = await supabase.from('spotlights_users').insert({
          email,
          password: passwordHash
        })

        if (insertError) {
          setErrors([`Не удалось сохранить данные пользователя: ${insertError.message}`])
          return
        }

        const savedUser = { email }
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedUser))
        }
        setCurrentUserEmail(email)
        setSuccessMessage('Регистрация прошла успешно!')
        setFormState(initialFormState)
        setTimeout(() => {
          setIsModalOpen(false)
          setSuccessMessage('')
        }, 800)
      } else {
        const email = formState.email.trim().toLowerCase()
        let passwordHash = ''
        try {
          passwordHash = await hashPassword(formState.password)
        } catch (hashError: any) {
          setErrors(['Не удалось обработать пароль. Попробуйте снова.'])
          return
        }

        const { data: userRecord, error: userError } = await supabase
          .from('spotlights_users')
          .select('email, password')
          .eq('email', email)
          .maybeSingle()

        if (userError) {
          setErrors([`Не удалось получить данные пользователя: ${userError.message}`])
          return
        }

        if (!userRecord || userRecord.password !== passwordHash) {
          setErrors(['Неверный email или пароль.'])
          return
        }

        const savedUser = { email }
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedUser))
        }
        setCurrentUserEmail(email)
        setSuccessMessage('Вход выполнен успешно!')
        setFormState(initialFormState)
        setTimeout(() => {
          setIsModalOpen(false)
          setSuccessMessage('')
        }, 500)
      }
    } catch (error: any) {
      setErrors([error.message || 'Произошла непредвиденная ошибка. Попробуйте позже.'])
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setErrors([])
    setSuccessMessage('')
    setFormState(initialFormState)
    setIsSubmitting(false)
    setAuthMode('signup')
  }

  const handleTopUp = () => {
    setCopyStatus('')
    setSelectedNetworkKey('bsc')
    setIsTopUpModalOpen(true)
  }

  const handleTopUpClose = () => {
    setIsTopUpModalOpen(false)
    setCopyStatus('')
  }

  const handleCopyAddress = async () => {
    const address = NETWORKS[selectedNetworkKey].address
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(address)
        setCopyStatus('Адрес скопирован')
      } else {
        throw new Error('Clipboard API недоступен')
      }
    } catch (copyError) {
      setCopyStatus('Не удалось скопировать. Скопируйте вручную.')
    }
    setTimeout(() => setCopyStatus(''), 3000)
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (logoutError) {
      console.error('Ошибка выхода из Supabase', logoutError)
    }

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
    setCurrentUserEmail(null)
    setFormState(initialFormState)
    setErrors([])
    setSuccessMessage('')
    setAuthMode('signup')
  }

  return (
    <header className="main-header">
      <div className="header-brand">
        <Link to="/" className="brand-link">
          <span className="brand-icon">✨</span>
          <span className="brand-title">Spotlight</span>
        </Link>
      </div>

      <nav className="header-nav">
        <Link
          to="/"
          className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
        >
          Главная
        </Link>
      </nav>

      <div className="header-actions">
        {currentUserEmail && (
          <button className="topup-button" onClick={handleTopUp}>
            Поповнити
          </button>
        )}
        <button
          className="register-button"
          onClick={() => {
            if (currentUserEmail) {
              handleLogout()
            } else {
              setIsModalOpen(true)
            }
          }}
        >
          {currentUserEmail ? 'Выход' : 'Регистрация'}
        </button>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div className="auth-toggle">
                <button
                  type="button"
                  className={`toggle-button ${authMode === 'signup' ? 'active' : ''}`}
                  onClick={() => {
                    setAuthMode('signup')
                    setErrors([])
                    setSuccessMessage('')
                  }}
                  disabled={isSubmitting}
                >
                  Регистрация
                </button>
                <button
                  type="button"
                  className={`toggle-button ${authMode === 'login' ? 'active' : ''}`}
                  onClick={() => {
                    setAuthMode('login')
                    setErrors([])
                    setSuccessMessage('')
                    setFormState((prev) => ({ ...prev, confirmPassword: '' }))
                  }}
                  disabled={isSubmitting}
                >
                  Вход
                </button>
              </div>
              <button className="close-button" onClick={closeModal} aria-label="Закрыть форму">
                ×
              </button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit} noValidate>
              <div className="form-field">
                <label htmlFor="email">Электронная почта</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="example@mail.com"
                  value={formState.email}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-field">
                <label htmlFor="password">Пароль</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Пароль"
                  value={formState.password}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {authMode === 'signup' && (
                <>
                  <div className="form-field">
                    <label htmlFor="confirmPassword">Повторите пароль</label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Повторите пароль"
                      value={formState.confirmPassword}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <ul className="password-hints">
                    <li>Минимум 8 символов</li>
                    <li>Заглавные и строчные буквы</li>
                    <li>Хотя бы одна цифра</li>
                    <li>Хотя бы один специальный символ</li>
                  </ul>
                </>
              )}

              {errors.length > 0 && (
                <div className="form-errors">
                  {errors.map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              )}

              {successMessage && <div className="form-success">{successMessage}</div>}

              <button type="submit" className="submit-button" disabled={isSubmitting}>
                {isSubmitting
                  ? authMode === 'signup'
                    ? 'Создание...'
                    : 'Вход...'
                  : authMode === 'signup'
                    ? 'Создать аккаунт'
                    : 'Войти'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isTopUpModalOpen && (
        <div className="modal-overlay" onClick={handleTopUpClose}>
          <div className="modal topup-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Пополнение аккаунта</h2>
              <button className="close-button" onClick={handleTopUpClose} aria-label="Закрыть окно">
                ×
              </button>
            </div>
            <div className="topup-content">
              <div className="network-selector">
                {Object.entries(NETWORKS).map(([key, network]) => (
                  <button
                    key={key}
                    type="button"
                    className={`network-button ${selectedNetworkKey === key ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedNetworkKey(key as NetworkKey)
                      setCopyStatus('')
                    }}
                  >
                    <span className="network-title">{network.label}</span>
                    <span className="network-subtitle">{network.description}</span>
                  </button>
                ))}
              </div>

              <div className="address-section">
                <p className="address-label">Адрес для пополнения</p>
                <div className="address-box">
                  <span className="address-value">{NETWORKS[selectedNetworkKey].address}</span>
                  <div className="address-actions">
                    <button type="button" className="copy-button" onClick={handleCopyAddress}>
                      Скопировать
                    </button>
                  </div>
                </div>
                {copyStatus && <p className="copy-status">{copyStatus}</p>}
                <p className="address-hint">
                  Отправляйте только совместимые активы в выбранной сети. Пополнение в другой сети может привести к потере средств.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
