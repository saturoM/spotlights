import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './AdminAllocationsPage.css'

interface AllocationRecord {
  id: number
  amount: number
  percent: number | null
  status: string | null
  expired_at: string | null
  created_at: string | null
  user_email: string
  coin_symbol?: string | null
  coin_name?: string | null
}

const AdminAllocationsPage = () => {
  const navigate = useNavigate()
  const [allocations, setAllocations] = useState<AllocationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAllocations = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('spotlights_allocations')
        .select(
          `id, amount, percent, status, expired_at, created_at,
           user:spotlights_users(email),
           coin:spotlights(symbol, name)`
        )
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      const mapped = (data ?? []).map((item: any) => ({
        id: item.id,
        amount: Number(item.amount ?? 0),
        percent: item.percent !== null ? Number(item.percent) : null,
        status: item.status ?? null,
        expired_at: item.expired_at,
        created_at: item.created_at,
        user_email: item.user?.email ?? '—',
        coin_symbol: item.coin?.symbol ?? null,
        coin_name: item.coin?.name ?? null
      }))

      setAllocations(mapped)
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить аллокации.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllocations()
  }, [])

  const formatDate = (value?: string | null) => {
    if (!value) return '—'
    try {
      return new Date(value).toLocaleString('ru-RU')
    } catch (err) {
      return value
    }
  }

  const formatStatus = (status?: string | null) => {
    switch ((status ?? '').toLowerCase()) {
      case 'pending':
        return 'В обработке'
      case 'active':
        return 'Активна'
      case 'closed':
        return 'Завершена'
      case 'cancelled':
      case 'canceled':
        return 'Отменена'
      default:
        return '—'
    }
  }

  return (
    <div className="admin-allocations-page">
      <div className="admin-allocations-card">
        <div className="admin-allocations-header">
          <div>
            <h1>Аллокации пользователей</h1>
            <p>Список созданных аллокаций с суммами, процентами и временем экспирации монеты</p>
          </div>
          <div className="admin-allocations-actions">
            <button className="admin-allocations-refresh" onClick={fetchAllocations} disabled={loading}>
              {loading ? 'Обновление...' : 'Обновить'}
            </button>
            <button className="admin-allocations-back" onClick={() => navigate('/admin')}>
              ← К админ-панели
            </button>
          </div>
        </div>

        {error && <div className="admin-allocations-error">{error}</div>}

        <div className="admin-allocations-table-wrapper">
          <table className="admin-allocations-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Монета</th>
                <th>Сумма</th>
                <th>Процент</th>
                <th>Монета экспирирует</th>
                <th>Статус</th>
                <th>Создано</th>
              </tr>
            </thead>
            <tbody>
              {allocations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-allocations-empty">
                    Аллокации отсутствуют
                  </td>
                </tr>
              ) : (
                allocations.map((allocation) => (
                  <tr key={allocation.id}>
                    <td>{allocation.user_email}</td>
                    <td>{allocation.coin_symbol || allocation.coin_name || `Монета #${allocation.id}`}</td>
                    <td>{allocation.amount.toFixed(2)} USDT</td>
                    <td>{allocation.percent !== null ? `${allocation.percent.toFixed(2)}%` : '—'}</td>
                    <td>{formatDate(allocation.expired_at)}</td>
                    <td>
                      <span
                        className={`admin-allocation-status admin-allocation-status--${
                          (allocation.status ?? 'unknown').toLowerCase()
                        }`}
                      >
                        {formatStatus(allocation.status)}
                      </span>
                    </td>
                    <td>{formatDate(allocation.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminAllocationsPage
