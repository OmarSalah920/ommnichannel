import { NavLink } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  Settings,
  BarChart3,
  Radio,
  UserCog,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Bot,
  Plug,
  Moon,
  Sun,
  Monitor,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useState } from 'react';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  badge?: number;
}

function NavItem({ to, icon, label, collapsed, badge }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-maqsam-coral/10 text-maqsam-coral dark:bg-maqsam-coral/20'
            : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary dark:text-text-dark-secondary dark:hover:bg-surface-dark-tertiary dark:hover:text-text-dark-primary'
        } ${collapsed ? 'justify-center' : ''}`
      }
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="font-medium">{label}</span>}
      {badge !== undefined && badge > 0 && (
        <span
          className={`${
            collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'
          } min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-maqsam-coral text-white text-xs font-semibold rounded-full`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-maqsam-dark text-white text-sm font-medium rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </NavLink>
  );
}

function StatusIndicator({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    online: 'bg-emerald-500',
    offline: 'bg-gray-400',
    away: 'bg-amber-500',
    busy: 'bg-red-500',
  };

  return (
    <span
      className={`absolute bottom-0 right-0 w-3 h-3 ${statusColors[status] || statusColors.offline} rounded-full ring-2 ring-white dark:ring-surface-dark-secondary`}
    />
  );
}

export function Sidebar() {
  const { profile, signOut, isAdmin, isSupervisor } = useAuth();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const themeOptions = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ];

  const currentThemeIcon = themeOptions.find((t) => t.value === theme)?.icon || Sun;
  const ThemeIcon = currentThemeIcon;

  return (
    <aside
      className={`${
        collapsed ? 'w-[72px]' : 'w-64'
      } bg-white dark:bg-surface-dark-secondary border-r border-gray-100 dark:border-gray-800 flex-col transition-all duration-300 ease-in-out hidden lg:flex`}
    >
      <div className={`p-4 border-b border-gray-100 dark:border-gray-800 ${collapsed ? 'px-3' : ''}`}>
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-maqsam-coral rounded-xl flex items-center justify-center shadow-soft">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </div>
              <div>
                <h1 className="font-bold text-text-primary dark:text-text-dark-primary tracking-tight">
                  Maqsam
                </h1>
                <p className="text-xs text-text-tertiary dark:text-text-dark-secondary">
                  Chat Portal
                </p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-10 h-10 bg-maqsam-coral rounded-xl flex items-center justify-center shadow-soft mx-auto">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        <NavItem
          to="/inbox"
          icon={<Inbox className="w-5 h-5" />}
          label="Inbox"
          collapsed={collapsed}
          badge={3}
        />

        {(isAdmin || isSupervisor) && (
          <>
            <div className={`pt-5 pb-2 ${collapsed ? 'hidden' : ''}`}>
              <p className="px-3 text-[11px] font-semibold text-text-tertiary dark:text-text-dark-secondary uppercase tracking-wider">
                Management
              </p>
            </div>
            {collapsed && <div className="h-4" />}
            <NavItem
              to="/analytics"
              icon={<BarChart3 className="w-5 h-5" />}
              label="Analytics"
              collapsed={collapsed}
            />
            <NavItem
              to="/team"
              icon={<Users className="w-5 h-5" />}
              label="Team"
              collapsed={collapsed}
            />
          </>
        )}

        {isAdmin && (
          <>
            <div className={`pt-5 pb-2 ${collapsed ? 'hidden' : ''}`}>
              <p className="px-3 text-[11px] font-semibold text-text-tertiary dark:text-text-dark-secondary uppercase tracking-wider">
                Administration
              </p>
            </div>
            {collapsed && <div className="h-4" />}
            <NavItem
              to="/channels"
              icon={<Radio className="w-5 h-5" />}
              label="Channels"
              collapsed={collapsed}
            />
            <NavItem
              to="/bot"
              icon={<Bot className="w-5 h-5" />}
              label="Bot Config"
              collapsed={collapsed}
            />
            <NavItem
              to="/integrations"
              icon={<Plug className="w-5 h-5" />}
              label="Integrations"
              collapsed={collapsed}
            />
            <NavItem
              to="/users"
              icon={<UserCog className="w-5 h-5" />}
              label="Users"
              collapsed={collapsed}
            />
            <NavItem
              to="/settings"
              icon={<Settings className="w-5 h-5" />}
              label="Settings"
              collapsed={collapsed}
            />
          </>
        )}
      </nav>

      <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-text-secondary dark:text-text-dark-secondary hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary rounded-lg transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <ThemeIcon className="w-5 h-5" />
            {!collapsed && <span className="text-sm font-medium">Theme</span>}
          </button>

          {showThemeMenu && (
            <div
              className={`absolute ${
                collapsed ? 'left-full ml-2 bottom-0' : 'bottom-full mb-1 left-0 right-0'
              } bg-white dark:bg-surface-dark-tertiary border border-gray-100 dark:border-gray-700 rounded-lg shadow-medium overflow-hidden z-50`}
            >
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value);
                    setShowThemeMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    theme === option.value
                      ? 'bg-maqsam-coral/10 text-maqsam-coral'
                      : 'text-text-secondary dark:text-text-dark-secondary hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary'
                  }`}
                >
                  <option.icon className="w-4 h-4" />
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center gap-3 px-3 py-2 text-text-secondary dark:text-text-dark-secondary hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary rounded-lg transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>

        <div
          className={`flex items-center gap-3 p-2 rounded-lg bg-surface-secondary dark:bg-surface-dark-tertiary ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-maqsam-dark to-gray-700 flex items-center justify-center text-white font-semibold text-sm">
              {profile?.full_name?.charAt(0)?.toUpperCase() ||
                profile?.email?.charAt(0)?.toUpperCase() ||
                '?'}
            </div>
            <StatusIndicator status={profile?.status || 'offline'} />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text-primary dark:text-text-dark-primary text-sm truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-text-tertiary dark:text-text-dark-secondary capitalize">
                {profile?.role}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="p-2 text-text-tertiary hover:text-maqsam-coral hover:bg-maqsam-coral/10 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
