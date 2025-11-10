import { useEffect, useState } from 'react';
import { 
  subscribeToDesks,
  subscribeToBookings,
  getDesksWithAvailability,
  createPendingSelection,
  deletePendingSelection,
  createBooking,
  deleteBooking,
  getBookings,
  getPendingSelectionsFromDesks,
  cleanupExpiredHolds
} from '../services/firestore';

export function useFirestore() {
  const [pendingSelections, setPendingSelections] = useState(new Map());

  useEffect(() => {
    // Subscribe to desks and extract pending selections from them
    const unsubscribeDesks = subscribeToDesks((desks) => {
      const pending = getPendingSelectionsFromDesks(desks);
      const pendingMap = new Map();
      pending.forEach(sel => {
        if (sel.deskId) {
          pendingMap.set(sel.deskId, sel);
        }
      });
      setPendingSelections(pendingMap);
    });

    // Set up periodic cleanup of expired holds (every 10 seconds)
    const cleanupInterval = setInterval(() => {
      cleanupExpiredHolds().catch(error => {
        console.error('Error in periodic cleanup:', error);
      });
    }, 10000); // Run every 10 seconds to catch expired holds quickly

    // Run cleanup immediately on mount
    cleanupExpiredHolds().catch(error => {
      console.error('Error in initial cleanup:', error);
    });

    return () => {
      unsubscribeDesks();
      clearInterval(cleanupInterval);
    };
  }, []);

  const subscribeToUserBookings = (userId, callback) => {
    return subscribeToBookings(userId, callback);
  };

  return {
    pendingSelections,
    createPendingSelection,
    deletePendingSelection,
    createBooking,
    deleteBooking,
    getDesksWithAvailability,
    subscribeToBookings: subscribeToUserBookings,
    getBookings
  };
}

