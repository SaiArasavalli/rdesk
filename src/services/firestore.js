import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  addDoc, 
  deleteDoc, 
  updateDoc,
  query, 
  where, 
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const BOOKINGS_COLLECTION = 'bookings';
const DESKS_COLLECTION = 'desks';

const checkTimeOverlap = (start1, end1, start2, end2) => {
  const s1 = new Date(`${start1.date}T${start1.time}`);
  const e1 = new Date(`${end1.date}T${end1.time}`);
  const s2 = new Date(`${start2.date}T${start2.time}`);
  const e2 = new Date(`${end2.date}T${end2.time}`);
  
  return s1 < e2 && s2 < e1;
};

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


export const createBooking = async (bookingData) => {
  try {
    const existingBookings = await getBookings();
    const requestedRange = {
      start: { date: bookingData.fromDate, time: bookingData.fromTime },
      end: { date: bookingData.toDate, time: bookingData.toTime }
    };

    // Check if user already has a booking for this time range (any desk)
    const userExistingBooking = existingBookings.find(booking => {
      if (booking.userId !== bookingData.userId) return false;
      if (!booking.fromDate || !booking.fromTime || !booking.toDate || !booking.toTime) return false;
      
      const bookingRange = {
        start: { date: booking.fromDate, time: booking.fromTime },
        end: { date: booking.toDate, time: booking.toTime }
      };
      
      return checkTimeOverlap(requestedRange.start, requestedRange.end, bookingRange.start, bookingRange.end);
    });

    if (userExistingBooking) {
      throw new Error(`You already have a booking for desk ${userExistingBooking.deskId} during this time period. You can only book one seat at a time.`);
    }

    // Check if this specific desk is already booked by anyone for this time range
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

    // Clear any held status for this desk by this user
    try {
      await deletePendingSelection(bookingData.deskId, bookingData.userId);
    } catch (error) {
      // Ignore errors - desk might not be held
    }

    const bookingsRef = collection(db, BOOKINGS_COLLECTION);
    const newBooking = {
      ...bookingData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(bookingsRef, newBooking);
    
    // Update desk status to "booked"
    const desksRef = collection(db, DESKS_COLLECTION);
    const deskQuery = query(desksRef, where('id', '==', bookingData.deskId));
    const deskSnapshot = await getDocs(deskQuery);
    if (!deskSnapshot.empty) {
      const deskDoc = deskSnapshot.docs[0];
      await updateDoc(doc(db, DESKS_COLLECTION, deskDoc.id), {
        availability: 'booked',
        bookedBy: bookingData.userName,
        bookedByUserId: bookingData.userId,
        bookedTimeRange: {
          fromDate: bookingData.fromDate,
          fromTime: bookingData.fromTime,
          toDate: bookingData.toDate,
          toTime: bookingData.toTime
        },
        heldBy: null,
        heldByUserId: null,
        heldExpiresAt: null,
        heldTimeRange: null,
        updatedAt: serverTimestamp()
      });
    }
    
    return { id: docRef.id, ...newBooking };
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

export const deleteBooking = async (bookingId) => {
  try {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    const bookingDoc = await getDoc(bookingRef);
    
    let deskId = null;
    if (bookingDoc.exists()) {
      const bookingData = bookingDoc.data();
      deskId = bookingData.deskId;
    }
    
    await deleteDoc(bookingRef);
    
    // Check if there are any other bookings for this desk at overlapping times
    if (deskId) {
      const bookings = await getBookings();
      const hasOtherBookings = bookings.some(booking => 
        booking.id !== bookingId && booking.deskId === deskId
      );
      
      // Update desk status - if no other bookings, check pending, otherwise set to available
      const desksRef = collection(db, DESKS_COLLECTION);
      const deskQuery = query(desksRef, where('id', '==', deskId));
      const deskSnapshot = await getDocs(deskQuery);
      if (!deskSnapshot.empty) {
        const deskDoc = deskSnapshot.docs[0];
        if (!hasOtherBookings) {
          // Check if desk is currently held
          const deskData = deskDoc.data();
          const now = Date.now();
          const heldExpiresAt = deskData.heldExpiresAt?.toMillis?.() || deskData.heldExpiresAt;
          const hasActiveHold = deskData.availability === 'held' && heldExpiresAt > now;
          
          if (hasActiveHold) {
            // Keep the held status, just clear booked status
            await updateDoc(doc(db, DESKS_COLLECTION, deskDoc.id), {
              bookedBy: null,
              bookedByUserId: null,
              bookedTimeRange: null,
              updatedAt: serverTimestamp()
            });
          } else {
            // No active hold, set to available
            await updateDoc(doc(db, DESKS_COLLECTION, deskDoc.id), {
              availability: 'available',
              bookedBy: null,
              bookedByUserId: null,
              bookedTimeRange: null,
              updatedAt: serverTimestamp()
            });
          }
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting booking:', error);
    throw error;
  }
};
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

export const getDesks = async () => {
  try {
    const desksRef = collection(db, DESKS_COLLECTION);
    const querySnapshot = await getDocs(desksRef);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id || doc.id,
        ...data,
        firestoreId: doc.id
      };
    });
  } catch (error) {
    console.error('Error getting desks:', error);
    throw error;
  }
};

// Define desk positions based on the layout
// Top row: y=7, Bottom row: y=28
const DESK_DEFINITIONS = [
  // Top row
  { id: 'desk-1', x: 10, y: 7, name: 'Desk 1' },
  { id: 'desk-2', x: 25, y: 7, name: 'Desk 2' },
  { id: 'desk-3', x: 40, y: 7, name: 'Desk 3' },
  { id: 'desk-4', x: 55, y: 7, name: 'Desk 4' },
  { id: 'desk-5', x: 70, y: 7, name: 'Desk 5' },
  { id: 'desk-6', x: 85, y: 7, name: 'Desk 6' },
  // Bottom row
  { id: 'desk-7', x: 10, y: 28, name: 'Desk 7' },
  { id: 'desk-8', x: 25, y: 28, name: 'Desk 8' },
  { id: 'desk-9', x: 40, y: 28, name: 'Desk 9' },
  { id: 'desk-10', x: 55, y: 28, name: 'Desk 10' },
  { id: 'desk-11', x: 70, y: 28, name: 'Desk 11' },
  { id: 'desk-12', x: 85, y: 28, name: 'Desk 12' },
];

/**
 * Initialize desks in Firestore
 * This function will:
 * 1. Check if desks already exist
 * 2. Create only desks that don't exist yet
 * 3. Skip desks that already exist
 * 
 * Usage: Call this function from browser console or a setup page
 * Example: await initializeDesks()
 */
export const initializeDesks = async () => {
  try {
    const desksRef = collection(db, DESKS_COLLECTION);
    
    // Get all existing desks
    const existingDesksSnapshot = await getDocs(desksRef);
    const existingDeskIds = new Set();
    
    existingDesksSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.id) {
        existingDeskIds.add(data.id);
      }
    });
    
    // Create desks that don't exist
    let created = 0;
    let skipped = 0;
    
    for (const deskDef of DESK_DEFINITIONS) {
      if (existingDeskIds.has(deskDef.id)) {
        skipped++;
        continue;
      }
      
      const deskData = {
        id: deskDef.id,
        x: deskDef.x,
        y: deskDef.y,
        name: deskDef.name,
        availability: 'available',
        heldBy: null,
        heldByUserId: null,
        heldExpiresAt: null,
        heldTimeRange: null,
        bookedBy: null,
        bookedByUserId: null,
        bookedTimeRange: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(desksRef, deskData);
      created++;
    }
    
    return {
      created,
      skipped,
      total: existingDeskIds.size + created
    };
  } catch (error) {
    console.error('❌ Error initializing desks:', error);
    throw error;
  }
};

export const createPendingSelection = async (deskId, selectionData) => {
  try {
    const now = Date.now();
    const requestedRange = {
      start: { date: selectionData.fromDate, time: selectionData.fromTime },
      end: { date: selectionData.toDate, time: selectionData.toTime }
    };
    
    // Get the desk to check current status
    const desksRef = collection(db, DESKS_COLLECTION);
    const deskQuery = query(desksRef, where('id', '==', deskId));
    const deskSnapshot = await getDocs(deskQuery);
    
    if (deskSnapshot.empty) {
      throw new Error('Desk not found');
    }
    
    const deskDoc = deskSnapshot.docs[0];
    const deskData = deskDoc.data();
    
    // Check if desk is currently held by another user for overlapping time
    if (deskData.availability === 'held' && deskData.heldByUserId !== selectionData.userId) {
      const heldExpiresAt = deskData.heldExpiresAt?.toMillis?.() || deskData.heldExpiresAt;
      
      // Only check if the hold is still active
      if (heldExpiresAt > now && deskData.heldTimeRange) {
        const heldRange = {
          start: { 
            date: deskData.heldTimeRange.fromDate, 
            time: deskData.heldTimeRange.fromTime 
          },
          end: { 
            date: deskData.heldTimeRange.toDate, 
            time: deskData.heldTimeRange.toTime 
          }
        };
        
        if (checkTimeOverlap(requestedRange.start, requestedRange.end, heldRange.start, heldRange.end)) {
          throw new Error(`Desk is currently being selected by ${deskData.heldBy} for this time period`);
        }
      }
    }
    
    // Check if user already has a booking for this time range (any desk)
    const bookings = await getBookings();
    const userExistingBooking = bookings.find(booking => {
      if (booking.userId !== selectionData.userId) return false;
      if (!booking.fromDate || !booking.fromTime || !booking.toDate || !booking.toTime) return false;
      
      const bookingRange = {
        start: { date: booking.fromDate, time: booking.fromTime },
        end: { date: booking.toDate, time: booking.toTime }
      };
      
      return checkTimeOverlap(requestedRange.start, requestedRange.end, bookingRange.start, bookingRange.end);
    });
    
    if (userExistingBooking) {
      throw new Error(`You already have a booking for desk ${userExistingBooking.deskId} during this time period. You can only book one seat at a time.`);
    }

    // Check if this specific desk is already booked for this time range
    const overlappingBooking = bookings.find(booking => {
      if (booking.deskId !== deskId) return false;
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
    
    const expiresAt = Timestamp.fromMillis(Date.now() + 60000);
    
    // Update desk status to "held"
    await updateDoc(doc(db, DESKS_COLLECTION, deskDoc.id), {
      availability: 'held',
      heldBy: selectionData.userName,
      heldByUserId: selectionData.userId,
      heldExpiresAt: expiresAt,
      heldTimeRange: {
        fromDate: selectionData.fromDate,
        fromTime: selectionData.fromTime,
        toDate: selectionData.toDate,
        toTime: selectionData.toTime
      },
      updatedAt: serverTimestamp()
    });
    
    return { 
      id: 'pending', 
      deskId,
      ...selectionData,
      expiresAt
    };
  } catch (error) {
    console.error('Error creating pending selection:', error);
    throw error;
  }
};

export const deletePendingSelection = async (deskId, userId) => {
  try {
    // Get the desk to verify it's held by this user
    const desksRef = collection(db, DESKS_COLLECTION);
    const deskQuery = query(desksRef, where('id', '==', deskId));
    const deskSnapshot = await getDocs(deskQuery);
    
    if (deskSnapshot.empty) {
      return true; // Desk doesn't exist, nothing to delete
    }
    
    const deskDoc = deskSnapshot.docs[0];
    const deskData = deskDoc.data();
    
    // Only clear if this user is holding it
    if (deskData.heldByUserId === userId && deskData.availability === 'held') {
      await updateDoc(doc(db, DESKS_COLLECTION, deskDoc.id), {
        availability: 'available',
        heldBy: null,
        heldByUserId: null,
        heldExpiresAt: null,
        heldTimeRange: null,
        updatedAt: serverTimestamp()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting pending selection:', error);
    throw error;
  }
};

// Helper function to get pending selections from desk documents
export const getPendingSelectionsFromDesks = (desks, currentUserId = null) => {
  const now = Date.now();
  const pending = [];
  
  desks.forEach(desk => {
    if (desk.availability === 'held' && desk.heldExpiresAt) {
      const expiresAt = desk.heldExpiresAt?.toMillis?.() || desk.heldExpiresAt;
      
      // Only include active holds
      if (expiresAt > now) {
        pending.push({
          id: desk.id,
          deskId: desk.id,
          userId: desk.heldByUserId,
          userName: desk.heldBy,
          expiresAt: expiresAt,
          fromDate: desk.heldTimeRange?.fromDate,
          fromTime: desk.heldTimeRange?.fromTime,
          toDate: desk.heldTimeRange?.toDate,
          toTime: desk.heldTimeRange?.toTime
        });
      }
    }
  });
  
  return pending;
};

// Clean up expired holds on desks
export const cleanupExpiredHolds = async () => {
  try {
    const desksRef = collection(db, DESKS_COLLECTION);
    const desksSnapshot = await getDocs(desksRef);
    const now = Date.now();
    
    const expiredDesks = [];
    desksSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (data.availability === 'held' && data.heldExpiresAt) {
        const expiresAt = data.heldExpiresAt?.toMillis?.() || data.heldExpiresAt;
        if (expiresAt <= now) {
          expiredDesks.push(docSnap.id);
        }
      }
    });
    
    // Clean up expired holds
    if (expiredDesks.length > 0) {
      await Promise.all(
        expiredDesks.map(async (deskDocId) => {
          try {
            await updateDoc(doc(db, DESKS_COLLECTION, deskDocId), {
              availability: 'available',
              heldBy: null,
              heldByUserId: null,
              heldExpiresAt: null,
              heldTimeRange: null,
              updatedAt: serverTimestamp()
            });
          } catch (error) {
            console.error('Error cleaning up expired hold:', error);
          }
        })
      );
    }
  } catch (error) {
    console.error('Error cleaning up expired holds:', error);
  }
};

export const subscribeToDesks = (callback) => {
  const desksRef = collection(db, DESKS_COLLECTION);
  
  return onSnapshot(desksRef, (snapshot) => {
    const desks = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id || doc.id,
        ...data,
        firestoreId: doc.id
      };
    });
    callback(desks);
  }, (error) => {
    console.error('Error in desks subscription:', error);
  });
};

export const getDesksWithAvailability = async (fromDate, fromTime, toDate, toTime, currentUserId = null) => {
  try {
    const [desks, bookings] = await Promise.all([
      getDesks(),
      getBookings()
    ]);
    
    const uniqueDesks = new Map();
    desks.forEach(desk => {
      if (desk.id && !uniqueDesks.has(desk.id)) {
        uniqueDesks.set(desk.id, desk);
      }
    });
    
    // Return only desks from Firestore - no default fallback
    const desksArray = Array.from(uniqueDesks.values());
    
    const requestedRange = {
      start: { date: fromDate, time: fromTime },
      end: { date: toDate, time: toTime }
    };
    
    // Clean up expired holds periodically
    cleanupExpiredHolds().catch(console.error);
    
    return desksArray.map(desk => {
      // Check if desk's stored status matches the requested time range
      const deskTimeRange = desk.heldTimeRange || desk.bookedTimeRange;
      let useDeskStatus = false;
      
      if (deskTimeRange) {
        const deskRange = {
          start: { date: deskTimeRange.fromDate, time: deskTimeRange.fromTime },
          end: { date: deskTimeRange.toDate, time: deskTimeRange.toTime }
        };
        useDeskStatus = checkTimeOverlap(requestedRange.start, requestedRange.end, deskRange.start, deskRange.end);
      }
      
      // Use desk status if it matches the time range, otherwise check bookings/pending
      if (useDeskStatus && desk.availability === 'booked') {
        // If current user owns this booking, don't show as booked
        if (currentUserId && desk.bookedByUserId === currentUserId) {
          return {
            ...desk,
            isBooked: false,
            bookedBy: null,
            bookingId: null,
            isPending: false,
            pendingBy: null
          };
        }
        return {
          ...desk,
          isBooked: true,
          bookedBy: desk.bookedBy,
          bookingId: null, // We'd need to find the actual booking ID
          isPending: false,
          pendingBy: null
        };
      }
      
      if (useDeskStatus && desk.availability === 'held') {
        // If current user holds this, don't show as pending
        if (currentUserId && desk.heldByUserId === currentUserId) {
          return {
            ...desk,
            isBooked: false,
            bookedBy: null,
            isPending: false,
            pendingBy: null
          };
        }
        return {
          ...desk,
          isBooked: false,
          bookedBy: null,
          isPending: true,
          pendingBy: desk.heldBy
        };
      }
      
      // Fall back to checking bookings
      const overlappingBooking = bookings.find(booking => {
        if (booking.deskId !== desk.id) return false;
        if (!booking.fromDate || !booking.fromTime || !booking.toDate || !booking.toTime) return false;
        
        const bookingRange = {
          start: { date: booking.fromDate, time: booking.fromTime },
          end: { date: booking.toDate, time: booking.toTime }
        };
        
        return checkTimeOverlap(requestedRange.start, requestedRange.end, bookingRange.start, bookingRange.end);
      });
      
      // Check for held status from desk document
      let overlappingPending = null;
      const now = Date.now();
      if (desk.availability === 'held' && desk.heldTimeRange && desk.heldExpiresAt) {
        const heldExpiresAt = desk.heldExpiresAt?.toMillis?.() || desk.heldExpiresAt;
        if (heldExpiresAt > now) {
          const heldRange = {
            start: { date: desk.heldTimeRange.fromDate, time: desk.heldTimeRange.fromTime },
            end: { date: desk.heldTimeRange.toDate, time: desk.heldTimeRange.toTime }
          };
          
          if (checkTimeOverlap(requestedRange.start, requestedRange.end, heldRange.start, heldRange.end)) {
            if (currentUserId && desk.heldByUserId === currentUserId) {
              overlappingPending = null;
            } else {
              overlappingPending = {
                userId: desk.heldByUserId,
                userName: desk.heldBy,
                expiresAt: heldExpiresAt,
                fromDate: desk.heldTimeRange.fromDate,
                fromTime: desk.heldTimeRange.fromTime,
                toDate: desk.heldTimeRange.toDate,
                toTime: desk.heldTimeRange.toTime
              };
            }
          }
        }
      }
      
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
        isPending: !!overlappingPending,
        pendingBy: overlappingPending ? overlappingPending.userName : null
      };
    });
  } catch (error) {
    console.error('Error getting desks with availability:', error);
    throw error;
  }
};


