# rDesk - Hot Desk Booking System

A modern, real-time web application for booking hot desks with an interactive SVG-based desk layout visualization.

## Features

- 🔐 **Mock Authentication** - Login with email/password (2 demo accounts)
- 📊 **Interactive Desk Layout** - Visual SVG-based desk layout with 12 desks
- ⏰ **Time-based Bookings** - Book desks for specific date/time ranges
- 🔄 **Real-time Updates** - WebSocket-based real-time status updates
- 👀 **Live Selection Status** - See when others are selecting desks
- ✅ **Visual Indicators** - Color-coded desk states (available, pending, booked, selected)
- 🗑️ **Easy Cancellation** - Cancel bookings with one click
- 📱 **Responsive Design** - Beautiful UI with Tailwind CSS and shadcn/ui
- 💾 **Persistent Storage** - JSON file-based data storage

## Desk Layout

The system displays 12 desks arranged in a layout:
- 6 desks on the top row
- 6 desks on the bottom row
- Connected by a shared table

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase project (or use Firebase Emulator for development)

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Set up Firebase:**

   **Option A: Use Firebase Emulator (Recommended for Development)**
   
   See `FIREBASE_SETUP.md` for detailed instructions. Quick setup:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init firestore
   firebase emulators:start --only firestore
   ```
   
   Create `.env.local`:
   ```env
   VITE_USE_FIREBASE_EMULATOR=true
   ```

   **Option B: Use Real Firebase Project**
   
   Create `.env.local` with your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

### Running the Application

1. **Start the frontend:**
```bash
npm run dev
```

This will start:
- ✅ Frontend server on `http://localhost:3000`
- ✅ Firestore for real-time updates and data storage

2. **Open your browser** and navigate to:
```
http://localhost:3000
```

3. **Login** with one of the demo accounts:
   - Email: `john@example.com` / Password: `password123`
   - Email: `jane@example.com` / Password: `password123`

**Note:** The Express backend is optional now. Firestore handles all real-time updates and data storage.

### Alternative Commands

- Run only the frontend: `npm run dev:client`
- Run only the backend: `npm run dev:server`
- Build for production: `npm run build`
- Preview production build: `npm run preview`

## Usage

1. **Login** - Use one of the demo accounts to log in
2. **View Bookings** - See your active and past bookings on the home page
3. **Book a Desk**:
   - Click "Book a Desk" button
   - Select date and time range (from date/time to date/time)
   - Choose an available desk from the layout
   - Confirm your booking
4. **Cancel Booking** - Click "Cancel Booking" on any active booking card
5. **Real-time Updates** - See when others are selecting desks (yellow/orange indicator)

## API Endpoints

- `GET /api/desks` - Get all desks with booking status (supports time range query)
- `GET /api/bookings` - Get all bookings (supports userId filter)
- `POST /api/bookings` - Create a new booking
- `DELETE /api/bookings/:bookingId` - Cancel a booking
- `POST /api/desks/:deskId/select` - Register desk selection (pending)
- `DELETE /api/desks/:deskId/select` - Cancel desk selection
- `GET /api/desks/pending` - Get all pending selections

## WebSocket Events

- `desk_selected` - Someone selected a desk
- `pending_selection_expired` - Pending selection expired
- `pending_selection_cancelled` - Pending selection cancelled
- `booking_confirmed` - Booking was created
- `booking_cancelled` - Booking was cancelled

## Data Storage

Bookings are stored in `server/data.json`. The file is automatically created on first run.

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express (optional - mainly for API compatibility)
- **Real-time & Storage**: Firebase Firestore
- **UI Components**: shadcn/ui, Lucide React icons

## Why Firestore?

- ✅ **Built-in real-time listeners** - No need to manage WebSocket connections
- ✅ **Automatic offline support** - Works offline and syncs when online
- ✅ **Scalable** - Handles concurrent users seamlessly
- ✅ **Free tier** - Generous free tier for development
- ✅ **Easy setup** - Can use emulator for local development

## License

MIT

