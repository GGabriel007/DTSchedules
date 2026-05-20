import { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, onSnapshot, addDoc,
  updateDoc, deleteDoc, doc, serverTimestamp, getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Schedule, Shift, AppUser } from '../types';

function tsToDate(ts: unknown): Date {
  if (!ts) return new Date();
  if ((ts as any).toDate) return (ts as any).toDate();
  return new Date(ts as any);
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')}${period}`;
}

function toInputDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Schedule() {
  const { userProfile } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Schedule | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [weekDate, setWeekDate] = useState(toInputDate(getMondayOfWeek(new Date())));
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'schedules'), orderBy('weekStartDate', 'desc'));
    return onSnapshot(q, snap => {
      setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() } as Schedule)));
      setLoading(false);
    });
  }, []);

  const createSchedule = async () => {
    if (!userProfile || !weekDate) return;
    setCreating(true);
    try {
      const monday = new Date(weekDate + 'T00:00:00');
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const duplicate = schedules.find(s => {
        const start = tsToDate(s.weekStartDate);
        return start.toDateString() === monday.toDateString();
      });
      if (duplicate) {
        alert('A schedule already exists for this week.');
        return;
      }

      const ref = await addDoc(collection(db, 'schedules'), {
        weekStartDate: monday,
        weekEndDate: sunday,
        status: 'draft',
        createdBy: userProfile.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        publishedAt: null,
      });

      setShowForm(false);
      setSelected({
        id: ref.id,
        weekStartDate: monday,
        weekEndDate: sunday,
        status: 'draft',
        createdBy: userProfile.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
      });
    } finally {
      setCreating(false);
    }
  };

  if (selected) {
    return (
      <ScheduleEditor
        schedule={selected}
        onBack={() => setSelected(null)}
        onUpdate={setSelected}
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Manage Schedule</h2>
          <p className="text-slate-500 text-sm mt-1">Create, edit, and publish weekly schedules.</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Schedule'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded border border-gray-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Select Week</h3>
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Week starting (Monday)</label>
              <input
                type="date"
                value={weekDate}
                onChange={e => setWeekDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              onClick={createSchedule}
              disabled={creating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded transition-colors"
            >
              {creating ? 'Creating...' : 'Create Schedule'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded border border-gray-200 p-8 text-center">
          <p className="text-slate-400 text-sm">No schedules yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map(s => {
            const start = tsToDate(s.weekStartDate);
            const end = tsToDate(s.weekEndDate);
            return (
              <div
                key={s.id}
                onClick={() => setSelected(s)}
                className="bg-white rounded border border-gray-200 p-5 flex items-center justify-between cursor-pointer hover:border-blue-300 transition-colors"
              >
                <div>
                  <p className="font-semibold text-slate-800 text-sm">
                    Week of {formatShort(start)} – {formatShort(end)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {start.toLocaleDateString('en-US', { year: 'numeric' })}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded capitalize ${s.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {s.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ShiftFormState {
  employeeId: string;
  dayIndex: number;
  startTime: string;
  endTime: string;
  position: string;
}

function ScheduleEditor({
  schedule,
  onBack,
  onUpdate,
}: {
  schedule: Schedule;
  onBack: () => void;
  onUpdate: (s: Schedule) => void;
}) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<AppUser[]>([]);
  const [showAddShift, setShowAddShift] = useState(false);
  const [form, setForm] = useState<ShiftFormState>({
    employeeId: '',
    dayIndex: 0,
    startTime: '09:00',
    endTime: '17:00',
    position: '',
  });
  const [addingShift, setAddingShift] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const weekStart = tsToDate(schedule.weekStartDate);
  const days = WEEK_DAYS.map((label, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return { label, date };
  });

  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      setEmployees(
        snap.docs
          .map(d => ({ uid: d.id, ...d.data() } as AppUser))
          .filter(e => e.isActive && (e.role as string)?.toLowerCase() !== 'manager')
          .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      );
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'shifts'), where('scheduleId', '==', schedule.id));
    return onSnapshot(q, snap => {
      setShifts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift)));
    });
  }, [schedule.id]);

  const employeeName = (uid: string) =>
    employees.find(e => e.uid === uid)?.displayName ?? uid;

  const addShift = async () => {
    if (!form.employeeId || !form.position) return;
    setAddingShift(true);
    try {
      const shiftDate = new Date(days[form.dayIndex].date);
      await addDoc(collection(db, 'shifts'), {
        scheduleId: schedule.id,
        employeeId: form.employeeId,
        date: shiftDate,
        startTime: form.startTime,
        endTime: form.endTime,
        position: form.position,
        status: 'scheduled',
        droppedAt: null,
        pickedUpBy: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setForm(f => ({ ...f, employeeId: '', position: '' }));
      setShowAddShift(false);
    } finally {
      setAddingShift(false);
    }
  };

  const removeShift = async (id: string) => {
    await deleteDoc(doc(db, 'shifts', id));
  };

  const publish = async () => {
    if (!confirm('Publish this schedule? Employees will be able to see their shifts.')) return;
    setPublishing(true);
    try {
      await updateDoc(doc(db, 'schedules', schedule.id), {
        status: 'published',
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onUpdate({ ...schedule, status: 'published' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            &larr; Back
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {formatShort(tsToDate(schedule.weekStartDate))} – {formatShort(tsToDate(schedule.weekEndDate))}
            </h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${schedule.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {schedule.status}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddShift(v => !v)}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-slate-700 text-sm font-semibold rounded transition-colors"
          >
            {showAddShift ? 'Cancel' : '+ Add Shift'}
          </button>
          {schedule.status === 'draft' && (
            <button
              onClick={publish}
              disabled={publishing || shifts.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded transition-colors"
            >
              {publishing ? 'Publishing...' : 'Publish Schedule'}
            </button>
          )}
        </div>
      </div>

      {showAddShift && (
        <div className="bg-white rounded border border-gray-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Add Shift</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Employee</label>
              <select
                value={form.employeeId}
                onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Select employee</option>
                {employees.map(e => (
                  <option key={e.uid} value={e.uid}>{e.displayName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Day</label>
              <select
                value={form.dayIndex}
                onChange={e => setForm(f => ({ ...f, dayIndex: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {days.map((d, i) => (
                  <option key={i} value={i}>{d.label} ({formatShort(d.date)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Position</label>
              <input
                type="text"
                placeholder="e.g. Server, Cook"
                value={form.position}
                onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Start Time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">End Time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={addShift}
                disabled={addingShift || !form.employeeId || !form.position}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded transition-colors"
              >
                {addingShift ? 'Adding...' : 'Add Shift'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <div className="bg-white rounded border border-gray-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {days.map(({ label, date }, i) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isToday = date.toDateString() === today.toDateString();
            return (
              <div key={i} className={`py-2 text-center text-xs font-semibold uppercase tracking-wide ${isToday ? 'text-slate-900' : 'text-slate-400'}`}>
                <span>{label}</span>
                <span className="block text-[11px] font-normal mt-0.5">{formatShort(date)}</span>
              </div>
            );
          })}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 divide-x divide-gray-100">
          {days.map(({ date }, i) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isToday = date.toDateString() === today.toDateString();
            const dayShifts = shifts
              .filter(s => tsToDate(s.date).toDateString() === date.toDateString())
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <div key={i} className={`min-h-[150px] p-2 ${isToday ? 'ring-2 ring-inset ring-slate-700' : ''}`}>
                {dayShifts.length === 0 ? (
                  <p className="text-[11px] text-slate-200 text-center pt-6">—</p>
                ) : (
                  <div className="space-y-1.5">
                    {dayShifts.map(shift => (
                      <div key={shift.id} className="bg-blue-50 rounded p-1.5 text-xs group relative border border-blue-100">
                        <p className="font-semibold text-blue-800 truncate pr-4 text-[11px]">
                          {employeeName(shift.employeeId)}
                        </p>
                        <p className="text-blue-600 text-[11px]">
                          {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                        </p>
                        <p className="text-blue-400 text-[10px]">{shift.position}</p>
                        {schedule.status === 'draft' && (
                          <button
                            onClick={() => removeShift(shift.id)}
                            className="absolute top-1 right-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity leading-none text-sm font-bold"
                            title="Remove shift"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {shifts.length === 0 && (
        <p className="text-center text-sm text-slate-400 mt-4">
          No shifts added yet. Click "+ Add Shift" to get started.
        </p>
      )}
    </div>
  );
}
