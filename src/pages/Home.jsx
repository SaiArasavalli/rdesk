import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/toast';
import { useFirestore } from '../hooks/useFirestore';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Calendar, Clock, Trash2, Plus, LogOut, User, MapPin, CheckCircle2, XCircle, Sparkles } from 'lucide-react';

function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const { deleteBooking, subscribeToBookings } = useFirestore();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time bookings for this user
    const unsubscribe = subscribeToBookings(user.id, (userBookings) => {
      setBookings(userBookings);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      await deleteBooking(bookingId);
      showToast('Booking cancelled successfully', 'success');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      showToast('An error occurred', 'error');
    }
  };

  const isActiveBooking = (booking) => {
    if (booking.fromDate && booking.fromTime && booking.toDate && booking.toTime) {
      const endDateTime = new Date(`${booking.toDate}T${booking.toTime}`);
      return endDateTime > new Date();
    }
    // Legacy format: check if date is today or future
    if (booking.date) {
      const bookingDate = new Date(booking.date);
      bookingDate.setHours(23, 59, 59, 999);
      return bookingDate >= new Date();
    }
    return false;
  };

  const formatDateTime = (booking) => {
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
    
    // Legacy format
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

  const activeBookings = bookings.filter(isActiveBooking).sort((a, b) => {
    const dateA = a.fromDate ? new Date(`${a.fromDate}T${a.fromTime}`) : new Date(a.date);
    const dateB = b.fromDate ? new Date(`${b.fromDate}T${b.fromTime}`) : new Date(b.date);
    return dateA - dateB;
  });

  const pastBookings = bookings.filter(b => !isActiveBooking(b)).sort((a, b) => {
    const dateA = a.toDate ? new Date(`${a.toDate}T${a.toTime}`) : new Date(a.date);
    const dateB = b.toDate ? new Date(`${b.toDate}T${b.toTime}`) : new Date(b.date);
    return dateB - dateA;
  });


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <div className="absolute inset-0 bg-blue-600/20 blur-lg rounded-full"></div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              rDesk
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200/50">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-foreground">{user.name}</span>
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
        {/* Hero Section */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-2">
              My Bookings
            </h2>
            <p className="text-muted-foreground">
              Manage your workspace reservations
            </p>
          </div>
          <Button 
            onClick={() => navigate('/book')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-11 px-6"
          >
            <Plus className="h-4 w-4 mr-2" />
            Book a Desk
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-sm text-muted-foreground font-medium">Loading bookings...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Active Bookings */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <h3 className="text-xl font-bold text-foreground">
                    Active Bookings
                  </h3>
                  <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded-full">
                    {activeBookings.length}
                  </span>
                </div>
              </div>
              {activeBookings.length > 0 ? (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {activeBookings.map((booking) => {
                    const dateTime = formatDateTime(booking);
                    return (
                      <Card 
                        key={booking.id} 
                        className="border-2 border-green-200/50 bg-gradient-to-br from-white to-green-50/30 shadow-lg hover:shadow-xl transition-all duration-300 group"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <MapPin className="h-5 w-5 text-blue-600" />
                                <CardTitle className="text-xl font-bold text-foreground">
                                  {booking.deskId}
                                </CardTitle>
                              </div>
                              <div className="space-y-1 mt-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{dateTime.date}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span>{dateTime.time}</span>
                                </div>
                              </div>
                            </div>
                            <div className="px-2 py-1 bg-green-100 rounded-full">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="w-full h-10 font-semibold hover:shadow-lg transition-all"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Cancel Booking
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-2 border-dashed border-muted-foreground/20 bg-gradient-to-br from-white to-slate-50/50">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="relative mb-4">
                      <Calendar className="h-16 w-16 text-muted-foreground/40" />
                      <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"></div>
                    </div>
                    <h4 className="text-lg font-semibold text-foreground mb-2">No Active Bookings</h4>
                    <p className="text-sm text-muted-foreground text-center mb-6">
                      Book your first desk to get started
                    </p>
                    <Button 
                      onClick={() => navigate('/book')}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Book a Desk
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Past Bookings */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                  <XCircle className="h-4 w-4 text-slate-600" />
                  <h3 className="text-xl font-bold text-foreground">
                    Past Bookings
                  </h3>
                  <span className="px-2 py-0.5 bg-slate-600 text-white text-xs font-bold rounded-full">
                    {pastBookings.length}
                  </span>
                </div>
              </div>
              {pastBookings.length > 0 ? (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {pastBookings.map((booking) => {
                    const dateTime = formatDateTime(booking);
                    return (
                      <Card 
                        key={booking.id} 
                        className="border-2 border-slate-200/50 bg-gradient-to-br from-white to-slate-50/30 shadow-md hover:shadow-lg transition-all duration-300 opacity-90"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <MapPin className="h-5 w-5 text-slate-500" />
                                <CardTitle className="text-xl font-bold text-slate-700">
                                  {booking.deskId}
                                </CardTitle>
                              </div>
                              <div className="space-y-1 mt-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{dateTime.date}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span>{dateTime.time}</span>
                                </div>
                              </div>
                            </div>
                            <div className="px-2 py-1 bg-slate-100 rounded-full">
                              <XCircle className="h-4 w-4 text-slate-500" />
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-2 border-dashed border-muted-foreground/20 bg-gradient-to-br from-white to-slate-50/50">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="relative mb-4">
                      <Clock className="h-16 w-16 text-muted-foreground/40" />
                      <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full"></div>
                    </div>
                    <h4 className="text-lg font-semibold text-foreground mb-2">No Past Bookings</h4>
                    <p className="text-sm text-muted-foreground text-center">
                      Your completed bookings will appear here
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>

    </div>
  );
}

export default Home;
