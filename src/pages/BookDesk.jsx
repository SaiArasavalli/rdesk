import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/toast';
import { useFirestore } from '../hooks/useFirestore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import DeskLayout from '../components/DeskLayout';
import { Calendar, Clock, ArrowLeft, ArrowRight, CheckCircle2, Loader2, AlertCircle, Sparkles, LogOut, User } from 'lucide-react';

function BookDesk() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState(1); // 1: date/time selection, 2: desk selection
  const [fromDate, setFromDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toDate, setToDate] = useState('');
  const [toTime, setToTime] = useState('');
  const [desks, setDesks] = useState([]);
  const [selectedDesk, setSelectedDesk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

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
      // Only show loading on initial fetch
      fetchDesks(true);
      
      // Subscribe to booking changes to update desk availability in real-time
      // Don't show loading spinner for real-time updates
      const unsubscribe = subscribeToBookings(null, async () => {
        await fetchDesks(false);
      });

      return () => unsubscribe();
    }
  }, [step, fromDate, fromTime, toDate, toTime]);

  // Also subscribe to pending selections changes to update availability
  // Don't show loading for pending selection updates
  useEffect(() => {
    if (step === 2 && fromDate && fromTime && toDate && toTime) {
      const timeoutId = setTimeout(() => {
        fetchDesks(false);
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

  const fetchDesks = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const desks = await getDesksWithAvailability(fromDate, fromTime, toDate, toTime);
      
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
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleNext = () => {
    if (!fromDate || !fromTime || !toDate || !toTime) {
      showToast('Please fill in all date and time fields', 'error');
      return;
    }

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
    if (step === 1) {
      navigate('/');
    } else {
      setStep(1);
      setSelectedDesk(null);
      setDesks([]);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Header */}
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

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <div className="mb-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-2">
            {step === 1 ? 'Select Date & Time' : 'Choose Your Desk'}
          </h2>
          <p className="text-muted-foreground">
            {step === 1 
              ? 'Choose when you want to book a desk' 
              : 'Select an available desk for your selected time period'}
          </p>
        </div>

        {step === 1 ? (
          <div className="max-w-4xl mx-auto">
            <Card className="border-2 border-blue-200/50 bg-gradient-to-br from-white to-blue-50/30 shadow-lg">
              <CardContent className="pt-8 pb-8 px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* From Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-blue-200/50">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="text-xl font-bold text-foreground">From</span>
                    </div>
                    <div className="space-y-4">
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
                          className="h-12 border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-base"
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
                          className="h-12 border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-base"
                        />
                      </div>
                    </div>
                  </div>

                  {/* To Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-indigo-200/50">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Clock className="h-5 w-5 text-indigo-600" />
                      </div>
                      <span className="text-xl font-bold text-foreground">To</span>
                    </div>
                    <div className="space-y-4">
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
                          className="h-12 border-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-base"
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
                          className="h-12 border-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-base"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 flex justify-end gap-4">
              <Button 
                variant="outline" 
                onClick={handleBack}
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
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Connection Status */}
            {!isConnected && (
              <div className="flex items-center gap-3 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg max-w-4xl mx-auto">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <p className="text-sm font-medium text-yellow-800">
                  Real-time updates unavailable. Reconnecting...
                </p>
              </div>
            )}

            {/* Loading State - only show on initial load, not on real-time updates */}
            {loading && desks.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                  <p className="text-base font-medium text-muted-foreground">Loading desk availability...</p>
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
              <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 max-w-4xl mx-auto">
                <CardContent className="pt-6 pb-6 px-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-7 w-7 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-foreground mb-1">
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

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 mt-8">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="h-11 px-6 border-2 hover:bg-slate-100"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
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
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default BookDesk;

