# 🚀 Quick Start Guide

## Step 1: Create Firebase Project (5 minutes)

1. Go to https://console.firebase.google.com/
2. Click **Add Project**
3. Name: `lab-laptop-tracker`
4. Disable Google Analytics
5. Click **Create Project** → Wait → **Continue**

## Step 2: Create Firestore Database (2 minutes)

1. Click **Firestore Database** in left sidebar
2. Click **Create Database**
3. Select **Start in test mode**
4. Location: **asia-south1** (or closest to you)
5. Click **Enable**

## Step 3: Get Firebase Config (2 minutes)

1. Click **Project Settings** (⚙️ gear icon)
2. Scroll to **Your apps**
3. Click **Web** icon (</>)
4. App nickname: `Lab Tracker`
5. Click **Register app**
6. Copy the `const firebaseConfig = { ... }` values
7. You'll need these 6 values:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

## Step 4: Configure Project (3 minutes)

1. Open terminal in project folder:
   ```bash
   cd /Users/aneesdahot/Desktop/lab-laptop-tracker
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and paste your Firebase values:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy... (from step 3)
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

## Step 5: Deploy Security Rules (2 minutes)

1. Install Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase:
   ```bash
   firebase init firestore
   ```
   
   When prompted:
   - **Use existing project**: Select your project
   - **Firestore Rules**: Type `firestore.rules`
   - **Firestore Indexes**: Press Enter (default)
   - **Overwrite existing files**: No

4. Deploy rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Step 6: Seed Database (2 minutes)

Run the seed script to create 32 laptops:

```bash
node seed.js
```

You should see:
```
🌱 Seeding database...
✅ Database seeded successfully!
📦 Created 32 laptops
⚙️ Created settings with 3-hour overdue threshold
```

## Step 7: Test Locally (1 minute)

```bash
npm run dev
```

Open http://localhost:5173

You should see the admin dashboard (since no laptop param).

Click on any laptop card → See it's available.

## Step 8: Deploy to Vercel (5 minutes)

### Option A: Deploy via Vercel Dashboard (Easiest)

1. Go to https://vercel.com/
2. Sign in with GitHub
3. Click **Add New Project**
4. Import your GitHub repo (or drag & drop the project folder)
5. In **Environment Variables**, add all 6 from `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
6. Click **Deploy**
7. Wait 1-2 minutes → Your site is live!

### Option B: Deploy via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

Add environment variables in Vercel dashboard when prompted.

## Step 9: Print QR Codes (2 minutes)

1. Open your deployed site: `https://your-project.vercel.app/admin`
2. Click **🖨️ Print QR Sheet**
3. Print dialog opens
4. Save as PDF or print to sticker paper

## Step 10: Test End-to-End (3 minutes)

1. **Test Take:**
   - Open phone camera
   - Scan any QR code
   - Enter name + Student ID
   - Click **Take Laptop**
   - Check admin dashboard → Laptop shows as taken

2. **Test Return:**
   - Scan same QR code
   - Enter Student ID
   - Click **Return Laptop**
   - Check admin dashboard → Laptop shows as available

3. **Test Overdue:**
   - Take a laptop
   - Wait 3+ hours (or change threshold in settings)
   - Check dashboard → Shows in overdue section

## 🎉 Done!

Your laptop tracking system is ready to use!

---

## Common Issues

### "Firebase not initialized"
- Check `.env` file has correct values
- Restart dev server: `Ctrl+C` → `npm run dev`

### "Permission denied" in Firestore
- Make sure you deployed security rules: `firebase deploy --only firestore:rules`

### QR codes show error
- QR codes use your live URL
- Make sure app is deployed to Vercel first
- Test manually: `https://yourdomain.com/?laptop=laptop-01`

### Seed script fails
- Check Firebase config in `.env`
- Make sure Firestore is created
- Try manually via Firebase Console (see README)

---

## Next Steps

1. **Print QR stickers** - Local print shop, vinyl material
2. **Stick on laptops** - Bottom-right corner of lid
3. **Share admin link** - `https://yourdomain.com/admin`
4. **Train students** - Show them how to scan
5. **Monitor first day** - Watch dashboard for issues

---

**Total Setup Time: ~25 minutes** ⏱️
