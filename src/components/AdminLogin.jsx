import { useState } from 'react'

function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD

    if (password === correctPassword) {
      sessionStorage.setItem('adminAuth', 'true')
      onLogin()
    } else {
      setError('Incorrect password')
    }
    setLoading(false)
  }

  return (
    <div className="scan-container">
      <div className="scan-card" style={{ maxWidth: '380px' }}>
        <h2 className="scan-title">🔒 Admin Access</h2>
        <p className="scan-subtitle">Enter admin password to continue</p>

        {error && (
          <div className="status-box taken-other mb-4">
            <div className="status-icon">⚠️</div>
            <div className="status-message text-danger">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              disabled={loading}
              autoFocus
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminLogin
