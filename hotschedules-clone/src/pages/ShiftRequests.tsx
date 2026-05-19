import { useAuth } from '../contexts/AuthContext';

export default function ShiftRequests() {
  const { userProfile } = useAuth();
  const isManager = userProfile?.role === 'manager';

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">
          {isManager ? 'Approval Dashboard' : 'My Requests'}
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          {isManager
            ? 'Review and approve shift drops, pickups, and availability changes.'
            : 'Track the status of your submitted shift requests.'}
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {['All', 'Pending', 'Approved', 'Denied'].map((tab) => (
          <button
            key={tab}
            className="px-4 py-1.5 text-sm font-medium rounded-full border border-gray-200 text-slate-600 hover:bg-gray-50 transition-colors first:bg-blue-600 first:text-white first:border-blue-600"
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-slate-400 text-sm">No requests found.</p>
      </div>
    </div>
  );
}
