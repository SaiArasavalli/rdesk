import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle2, Circle, Clock, MapPin, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function DeskLayout({ desks, onDeskClick, selectedDeskId }) {
  const scale = 10;
  const viewBoxWidth = 100;
  const viewBoxHeight = 35;
  const [hoveredDesk, setHoveredDesk] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const mapContainerRef = useRef(null);

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.2;

  useEffect(() => {
    const handleWheel = (e) => {
      if (!svgRef.current) return;
      
      e.preventDefault();
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
      
      const zoomRatio = newZoom / zoom;
      const newPanX = mouseX - (mouseX - pan.x) * zoomRatio;
      const newPanY = mouseY - (mouseY - pan.y) * zoomRatio;
      
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    };

    const svg = svgRef.current;
    if (svg) {
      svg.addEventListener('wheel', handleWheel, { passive: false });
      return () => svg.removeEventListener('wheel', handleWheel);
    }
  }, [zoom, pan]);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    if (zoom >= MAX_ZOOM) return;
    const newZoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    if (zoom <= MIN_ZOOM) return;
    const newZoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
    setZoom(newZoom);
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFullscreen = async () => {
    if (!mapContainerRef.current) return;

    try {
      if (!isFullscreen) {
        if (mapContainerRef.current.requestFullscreen) {
          await mapContainerRef.current.requestFullscreen();
        } else if (mapContainerRef.current.webkitRequestFullscreen) {
          await mapContainerRef.current.webkitRequestFullscreen();
        } else if (mapContainerRef.current.msRequestFullscreen) {
          await mapContainerRef.current.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!document.webkitFullscreenElement || !!document.msFullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const formatBookingTime = (desk) => {
    if (!desk.isBooked) return null;
    
    if (desk.fromDate && desk.fromTime && desk.toDate && desk.toTime) {
      const fromDate = new Date(`${desk.fromDate}T${desk.fromTime}`);
      const toDate = new Date(`${desk.toDate}T${desk.toTime}`);
      
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
      
      return `${fromDateStr}\n${fromTimeStr} - ${toTimeStr}`;
    }
    
    if (desk.date) {
      const dateStr = new Date(desk.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return `All day\n${dateStr}`;
    }
    
    return null;
  };

  const getBookingTooltip = (desk) => {
    if (!desk.isBooked) return null;
    
    const timeRange = formatBookingTime(desk);
    if (!timeRange) return `Booked by ${desk.bookedBy}`;
    
    return `👤 ${desk.bookedBy}\n🕐 ${timeRange}`;
  };

  // Transform desk positions to have more spacing
  // Original positions were: x: 6, 19, 32, 45, 58, 71 (both rows) and y: 5 (top), 20 (bottom)
  // New positions with more spacing: spread them out more with better spacing
  const transformDeskPosition = (desk) => {
    // Map original positions to new spaced positions
    // Top row at y=7, bottom row at y=28, line at y=17.5
    const positionMap = {
      'desk-1': { x: 10, y: 7 },
      'desk-2': { x: 25, y: 7 },
      'desk-3': { x: 40, y: 7 },
      'desk-4': { x: 55, y: 7 },
      'desk-5': { x: 70, y: 7 },
      'desk-6': { x: 85, y: 7 },
      'desk-7': { x: 10, y: 28 },
      'desk-8': { x: 25, y: 28 },
      'desk-9': { x: 40, y: 28 },
      'desk-10': { x: 55, y: 28 },
      'desk-11': { x: 70, y: 28 },
      'desk-12': { x: 85, y: 28 }
    };
    
    const mapped = positionMap[desk.id];
    if (mapped) {
      return { ...desk, x: mapped.x, y: mapped.y };
    }
    // If desk doesn't have coordinates, use the original x/y from the desk object
    if (desk.x && desk.y) {
      return desk;
    }
    // Fallback: if no coordinates at all, don't render (return null will be filtered)
    return { ...desk, x: desk.x || 0, y: desk.y || 0 };
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <Card className="w-full max-w-6xl shadow-2xl border-2 border-blue-200/50 bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/20 overflow-hidden">
        <CardHeader className="pb-4 border-b bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Interactive Desk Map
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFullscreen}
                className="h-9 px-3"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-9 px-3"
                title="Reset view"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            Use mouse wheel to zoom, drag to pan around the map
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 p-6">
          <div 
            ref={mapContainerRef}
            className={`relative w-full ${isFullscreen ? 'h-screen flex items-center justify-center bg-white' : ''}`}
          >
            <div 
              ref={containerRef}
              className="relative w-full overflow-hidden rounded-xl border-2 border-blue-200/50 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30"
              style={{ height: isFullscreen ? 'calc(100vh - 2rem)' : '600px', cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
            <svg
              ref={svgRef}
              className="w-full h-full"
              width={viewBoxWidth * scale}
              height={viewBoxHeight * scale}
              viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
              xmlns="http://www.w3.org/2000/svg"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
          >
            <defs>
                <linearGradient id="tableGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--border))" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="hsl(var(--border))" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="hsl(var(--border))" stopOpacity="0.4" />
                </linearGradient>
              </defs>
              <line
                x1="5"
                y1="17.5"
                x2="95"
                y2="17.5"
                stroke="hsl(var(--border))"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.6"
              />

              {desks && desks.length > 0 ? desks.map((desk, index) => {
                const transformedDesk = transformDeskPosition(desk);
                const isBooked = transformedDesk.isBooked;
                const isPending = transformedDesk.isPending;
                const isSelected = selectedDeskId === transformedDesk.id;
                const isHovered = hoveredDesk === transformedDesk.id;
                const bookingTooltip = getBookingTooltip(transformedDesk);
                
                const uniqueKey = transformedDesk.id || transformedDesk.firestoreId || `desk-${index}`;
                
                const fillColor = isBooked 
                  ? 'hsl(var(--destructive))' 
                  : isSelected
                  ? 'hsl(var(--primary))'
                  : isPending
                  ? 'hsl(45, 93%, 47%)'
                  : 'hsl(var(--muted))';
                const strokeColor = isBooked 
                  ? 'hsl(var(--destructive))' 
                  : isSelected
                  ? 'hsl(var(--primary))'
                  : isPending
                  ? 'hsl(45, 93%, 47%)'
                  : 'hsl(var(--border))';
                const strokeWidth = isBooked || isSelected || isPending ? '2' : '1';

                return (
                  <g
                    key={uniqueKey}
                    className={cn(
                      "transition-colors duration-200",
                      !isBooked && !isPending && "cursor-pointer",
                      isSelected && !isBooked && "cursor-pointer",
                      isBooked && "cursor-not-allowed",
                      isPending && "cursor-not-allowed"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isBooked || isPending) {
                        return;
                      }
                      onDeskClick(transformedDesk);
                    }}
                    onMouseEnter={() => setHoveredDesk(transformedDesk.id)}
                    onMouseLeave={() => setHoveredDesk(null)}
                  >
                    <circle
                      cx={transformedDesk.x}
                      cy={transformedDesk.y}
                      r="5"
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      className={cn(
                        "transition-all duration-200",
                        isHovered && !isBooked && !isPending && !isSelected && "opacity-90",
                        isSelected && "shadow-lg filter drop-shadow-lg"
                      )}
                    />
                    
                    {isSelected && !isBooked && (
                      <circle
                        cx={transformedDesk.x}
                        cy={transformedDesk.y}
                        r="6.5"
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="1"
                        strokeOpacity="0.5"
                        className="animate-pulse"
                      />
                    )}
                    
                    {isBooked && (
                      <>
                        <text
                          x={transformedDesk.x}
                          y={transformedDesk.y + 0.8}
                          fontSize="2.5"
                          textAnchor="middle"
                          fill="white"
                          fontWeight="bold"
                          pointerEvents="none"
                          className="drop-shadow-lg"
                        >
                          {transformedDesk.id.replace('desk-', 'D')}
                        </text>
                        <circle
                          cx={transformedDesk.x}
                          cy={transformedDesk.y}
                          r="6"
                          fill="none"
                          stroke="hsl(var(--destructive))"
                          strokeWidth="0.8"
                          strokeOpacity="0.6"
                          strokeDasharray="1.5,1.5"
                        />
                      </>
                    )}
                    
                    {isPending && !isBooked && (
                      <>
                        <text
                          x={transformedDesk.x}
                          y={transformedDesk.y + 0.8}
                          fontSize="2.5"
                          textAnchor="middle"
                          fill="white"
                          fontWeight="bold"
                          pointerEvents="none"
                          className="drop-shadow-lg"
                        >
                          {transformedDesk.id.replace('desk-', 'D')}
                        </text>
                        <circle
                          cx={transformedDesk.x}
                          cy={transformedDesk.y}
                          r="6.5"
                          fill="none"
                          stroke="hsl(45, 93%, 47%)"
                          strokeWidth="0.8"
                          strokeOpacity="0.7"
                          strokeDasharray="1.5,1.5"
                          className="animate-pulse"
                        />
                      </>
                    )}
                    
                    {!isBooked && !isPending && (
                      <text
                        x={transformedDesk.x}
                        y={transformedDesk.y + 0.8}
                        fontSize="3"
                        textAnchor="middle"
                        fill={isSelected ? 'white' : 'hsl(var(--foreground))'}
                        fontWeight="semibold"
                        pointerEvents="none"
                        className="drop-shadow-sm"
                      >
                        {transformedDesk.id.replace('desk-', 'D')}
                      </text>
                    )}
                    
                    <title>
                      {isBooked 
                        ? bookingTooltip || `Booked by ${transformedDesk.bookedBy}` 
                        : isPending
                        ? `Being selected by ${transformedDesk.pendingBy}`
                        : `Desk ${transformedDesk.id} - Available`}
                    </title>
                  </g>
                );
              }).filter(Boolean) : null}
            </svg>
            
            {hoveredDesk && desks.find(d => d.id === hoveredDesk && (d.isBooked || d.isPending)) && (
              <div 
                className="absolute z-50 px-4 py-3 text-sm font-medium text-popover-foreground bg-popover border-2 border-blue-200 rounded-xl shadow-2xl pointer-events-none max-w-xs"
                style={{
                  left: `${(desks.find(d => d.id === hoveredDesk)?.x || 0) * scale * zoom / 10 + pan.x + 50}%`,
                  top: `${(desks.find(d => d.id === hoveredDesk)?.y || 0) * scale * zoom / 10 + pan.y - 10}%`,
                  transform: 'translate(-50%, -100%)',
                  whiteSpace: 'pre-line',
                  marginBottom: '15px'
                }}
              >
                {desks.find(d => d.id === hoveredDesk)?.isPending 
                  ? `⏳ ${desks.find(d => d.id === hoveredDesk)?.pendingBy} is selecting this desk`
                  : getBookingTooltip(desks.find(d => d.id === hoveredDesk))}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="border-6 border-transparent border-t-popover"></div>
                </div>
              </div>
            )}

            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white/90 backdrop-blur-sm border-2 border-blue-200/50 rounded-lg p-2 shadow-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= MAX_ZOOM}
                className="h-9 w-9 p-0"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="text-xs font-semibold text-center text-muted-foreground px-2 py-1">
                {Math.round(zoom * 100)}%
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= MIN_ZOOM}
                className="h-9 w-9 p-0"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          </div>

          <div className="w-full space-y-4 pt-6 border-t border-blue-200/50">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="flex items-center gap-6 flex-wrap justify-center">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                  <Circle className="h-5 w-5 text-slate-500 fill-slate-300" />
                  <span className="text-sm font-semibold text-foreground">Available</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 rounded-lg">
                  <Circle className="h-5 w-5 text-yellow-600 fill-yellow-500" />
                  <span className="text-sm font-semibold text-foreground">Pending Selection</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-red-600 fill-red-500" />
                  <span className="text-sm font-semibold text-foreground">Booked</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-lg">
                  <Circle className="h-5 w-5 text-blue-600 fill-blue-500" />
                  <span className="text-sm font-semibold text-blue-700">Selected</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DeskLayout;
