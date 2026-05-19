import { useAuth } from '../contexts/AuthContext';

export default function Announcements() {
  const { userProfile } = useAuth();
  const isManager = userProfile?.role === 'manager';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Announcements</h2>
          <p className="text-slate-500 text-sm mt-1">Company-wide bulletin board.</p>
        </div>
        {isManager && (
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
            + Post Announcement
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-slate-800 text-sm">Welcome to DT Schedules!</h3>
            <span className="text-xs text-slate-400">Today</span>
          </div>
          <p className="text-sm text-slate-600">
            This is your digital bulletin board. Managers can post announcements here and all staff will be notified by email.
          </p>
          <p className="text-xs text-slate-400 mt-3">Posted by: Manager</p>
        </div>
      </div>
    </div>
  );
}
