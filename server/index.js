import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to check time overlap
function checkTimeOverlap(start1, end1, start2, end2) {
  const s1 = new Date(`${start1.date}T${start1.time}`);
  const e1 = new Date(`${end1.date}T${end1.time}`);
  const s2 = new Date(`${start2.date}T${start2.time}`);
  const e2 = new Date(`${end2.date}T${end2.time}`);
  
  return s1 < e2 && s2 < e1;
}

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  const initialData = {
    bookings: [],
    desks: [
      { id: 'desk-1', x: 6, y: 5 },
      { id: 'desk-2', x: 19, y: 5 },
      { id: 'desk-3', x: 32, y: 5 },
      { id: 'desk-4', x: 45, y: 5 },
      { id: 'desk-5', x: 58, y: 5 },
      { id: 'desk-6', x: 71, y: 5 },
      { id: 'desk-7', x: 6, y: 20 },
      { id: 'desk-8', x: 19, y: 20 },
      { id: 'desk-9', x: 32, y: 20 },
      { id: 'desk-10', x: 45, y: 20 },
      { id: 'desk-11', x: 58, y: 20 },
      { id: 'desk-12', x: 71, y: 20 }
    ]
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

// Helper function to read data
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data:', error);
    return { bookings: [], desks: [] };
  }
}

// Helper function to write data
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing data:', error);
    return false;
  }
}

// Get all desks with booking status based on time range
app.get('/api/desks', (req, res) => {
  const data = readData();
  const { fromDate, fromTime, toDate, toTime } = req.query;
  
  // If time range is provided, check for overlaps
  if (fromDate && fromTime && toDate && toTime) {
    const requestedRange = {
      start: { date: fromDate, time: fromTime },
      end: { date: toDate, time: toTime }
    };

    const desksWithStatus = data.desks.map(desk => {
      // Check if desk has overlapping bookings
      const overlappingBooking = data.bookings.find(booking => {
        if (booking.deskId !== desk.id) return false;
        
        // Skip legacy bookings (date-only) for time-based checking
        if (!booking.fromDate || !booking.fromTime || !booking.toDate || !booking.toTime) {
          return false;
        }
        
        const bookingRange = {
          start: { date: booking.fromDate, time: booking.fromTime },
          end: { date: booking.toDate, time: booking.toTime }
        };
        
        return checkTimeOverlap(requestedRange.start, requestedRange.end, bookingRange.start, bookingRange.end);
      });

      return {
        ...desk,
        isBooked: !!overlappingBooking,
        bookedBy: overlappingBooking ? overlappingBooking.userName : null,
        bookingId: overlappingBooking ? overlappingBooking.id : null,
        fromDate: overlappingBooking ? overlappingBooking.fromDate : null,
        fromTime: overlappingBooking ? overlappingBooking.fromTime : null,
        toDate: overlappingBooking ? overlappingBooking.toDate : null,
        toTime: overlappingBooking ? overlappingBooking.toTime : null,
        date: overlappingBooking ? overlappingBooking.date : null
      };
    });
    
    return res.json(desksWithStatus);
  }
  
  // Fallback to date-based checking (legacy support)
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const dateBookings = data.bookings.filter(booking => booking.date === date);
  
  const desksWithStatus = data.desks.map(desk => {
    const booking = dateBookings.find(b => b.deskId === desk.id);
    return {
      ...desk,
      isBooked: !!booking,
      bookedBy: booking ? booking.userName : null,
      bookingId: booking ? booking.id : null
    };
  });
  
  res.json(desksWithStatus);
});

// Get bookings for a specific date
app.get('/api/bookings/:date', (req, res) => {
  const data = readData();
  const { date } = req.params;
  const bookings = data.bookings.filter(booking => booking.date === date);
  res.json(bookings);
});

// Create a booking
app.post('/api/bookings', (req, res) => {
  const { deskId, userId, userName, fromDate, fromTime, toDate, toTime, date } = req.body;
  
  console.log('Received booking request:', { deskId, userId, userName, fromDate, fromTime, toDate, toTime, date });
  
  // Validate required fields
  if (!deskId || !userName) {
    console.log('Missing deskId or userName:', { deskId, userName });
    return res.status(400).json({ error: 'Missing required fields: deskId, userName' });
  }

  // Check if this is a new time-based booking or legacy date-only booking
  // If any time fields are present, treat as time-based booking
  const isTimeBasedBooking = !!(fromDate && fromTime && toDate && toTime);
  
  console.log('Is time-based booking:', isTimeBasedBooking, { 
    fromDate, 
    fromTime, 
    toDate, 
    toTime,
    fromDateType: typeof fromDate,
    fromTimeType: typeof fromTime,
    toDateType: typeof toDate,
    toTimeType: typeof toTime
  });

  if (isTimeBasedBooking) {
    // New format: time-based booking
    // Use double-check pattern to prevent race conditions
    const requestedRange = {
      start: { date: fromDate, time: fromTime },
      end: { date: toDate, time: toTime }
    };

    // Helper function to check for overlaps
    const checkForOverlaps = (bookings) => {
      return bookings.find(booking => {
        if (booking.deskId !== deskId) return false;
        
        // Skip legacy bookings (date-only) for time-based overlap checking
        if (!booking.fromDate || !booking.fromTime || !booking.toDate || !booking.toTime) {
          return false;
        }
        
        const bookingRange = {
          start: { date: booking.fromDate, time: booking.fromTime },
          end: { date: booking.toDate, time: booking.toTime }
        };
        
        return checkTimeOverlap(requestedRange.start, requestedRange.end, bookingRange.start, bookingRange.end);
      });
    };

    // First check: Read data and check availability
    let data = readData();
    let overlappingBooking = checkForOverlaps(data.bookings);

    if (overlappingBooking) {
      return res.status(409).json({ 
        error: 'Desk is already booked for this time period',
        conflict: {
          bookedBy: overlappingBooking.userName,
          fromDate: overlappingBooking.fromDate,
          fromTime: overlappingBooking.fromTime,
          toDate: overlappingBooking.toDate,
          toTime: overlappingBooking.toTime
        }
      });
    }

    // Create new booking
    const newBooking = {
      id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      deskId,
      userId,
      userName,
      fromDate,
      fromTime,
      toDate,
      toTime,
      createdAt: new Date().toISOString()
    };

    // Second check: Re-read data right before writing (double-check pattern)
    // This helps prevent race conditions when two users book simultaneously
    data = readData();
    overlappingBooking = checkForOverlaps(data.bookings);

    if (overlappingBooking) {
      // Someone just booked this desk between our checks
      return res.status(409).json({ 
        error: 'Desk was just booked by another user. Please select a different desk or time.',
        conflict: {
          bookedBy: overlappingBooking.userName,
          fromDate: overlappingBooking.fromDate,
          fromTime: overlappingBooking.fromTime,
          toDate: overlappingBooking.toDate,
          toTime: overlappingBooking.toTime
        }
      });
    }

    // Both checks passed, safe to create booking
    data.bookings.push(newBooking);

    if (writeData(data)) {
      res.status(201).json(newBooking);
    } else {
      res.status(500).json({ error: 'Failed to save booking' });
    }
    return;
  }

  // Legacy format support (date only)
  if (!date) {
    return res.status(400).json({ error: 'Missing required fields: either (fromDate, fromTime, toDate, toTime) or date' });
  }

  // First check: Read data and check availability
  let data = readData();
  let existingBooking = data.bookings.find(
    b => b.deskId === deskId && b.date === date
  );

  if (existingBooking) {
    return res.status(409).json({ 
      error: 'Desk is already booked for this date',
      conflict: {
        bookedBy: existingBooking.userName,
        date: existingBooking.date
      }
    });
  }

  const newBooking = {
    id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    deskId,
    userId,
    userName,
    date,
    createdAt: new Date().toISOString()
  };

  // Second check: Re-read data right before writing (double-check pattern)
  data = readData();
  existingBooking = data.bookings.find(
    b => b.deskId === deskId && b.date === date
  );

  if (existingBooking) {
    // Someone just booked this desk between our checks
    return res.status(409).json({ 
      error: 'Desk was just booked by another user. Please select a different desk or date.',
      conflict: {
        bookedBy: existingBooking.userName,
        date: existingBooking.date
      }
    });
  }

  // Both checks passed, safe to create booking
  data.bookings.push(newBooking);

  if (writeData(data)) {
    res.status(201).json(newBooking);
  } else {
    res.status(500).json({ error: 'Failed to save booking' });
  }
});

// Cancel a booking
app.delete('/api/bookings/:bookingId', (req, res) => {
  const { bookingId } = req.params;
  const data = readData();
  
  const bookingIndex = data.bookings.findIndex(b => b.id === bookingId);
  
  if (bookingIndex === -1) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  const cancelledBooking = data.bookings[bookingIndex];
  data.bookings.splice(bookingIndex, 1);
  
  if (writeData(data)) {
    res.json({ message: 'Booking cancelled successfully' });
  } else {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// Get all bookings
app.get('/api/bookings', (req, res) => {
  const data = readData();
  const { userId } = req.query;
  
  // If userId is provided, filter bookings for that user
  if (userId) {
    const userBookings = data.bookings.filter(booking => booking.userId === userId);
    return res.json(userBookings);
  }
  
  res.json(data.bookings);
});

// Note: All real-time features are now handled by Firestore
// The following endpoints are kept for backward compatibility but are not used by the frontend

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Note: Real-time features are handled by Firestore`);
});

