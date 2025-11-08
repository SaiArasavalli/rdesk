import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/toast';
import { useFirestore } from '../hooks/useFirestore';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { DateTimePicker } from '../components/ui/date-time-picker';
import DeskLayout from '../components/DeskLayout';
import { Calendar, Clock, ArrowLeft, CheckCircle2, Loader2, AlertCircle, Sparkles, LogOut, User } from 'lucide-react';

function BookDesk() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  // Prevent admin from booking desks
  React.useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/');
      showToast('Admin users cannot book desks', 'error');
    }
  }, [user, navigate, showToast]);
  const [fromDate, setFromDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toDate, setToDate] = useState('');
  const [toTime, setToTime] = useState('');
  const [desks, setDesks] = useState([]);
  const [selectedDesk, setSelectedDesk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const hasRegisteredRef = useRef(false);
  const expirationTimeRef = useRef(null);
  const timerRef = useRef(null);

  const { 
    pendingSelections, 
    isConnected,
    createPendingSelection,
    deletePendingSelection,
    getDesksWithAvailability,
    createBooking,
    subscribeToBookings,
    getBookings
  } = useFirestore();

  useEffect(() => {
    if (fromDate && fromTime && toDate && toTime) {
      const startDateTime = new Date(`${fromDate}T${fromTime}`);
      const endDateTime = new Date(`${toDate}T${toTime}`);
      
      if (endDateTime > startDateTime) {
        fetchDesks(true);
        
        const unsubscribe = subscribeToBookings(null, async () => {
          await fetchDesks(false);
        });

        return () => unsubscribe();
      }
    }
  }, [fromDate, fromTime, toDate, toTime]);

  useEffect(() => {
    if (fromDate && fromTime && toDate && toTime) {
      const startDateTime = new Date(`${fromDate}T${fromTime}`);
      const endDateTime = new Date(`${toDate}T${toTime}`);
      
      if (endDateTime > startDateTime) {
        const timeoutId = setTimeout(() => {
          fetchDesks(false);
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [pendingSelections, fromDate, fromTime, toDate, toTime]);

  // Reset registration ref when selected desk changes
  useEffect(() => {
    hasRegisteredRef.current = false;
    expirationTimeRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeRemaining(null);
  }, [selectedDesk?.id]);

  useEffect(() => {
    if (selectedDesk && !selectedDesk.isBooked && fromDate && fromTime && toDate && toTime) {
      // Check if pending selection already exists for this desk
      const existingPending = pendingSelections.get(selectedDesk.id);
      const alreadyRegistered = existingPending && existingPending.userId === user?.id;
      
      // Only register if it doesn't already exist and we haven't registered yet
      if (!alreadyRegistered && !hasRegisteredRef.current) {
        hasRegisteredRef.current = true;
        const selectionStartTime = Date.now();
        expirationTimeRef.current = selectionStartTime + 60000; // 60 seconds = 1 minute
        setTimeRemaining(60);
        
        registerDeskSelection(selectedDesk.id);
      } else if (existingPending && existingPending.userId === user?.id) {
        // If already registered, use Firestore expiration time
        const expiresAt = existingPending.expiresAt?.toMillis?.() || existingPending.expiresAt;
        if (expiresAt && typeof expiresAt === 'number') {
          expirationTimeRef.current = expiresAt;
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
          setTimeRemaining(remaining);
        }
      }
      
      // Create timer if one doesn't exist
      if (!timerRef.current) {
        timerRef.current = setInterval(async () => {
          const now = Date.now();
          let remaining = 0;
          
          // Use Firestore expiration if available, otherwise use ref
          const currentPending = Array.from(pendingSelections.values()).find(
            p => p.userId === user?.id && p.deskId === selectedDesk.id
          );
          
          if (currentPending && currentPending.expiresAt) {
            const expiresAt = currentPending.expiresAt?.toMillis?.() || currentPending.expiresAt;
            if (expiresAt && typeof expiresAt === 'number') {
              expirationTimeRef.current = expiresAt;
              remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
            } else if (expirationTimeRef.current) {
              remaining = Math.max(0, Math.floor((expirationTimeRef.current - now) / 1000));
            }
          } else if (expirationTimeRef.current) {
            // Use ref expiration time
            remaining = Math.max(0, Math.floor((expirationTimeRef.current - now) / 1000));
          }
          
          setTimeRemaining(remaining);
          
          if (remaining <= 0) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            hasRegisteredRef.current = false;
            expirationTimeRef.current = null;
            // Cancel the selection in Firestore to update availability back to "available"
            if (selectedDesk?.id && user?.id) {
              await cancelDeskSelection(selectedDesk.id);
            }
            setSelectedDesk(null);
            setTimeRemaining(null);
          }
        }, 1000);
      }
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    } else if (!selectedDesk) {
      hasRegisteredRef.current = false;
      expirationTimeRef.current = null;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTimeRemaining(null);
      const currentPending = Array.from(pendingSelections.values()).find(
        p => p.userId === user?.id
      );
      if (currentPending) {
        cancelDeskSelection(currentPending.deskId);
      }
    }
  }, [selectedDesk, fromDate, fromTime, toDate, toTime, pendingSelections, user?.id]);

  const registerDeskSelection = async (deskId) => {
    try {
      // Check if user already has a booking for this time range
      const bookings = await getBookings();
      const requestedRange = {
        start: { date: fromDate, time: fromTime },
        end: { date: toDate, time: toTime }
      };
      
      const userExistingBooking = bookings.find(booking => {
        if (booking.userId !== user?.id) return false;
        if (!booking.fromDate || !booking.fromTime || !booking.toDate || !booking.toTime) return false;
        
        const bookingRange = {
          start: { date: booking.fromDate, time: booking.fromTime },
          end: { date: booking.toDate, time: booking.toTime }
        };
        
        const start1 = new Date(`${bookingRange.start.date}T${bookingRange.start.time}`);
        const end1 = new Date(`${bookingRange.end.date}T${bookingRange.end.time}`);
        const start2 = new Date(`${requestedRange.start.date}T${requestedRange.start.time}`);
        const end2 = new Date(`${requestedRange.end.date}T${requestedRange.end.time}`);
        
        return start1 < end2 && start2 < end1;
      });
      
      if (userExistingBooking) {
        showToast(`You already have a booking for desk ${userExistingBooking.deskId} during this time period. You can only book one seat at a time.`, 'error');
        setSelectedDesk(null);
        setTimeRemaining(null);
        return;
      }
      
      // First, cancel any existing pending selections for this user
      const userPendingSelections = Array.from(pendingSelections.values()).filter(
        p => p.userId === user?.id && p.deskId !== deskId
      );
      
      if (userPendingSelections.length > 0) {
        // Cancel all previous pending selections
        for (const prevPending of userPendingSelections) {
          await cancelDeskSelection(prevPending.deskId);
        }
      }
      
      // Now create the new pending selection
      await createPendingSelection(deskId, {
        userId: user.id,
        userName: user.name,
        fromDate,
        fromTime,
        toDate,
        toTime
      });
    } catch (error) {
      console.error('Error registering desk selection:', error);
      showToast(error.message || 'Failed to select desk', 'error');
      setSelectedDesk(null);
      setTimeRemaining(null);
    }
  };

  const cancelDeskSelection = async (deskId) => {
    try {
      await deletePendingSelection(deskId, user.id);
    } catch (error) {
      console.error('Error cancelling desk selection:', error);
    }
  };

  const fetchDesks = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const desks = await getDesksWithAvailability(fromDate, fromTime, toDate, toTime, user?.id);
      setDesks(desks);
    } catch (error) {
      console.error('Error fetching desks:', error);
      showToast('Failed to load desks', 'error');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const validateDateTime = () => {
    if (!fromDate || !fromTime || !toDate || !toTime) {
      return false;
    }

    const now = new Date();
    const startDateTime = new Date(`${fromDate}T${fromTime}`);
    const endDateTime = new Date(`${toDate}T${toTime}`);

    // Check if start time is in the past
    if (startDateTime < now) {
      showToast('Start date/time cannot be in the past', 'error');
      return false;
    }

    // Check if end time is in the past
    if (endDateTime < now) {
      showToast('End date/time cannot be in the past', 'error');
      return false;
    }

    if (endDateTime <= startDateTime) {
      showToast('End date/time must be after start date/time', 'error');
      return false;
    }

    return true;
  };
  
  // Get current date and time for min validation
  const getCurrentDateTime = () => {
    const now = new Date();
    return {
      date: now.toISOString().split('T')[0],
      time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    };
  };

  const handleDeskSelect = async (desk) => {
    // Only block if desk is booked for the requested time range
    if (desk.isBooked) {
      return;
    }
    
    // Only block if desk is pending for the requested time range by another user
    if (desk.isPending && desk.pendingBy && desk.pendingBy !== user.name) {
      return;
    }
    
    // Check pending selections - only block if time ranges overlap
    const pending = pendingSelections.get(desk.id);
    if (pending && pending.userId !== user.id) {
      // Check if time ranges overlap
      if (pending.fromDate && pending.fromTime && pending.toDate && pending.toTime) {
        const pendingRange = {
          start: { date: pending.fromDate, time: pending.fromTime },
          end: { date: pending.toDate, time: pending.toTime }
        };
        const requestedRange = {
          start: { date: fromDate, time: fromTime },
          end: { date: toDate, time: toTime }
        };
        
        // Check for time overlap
        const start1 = new Date(`${pendingRange.start.date}T${pendingRange.start.time}`);
        const end1 = new Date(`${pendingRange.end.date}T${pendingRange.end.time}`);
        const start2 = new Date(`${requestedRange.start.date}T${requestedRange.start.time}`);
        const end2 = new Date(`${requestedRange.end.date}T${requestedRange.end.time}`);
        
        const overlaps = start1 < end2 && start2 < end1;
        
        // Only block if time ranges overlap
        if (overlaps) {
          return;
        }
      } else {
        // If no time info, block to be safe
        return;
      }
    }
    
    // If clicking the same desk, deselect it
    if (selectedDesk?.id === desk.id) {
      setSelectedDesk(null);
      return;
    }
    
    // If user already has a pending selection for a different desk, cancel it first
    const userPendingSelections = Array.from(pendingSelections.values()).filter(
      p => p.userId === user?.id && p.deskId !== desk.id
    );
    
    if (userPendingSelections.length > 0) {
      // Cancel all previous pending selections
      for (const prevPending of userPendingSelections) {
        await cancelDeskSelection(prevPending.deskId);
      }
    }
    
    // Set the new selected desk
    setSelectedDesk(desk);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDesk) {
      showToast('Please select a desk', 'error');
      return;
    }

    if (!validateDateTime()) {
      return;
    }

    if (!user || !user.id || !user.name) {
      showToast('User information is missing', 'error');
      return;
    }

    try {
      setConfirming(true);
      const bookingData = {
        deskId: selectedDesk.id,
        userId: user.id,
        userName: user.name,
        fromDate,
        fromTime,
        toDate,
        toTime
      };

      if (selectedDesk) {
        await cancelDeskSelection(selectedDesk.id);
      }

      await createBooking(bookingData);
      
      showToast('Desk booked successfully!', 'success');
      navigate('/');
    } catch (error) {
      console.error('Error booking desk:', error);
      showToast(error.message || 'An error occurred. Please try again.', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const handleBack = () => {
    if (selectedDesk) {
      cancelDeskSelection(selectedDesk.id);
    }
    navigate('/');
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-9 px-3"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
            <div className="relative">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <div className="absolute inset-0 bg-blue-600/20 blur-lg rounded-full"></div>
            </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                rDesk
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200/50">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-foreground">{user?.name}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => logout()}
              className="border-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-2">
            Book a Desk
          </h2>
          <p className="text-muted-foreground">
            Select your date, time, and desk to make a reservation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Date/Time Selection & Booking Summary */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-lg sticky top-24">
              <CardContent className="pt-6 pb-6 px-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                      Select Date & Time
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                          From
                        </label>
                        <DateTimePicker
                          dateValue={fromDate}
                          timeValue={fromTime}
                          onDateChange={(e) => {
                            const newDate = e.target.value;
                            setFromDate(newDate);
                            // If date changed to today and current time is in the past, clear the time
                            if (newDate === today && fromTime) {
                              const current = getCurrentDateTime();
                              if (fromTime < current.time) {
                                setFromTime('');
                                showToast('Please select a time in the future', 'error');
                              }
                            }
                          }}
                          onTimeChange={(e) => {
                            const newTime = e.target.value;
                            // Validate that the time is not in the past if date is today
                            if (fromDate === today) {
                              const current = getCurrentDateTime();
                              if (newTime < current.time) {
                                showToast('Start time cannot be in the past', 'error');
                                return;
                              }
                            }
                            setFromTime(newTime);
                          }}
                          minDate={today}
                          minTime={fromDate === today ? (() => {
                            const current = getCurrentDateTime();
                            return current.time;
                          })() : undefined}
                          datePlaceholder="Select date"
                          timePlaceholder="Select time"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                          To
                        </label>
                        <DateTimePicker
                          dateValue={toDate}
                          timeValue={toTime}
                          onDateChange={(e) => {
                            const newDate = e.target.value;
                            setToDate(newDate);
                            // If date changed to today and current time is in the past, clear the time
                            if (newDate === today && toTime) {
                              const current = getCurrentDateTime();
                              if (toTime < current.time) {
                                setToTime('');
                                showToast('Please select a time in the future', 'error');
                              }
                            }
                          }}
                          onTimeChange={(e) => {
                            const newTime = e.target.value;
                            // Validate that the time is not in the past if date is today
                            if (toDate === today) {
                              const current = getCurrentDateTime();
                              if (newTime < current.time) {
                                showToast('End time cannot be in the past', 'error');
                                return;
                              }
                            }
                            setToTime(newTime);
                          }}
                          minDate={fromDate || today}
                          minTime={toDate === today ? (() => {
                            const current = getCurrentDateTime();
                            return current.time;
                          })() : undefined}
                          datePlaceholder="Select date"
                          timePlaceholder="Select time"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                      Booking Summary
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border border-blue-100/50">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg mt-0.5">
                            <Calendar className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                              From
                            </p>
                            <p className="text-sm font-semibold text-foreground leading-tight">
                              {fromDate && fromTime 
                                ? `${new Date(fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` 
                                : 'Not selected'}
                            </p>
                            <p className="text-sm font-medium text-muted-foreground mt-0.5">
                              {fromTime 
                                ? new Date(`2000-01-01T${fromTime}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                                : '--:--'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100/50">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-indigo-100 rounded-lg mt-0.5">
                            <Clock className="h-4 w-4 text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                              To
                            </p>
                            <p className="text-sm font-semibold text-foreground leading-tight">
                              {toDate && toTime 
                                ? `${new Date(toDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` 
                                : 'Not selected'}
                            </p>
                            <p className="text-sm font-medium text-muted-foreground mt-0.5">
                              {toTime 
                                ? new Date(`2000-01-01T${toTime}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                                : '--:--'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                      {selectedDesk && (() => {
                        // Check if current user is holding this desk
                        const currentPending = Array.from(pendingSelections.values()).find(
                          p => p.userId === user?.id && p.deskId === selectedDesk.id
                        );
                        const isUserHolding = currentPending && currentPending.userId === user?.id;
                        
                        return isUserHolding ? (
                          <div className="pt-6 border-t border-slate-200">
                            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/50 to-teal-50/50 border border-emerald-100/50">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-emerald-100 rounded-lg mt-0.5">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                    Selected Desk
                                  </p>
                                  <p className="text-base font-bold text-foreground">
                                    {selectedDesk.id}
                                  </p>
                                  {timeRemaining !== null && timeRemaining > 0 ? (
                                    <div className="mt-3 space-y-2">
                                      <div className="p-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <div className="relative">
                                              <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
                                              <div className="absolute inset-0 bg-amber-400/20 blur-sm rounded-full"></div>
                                            </div>
                                            <span className="text-xs font-semibold text-amber-600/80 uppercase tracking-wider">
                                              1 Minute Timer
                                            </span>
                                          </div>
                                          <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-bold text-amber-700 tabular-nums tracking-tight">
                                              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                                            </span>
                                            <span className="text-xs font-semibold text-amber-600/70">
                                              remaining
                                            </span>
                                          </div>
                                        </div>
                                        <p className="text-xs font-medium text-amber-700/90 leading-tight pt-2 border-t border-amber-200/50">
                                          ⚠️ Please confirm your booking before the timer expires, or your selection will be released.
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Ready to confirm
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null;
                      })()}

                      {!isConnected && (
                        <div className="pt-6 border-t border-slate-200">
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50/80 border border-yellow-200/50">
                            <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                            <p className="text-xs font-medium text-yellow-800">
                              Reconnecting...
                            </p>
                          </div>
                        </div>
                      )}

                  <div className="pt-6 border-t border-slate-200 space-y-3">
                    <Button 
                      onClick={handleConfirmBooking} 
                      disabled={!selectedDesk || confirming || !validateDateTime()}
                      className="w-full h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {confirming ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Confirming...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Confirm Booking
                        </>
                      )}
                    </Button>
                  </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content - Desk Layout */}
              <div className="lg:col-span-2">
                {loading && desks.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                      <p className="text-sm font-medium text-muted-foreground">Loading desk availability...</p>
                    </div>
                  </div>
                ) : (
                  <DeskLayout
                    desks={desks}
                    onDeskClick={handleDeskSelect}
                    selectedDeskId={selectedDesk?.id}
                  />
                )}
              </div>
            </div>
      </main>
    </div>
  );
}

export default BookDesk;

