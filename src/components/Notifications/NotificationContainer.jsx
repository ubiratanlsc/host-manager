import { useEffect, useRef } from 'react';
import { Xmark, CheckCircle, XmarkCircle, WarningTriangle, InfoCircle } from 'iconoir-react';
import { useAppStore } from '@/stores';
import { cn } from '@/lib/utils';

const icons = {
  success: CheckCircle,
  error: XmarkCircle,
  warning: WarningTriangle,
  info: InfoCircle,
};

const styles = {
  success: 'bg-emerald-600 border-emerald-500 text-white',
  error: 'bg-red-600 border-red-500 text-white',
  warning: 'bg-amber-600 border-amber-500 text-white',
  info: 'bg-sky-600 border-sky-500 text-white',
};

function NotificationItem({ notification, onRemove }) {
  const Icon = icons[notification.type] || icons.info;
  const timerRef = useRef(null);

  useEffect(() => {
    const duration = notification.duration ?? 4000;
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        onRemove(notification.id);
      }, duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notification.id, notification.duration, onRemove]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border pointer-events-auto',
        'animate-in slide-in-from-right-5 fade-in duration-300',
        styles[notification.type] || styles.info
      )}
      role="alert"
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {notification.title && (
          <p className="font-semibold text-sm">{notification.title}</p>
        )}
        <p className="text-sm opacity-90">{notification.message}</p>
      </div>
      <button
        onClick={() => onRemove(notification.id)}
        className="shrink-0 p-0.5 rounded hover:bg-black/10 transition-colors"
      >
        <Xmark className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function NotificationContainer() {
  const notifications = useAppStore((s) => s.notifications);
  const removeNotification = useAppStore((s) => s.removeNotification);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((n) => (
        <NotificationItem
          key={n.id}
          notification={n}
          onRemove={removeNotification}
        />
      ))}
    </div>
  );
}
