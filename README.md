# rDesk - Hot Desk Booking System

A modern, real-time hot desk booking system built with React, Firestore, and Tailwind CSS. Features an interactive desk map with zoom, pan, and drag functionality, real-time booking updates, and a beautiful, polished UI.

## Features

- 🎯 **Interactive Desk Map** - Zoom, pan, and drag to navigate the desk layout
- ⚡ **Real-time Updates** - See booking changes instantly using Firestore
- 📅 **Time-based Bookings** - Book desks for specific date and time ranges
- 🔒 **Race Condition Prevention** - Prevents double-booking with conflict detection
- 👥 **Multi-user Support** - See when others are selecting desks
- 🎨 **Modern UI** - Beautiful design with Tailwind CSS and shadcn/ui components
- 🔐 **Mock Authentication** - Simple email/password login system

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** (comes with Node.js)
- **Firebase CLI** (for Firebase Emulator option) - [Install guide](https://firebase.google.com/docs/cli#install_the_firebase_cli)

## Step-by-Step Setup Guide

### Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd rdesk
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required dependencies including React, Vite, Tailwind CSS, Firebase, and shadcn/ui components.

### Step 3: Set Up Firebase

You have two options for Firebase setup:

#### Option A: Use Firebase Emulator (Recommended for Development)

This is the easiest way to get started without setting up a real Firebase project.

1. **Install Firebase CLI globally** (if not already installed):
```bash
npm install -g firebase-tools
```

2. **Login to Firebase**:
```bash
firebase login
```

3. **Initialize Firebase in your project**:
```bash
firebase init firestore
```

When prompted:
- Select "Create a new project" or use an existing one
- Choose a Firestore location (e.g., `us-central1`)
- Accept the default `firestore.rules` file
- Accept the default `firestore.indexes.json` file

4. **Create environment file**:
Create a `.env.local` file in the root directory:
```env
VITE_USE_FIREBASE_EMULATOR=true
```

5. **Start Firebase Emulator** (in a separate terminal):
```bash
firebase emulators:start --only firestore
```

Keep this terminal running. The emulator will start on `http://localhost:8080`.

#### Option B: Use Real Firebase Project

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project"
   - Follow the setup wizard

2. **Get Your Firebase Config**:
   - In Firebase Console, go to Project Settings (gear icon)
   - Scroll down to "Your apps" section
   - Click the web icon (`</>`) to add a web app
   - Copy the Firebase configuration object

3. **Create environment file**:
Create a `.env.local` file in the root directory with your Firebase config:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

4. **Set up Firestore Security Rules**:
   - Go to Firestore Database in Firebase Console
   - Click "Rules" tab
   - Add rules to allow read/write (for development):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         read, write: if true; // Allow all for development
       }
     }
   }
   ```
   ⚠️ **Note**: These rules allow anyone to read/write. For production, implement proper authentication-based rules.

### Step 4: Run the Application

1. **Start the development server**:
```bash
npm run dev
```

This will start:
- ✅ Frontend server on `http://localhost:3000`
- ✅ Backend API server on `http://localhost:3001` (optional)

2. **Open your browser**:
Navigate to `http://localhost:3000`

### Step 5: Login

Use one of the demo accounts to login:
- **Email**: `john@example.com` / **Password**: `password123`
- **Email**: `jane@example.com` / **Password**: `password123`

## Project Structure

```
rdesk/
├── src/
│   ├── components/          # React components
│   │   ├── DeskLayout.jsx  # Interactive desk map
│   │   ├── BookDeskModal.jsx
│   │   └── ui/             # shadcn/ui components
│   ├── pages/              # Page components
│   │   ├── Home.jsx        # Bookings list page
│   │   ├── BookDesk.jsx    # Booking page
│   │   └── Login.jsx       # Login page
│   ├── hooks/              # Custom React hooks
│   │   └── useFirestore.js # Firestore hook
│   ├── services/           # Service layer
│   │   └── firestore.js    # Firestore operations
│   ├── contexts/           # React contexts
│   │   └── AuthContext.jsx # Authentication context
│   └── lib/                # Utility functions
├── server/                 # Express backend (optional)
├── public/                 # Static assets
├── .env.local             # Environment variables (create this)
└── package.json           # Dependencies
```

## Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:client` - Start only the frontend (Vite)
- `npm run dev:server` - Start only the backend (Express)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express (optional - mainly for API compatibility)
- **Real-time & Storage**: Firebase Firestore
- **UI Components**: shadcn/ui, Lucide React icons
- **Routing**: React Router DOM

## Why Firestore?

- ✅ **Built-in real-time listeners** - No need to manage WebSocket connections
- ✅ **Automatic offline support** - Works offline and syncs when online
- ✅ **Scalable** - Handles concurrent users seamlessly
- ✅ **Free tier** - Generous free tier for development
- ✅ **Easy setup** - Can use emulator for local development

## Troubleshooting

### Firebase Connection Issues

**Problem**: "Firebase connection failed" or "Real-time updates unavailable"

**Solutions**:
1. Make sure Firebase Emulator is running (if using emulator):
   ```bash
   firebase emulators:start --only firestore
   ```

2. Check your `.env.local` file exists and has correct values

3. Verify Firestore is enabled in your Firebase project (if using real project)

4. Check browser console for specific error messages

### Port Already in Use

**Problem**: "Port 3000 is already in use"

**Solutions**:
1. Kill the process using the port:
   ```bash
   # On macOS/Linux
   lsof -ti:3000 | xargs kill -9
   
   # On Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

2. Or change the port in `vite.config.js`:
   ```javascript
   server: {
     port: 3001, // Change to another port
   }
   ```

### Module Not Found Errors

**Problem**: "Cannot find module 'xyz'"

**Solution**:
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Development Tips

1. **Hot Reload**: The app uses Vite's HMR (Hot Module Replacement) for instant updates

2. **Firestore Emulator**: Use the emulator for development to avoid Firebase costs

3. **Real-time Testing**: Open the app in multiple browser windows to test real-time updates

4. **Console Logs**: Check browser console and terminal for debugging information

## Production Deployment

For production deployment:

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Deploy to hosting** (Vercel, Netlify, etc.):
   - Connect your GitHub repository
   - Set environment variables
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Update Firebase Security Rules** for production with proper authentication

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
