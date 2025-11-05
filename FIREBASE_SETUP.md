# Firebase Setup Guide

This app uses Firestore for real-time updates and data storage. You have two options:

## Option 1: Use Firebase Emulator (Recommended for Development)

The Firebase Emulator allows you to run Firestore locally without needing a Firebase project.

### Setup Steps:

1. **Install Firebase CLI globally:**
```bash
npm install -g firebase-tools
```

2. **Login to Firebase:**
```bash
firebase login
```

3. **Initialize Firebase in your project:**
```bash
firebase init firestore
```
- Select "Create a new project" or use an existing one
- Choose Firestore location
- Set up Firestore rules (accept defaults)

4. **Create `.env.local` file:**
```env
VITE_USE_FIREBASE_EMULATOR=true
```

5. **Start the emulator:**
```bash
firebase emulators:start --only firestore
```

6. **In a separate terminal, start your app:**
```bash
npm run dev
```

## Option 2: Use Real Firebase Project (Production)

1. **Create a Firebase project:**
   - Go to https://console.firebase.google.com/
   - Click "Add project"
   - Follow the setup wizard

2. **Get your Firebase config:**
   - Go to Project Settings > General
   - Scroll to "Your apps" section
   - Click the web icon (</>) to add a web app
   - Copy the config object

3. **Create `.env.local` file:**
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

4. **Set up Firestore:**
   - Go to Firestore Database in Firebase Console
   - Click "Create database"
   - Start in test mode (for development) or production mode

5. **Start your app:**
```bash
npm run dev
```

## Firestore Security Rules

For development, you can use these rules (test mode):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

For production, implement proper security rules based on your authentication needs.

## Collections Structure

- `bookings` - All desk bookings
- `desks` - Desk layout information
- `pendingSelections` - Temporary desk selections (expire after 30 seconds)

