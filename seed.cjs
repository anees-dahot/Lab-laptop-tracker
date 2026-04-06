const { initializeApp } = require('firebase/app')
const { getFirestore, collection, doc, setDoc, writeBatch } = require('firebase/firestore')
const { readFileSync } = require('fs')
const { join } = require('path')

// Read .env file manually
const envContent = readFileSync(join(__dirname, '.env'), 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY,
  authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function seedDatabase() {
  console.log('🌱 Seeding database...')

  const batch = writeBatch(db)

  // Seed 32 laptops
  for (let i = 1; i <= 32; i++) {
    const laptopRef = doc(collection(db, 'laptops'))
    batch.set(laptopRef, {
      name: `Laptop ${String(i).padStart(2, '0')}`,
      status: 'available',
      takenBy: null,
      takenAt: null,
      notes: null
    })
  }

  // Seed settings
  const settingsRef = doc(db, 'settings', 'config')
  batch.set(settingsRef, {
    overdueThresholdHours: 3,
    createdAt: new Date()
  })

  await batch.commit()
  console.log('✅ Database seeded successfully!')
  console.log('📦 Created 32 laptops')
  console.log('⚙️ Created settings with 3-hour overdue threshold')
}

seedDatabase().catch(console.error)
