import * as React from "react"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, X } from "lucide-react"

const ToastContext = React.createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([])

  const showToast = React.useCallback((message, type = "success") => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 3000)
  }, [])

  const removeToast = React.useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}

function Toast({ message, type, onClose }) {
  const Icon = type === "success" ? CheckCircle2 : XCircle
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-4 shadow-lg animate-in slide-in-from-bottom-5",
        type === "success" ? "border-green-500/50" : "border-red-500/50"
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5",
          type === "success" ? "text-green-600" : "text-red-600"
        )}
      />
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="ml-auto rounded-md p-1 hover:bg-accent"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

