import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const employeeLinks: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '⊞' },
  { to: '/my-schedule', label: 'My Schedule', icon: '📅' },
  { to: '/shift-requests', label: 'Shift Requests', icon: '↔' },
  { to: '/availability', label: 'Availability', icon: '✓' },
  { to: '/announcements', label: 'Announcements', icon: '📣' },
];

const managerLinks: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '⊞' },
  { to: '/schedule', label: 'Manage Schedule', icon: '📋' },
  { to: '/shift-requests', label: 'Requests', icon: '↔' },
  { to: '/availability', label: 'Availability', icon: '✓' },
  { to: '/announcements', label: 'Announcements', icon: '📣' },
  { to: '/create-employee', label: 'Add Employee', icon: '＋' },
];

export default function Sidebar() {
  const { userProfile } = useAuth();
  const links = userProfile?.role === 'manager' ? managerLinks : employeeLinks;

  return (
    <aside className="w-60 bg-slate-900 text-white flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-slate-700">
        <span className="text-base font-bold tracking-tight">DT Schedules</span>
        <p className="text-xs text-slate-400 mt-0.5 capitalize">{userProfile?.position || 'Staff'}</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span className="text-base leading-none">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
