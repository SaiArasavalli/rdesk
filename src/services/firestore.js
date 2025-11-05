import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Collections
const BOOKINGS_COLLECTION = 'bookings';
const DESKS_COLLECTION = 'desks';
const PENDING_SELECTIONS_COLLECTION = 'pendingSelections';

// Helper function for time overlap (shared across functions)
const checkTimeOverlap = (start1, end1, start2, end2) => {
  const s1 = new Date(`${start1.date}T${start1.time}`);
  const e1 = new Date(`${end1.date}T${end1.time}`);
  const s2 = new Date(`${start2.date}T${start2.time}`);
  const e2 = new Date(`${end2.date}T${end2.time}`);
  
  return s1 < e2 && s2 < e1;
};

// ========== BOOKINGS ==========

export const getBookings = async (userId = null) => {
  try {
    const bookingsRef = collection(db, BOOKINGS_COLLECTION);
    let q = bookingsRef;
    
    if (userId) {
      q = query(bookingsRef, where('userId', '==', userId));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting bookings:', error);
    throw error;
  }
};

export const getBooking = async (bookingId) => {
  try {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (bookingSnap.exists()) {
      return { id: bookingSnap.id, ...bookingSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting booking:', error);
    throw error;
  }
};

export const createBooking = async (bookingData) => {
  try {
    // Double-check for conflicts before creating
    const existingBookings = await getBookings();
    const requestedRange = {
      start: { date: bookingData.fromDate, time: bookingData.fromTime },
      end: { date: bookingData.toDate, time: bookingData.toTime }
    };

    // Check for overlapping bookings on the same desk
    const overlappingBooking = existingBookings.find(booking => {
      if (booking.deskId !== bookingData.deskId) return false;
      if (!booking.fromDate || !booking.fromTime || !booking.toDate || !booking.toTime) return false;
      
      const bookingRange = {
        start: { date: booking.fromDate, time: booking.fromTime },
        end: { date: booking.toDate, time: booking.toTime }
      };
      
      return checkTimeOverlap(requestedRange.start, requestedRange.end, bookingRange.start, bookingRange.end);
    });

    if (overlappingBooking) {
      throw new Error(`Desk is already booked by ${overlappingBooking.userName} for this time period`);
    }

    // Delete pending selection if exists
    try {
      await deletePendingSelection(bookingData.deskId, bookingData.userId);
    } catch (error) {
      // Ignore if pending selection doesn't exist
    }

    const bookingsRef = collection(db, BOOKINGS_COLLECTION);
    const newBooking = {
      ...bookingData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(bookingsRef, newBooking);
    return { id: docRef.id, ...newBooking };
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

export const deleteBooking = async (bookingId) => {
  try {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    await deleteDoc(bookingRef);
    return true;
  } catch (error) {
    console.error('Error deleting booking:', error);
    throw error;
  }
};

// Real-time listener for bookings
export const subscribeToBookings = (userId, callback) => {
  const bookingsRef = collection(db, BOOKINGS_COLLECTION);
  let q = bookingsRef;
  
  if (userId) {
    q = query(bookingsRef, where('userId', '==', userId));
  }
  
  return onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(bookings);
  }, (error) => {
    console.error('Error in bookings subscription:', error);
  });
};

// ========== DESKS ==========

export const getDesks = async () => {
  try {
    const desksRef = collection(db, DESKS_COLLECTION);
    const querySnapshot = await getDocs(desksRef);
    // Use the desk's id field if it exists, otherwise use Firestore doc.id
    // This ensures we preserve the original desk IDs (desk-1, desk-2, etc.)
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id || doc.id, // Prefer the id field from data, fallback to doc.id
        ...data,
        firestoreId: doc.id // Store Firestore ID separately for reference
      };
    });
  } catch (error) {
    console.error('Error getting desks:', error);
    throw error;
  }
};

// Initialize desks if they don't exist
export const initializeDesks = async () => {
  try {
    const desks = await getDesks();
    if (desks.length === 0) {
      const desksData = [
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
      ];
      
      const desksRef = collection(db, DESKS_COLLECTION);
      for (const desk of desksData) {
        await addDoc(desksRef, desk);
      }
    }
  } catch (error) {
    console.error('Error initializing desks:', error);
    throw error;
  }
};

// ========== PENDING SELECTIONS ==========

export const createPendingSelection = async (deskId, selectionData) => {
  try {
    const pendingRef = collection(db, PENDING_SELECTIONS_COLLECTION);
    
    // Check if there's an existing pending selection for this desk
    const existingQuery = query(
      pendingRef, 
      where('deskId', '==', deskId)
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    // Delete existing pending selections for this desk
    for (const docSnap of existingSnapshot.docs) {
      await deleteDoc(doc(db, PENDING_SELECTIONS_COLLECTION, docSnap.id));
    }
    
    // Create new pending selection with expiration
    const expiresAt = Timestamp.fromMillis(Date.now() + 30000); // 30 seconds
    const newSelection = {
      ...selectionData,
      deskId,
      expiresAt,
      createdAt: serverTimestamp()
    };
    
    await addDoc(pendingRef, newSelection);
    
    return { id: 'pending', ...newSelection };
  } catch (error) {
    console.error('Error creating pending selection:', error);
    throw error;
  }
};

export const deletePendingSelection = async (deskId, userId) => {
  try {
    const pendingRef = collection(db, PENDING_SELECTIONS_COLLECTION);
    const q = query(
      pendingRef,
      where('deskId', '==', deskId),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    for (const docSnap of querySnapshot.docs) {
      await deleteDoc(doc(db, PENDING_SELECTIONS_COLLECTION, docSnap.id));
    }
    return true;
  } catch (error) {
    console.error('Error deleting pending selection:', error);
    throw error;
  }
};

// Real-time listener for pending selections
export const subscribeToPendingSelections = (callback) => {
  const pendingRef = collection(db, PENDING_SELECTIONS_COLLECTION);
  
  return onSnapshot(pendingRef, (snapshot) => {
    const now = Date.now();
    const pending = snapshot.docs
      .map(doc => {
        const data = doc.data();
        const expiresAt = data.expiresAt?.toMillis?.() || data.expiresAt;
        return {
          id: doc.id,
          ...data,
          expiresAt
        };
      })
      .filter(selection => {
        // Filter out expired selections
        return selection.expiresAt > now;
      });
    
    callback(pending);
  }, (error) => {
    console.error('Error in pending selections subscription:', error);
  });
};

// ========== DESK AVAILABILITY ==========

export const getDesksWithAvailability = async (fromDate, fromTime, toDate, toTime) => {
  try {
    const [desks, bookings] = await Promise.all([
      getDesks(),
      getBookings()
    ]);
    
    const pendingRef = collection(db, PENDING_SELECTIONS_COLLECTION);
    const pendingSnapshot = await getDocs(pendingRef);
    const pendingSelections = pendingSnapshot;
    
    // Ensure we have unique desks by id
    const uniqueDesks = new Map();
    desks.forEach(desk => {
      if (desk.id && !uniqueDesks.has(desk.id)) {
        uniqueDesks.set(desk.id, desk);
      }
    });
    
    const desksArray = uniqueDesks.size > 0 
      ? Array.from(uniqueDesks.values())
      : [{ id: 'desk-1', x: 6, y: 5 }, { id: 'desk-2', x: 19, y: 5 }, { id: 'desk-3', x: 32, y: 5 }, { id: 'desk-4', x: 45, y: 5 }, { id: 'desk-5', x: 58, y: 5 }, { id: 'desk-6', x: 71, y: 5 }, { id: 'desk-7', x: 6, y: 20 }, { id: 'desk-8', x: 19, y: 20 }, { id: 'desk-9', x: 32, y: 20 }, { id: 'desk-10', x: 45, y: 20 }, { id: 'desk-11', x: 58, y: 20 }, { id: 'desk-12', x: 71, y: 20 }];
    
    const requestedRange = {
      start: { date: fromDate, time: fromTime },
      end: { date: toDate, time: toTime }
    };
    
    const pendingMap = new Map();
    pendingSelections.docs.forEach(doc => {
      const data = doc.data();
      const expiresAt = data.expiresAt?.toMillis?.() || data.expiresAt;
      if (expiresAt > Date.now()) {
        pendingMap.set(data.deskId, {
          userId: data.userId,
          userName: data.userName,
          expiresAt
        });
      }
    });
    
    return desksArray.map(desk => {
      // Check for overlapping bookings
      const overlappingBooking = bookings.find(booking => {
        if (booking.deskId !== desk.id) return false;
        if (!booking.fromDate || !booking.fromTime || !booking.toDate || !booking.toTime) return false;
        
        const bookingRange = {
          start: { date: booking.fromDate, time: booking.fromTime },
          end: { date: booking.toDate, time: booking.toTime }
        };
        
        return checkTimeOverlap(requestedRange.start, requestedRange.end, bookingRange.start, bookingRange.end);
      });
      
      const pending = pendingMap.get(desk.id);
      
      return {
        ...desk,
        isBooked: !!overlappingBooking,
        bookedBy: overlappingBooking ? overlappingBooking.userName : null,
        bookingId: overlappingBooking ? overlappingBooking.id : null,
        fromDate: overlappingBooking ? overlappingBooking.fromDate : null,
        fromTime: overlappingBooking ? overlappingBooking.fromTime : null,
        toDate: overlappingBooking ? overlappingBooking.toDate : null,
        toTime: overlappingBooking ? overlappingBooking.toTime : null,
        date: overlappingBooking ? overlappingBooking.date : null,
        isPending: !!pending,
        pendingBy: pending ? pending.userName : null
      };
    });
  } catch (error) {
    console.error('Error getting desks with availability:', error);
    throw error;
  }
};


