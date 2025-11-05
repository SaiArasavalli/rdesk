# Quick Setup Guide

## 🚀 Quick Start (5 minutes)

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd rdesk
npm install
```

### 2. Set Up Firebase Emulator (Easiest)

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firestore
firebase init firestore
# - Select "Create a new project" or use existing
# - Choose Firestore location
# - Accept default rules and indexes

# Create .env.local file
echo "VITE_USE_FIREBASE_EMULATOR=true" > .env.local

# Start emulator (in a separate terminal)
firebase emulators:start --only firestore
```

### 3. Run the App

```bash
# In the main terminal
npm run dev
```

### 4. Open Browser
Go to `http://localhost:3000`

### 5. Login
- Email: `john@example.com` / Password: `password123`
- Email: `jane@example.com` / Password: `password123`

## ✅ Done!

You're all set! The app should be running with real-time updates.

## Need Help?

See [README.md](./README.md) for detailed instructions and troubleshooting.

