import { useEffect, useState } from 'react';
import { 
  subscribeToPendingSelections,
  subscribeToBookings,
  getDesksWithAvailability,
  createPendingSelection,
  deletePendingSelection,
  createBooking,
  deleteBooking,
  getBookings
} from '../services/firestore';
import { initializeDesks } from '../services/firestore';

// Custom hook for Firestore real-time updates
export function useFirestore() {
  const [pendingSelections, setPendingSelections] = useState(new Map());
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Initialize desks if needed
    initializeDesks().catch(console.error);

    // Subscribe to pending selections
    const unsubscribePending = subscribeToPendingSelections((pending) => {
      const pendingMap = new Map();
      pending.forEach(sel => {
        pendingMap.set(sel.deskId, sel);
      });
      setPendingSelections(pendingMap);
    });

    return () => {
      unsubscribePending();
    };
  }, []);

  // Function to subscribe to bookings (used in Home component)
  const subscribeToUserBookings = (userId, callback) => {
    return subscribeToBookings(userId, callback);
  };

  return {
    pendingSelections,
    isConnected,
    createPendingSelection,
    deletePendingSelection,
    createBooking,
    deleteBooking,
    getDesksWithAvailability,
    subscribeToBookings: subscribeToUserBookings,
    getBookings
  };
}

