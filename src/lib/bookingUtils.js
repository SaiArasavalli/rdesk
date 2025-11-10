/**
 * Utility functions for booking-related operations
 */

/**
 * Check if two time ranges overlap
 */
export const checkTimeOverlap = (start1, end1, start2, end2) => {
  const s1 = new Date(`${start1.date}T${start1.time}`);
  const e1 = new Date(`${end1.date}T${end1.time}`);
  const s2 = new Date(`${start2.date}T${start2.time}`);
  const e2 = new Date(`${end2.date}T${end2.time}`);
  
  return s1 < e2 && s2 < e1;
};

/**
 * Check if a booking is currently active (not expired)
 */
export const isActiveBooking = (booking) => {
  if (booking.fromDate && booking.fromTime && booking.toDate && booking.toTime) {
    const endDateTime = new Date(`${booking.toDate}T${booking.toTime}`);
    return endDateTime > new Date();
  }
  if (booking.date) {
    const bookingDate = new Date(booking.date);
    bookingDate.setHours(23, 59, 59, 999);
    return bookingDate >= new Date();
  }
  return false;
};

/**
 * Format booking date and time for display
 */
export const formatDateTime = (booking) => {
  if (booking.fromDate && booking.fromTime && booking.toDate && booking.toTime) {
    const fromDate = new Date(`${booking.fromDate}T${booking.fromTime}`);
    const toDate = new Date(`${booking.toDate}T${booking.toTime}`);
    
    const fromDateStr = fromDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    const fromTimeStr = fromDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
    const toTimeStr = toDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
    
    return {
      date: fromDateStr,
      time: `${fromTimeStr} - ${toTimeStr}`
    };
  }
  
  if (booking.date) {
    return {
      date: new Date(booking.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: 'All day'
    };
  }
  
  return { date: 'Unknown', time: '' };
};

