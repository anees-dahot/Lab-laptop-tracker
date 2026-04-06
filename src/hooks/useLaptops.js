import { useState, useEffect } from 'react'
import { collection, doc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useLaptops() {
  const [laptops, setLaptops] = useState([])
  const [logs, setLogs] = useState([])
  const [settings, setSettings] = useState({ overdueThresholdHours: 3 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let laptopsReceived = 0
    let logsReceived = 0
    let settingsReceived = 0

    const checkLoaded = () => {
      if (laptopsReceived > 0 && logsReceived > 0 && settingsReceived > 0) {
        setLoading(false)
      }
    }

    // Subscribe to laptops
    const laptopsQuery = query(collection(db, 'laptops'))
    const unsubscribeLaptops = onSnapshot(laptopsQuery, (snapshot) => {
      const laptopsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setLaptops([...laptopsData])
      laptopsReceived++
      checkLoaded()
    }, (error) => {
      console.error('Laptops subscription error:', error)
      laptopsReceived++
      checkLoaded()
    })

    // Subscribe to logs
    const logsQuery = query(
      collection(db, 'logs'),
      orderBy('timestamp', 'desc')
    )
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setLogs([...logsData])
      logsReceived++
      checkLoaded()
    }, (error) => {
      console.error('Logs subscription error:', error)
      logsReceived++
      checkLoaded()
    })

    // Subscribe to settings (single document)
    const settingsRef = doc(db, 'settings', 'config')
    const unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setSettings({ id: snapshot.id, ...snapshot.data() })
      }
      settingsReceived++
      checkLoaded()
    }, (error) => {
      console.error('Settings subscription error:', error)
      settingsReceived++
      checkLoaded()
    })

    // Fallback: stop loading after 3 seconds even if something failed
    const timer = setTimeout(() => setLoading(false), 3000)

    return () => {
      unsubscribeLaptops()
      unsubscribeLogs()
      unsubscribeSettings()
      clearTimeout(timer)
    }
  }, [])

  return { laptops, logs, settings, loading }
}
