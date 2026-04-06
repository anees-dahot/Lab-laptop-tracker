export function exportToCSV(logs) {
  const headers = ['Laptop Name', 'Student Name', 'Student ID', 'Action', 'Date', 'Time']
  
  const rows = logs.map(log => {
    const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp)
    return [
      log.laptopName,
      log.studentName,
      log.studentId,
      log.action,
      date.toLocaleDateString('en-PK', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })
    ]
  })

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `laptop-logs-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}
