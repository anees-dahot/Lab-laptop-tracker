export function generateQRUrl(laptopId) {
  const baseUrl = window.location.origin
  return `${baseUrl}/?laptop=${laptopId}`
}

export function getQRCodeUrl(laptopId, size = 500) {
  const url = generateQRUrl(laptopId)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`
}
