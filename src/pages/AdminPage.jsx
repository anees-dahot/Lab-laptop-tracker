/* global XLSX */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { doc, updateDoc, addDoc, collection, serverTimestamp, deleteDoc, query, orderBy, limit, getDocs, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useLaptops } from '../hooks/useLaptops'
import { getQRCodeUrl } from '../utils/qrGenerator'
import AdminLogin from '../components/AdminLogin'

function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { laptops, logs, settings, loading } = useLaptops()
  const [showQR, setShowQR] = useState(false)
  const [updatingThreshold, setUpdatingThreshold] = useState(false)
  const [newThreshold, setNewThreshold] = useState(settings.overdueThresholdHours || 3)
  const [filterAction, setFilterAction] = useState('all')
  const [filterSearch, setFilterSearch] = useState('')
  const [filterDate, setFilterDate] = useState('')

  // Check auth on mount
  useEffect(() => {
    if (sessionStorage.getItem('adminAuth') === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  function handleLogin() {
    setIsAuthenticated(true)
  }

  function handleLogout() {
    sessionStorage.removeItem('adminAuth')
    setIsAuthenticated(false)
  }

  // Sort laptops by number (Laptop 01, 02, 03...)
  const sortedLaptops = [...laptops].sort((a, b) => {
    const numA = parseInt(a.name.replace('Laptop ', ''))
    const numB = parseInt(b.name.replace('Laptop ', ''))
    return numA - numB
  })

  // Format time duration (seconds, minutes, hours)
  function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  // Calculate stats
  const available = sortedLaptops.filter(l => l.status === 'available').length
  const taken = sortedLaptops.filter(l => l.status === 'taken').length
  const maintenance = sortedLaptops.filter(l => l.status === 'maintenance').length

  // Calculate overdue
  const now = Date.now()
  const thresholdMs = (settings.overdueThresholdHours || 3) * 60 * 60 * 1000
  const overdueLaptops = sortedLaptops.filter(l => {
    if (l.status !== 'taken' || !l.takenAt) return false
    const takenTime = l.takenAt.seconds ? l.takenAt.seconds * 1000 : new Date(l.takenAt).getTime()
    return (now - takenTime) > thresholdMs
  })

  // Today's scans
  const today = new Date().toDateString()
  const todayScans = logs.filter(log => {
    const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp)
    return logDate.toDateString() === today
  }).length

  async function handleForceReturn(laptop) {
    if (!confirm(`Force return ${laptop.name}?`)) return

    try {
      const laptopRef = doc(db, 'laptops', laptop.id)
      
      await updateDoc(laptopRef, {
        status: 'available',
        takenBy: null,
        takenAt: null
      })

      await addDoc(collection(db, 'logs'), {
        laptopId: laptop.id,
        laptopName: laptop.name,
        studentName: laptop.takenBy?.name || 'Unknown',
        studentId: laptop.takenBy?.studentId || 'Unknown',
        action: 'force_return',
        timestamp: serverTimestamp(),
        note: 'Returned by admin'
      })
    } catch (err) {
      console.error('Error force returning:', err)
      alert('Failed to force return. Please try again.')
    }
  }

  async function handleUpdateThreshold() {
    if (newThreshold < 1 || newThreshold > 24) {
      alert('Threshold must be between 1 and 24 hours')
      return
    }

    setUpdatingThreshold(true)
    try {
      const settingsRef = doc(db, 'settings', 'config')
      await updateDoc(settingsRef, {
        overdueThresholdHours: parseInt(newThreshold)
      })
      alert('Threshold updated successfully')
    } catch (err) {
      console.error('Error updating threshold:', err)
      alert('Failed to update threshold')
    } finally {
      setUpdatingThreshold(false)
    }
  }

  function handlePrintQR() {
    setShowQR(true)
    setTimeout(() => {
      window.print()
      setShowQR(false)
    }, 500)
  }

  async function handleDeleteLog(logId) {
    if (!confirm('Delete this log entry?')) return
    try {
      await deleteDoc(doc(db, 'logs', logId))
    } catch (err) {
      console.error('Error deleting log:', err)
      alert('Failed to delete log')
    }
  }

  async function handleClearAllLogs() {
    if (!confirm('Delete ALL activity logs? This cannot be undone.')) return
    if (!confirm('Are you sure? This will permanently delete all logs.')) return
    
    try {
      const q = query(collection(db, 'logs'))
      const snapshot = await getDocs(q)
      const batch = writeBatch(db)
      snapshot.docs.forEach(doc => batch.delete(doc.ref))
      await batch.commit()
      alert('All logs deleted')
    } catch (err) {
      console.error('Error clearing logs:', err)
      alert('Failed to clear logs')
    }
  }

  function handleExportXLSX() {
    const data = filteredLogs.map(log => {
      const logTime = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp)
      return {
        'Laptop Name': log.laptopName,
        'Student Name': log.studentName,
        'Student ID': log.studentId,
        'Action': log.action === 'taken' ? 'Taken' : log.action === 'force_return' ? 'Force Return' : 'Returned',
        'Date': logTime.toLocaleDateString('en-PK', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        'Time': logTime.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })
      }
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Activity Logs')
    
    ws['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 18 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
    ]

    XLSX.writeFile(wb, `laptop-logs-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  function getFilteredLogs() {
    return logs.filter(log => {
      if (filterAction !== 'all' && log.action !== filterAction) return false
      if (filterSearch) {
        const search = filterSearch.toLowerCase()
        const matchName = log.studentName?.toLowerCase().includes(search)
        const matchId = log.studentId?.toLowerCase().includes(search)
        const matchLaptop = log.laptopName?.toLowerCase().includes(search)
        if (!matchName && !matchId && !matchLaptop) return false
      }
      if (filterDate) {
        const logTime = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp)
        const logDate = logTime.toISOString().split('T')[0]
        if (logDate !== filterDate) return false
      }
      return true
    })
  }

  const filteredLogs = getFilteredLogs()
  const displayedLogs = filteredLogs.slice(0, 100)

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '40px 16px' }}>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <header className="header no-print">
        <div className="container header-content">
          <div className="logo">
            🖥️ Lab Laptop Tracker
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span className="admin-badge">Admin</span>
            <button className="btn btn-secondary btn-sm" onClick={handlePrintQR}>
              🖨️ Print QR Sheet
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleLogout}>
              🔓 Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '24px 16px 40px' }}>
        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-value text-success">{available}</div>
            <div className="stat-label">Available</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-danger">{taken}</div>
            <div className="stat-label">Taken</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--danger)' }}>{overdueLaptops.length}</div>
            <div className="stat-label">Overdue ⚠️</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--primary)' }}>{todayScans}</div>
            <div className="stat-label">Scans Today</div>
          </div>
        </div>

        {/* Overdue Settings */}
        <div className="card mb-4 no-print">
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>⏱️ Overdue Settings</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Mark laptops overdue after:
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={newThreshold}
              onChange={(e) => setNewThreshold(e.target.value)}
              className="form-input"
              style={{ width: '80px', padding: '8px 12px' }}
              disabled={updatingThreshold}
            />
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>hours</span>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleUpdateThreshold}
              disabled={updatingThreshold}
            >
              {updatingThreshold ? 'Updating...' : 'Update'}
            </button>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              Current: {settings.overdueThresholdHours || 3} hours
            </span>
          </div>
        </div>

        {/* Overdue Alerts */}
        {overdueLaptops.length > 0 && (
          <div className="overdue-alert">
            <div className="overdue-header">
              ⚠️ Overdue Laptops ({overdueLaptops.length})
            </div>
            {overdueLaptops.map(laptop => {
              const takenTime = laptop.takenAt.seconds ? laptop.takenAt.seconds * 1000 : new Date(laptop.takenAt).getTime()
              const duration = formatDuration(now - takenTime)
              return (
                <div key={laptop.id} className="overdue-item">
                  <div className="overdue-info">
                    <div className="overdue-name">{laptop.name} - {laptop.takenBy?.name} ({laptop.takenBy?.studentId})</div>
                    <div className="overdue-time">⏱️ {duration} (Overdue)</div>
                  </div>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleForceReturn(laptop)}
                  >
                    Force Return
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Taken Laptops */}
        {taken > 0 && (
          <section className="mb-4">
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>
              💻 Taken Laptops ({taken})
            </h2>
            <div className="laptop-grid">
              {sortedLaptops.filter(l => l.status === 'taken').map(laptop => {
                const takenTime = laptop.takenAt?.seconds ? laptop.takenAt.seconds * 1000 : new Date(laptop.takenAt).getTime()
                const duration = formatDuration(now - takenTime)
                const isOverdue = (now - takenTime) > thresholdMs

                return (
                  <div key={laptop.id} className={`laptop-card taken`} style={{ borderColor: isOverdue ? 'var(--danger)' : '' }}>
                    <div className="laptop-name">{laptop.name}</div>
                    <div className="laptop-student">
                      <strong>{laptop.takenBy?.name}</strong><br />
                      {laptop.takenBy?.studentId}<br />
                      <span className="text-muted" style={{ fontSize: '12px' }}>
                        {isOverdue ? (
                          <span className="text-danger">⏱️ {duration} (Overdue)</span>
                        ) : (
                          `⏱️ ${duration} ago`
                        )}
                      </span>
                    </div>
                    <button 
                      className="btn btn-danger btn-sm btn-block mt-4 no-print"
                      onClick={() => handleForceReturn(laptop)}
                    >
                      Force Return
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Available Laptops */}
        <section className="mb-4">
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>
            ✅ Available Laptops ({available})
          </h2>
          <div className="laptop-grid">
            {sortedLaptops.filter(l => l.status === 'available').map(laptop => (
              <div key={laptop.id} className="laptop-card available">
                <div className="laptop-name">{laptop.name}</div>
                <div className="laptop-status text-success">Available</div>
                <a 
                  href={`/?laptop=${laptop.name.replace('Laptop ', 'laptop-')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm btn-block mt-4 no-print"
                  style={{ fontSize: '12px' }}
                >
                  🔗 Open QR Link
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Activity Log */}
        <section className="activity-log">
          <div className="log-header">
            <h2 className="log-title">📋 Activity Log</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleExportXLSX}>
                📥 Export XLSX
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleClearAllLogs}>
                🗑️ Clear All
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="no-print" style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Search name, ID, laptop..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              style={{ flex: 1, minWidth: '200px', padding: '8px 12px', fontSize: '14px' }}
            />
            <select
              className="form-input"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              style={{ width: '150px', padding: '8px 12px', fontSize: '14px' }}
            >
              <option value="all">All Actions</option>
              <option value="taken">Taken</option>
              <option value="return">Returned</option>
              <option value="force_return">Force Return</option>
            </select>
            <input
              type="date"
              className="form-input"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{ width: '160px', padding: '8px 12px', fontSize: '14px' }}
            />
            {(filterSearch || filterAction !== 'all' || filterDate) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setFilterSearch('')
                  setFilterAction('all')
                  setFilterDate('')
                }}
              >
                ✕ Clear
              </button>
            )}
          </div>

          {filteredLogs.length === 0 ? (
            <p className="text-muted text-center" style={{ padding: '40px 0' }}>
              {logs.length === 0 ? 'No activity yet' : 'No logs match your filters'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="log-table">
                <thead>
                  <tr>
                    <th>Laptop</th>
                    <th>Student</th>
                    <th>ID</th>
                    <th>Action</th>
                    <th>Time</th>
                    <th className="no-print"></th>
                  </tr>
                </thead>
                <tbody>
                  {displayedLogs.map(log => {
                    const logTime = log.timestamp?.toDate
                      ? log.timestamp.toDate()
                      : new Date(log.timestamp)
                    const timeStr = logTime.toLocaleTimeString('en-PK', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })
                    const dateStr = logTime.toLocaleDateString('en-PK', {
                      month: 'short',
                      day: 'numeric'
                    })

                    return (
                      <tr key={log.id}>
                        <td>{log.laptopName}</td>
                        <td>{log.studentName}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{log.studentId}</td>
                        <td>
                          <span className={`action-badge ${log.action}`}>
                            {log.action === 'taken' ? '📥 Taken' :
                             log.action === 'force_return' ? '⚠️ Force Return' : '📤 Returned'}
                          </span>
                        </td>
                        <td className="text-muted">{dateStr} {timeStr}</td>
                        <td className="no-print">
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => handleDeleteLog(log.id)}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredLogs.length > 100 && (
                <p className="text-muted text-center mt-4" style={{ fontSize: '13px' }}>
                  Showing first 100 of {filteredLogs.length} logs
                </p>
              )}
            </div>
          )}
        </section>
      </main>

      {/* QR Print Sheet */}
      {showQR && (
        <div className="print-sheet">
          <h2 style={{ textAlign: 'center', marginBottom: '20mm', fontSize: '18pt' }}>
            LAB LAPTOP TRACKING - QR CODES
          </h2>
          <div className="qr-grid">
            {sortedLaptops.map(laptop => {
              const laptopNum = laptop.name.replace('Laptop ', '')
              return (
                <div key={laptop.id} className="qr-item">
                  <img 
                    src={getQRCodeUrl(`laptop-${laptopNum}`, 500)}
                    alt={`QR ${laptop.name}`}
                  />
                  <span>{laptop.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPage
