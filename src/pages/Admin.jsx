import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/toast';
import { useFirestore } from '../hooks/useFirestore';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { initializeDesks } from '../services/firestore';
import { Calendar, Clock, MapPin, LogOut, User, Sparkles, Settings, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { isActiveBooking, formatDateTime } from '../lib/bookingUtils';

function Admin() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const { getBookings } = useFirestore();
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [initResult, setInitResult] = useState(null);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    loadAllBookings();
  }, [user]);

  const loadAllBookings = async () => {
    try {
      setLoading(true);
      const bookings = await getBookings();
      // Sort by date/time (newest first)
      const sortedBookings = bookings.sort((a, b) => {
        const dateA = a.fromDate ? new Date(`${a.fromDate}T${a.fromTime}`) : new Date(a.date || 0);
        const dateB = b.fromDate ? new Date(`${b.fromDate}T${b.fromTime}`) : new Date(b.date || 0);
        return dateB - dateA;
      });
      setAllBookings(sortedBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      showToast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeDesks = async () => {
    setInitializing(true);
    setInitError(null);
    setInitResult(null);
    
    try {
      const result = await initializeDesks();
      setInitResult(result);
      showToast('Desks initialized successfully!', 'success');
    } catch (err) {
      console.error(err);
      setInitError(err.message || 'Failed to initialize desks');
      showToast('Failed to initialize desks', 'error');
    } finally {
      setInitializing(false);
    }
  };

  const activeBookings = allBookings.filter(isActiveBooking);
  const pastBookings = allBookings.filter(b => !isActiveBooking(b));

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
              rDesk Admin
            </h1>
          </button>
          
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
            Admin Dashboard
          </h2>
          <p className="text-muted-foreground">
            Manage desks and view all employee bookings
          </p>
        </div>

        {/* Initialize Desks Section */}
        <div className="mb-8">
          <Card className="border-2 border-blue-200/50 bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Settings className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-foreground">
                    Desk Management
                  </CardTitle>
                  <CardDescription>
                    Initialize or reinitialize all desks in the system
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleInitializeDesks} 
                disabled={initializing}
                className="w-full sm:w-auto h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {initializing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Initialize Desks
                  </>
                )}
              </Button>

              {initError && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-800 mb-1">
                        Error
                      </p>
                      <p className="text-sm text-red-700">
                        {initError}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {initResult && (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-emerald-800 mb-3">
                        Initialization Complete!
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-emerald-700">Created:</span>
                          <span className="font-bold text-emerald-800">{initResult.created}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-700">Skipped:</span>
                          <span className="font-bold text-emerald-800">{initResult.skipped}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-emerald-200">
                          <span className="font-semibold text-emerald-800">Total:</span>
                          <span className="font-bold text-emerald-800">{initResult.total}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                This will create 12 desks (desk-1 through desk-12) with their positions on the map.
                Safe to run multiple times - existing desks will be skipped.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* All Bookings Section */}
        <div className="space-y-8">
          {/* Active Bookings */}
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
                    All current and upcoming reservations
                  </p>
                </div>
              </div>
              <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
                <span className="text-sm font-bold text-emerald-700">
                  {activeBookings.length} {activeBookings.length === 1 ? 'booking' : 'bookings'}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                  <p className="text-sm font-medium text-muted-foreground">Loading bookings...</p>
                </div>
              </div>
            ) : activeBookings.length > 0 ? (
              <Card className="border border-slate-200 bg-white shadow-sm">
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-200">
                    {activeBookings.map((booking) => {
                      const dateTime = formatDateTime(booking);
                      return (
                        <div 
                          key={booking.id} 
                          className="p-4 hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="flex-shrink-0">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                  <MapPin className="h-4 w-4 text-emerald-600" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                    Desk
                                  </p>
                                  <p className="text-sm font-bold text-foreground truncate">
                                    {booking.deskId}
                                  </p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                    Employee
                                  </p>
                                  <p className="text-sm font-semibold text-foreground truncate">
                                    {booking.userName}
                                  </p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                    Date
                                  </p>
                                  <p className="text-sm font-semibold text-foreground truncate">
                                    {dateTime.date}
                                  </p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                    Time
                                  </p>
                                  <p className="text-sm font-semibold text-foreground truncate">
                                    {dateTime.time}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-md">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              </div>
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
                    <div className="p-6 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl">
                      <Calendar className="h-12 w-12 text-slate-400" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white" />
                  </div>
                  <h4 className="text-xl font-bold text-foreground mb-2">No Active Bookings</h4>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    There are no active bookings at the moment.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Past Bookings */}
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
                    Historical booking records
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
                              <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4">
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
                                    Employee
                                  </p>
                                  <p className="text-sm font-semibold text-slate-600 truncate">
                                    {booking.userName}
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
                    No past bookings found.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Admin;

