import { useState, useEffect, FormEvent, ChangeEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Header.css'

interface FormState {
  email: string
  password: string
  confirmPassword: string
}

type AuthMode = 'signup' | 'login'

const initialFormState: FormState = {
  email: '',
  password: '',
  confirmPassword: ''
}

const hashPassword = async (password: string): Promise<string> => {
  return password
}

const Header = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formState, setFormState] = useState<FormState>(initialFormState)
  const [errors, setErrors] = useState<string[]>([])
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('signup')

  const STORAGE_KEY = 'spotlight_user'

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isModalOpen])

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
    setIsModalOpen(false)
    navigate('/topup')
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
            Пополнить
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
    </header>
  )
}

export default Header
