import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/toast';
import { useFirestore } from '../hooks/useFirestore';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Calendar, Clock, Trash2, Plus, LogOut, User, MapPin, CheckCircle2, XCircle, Sparkles, Settings, AlertTriangle } from 'lucide-react';
import { isActiveBooking, formatDateTime } from '../lib/bookingUtils';

function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const { deleteBooking, subscribeToBookings } = useFirestore();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [isPastBooking, setIsPastBooking] = useState(false);

  useEffect(() => {
    if (!user || user.role === 'admin') return;

    const unsubscribe = subscribeToBookings(user.id, (userBookings) => {
      setBookings(userBookings);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteBookingClick = (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId);
    const isPast = booking ? !isActiveBooking(booking) : false;
    setBookingToCancel(bookingId);
    setIsPastBooking(isPast);
    setCancelDialogOpen(true);
  };

  const handleDeleteBooking = async () => {
    if (!bookingToCancel) return;

    try {
      await deleteBooking(bookingToCancel);
      showToast(
        isPastBooking 
          ? 'Booking deleted successfully' 
          : 'Booking cancelled successfully', 
        'success'
      );
      setCancelDialogOpen(false);
      setBookingToCancel(null);
      setIsPastBooking(false);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      showToast('An error occurred', 'error');
      setCancelDialogOpen(false);
      setBookingToCancel(null);
      setIsPastBooking(false);
    }
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
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="relative">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <div className="absolute inset-0 bg-blue-600/20 blur-lg rounded-full"></div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              rDesk
            </h1>
          </button>
          
              <div className="flex items-center gap-4">
                {user.role === 'admin' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/admin')}
                    className="border-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Admin</span>
                  </Button>
                )}
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

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-2">
                  {user.role === 'admin' ? 'Admin Dashboard' : 'My Bookings'}
                </h2>
                <p className="text-muted-foreground">
                  {user.role === 'admin' 
                    ? 'Access the admin panel to manage desks and view all bookings'
                    : 'Manage your workspace reservations'}
                </p>
              </div>
              {user.role === 'admin' ? (
                <Button 
                  onClick={() => navigate('/admin')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-11 px-6"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin Panel
                </Button>
              ) : (
                <Button 
                  onClick={() => navigate('/book')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-11 px-6"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Book a Desk
                </Button>
              )}
            </div>

        {user.role === 'admin' ? (
          <Card className="border-2 border-dashed border-slate-200 bg-white/50 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="relative mb-6">
                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
                  <Settings className="h-12 w-12 text-blue-600" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 rounded-full border-4 border-white" />
              </div>
              <h4 className="text-xl font-bold text-foreground mb-2">Admin Dashboard</h4>
              <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
                As an admin, you can manage desks and view all employee bookings. You cannot book desks yourself.
              </p>
              <Button 
                onClick={() => navigate('/admin')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                <Settings className="h-4 w-4 mr-2" />
                Go to Admin Panel
              </Button>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-sm text-muted-foreground font-medium">Loading bookings...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Active Bookings Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-xl">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">
                      Active Bookings
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Upcoming and current reservations
                    </p>
                  </div>
                </div>
                <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
                  <span className="text-sm font-bold text-emerald-700">
                    {activeBookings.length} {activeBookings.length === 1 ? 'booking' : 'bookings'}
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
                        className="group relative overflow-hidden border-0 bg-white shadow-md hover:shadow-xl transition-all duration-300 rounded-xl"
                      >
                        {/* Gradient accent bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400" />
                        
                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                        </div>

                        <CardContent className="p-6 relative">
                          {/* Header with icon and status */}
                          <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg group-hover:shadow-emerald-200/50 transition-shadow">
                                  <MapPin className="h-5 w-5 text-white" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
                                  Desk
                                </p>
                                <h3 className="text-xl font-bold text-slate-900">
                                  {booking.deskId}
                                </h3>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              <span className="text-xs font-semibold text-emerald-700">Active</span>
                            </div>
                          </div>

                          {/* Date and Time Info */}
                          <div className="space-y-3 mb-5">
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-100 group-hover:border-emerald-100 transition-colors">
                              <div className="p-2 bg-white rounded-lg shadow-sm">
                                <Calendar className="h-4 w-4 text-emerald-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                  Date
                                </p>
                                <p className="text-sm font-bold text-slate-900">
                                  {dateTime.date}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-100 group-hover:border-emerald-100 transition-colors">
                              <div className="p-2 bg-white rounded-lg shadow-sm">
                                <Clock className="h-4 w-4 text-emerald-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                  Time
                                </p>
                                <p className="text-sm font-bold text-slate-900">
                                  {dateTime.time}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Cancel Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteBookingClick(booking.id)}
                            className="w-full h-10 font-semibold text-red-600 hover:text-white hover:bg-red-600 hover:border-red-600 transition-all border-red-200 rounded-lg shadow-sm hover:shadow-md"
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
                <Card className="border-2 border-dashed border-slate-200 bg-white/50 backdrop-blur-sm">
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <div className="relative mb-6">
                      <div className="p-6 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl">
                        <Calendar className="h-12 w-12 text-slate-400" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white" />
                    </div>
                    <h4 className="text-xl font-bold text-foreground mb-2">No Active Bookings</h4>
                    <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
                      You don't have any upcoming reservations. Book a desk to get started!
                    </p>
                        {user.role !== 'admin' && (
                          <Button 
                            onClick={() => navigate('/book')}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Book a Desk
                          </Button>
                        )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Past Bookings Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-xl">
                    <XCircle className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">
                      Past Bookings
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Completed reservations history
                    </p>
                  </div>
                </div>
                <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full">
                  <span className="text-sm font-bold text-slate-700">
                    {pastBookings.length} {pastBookings.length === 1 ? 'booking' : 'bookings'}
                  </span>
                </div>
              </div>
              {pastBookings.length > 0 ? (
                <Card className="border border-slate-200 bg-white shadow-sm">
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-200">
                      {pastBookings.map((booking) => {
                        const dateTime = formatDateTime(booking);
                        return (
                          <div 
                            key={booking.id} 
                            className="p-4 hover:bg-slate-50/50 transition-colors opacity-90"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="flex-shrink-0">
                                  <div className="p-2 bg-slate-100 rounded-lg">
                                    <MapPin className="h-4 w-4 text-slate-500" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                      Desk
                                    </p>
                                    <p className="text-sm font-bold text-slate-700 truncate">
                                      {booking.deskId}
                                    </p>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                      Date
                                    </p>
                                    <p className="text-sm font-semibold text-slate-600 truncate">
                                      {dateTime.date}
                                    </p>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                      Time
                                    </p>
                                    <p className="text-sm font-semibold text-slate-600 truncate">
                                      {dateTime.time}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteBookingClick(booking.id)}
                                  className="h-9 font-semibold text-muted-foreground hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all border-slate-200"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  <span className="hidden sm:inline">Delete</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-2 border-dashed border-slate-200 bg-white/50 backdrop-blur-sm">
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <div className="relative mb-6">
                      <div className="p-6 bg-gradient-to-br from-slate-50 to-indigo-50 rounded-2xl">
                        <Clock className="h-12 w-12 text-slate-400" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-slate-400 rounded-full border-4 border-white" />
                    </div>
                    <h4 className="text-xl font-bold text-foreground mb-2">No Past Bookings</h4>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                      Your completed bookings will appear here once you've finished using a desk.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Cancel/Delete Booking Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                {isPastBooking ? 'Delete Booking' : 'Cancel Booking'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-slate-600 pt-2">
              {isPastBooking 
                ? 'Are you sure you want to delete this past booking? This action cannot be undone.'
                : 'Are you sure you want to cancel this booking? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 sm:justify-end mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setBookingToCancel(null);
                setIsPastBooking(false);
              }}
              className="flex-1 sm:flex-initial"
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBooking}
              className="flex-1 sm:flex-initial bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isPastBooking ? 'Delete Booking' : 'Cancel Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Home;
