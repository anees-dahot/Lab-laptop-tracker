import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { collection, doc, addDoc, updateDoc, query, where, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config'

function ScanPage() {
  const [searchParams] = useSearchParams()
  const laptopId = searchParams.get('laptop')

  const [laptop, setLaptop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Form states
  const [name, setName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [returnStudentId, setReturnStudentId] = useState('')

  // Track who just took this laptop (for direct return without ID)
  const [justTook, setJustTook] = useState(false)

  useEffect(() => {
    if (!laptopId) {
      window.location.href = '/admin'
      return
    }
    fetchLaptop()
  }, [laptopId])

  async function fetchLaptop() {
    try {
      const q = query(collection(db, 'laptops'), where('name', '==', `Laptop ${laptopId.replace('laptop-', '')}`))
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        setMessage({ type: 'error', text: 'Laptop not found' })
        return
      }

      const laptopData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }
      setLaptop(laptopData)
      setJustTook(false)
    } catch (err) {
      console.error('Error fetching laptop:', err)
      setMessage({ type: 'error', text: 'Failed to load laptop data' })
    } finally {
      setLoading(false)
    }
  }

  async function handleTake(e) {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedId = studentId.trim()

    if (!trimmedName || !trimmedId) {
      setMessage({ type: 'error', text: 'Please enter your name and CNIC number' })
      return
    }

    // CNIC format validation: XXXXX-XXXXXXX-X
    const cnicRegex = /^\d{5}-\d{7}-\d$/
    if (!cnicRegex.test(trimmedId)) {
      setMessage({ type: 'error', text: 'Invalid CNIC format. Use: XXXXX-XXXXXXX-X (e.g., 42101-1234567-1)' })
      return
    }

    setProcessing(true)
    setMessage({ type: '', text: '' })

    try {
      const laptopRef = doc(db, 'laptops', laptop.id)
      const batch = writeBatch(db)

      batch.update(laptopRef, {
        status: 'taken',
        takenBy: { name: trimmedName, studentId: trimmedId },
        takenAt: serverTimestamp()
      })

      const logRef = doc(collection(db, 'logs'))
      batch.set(logRef, {
        laptopId: laptop.id,
        laptopName: laptop.name,
        studentName: trimmedName,
        studentId: trimmedId,
        action: 'taken',
        timestamp: serverTimestamp()
      })

      await batch.commit()

      setLaptop({
        ...laptop,
        status: 'taken',
        takenBy: { name: trimmedName, studentId: trimmedId },
        takenAt: { seconds: Date.now() / 1000 }
      })
      setJustTook(true)
      setMessage({ type: 'success', text: `${laptop.name} taken successfully!` })
    } catch (err) {
      console.error('Error taking laptop:', err)
      setMessage({ type: 'error', text: 'Failed to record. Please try again.' })
    } finally {
      setProcessing(false)
    }
  }

  async function handleReturn(e) {
    e.preventDefault()
    const enteredId = returnStudentId.trim()

    if (!enteredId) {
      setMessage({ type: 'error', text: 'Please enter your CNIC number' })
      return
    }

    const cnicRegex = /^\d{5}-\d{7}-\d$/
    if (!cnicRegex.test(enteredId)) {
      setMessage({ type: 'error', text: 'Invalid CNIC format. Use: XXXXX-XXXXXXX-X' })
      return
    }

    if (enteredId !== laptop.takenBy?.studentId) {
      setMessage({ type: 'error', text: 'This laptop was taken with a different CNIC. Please contact admin.' })
      return
    }

    setProcessing(true)
    setMessage({ type: '', text: '' })

    try {
      const laptopRef = doc(db, 'laptops', laptop.id)
      const batch = writeBatch(db)

      batch.update(laptopRef, {
        status: 'available',
        takenBy: null,
        takenAt: null
      })

      const logRef = doc(collection(db, 'logs'))
      batch.set(logRef, {
        laptopId: laptop.id,
        laptopName: laptop.name,
        studentName: laptop.takenBy.name,
        studentId: enteredId,
        action: 'return',
        timestamp: serverTimestamp()
      })

      await batch.commit()

      setLaptop({
        ...laptop,
        status: 'available',
        takenBy: null,
        takenAt: null
      })
      setJustTook(false)
      setReturnStudentId('')
      setMessage({ type: 'success', text: `${laptop.name} returned successfully!` })
    } catch (err) {
      console.error('Error returning laptop:', err)
      setMessage({ type: 'error', text: 'Failed to record. Please try again.' })
    } finally {
      setProcessing(false)
    }
  }

  // Direct return (no ID needed - just took it)
  async function handleDirectReturn() {
    setProcessing(true)
    setMessage({ type: '', text: '' })

    try {
      const laptopRef = doc(db, 'laptops', laptop.id)
      const batch = writeBatch(db)

      batch.update(laptopRef, {
        status: 'available',
        takenBy: null,
        takenAt: null
      })

      const logRef = doc(collection(db, 'logs'))
      batch.set(logRef, {
        laptopId: laptop.id,
        laptopName: laptop.name,
        studentName: laptop.takenBy.name,
        studentId: laptop.takenBy.studentId,
        action: 'return',
        timestamp: serverTimestamp()
      })

      await batch.commit()

      setLaptop({
        ...laptop,
        status: 'available',
        takenBy: null,
        takenAt: null
      })
      setJustTook(false)
      setName('')
      setStudentId('')
      setMessage({ type: 'success', text: `${laptop.name} returned successfully!` })
    } catch (err) {
      console.error('Error returning laptop:', err)
      setMessage({ type: 'error', text: 'Failed to record. Please try again.' })
    } finally {
      setProcessing(false)
    }
  }

  function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  if (loading) {
    return (
      <div className="scan-container">
        <div className="scan-card">
          <div className="loading">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!laptop) {
    return (
      <div className="scan-container">
        <div className="scan-card">
          <h2 className="scan-title">Laptop Not Found</h2>
          <p className="scan-subtitle">This QR code is not recognized.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="scan-container">
      <div className="scan-card">
        <h2 className="scan-title">{laptop.name}</h2>
        <p className="scan-subtitle">Udaar Academy — Hala Campus</p>

        {/* Message Display */}
        {message.text && (
          <div className={`status-box mb-4 ${message.type === 'error' ? 'taken-other' : message.type === 'success' ? 'taken-self' : 'available'}`}>
            <div className="status-icon">{message.type === 'error' ? '⚠️' : '✅'}</div>
            <div className={`status-message ${message.type === 'error' ? 'text-danger' : 'text-success'}`}>{message.text}</div>
            {message.type === 'error' && (
              <button
                className="btn btn-secondary btn-sm mt-4"
                onClick={() => setMessage({ type: '', text: '' })}
              >
                ← Go Back
              </button>
            )}
          </div>
        )}

        {/* State 1: Available - Take Form */}
        {laptop.status === 'available' && !message.text && (
          <>
            <div className="status-box available">
              <div className="status-icon">✅</div>
              <div className="status-message text-success">Available for Take</div>
              <div className="status-detail">Enter your details below</div>
            </div>

            <form onSubmit={handleTake}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Ali Hassan"
                  disabled={processing}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">CNIC Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={studentId}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9]/g, '')
                    if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5)
                    if (val.length > 13) val = val.slice(0, 13) + '-' + val.slice(13)
                    if (val.length > 15) val = val.slice(0, 15)
                    setStudentId(val)
                  }}
                  placeholder="42101-1234567-1"
                  disabled={processing}
                  maxLength={15}
                />
              </div>

              <button type="submit" className="btn btn-success btn-block" disabled={processing}>
                {processing ? 'Processing...' : 'Take Laptop'}
              </button>
            </form>
          </>
        )}

        {/* State 2: Just took it - Direct return option */}
        {justTook && laptop.status === 'taken' && !message.text && (
          <>
            <div className="status-box taken-self">
              <div className="status-icon">✅</div>
              <div className="status-message text-success">You have this laptop</div>
              <div className="status-detail">
                <strong>{laptop.takenBy?.name}</strong> ({laptop.takenBy?.studentId})<br />
                {laptop.takenAt && `Taken ${formatDuration(Date.now() - (laptop.takenAt.seconds * 1000))} ago`}
              </div>
            </div>

            <button className="btn btn-primary btn-block" onClick={handleDirectReturn} disabled={processing}>
              {processing ? 'Processing...' : 'Return Now'}
            </button>

            <p className="text-center text-muted mt-4" style={{ fontSize: '13px' }}>
              Or close this page. Scan again when ready to return.
            </p>
          </>
        )}

        {/* State 3: Taken by someone else - ID verification return */}
        {laptop.status === 'taken' && !justTook && !message.text && (
          <>
            <div className="status-box taken-other">
              <div className="status-icon">🔒</div>
              <div className="status-message text-danger">Already Taken</div>
              <div className="status-detail">
                Taken by <strong>{laptop.takenBy?.name}</strong><br />
                {laptop.takenAt && `Taken ${formatDuration(Date.now() - (laptop.takenAt.seconds * 1000))} ago`}
              </div>
            </div>

            <form onSubmit={handleReturn}>
              <div className="form-group">
                <label className="form-label">Enter Your CNIC to Return</label>
                <input
                  type="text"
                  className="form-input"
                  value={returnStudentId}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9]/g, '')
                    if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5)
                    if (val.length > 13) val = val.slice(0, 13) + '-' + val.slice(13)
                    if (val.length > 15) val = val.slice(0, 15)
                    setReturnStudentId(val)
                  }}
                  placeholder="42101-1234567-1"
                  disabled={processing}
                  maxLength={15}
                  autoFocus
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={processing}>
                {processing ? 'Processing...' : 'Return Laptop'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default ScanPage
