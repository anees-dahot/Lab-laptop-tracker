# Lab Laptop Tracking System

A QR-based laptop tracking system for university computer labs. Students scan QR codes with their phones to take/return laptops, and admins get real-time visibility of all 32 laptops.

## Features

### For Students
- **Scan QR → Enter Details → Done** (no login required)
- Take laptop: Enter name + Student ID
- Return laptop: Enter Student ID (system verifies match)
- Works on any phone browser - no app install needed

### For Admins
- **Live Dashboard**: See all 32 laptops at a glance
- **Overdue Alerts**: Laptops past 3-hour limit (configurable) float to top
- **Force Return**: One-click return for any laptop
- **Activity Log**: Complete audit trail, exportable to CSV
- **Print QR Sheet**: One-click generates A4 sheet with all 32 QR codes

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Firebase Firestore (serverless database)
- **Hosting**: Vercel (free tier, no sleep mode)
- **QR Generation**: qrserver.com API (free)

## Setup Instructions

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project**
3. Enter project name (e.g., "lab-laptop-tracker")
4. Disable Google Analytics (not needed)
5. Click **Create Project**

### 2. Enable Firestore Database

1. In Firebase Console, click **Firestore Database** in left sidebar
2. Click **Create Database**
3. Choose **Start in Test Mode** (we'll add security rules next)
4. Select location: **asia-south1** (closest to Pakistan)
5. Click **Enable**

### 3. Deploy Security Rules

1. In Firestore, click **Rules** tab
2. Replace the default rules with contents from `firestore.rules` in this project
3. Click **Publish**

### 4. Get Firebase Config

1. Go to **Project Settings** (gear icon)
2. Scroll to **Your apps** section
3. Click **Web** (</> icon)
4. Register app with nickname "Lab Tracker"
5. Copy the `firebaseConfig` values
6. Create `.env` file in project root:

```bash
cp .env.example .env
```

7. Paste your config values into `.env`:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 5. Install Dependencies

```bash
npm install
```

### 6. Seed Database

First, make sure you have the Firebase CLI installed:

```bash
npm install -g firebase-tools
```

Login to Firebase:

```bash
firebase login
```

Initialize Firebase in your project:

```bash
firebase init firestore
```

When prompted:
- Use existing project: Select your project
- Firestore Rules: `firestore.rules` (already created)
- Don't overwrite existing files: No

Now seed the database with 32 laptops:

**Option A: Using Node script (recommended)**

```bash
# Make sure .env file has your Firebase config
node seed.js
```

**Option B: Manual setup via Firebase Console**

If the script doesn't work, manually create documents in Firestore:

1. Go to **Firestore Database** in Firebase Console
2. Click **Start collection**
3. Collection ID: `laptops`
4. Add 32 documents with this structure:

```js
{
  name: "Laptop 01",
  status: "available",
  takenBy: null,
  takenAt: null,
  notes: null
}
```

5. Create another collection: `settings`
6. Add document ID: `config`
7. Add field: `overdueThresholdHours: 3`

### 7. Run Development Server

```bash
npm run dev
```

Open http://localhost:5173 to test.

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/lab-laptop-tracker.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [Vercel](https://vercel.com/)
2. Click **Add New Project**
3. Import your GitHub repository
4. In **Environment Variables**, add all from `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
5. Click **Deploy**

### 3. Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings → Domains**
2. Add your domain (e.g., `labtrack.youruni.edu.pk`)
3. Follow DNS configuration instructions

## QR Code Generation & Printing

### Generate QR Codes

1. Deploy the app first (QR codes use live URL)
2. Open admin dashboard: `https://yourdomain.com/admin`
3. Click **Print QR Sheet** button
4. Browser print dialog opens
5. Save as PDF or print directly

### Print Specifications

- **Paper Size**: A4
- **Grid**: 4 columns × 8 rows (32 QR codes)
- **QR Size**: 45mm × 45mm each
- **Material**: Vinyl stickers (waterproof, durable)
- **Placement**: Bottom-right corner of laptop lid

### Where to Print

In Pakistan:
- **Local print shops**: Rs. 50-100 per A4 vinyl sheet
- **Online**: Daraz.pk search "vinyl sticker printing"
- **Recommended**: 32 laptops fit on one A4 sheet

Total cost: ~Rs. 2,000-3,000 for 32 vinyl stickers

## Usage Guide

### Student Flow

1. **Scan QR** with phone camera
2. **Enter details**:
   - Taking: Name + Student ID
   - Returning: Student ID only
3. **Confirm** - done!

### Admin Dashboard

**Stats Bar** (Top)
- Available: Laptops ready to take
- Taken: Currently in use
- Overdue: Past 3-hour limit
- Scans Today: Total activity

**Overdue Settings**
- Change threshold (default: 3 hours)
- Click **Update** to save

**Overdue Alerts** (if any)
- Red box at top
- Shows student name, ID, hours overdue
- **Force Return** button for each

**Taken Laptops**
- Grid of all taken laptops
- Shows who has it, since when
- **Force Return** button

**Available Laptops**
- Green cards
- Click **Open QR Link** to test

**Activity Log** (Bottom)
- Last 50 scans
- Export to CSV button

## Database Structure

```
/laptops/{laptopId}
  - name: "Laptop 01"
  - status: "available" | "taken" | "maintenance"
  - takenBy: { name, studentId } | null
  - takenAt: timestamp | null
  - notes: string | null

/logs/{logId}
  - laptopId: string
  - laptopName: string
  - studentName: string
  - studentId: string
  - action: "taken" | "return" | "force_return"
  - timestamp: timestamp

/settings/config
  - overdueThresholdHours: 3
  - createdAt: timestamp
```

## Troubleshooting

### "Firebase not initialized" error
- Check `.env` file exists with correct values
- Restart dev server after adding `.env`
- In production, check Vercel environment variables

### QR codes not working
- Make sure app is deployed (QR uses live URL)
- Test QR link manually: `https://yourdomain.com/?laptop=laptop-01`

### Database empty after deploy
- Run `node seed.js` after Firebase setup
- Or manually add laptops via Firebase Console

### Force return not working
- Check Firestore security rules are deployed
- Check browser console for errors

## Cost Breakdown

| Item | Cost |
|------|------|
| Firebase | Free (forever tier) |
| Vercel | Free (forever tier) |
| QR API | Free |
| Stickers | Rs. 2,000-3,000 one-time |
| **Total Monthly** | **Rs. 0** |

## Free Tier Limits

| Service | Limit | Your Usage |
|---------|-------|------------|
| Firestore Reads | 50K/day | ~2K/day |
| Firestore Writes | 20K/day | ~400/day |
| Vercel Bandwidth | 100GB/month | ~2GB/month |

**You're at ~5% of limits. No upgrade needed unless you scale to 1000+ students.**

## License

MIT License - Feel free to use for your lab!

## Support

For issues or questions, contact the developer.

---

**Built with ❤️ for University Computer Labs**
