import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/toast';
import Login from './pages/Login';
import Home from './pages/Home';
import BookDesk from './pages/BookDesk';
import { Loader2, Sparkles } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <div className="absolute inset-0 bg-blue-600/20 blur-xl rounded-full"></div>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600 animate-pulse" />
            <p className="text-base font-semibold text-muted-foreground">Loading rDesk...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/book" element={user ? <BookDesk /> : <Navigate to="/login" replace />} />
      <Route path="/" element={user ? <Home /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
