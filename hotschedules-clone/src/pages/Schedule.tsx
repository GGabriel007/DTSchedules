export default function Schedule() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Manage Schedule</h2>
          <p className="text-slate-500 text-sm mt-1">Create, edit, and publish weekly schedules.</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
          + New Schedule
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-slate-400 text-sm">Schedule grid coming in the next phase.</p>
      </div>
    </div>
  );
}
