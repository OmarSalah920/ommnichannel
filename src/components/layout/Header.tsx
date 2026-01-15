import { useState, useRef, useEffect } from 'react';
import { Bell, Search, X, Check, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'info',
    title: 'New conversation assigned',
    message: 'A customer from WhatsApp has been assigned to you',
    time: '2m ago',
    read: false,
  },
  {
    id: '2',
    type: 'success',
    title: 'Conversation resolved',
    message: 'Customer satisfaction survey completed',
    time: '15m ago',
    read: false,
  },
  {
    id: '3',
    type: 'warning',
    title: 'Response time alert',
    message: '3 conversations waiting for more than 5 minutes',
    time: '1h ago',
    read: true,
  },
];

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { profile, updateStatus } = useAuth();
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [notifications] = useState<Notification[]>(mockNotifications);
  const notifRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statusOptions = [
    { value: 'online', label: 'Online', color: 'bg-emerald-500' },
    { value: 'away', label: 'Away', color: 'bg-amber-500' },
    { value: 'busy', label: 'Busy', color: 'bg-red-500' },
    { value: 'offline', label: 'Offline', color: 'bg-gray-400' },
  ];

  const getStatusColor = (status: string) => {
    return statusOptions.find((s) => s.value === status)?.color || 'bg-gray-400';
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <Check className="w-4 h-4 text-emerald-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-maqsam-coral" />;
    }
  };

  const handleStatusChange = async (status: string) => {
    if (updateStatus) {
      await updateStatus(status as 'online' | 'offline' | 'away' | 'busy');
    }
    setShowStatusMenu(false);
  };

  return (
    <header className="h-16 bg-white dark:bg-surface-dark-secondary border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <h2 className="text-lg md:text-xl font-semibold text-text-primary dark:text-text-dark-primary tracking-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs md:text-sm text-text-secondary dark:text-text-dark-secondary truncate">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div
          className={`hidden md:block relative transition-all duration-200 ${
            searchFocused ? 'w-80' : 'w-64'
          }`}
        >
          <Search
            className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
              searchFocused ? 'text-maqsam-coral' : 'text-text-tertiary'
            }`}
          />
          <input
            type="text"
            placeholder="Search conversations, customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full pl-10 pr-10 py-2 bg-surface-secondary dark:bg-surface-dark-tertiary border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-text-primary dark:text-text-dark-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-maqsam-coral/30 focus:border-maqsam-coral transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-text-tertiary hover:text-text-primary rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2.5 rounded-lg transition-colors ${
              showNotifications
                ? 'bg-maqsam-coral/10 text-maqsam-coral'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary dark:text-text-dark-secondary dark:hover:bg-surface-dark-tertiary'
            }`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-maqsam-coral text-white text-[10px] font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-surface-dark-secondary border border-gray-100 dark:border-gray-700 rounded-xl shadow-strong overflow-hidden z-50 animate-slide-up">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-text-primary dark:text-text-dark-primary">
                  Notifications
                </h3>
                <button className="text-xs text-maqsam-coral hover:text-maqsam-coral-dark font-medium">
                  Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 flex gap-3 hover:bg-surface-secondary dark:hover:bg-surface-dark-tertiary cursor-pointer transition-colors ${
                      !notification.read ? 'bg-maqsam-coral/5' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-secondary dark:bg-surface-dark-tertiary flex items-center justify-center">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary dark:text-text-dark-primary">
                        {notification.title}
                      </p>
                      <p className="text-xs text-text-secondary dark:text-text-dark-secondary mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[11px] text-text-tertiary mt-1">{notification.time}</p>
                    </div>
                    {!notification.read && (
                      <div className="flex-shrink-0 w-2 h-2 bg-maqsam-coral rounded-full mt-1.5" />
                    )}
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                <button className="w-full text-center text-sm text-maqsam-coral hover:text-maqsam-coral-dark font-medium py-1">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {actions}

        <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

        <div className="relative" ref={statusRef}>
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary transition-colors"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-maqsam-dark to-gray-700 flex items-center justify-center text-white font-semibold text-sm">
                {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-surface-dark-secondary ${getStatusColor(
                  profile?.status || 'offline'
                )}`}
              />
            </div>
          </button>

          {showStatusMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-surface-dark-secondary border border-gray-100 dark:border-gray-700 rounded-xl shadow-strong overflow-hidden z-50 animate-slide-up">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <p className="font-semibold text-text-primary dark:text-text-dark-primary text-sm">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-text-tertiary">{profile?.email}</p>
              </div>
              <div className="py-1">
                <p className="px-4 py-2 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                  Set Status
                </p>
                {statusOptions.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => handleStatusChange(status.value)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      profile?.status === status.value
                        ? 'bg-maqsam-coral/10 text-maqsam-coral'
                        : 'text-text-secondary dark:text-text-dark-secondary hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${status.color}`} />
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
