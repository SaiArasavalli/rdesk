import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import DeskLayout from './DeskLayout';
import { useToast } from './ui/toast';
import { useFirestore } from '../hooks/useFirestore';
import { Calendar, Clock, ArrowRight, ArrowLeft, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

function BookDeskModal({ open, onClose, onSuccess, user }) {
  const [step, setStep] = useState(1); // 1: date/time selection, 2: desk selection
  const [fromDate, setFromDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toDate, setToDate] = useState('');
  const [toTime, setToTime] = useState('');
  const [desks, setDesks] = useState([]);
  const [selectedDesk, setSelectedDesk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { showToast } = useToast();

  // Firestore for real-time updates
  const { 
    pendingSelections, 
    isConnected,
    createPendingSelection,
    deletePendingSelection,
    getDesksWithAvailability,
    createBooking,
    subscribeToBookings
  } = useFirestore();

  // Subscribe to real-time booking updates when in step 2
  useEffect(() => {
    if (step === 2 && fromDate && fromTime && toDate && toTime) {
      fetchDesks();
      
      // Subscribe to booking changes to update desk availability in real-time
      const unsubscribe = subscribeToBookings(null, async () => {
        // When bookings change, refresh desk availability
        await fetchDesks();
      });

      return () => unsubscribe();
    }
  }, [step, fromDate, fromTime, toDate, toTime]);

  // Also subscribe to pending selections changes to update availability
  useEffect(() => {
    if (step === 2 && fromDate && fromTime && toDate && toTime) {
      // Re-fetch desks when pending selections change (debounced to avoid too many calls)
      const timeoutId = setTimeout(() => {
        fetchDesks();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [pendingSelections, step, fromDate, fromTime, toDate, toTime]);

  // Register desk selection when user clicks a desk
  useEffect(() => {
    if (selectedDesk && !selectedDesk.isBooked && step === 2) {
      registerDeskSelection(selectedDesk.id);
    }
    return () => {
      if (selectedDesk) {
        cancelDeskSelection(selectedDesk.id);
      }
    };
  }, [selectedDesk, step]);

  const registerDeskSelection = async (deskId) => {
    try {
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
    }
  };

  const cancelDeskSelection = async (deskId) => {
    try {
      await deletePendingSelection(deskId, user.id);
    } catch (error) {
      console.error('Error cancelling desk selection:', error);
    }
  };

  const fetchDesks = async () => {
    try {
      setLoading(true);
      const desks = await getDesksWithAvailability(fromDate, fromTime, toDate, toTime);
      
      // Merge with real-time pending selections
      const desksWithPending = desks.map(desk => {
        const pending = pendingSelections.get(desk.id);
        return {
          ...desk,
          isPending: !!pending && pending.userId !== user.id,
          pendingBy: pending && pending.userId !== user.id ? pending.userName : null
        };
      });
      
      setDesks(desksWithPending);
    } catch (error) {
      console.error('Error fetching desks:', error);
      showToast('Failed to load desks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!fromDate || !fromTime || !toDate || !toTime) {
      showToast('Please fill in all date and time fields', 'error');
      return;
    }

    // Validate that end is after start
    const startDateTime = new Date(`${fromDate}T${fromTime}`);
    const endDateTime = new Date(`${toDate}T${toTime}`);

    if (endDateTime <= startDateTime) {
      showToast('End date/time must be after start date/time', 'error');
      return;
    }

    setStep(2);
  };

  const handleDeskSelect = (desk) => {
    if (desk.isBooked) {
      showToast('This desk is already booked for the selected time', 'error');
      return;
    }
    
    // Check if someone else is selecting this desk
    const pending = pendingSelections.get(desk.id);
    if (pending && pending.userId !== user.id) {
      showToast(`${pending.userName} is currently selecting this desk`, 'error');
      return;
    }
    
    setSelectedDesk(desk);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDesk) {
      showToast('Please select a desk', 'error');
      return;
    }

    // Validate all fields are present
    if (!fromDate || !fromTime || !toDate || !toTime) {
      showToast('Please fill in all date and time fields', 'error');
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

      // Cancel pending selection first
      if (selectedDesk) {
        await cancelDeskSelection(selectedDesk.id);
      }

      // Create booking in Firestore
      await createBooking(bookingData);
      
      showToast('Desk booked successfully!', 'success');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error booking desk:', error);
      showToast(error.message || 'An error occurred. Please try again.', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const handleClose = () => {
    // Cancel pending selection if exists
    if (selectedDesk) {
      cancelDeskSelection(selectedDesk.id);
    }
    setStep(1);
    setFromDate('');
    setFromTime('');
    setToDate('');
    setToTime('');
    setSelectedDesk(null);
    setDesks([]);
    setConfirming(false);
    onClose();
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[950px] max-h-[95vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {step === 1 ? 'Select Date & Time' : 'Choose Your Desk'}
              </DialogTitle>
              <DialogDescription className="text-base mt-2 text-muted-foreground">
                {step === 1 
                  ? 'Choose when you want to book a desk' 
                  : 'Select an available desk for your selected time period'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-6">
          {step === 1 ? (
            <div className="space-y-6">
              <Card className="border-2 border-blue-200/50 bg-gradient-to-br from-white to-blue-50/30 shadow-lg">
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* From Section */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-3 pb-3 border-b border-blue-200/50">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <span className="text-lg font-bold text-foreground">From</span>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label htmlFor="fromDate" className="text-sm font-semibold text-foreground">
                            Date
                          </label>
                          <Input
                            id="fromDate"
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            min={today}
                            required
                            className="h-11 border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="fromTime" className="text-sm font-semibold text-foreground">
                            Time
                          </label>
                          <Input
                            id="fromTime"
                            type="time"
                            value={fromTime}
                            onChange={(e) => setFromTime(e.target.value)}
                            required
                            className="h-11 border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* To Section */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-3 pb-3 border-b border-indigo-200/50">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Clock className="h-5 w-5 text-indigo-600" />
                        </div>
                        <span className="text-lg font-bold text-foreground">To</span>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label htmlFor="toDate" className="text-sm font-semibold text-foreground">
                            Date
                          </label>
                          <Input
                            id="toDate"
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            min={fromDate || today}
                            required
                            className="h-11 border-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="toTime" className="text-sm font-semibold text-foreground">
                            Time
                          </label>
                          <Input
                            id="toTime"
                            type="time"
                            value={toTime}
                            onChange={(e) => setToTime(e.target.value)}
                            required
                            className="h-11 border-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Connection Status */}
              {!isConnected && (
                <div className="flex items-center gap-3 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <p className="text-sm font-medium text-yellow-800">
                    Real-time updates unavailable. Reconnecting...
                  </p>
                </div>
              )}

              {/* Loading State */}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                    <p className="text-sm font-medium text-muted-foreground">Loading desk availability...</p>
                  </div>
                </div>
              ) : (
                <DeskLayout
                  desks={desks.map(desk => {
                    const pending = pendingSelections.get(desk.id);
                    return {
                      ...desk,
                      isPending: !!pending && pending.userId !== user.id,
                      pendingBy: pending && pending.userId !== user.id ? pending.userName : null
                    };
                  })}
                  onDeskClick={handleDeskSelect}
                  selectedDeskId={selectedDesk?.id}
                />
              )}

              {/* Selected Desk Info */}
              {selectedDesk && (
                <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="font-semibold text-foreground">
                          Selected: <span className="text-blue-600">{selectedDesk.id}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Click "Confirm Booking" to finalize your reservation
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50/50 gap-3">
          {step === 1 ? (
            <>
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="h-11 px-6 border-2 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleNext}
                className="h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="h-11 px-6 border-2 hover:bg-slate-100"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="h-11 px-6 border-2 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmBooking} 
                disabled={!selectedDesk || confirming}
                className="h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BookDeskModal;
