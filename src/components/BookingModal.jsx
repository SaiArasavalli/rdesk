import React from 'react';
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
import { Calendar, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';

function BookingModal({ desk, userName, setUserName, selectedDate, onBook, onClose, open }) {
  const isBooked = desk.isBooked;

  const handleSubmit = (e) => {
    e.preventDefault();
    onBook();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" onOpenChange={onClose}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isBooked ? 'Cancel Booking' : 'Book Desk'}
          </DialogTitle>
          <DialogDescription>
            {isBooked 
              ? 'Are you sure you want to cancel this booking?' 
              : 'Enter your details to book this desk'}
          </DialogDescription>
        </DialogHeader>

        <Card className="border-2 bg-muted/30">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-xs font-semibold text-primary">#{desk.id.split('-')[1]}</span>
              </div>
              <div>
                <p className="font-medium">Desk {desk.id}</p>
                <p className="text-xs text-muted-foreground">Desk ID: {desk.id}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm border-t pt-4">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {new Date(selectedDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>

            {isBooked && (
              <div className="flex items-center gap-3 text-sm border-t pt-4">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Currently booked by</p>
                  <p className="font-medium text-destructive">{desk.bookedBy}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isBooked ? (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={onBook}
              className="w-full sm:w-auto"
            >
              Cancel Booking
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Keep Booking
            </Button>
          </DialogFooter>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="userName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Your Name
              </label>
              <Input
                id="userName"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                required
                autoFocus
                className="w-full"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
              >
                Book Desk
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default BookingModal;
