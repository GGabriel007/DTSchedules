const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export default function Availability() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Availability</h2>
          <p className="text-slate-500 text-sm mt-1">Submit your weekly availability for manager review.</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
          Submit Availability
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {DAYS.map((day) => (
          <div key={day} className="flex items-center gap-4 px-5 py-4">
            <span className="w-28 text-sm font-medium text-slate-700">{day}</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">
              Available
            </span>
            <span className="text-xs text-slate-400 ml-auto">All day</span>
          </div>
        ))}
      </div>
    </div>
  );
}
