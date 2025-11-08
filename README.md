# rDesk - Hot Desk Booking System

A modern, real-time hot desk booking system built with React, Firestore, and Tailwind CSS. Features an interactive desk map with zoom, pan, and drag functionality, real-time booking updates, and a beautiful, polished UI.

## Features

- 🎯 **Interactive Desk Map** - Zoom, pan, and drag to navigate the desk layout
- ⚡ **Real-time Updates** - See booking changes instantly using Firestore
- 📅 **Time-based Bookings** - Book desks for specific date and time ranges
- 🔒 **Race Condition Prevention** - Prevents double-booking with conflict detection
- 👥 **Multi-user Support** - See when others are selecting desks with 1-minute hold timers
- 🎨 **Modern UI** - Beautiful design with Tailwind CSS and shadcn/ui components
- 🔐 **Mock Authentication** - Simple email/password login system
- 👨‍💼 **Admin Panel** - Manage desks and view all employee bookings

## Prerequisites

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Firebase Project** - [Create one here](https://console.firebase.google.com/)

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repository-url>
cd rdesk
npm install
```

### 2. Set Up Firebase

You can choose to use either the **Firestore Emulator** (for local development) or a **real Firebase project** (for production). The app can toggle between them using an environment variable.

#### Option A: Using Firestore Emulator (Recommended for Development)

The Firestore Emulator allows you to develop locally without using a real Firebase project.

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase** (if not already logged in):
   ```bash
   firebase login
   ```

3. **Create `.env.local` file** in the root directory (copy from `.env.example`):
   ```env
   VITE_USE_FIREBASE_EMULATOR=true
   VITE_FIREBASE_EMULATOR_HOST=localhost
   VITE_FIREBASE_EMULATOR_PORT=8080
   ```

4. **Start the Firestore Emulator** (in a separate terminal):
   ```bash
   npm run emulator
   ```
   
   This will start the Firestore Emulator on `http://localhost:8080` and the Emulator UI on `http://localhost:4000`.

5. **Keep the emulator running** while developing.

#### Option B: Using Real Firebase Project (For Production)

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click **"Add project"** or **"Create a project"**
   - Enter a project name (e.g., "rdesk" or "rdesk-production")
   - Click **"Continue"**
   - (Optional) Enable Google Analytics if you want
   - Click **"Create project"**
   - Wait for the project to be created, then click **"Continue"**

2. **Enable Firestore Database**:
   - In your Firebase project, click on **"Firestore Database"** in the left sidebar
   - Click **"Create database"**
   - Select **"Start in production mode"** (we'll set up security rules later)
   - Choose a location for your database (select the closest region to your users)
   - Click **"Enable"**

3. **Get Your Firebase Configuration**:
   - In your Firebase project, click on the **gear icon** ⚙️ next to "Project Overview"
   - Click **"Project settings"**
   - Scroll down to the **"Your apps"** section
   - Click on the **Web icon** (`</>`) to add a web app
   - Register your app with a nickname (e.g., "rdesk-web")
   - Click **"Register app"**
   - Copy the Firebase configuration object

4. **Set Up Environment Variables**:
   - Create `.env.local` file in the root directory (copy from `.env.example`):
   ```env
   VITE_USE_FIREBASE_EMULATOR=false
   VITE_FIREBASE_API_KEY=your-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```
   - Replace the values with your actual Firebase configuration

5. **Set Up Firestore Security Rules**:
   - In Firebase Console, go to **"Firestore Database"** → **"Rules"** tab
   - Replace the default rules with:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow all reads and writes for now (for development)
       // TODO: Add proper security rules for production
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
   - Click **"Publish"**

⚠️ **Note**: The above rules allow all reads and writes. For production, you should implement proper security rules based on your authentication system.

### 3. Initialize Desks

After setting up Firebase (or starting the emulator), you need to initialize the desk data:

**Option A: Using Admin Panel (Recommended)**
1. Start the app: `npm run dev`
2. Login as admin: `admin@rdesk.com` / `admin123`
3. Go to Admin Panel
4. Click "Initialize Desks" button

**Option B: Using Node.js Script**
```bash
node scripts/seed-desks.js
```

To reset all desks (delete and recreate):
```bash
node scripts/seed-desks.js --reset
```

### 4. Run the Application

**If using Firestore Emulator:**
1. Start the emulator (in one terminal):
   ```bash
   npm run emulator
   ```
2. Start the app (in another terminal):
   ```bash
   npm run dev
   ```

**If using Real Firebase:**
```bash
npm run dev
```

This will start the frontend server (usually on `http://localhost:5173`).

**Note**: When using the emulator, make sure the emulator is running before starting the app. The app will automatically connect to the emulator if `VITE_USE_FIREBASE_EMULATOR=true` is set in your `.env.local` file.

### 5. Login

Use one of the demo accounts:
- **Regular Users**:
  - `john@example.com` / `password123`
  - `jane@example.com` / `password123`
- **Admin User**:
  - `admin@rdesk.com` / `admin123`

## Project Structure

```
rdesk/
├── src/
│   ├── components/          # React components
│   │   ├── DeskLayout.jsx  # Interactive desk map
│   │   └── ui/             # shadcn/ui components
│   ├── pages/              # Page components
│   │   ├── Home.jsx        # User bookings page
│   │   ├── BookDesk.jsx    # Booking page
│   │   ├── Login.jsx       # Login page
│   │   └── Admin.jsx       # Admin panel
│   ├── hooks/              # Custom React hooks
│   │   └── useFirestore.js # Firestore hook
│   ├── services/           # Service layer
│   │   └── firestore.js    # Firestore operations
│   ├── contexts/           # React contexts
│   │   └── AuthContext.jsx # Authentication context
│   └── lib/                # Utility functions
├── scripts/
│   └── seed-desks.js       # Script to initialize desks
├── .env.local              # Environment variables (create this)
├── .env.example            # Environment variables template
└── package.json            # Dependencies
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run emulator` - Start Firestore Emulator only
- `npm run emulator:all` - Start all Firebase emulators

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui
- **Real-time & Storage**: Firebase Firestore
- **UI Components**: shadcn/ui, Lucide React icons
- **Routing**: React Router DOM

## Firestore Collections

The app uses two Firestore collections:

### `bookings` Collection

Stores all desk bookings with time ranges:

```javascript
{
  deskId: "desk-1",
  userId: "user123",
  userName: "John Doe",
  fromDate: "2024-01-15",
  fromTime: "09:00",
  toDate: "2024-01-15",
  toTime: "17:00",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `desks` Collection

Stores desk layout information and real-time availability status (12 desks total):

```javascript
{
  // Static fields
  id: "desk-1",
  x: 10,
  y: 7,
  name: "Desk 1",
  
  // Dynamic status fields
  availability: "available", // "available" | "held" | "booked"
  
  // Hold status (when availability === "held")
  heldBy: null,
  heldByUserId: null,
  heldExpiresAt: null,
  heldTimeRange: null,
  
  // Booking status (when availability === "booked")
  bookedBy: null,
  bookedByUserId: null,
  bookedTimeRange: null,
  
  // Metadata
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Desk Positions:**
- Top row (y=7): desk-1 (x=10), desk-2 (x=25), desk-3 (x=40), desk-4 (x=55), desk-5 (x=70), desk-6 (x=85)
- Bottom row (y=28): desk-7 (x=10), desk-8 (x=25), desk-9 (x=40), desk-10 (x=55), desk-11 (x=70), desk-12 (x=85)

## How It Works

1. **Real-time Updates**: Uses Firestore `onSnapshot()` listeners to update the UI instantly when bookings change
2. **Conflict Prevention**: Double-checks for overlapping bookings before creating a new booking
3. **Pending Selections**: When a user selects a desk, it's held for 1 minute. Other users see this as a pending selection
4. **Single Booking Rule**: Users can only book one desk at a time for overlapping time ranges
5. **Admin Panel**: Admins can initialize desks and view all bookings, but cannot book desks themselves

## Features in Detail

### Booking Flow

1. User selects date and time range
2. Available desks are displayed on the map
3. User clicks a desk to select it
4. Desk is held for 1 minute (timer visible to the selecting user)
5. User confirms booking before timer expires
6. Booking is created and desk status updates to "booked"

### Admin Features

- Initialize/Re-initialize desks in Firestore
- View all active and past bookings
- See which employee booked which desk and when
- Cannot book desks (admin-only access)

## Troubleshooting

### Firebase Connection Issues

**Problem**: "Firebase connection failed" or errors in console

**If using Firestore Emulator:**
1. Make sure the emulator is running (`npm run emulator`)
2. Check that `VITE_USE_FIREBASE_EMULATOR=true` in your `.env.local` file
3. Verify the emulator is running on the correct port (default: 8080)
4. Check the emulator UI at `http://localhost:4000` to see if it's running
5. Check browser console for specific error messages

**If using Real Firebase:**
1. Check your `.env.local` file exists and has correct values
2. Verify `VITE_USE_FIREBASE_EMULATOR=false` in your `.env.local` file
3. Verify Firestore is enabled in your Firebase project
4. Check Firestore security rules allow read/write access
5. Check browser console for specific error messages

### Desks Not Showing

**Problem**: No desks appear on the map

**Solutions**:
1. Make sure desks are initialized (use Admin Panel or script)
2. Check Firestore console to verify `desks` collection exists
3. Verify desk documents have correct structure (id, x, y, availability fields)

### Port Already in Use

**Problem**: "Port 5173 is already in use"

**Solutions**:
1. Kill the process using the port:
   ```bash
   # On macOS/Linux
   lsof -ti:5173 | xargs kill -9
   
   # On Windows
   netstat -ano | findstr :5173
   taskkill /PID <PID> /F
   ```

2. Or change the port in `vite.config.js`

### Module Not Found Errors

**Problem**: "Cannot find module 'xyz'"

**Solution**:
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Permission Denied Errors

**Problem**: "Permission denied" when trying to create/update bookings

**Solutions**:
1. Check your Firestore security rules
2. Make sure you're authenticated (if required)
3. Verify your Firebase configuration is correct in `.env.local`

### Data Not Persisting

**Problem**: Data disappears after page refresh

**Solutions**:
1. Verify you're using the correct Firebase project
2. Check that Firestore is enabled in your Firebase project
3. Verify your Firebase configuration in `.env.local` is correct
4. Check browser console for specific error messages

## Production Deployment

For production deployment:

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Deploy to hosting** (Vercel, Netlify, etc.):
   - Connect your GitHub repository
   - Set environment variables (Firebase config from `.env.local`)
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Update Firebase Security Rules** for production with proper authentication:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /bookings/{bookingId} {
         allow read: if request.auth != null;
         allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
         allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
       }
       match /desks/{deskId} {
         allow read: if true;
         allow update: if request.auth != null;
         allow create, delete: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
       }
     }
   }
   ```

4. **Set up Firebase Authentication** (replace mock auth with real Firebase Auth)

5. **Monitor usage** in Firebase Console

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
