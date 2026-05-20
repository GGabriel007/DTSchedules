import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Shift, ShiftRequest } from '../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

function tsToDate(ts: unknown): Date {
  if (!ts) return new Date();
  if ((ts as any).toDate) return (ts as any).toDate();
  return new Date(ts as any);
}

function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')}${period}`;
}

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = start.toLocaleDateString('en-US', opts);
  const e = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${s} – ${e}`;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Tab = 'my' | 'available';

// ─── component ───────────────────────────────────────────────────────────────

export default function MySchedule() {
  const { currentUser } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [tab, setTab] = useState<Tab>('my');
  const [myShifts, setMyShifts] = useState<Shift[]>([]);
  const [availableShifts, setAvailableShifts] = useState<Shift[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [activeShift, setActiveShift] = useState<string | null>(null);

  // Compute week window
  const baseMonday = getMondayOfWeek(new Date());
  const weekStart = new Date(baseMonday);
  weekStart.setDate(baseMonday.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // My shifts (all — we filter by week client-side)
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'shifts'), where('employeeId', '==', currentUser.uid));
    return onSnapshot(q, snap => {
      setMyShifts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift)));
      setLoading(false);
    });
  }, [currentUser]);

  // Pending drop requests for this employee
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'shiftRequests'),
      where('requestedBy', '==', currentUser.uid),
      where('status', '==', 'pending'),
    );
    return onSnapshot(q, snap => {
      setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as ShiftRequest)));
    });
  }, [currentUser]);

  // Available shifts (dropped by others)
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'shifts'), where('status', '==', 'available'));
    return onSnapshot(q, snap => {
      setAvailableShifts(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Shift))
          .filter(s => s.employeeId !== currentUser.uid),
      );
    });
  }, [currentUser]);

  const hasPendingDrop = (shiftId: string) =>
    pendingRequests.some(r => r.shiftId === shiftId && r.type === 'drop');

  const submitRequest = async (shift: Shift, type: 'drop' | 'pickup') => {
    if (!currentUser) return;
    setRequesting(shift.id);
    try {
      await addDoc(collection(db, 'shiftRequests'), {
        type,
        shiftId: shift.id,
        requestedBy: currentUser.uid,
        status: 'pending',
        managerNote: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: serverTimestamp(),
      });
      setActiveShift(null);
    } finally {
      setRequesting(null);
    }
  };

  const shiftsForDay = (date: Date, list: Shift[]) =>
    list.filter(s => tsToDate(s.date).toDateString() === date.toDateString());

  if (loading) return <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>;

  const displayShifts = tab === 'my'
    ? myShifts.filter(s => s.status !== 'filled')
    : availableShifts;

  return (
    <div>
      {/* Title */}
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-slate-800">My Schedule</h2>
      </div>

      {/* Tabs + Week navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Tabs */}
        <div className="flex rounded overflow-hidden border border-teal-600">
          <button
            onClick={() => setTab('my')}
            className={`px-4 py-2 text-xs font-bold tracking-wide transition-colors ${
              tab === 'my' ? 'bg-teal-700 text-white' : 'text-teal-700 hover:bg-teal-50'
            }`}
          >
            MY SHIFTS
          </button>
          <button
            onClick={() => setTab('available')}
            className={`px-4 py-2 text-xs font-bold tracking-wide border-l border-teal-600 transition-colors ${
              tab === 'available' ? 'bg-teal-700 text-white' : 'text-teal-700 hover:bg-teal-50'
            }`}
          >
            AVAILABLE SHIFTS
          </button>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-slate-500 hover:text-slate-800 transition-colors text-sm"
          >
            &lsaquo;
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[190px] text-center">
            {formatDateRange(weekStart, weekEnd)}
          </span>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-slate-500 hover:text-slate-800 transition-colors text-sm"
          >
            &rsaquo;
          </button>
        </div>

        {/* Reset to current week */}
        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="text-sm text-teal-600 hover:underline"
          >
            Current week
          </button>
        )}
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded border border-gray-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {days.map((date, i) => {
            const isToday = date.toDateString() === today.toDateString();
            return (
              <div
                key={i}
                className={`py-2 text-center text-xs font-semibold uppercase tracking-wide ${
                  isToday ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                {DAY_LABELS[i]}
              </div>
            );
          })}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 divide-x divide-gray-100">
          {days.map((date, i) => {
            const isToday = date.toDateString() === today.toDateString();
            const isPastDay = date < today;
            const dayShifts = shiftsForDay(date, displayShifts);

            return (
              <div
                key={i}
                className={`min-h-[150px] p-2 relative ${
                  isToday ? 'ring-2 ring-inset ring-slate-700' : ''
                } ${i > 0 ? 'border-t-0' : ''}`}
              >
                {/* Date number */}
                <p className={`text-sm mb-2 font-medium ${
                  isToday ? 'text-slate-900 font-bold' : isPastDay ? 'text-slate-300' : 'text-slate-500'
                }`}>
                  {date.getDate()}
                </p>

                {/* Shift cards */}
                <div className="space-y-1.5">
                  {dayShifts.map(shift => {
                    const isPending = hasPendingDrop(shift.id);
                    const isPast = tsToDate(shift.date) < today;
                    const isActive = activeShift === shift.id;
                    const isAvail = tab === 'available';

                    let cardClass = '';
                    if (isAvail) {
                      cardClass = 'bg-white border border-dashed border-gray-300 text-slate-600 hover:border-teal-400 hover:bg-teal-50';
                    } else if (isPast) {
                      cardClass = 'bg-indigo-50 text-indigo-300 border border-indigo-100';
                    } else if (isPending) {
                      cardClass = 'bg-indigo-100 border-2 border-indigo-400 text-indigo-800';
                    } else {
                      cardClass = 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200';
                    }

                    return (
                      <div key={shift.id}>
                        <div
                          onClick={() => {
                            if (isAvail) {
                              submitRequest(shift, 'pickup');
                            } else if (!isPast && !isPending) {
                              setActiveShift(isActive ? null : shift.id);
                            }
                          }}
                          className={`rounded p-1.5 text-xs cursor-pointer transition-all ${cardClass}`}
                        >
                          <p className="font-semibold truncate">{shift.position}</p>
                          <p className="truncate text-[11px] opacity-80">
                            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                          </p>
                          {isPending && (
                            <p className="text-[10px] mt-0.5 text-indigo-500 font-medium">Pending release</p>
                          )}
                        </div>

                        {/* Inline drop action */}
                        {isActive && !isAvail && (
                          <button
                            onClick={() => submitRequest(shift, 'drop')}
                            disabled={requesting === shift.id}
                            className="w-full mt-1 text-[11px] py-1 rounded bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors disabled:opacity-50"
                          >
                            {requesting === shift.id ? 'Requesting...' : 'Request Drop'}
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {tab === 'available' && dayShifts.length === 0 && (
                    <p className="text-[11px] text-slate-200 text-center pt-4">—</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-5 mt-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-4 rounded bg-indigo-50 border border-indigo-100" />
          <span>Past shift</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-4 rounded bg-indigo-100" />
          <span>Your shift</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-4 rounded bg-indigo-100 border-2 border-indigo-400" />
          <span>Your shift · pending release or swap</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-4 rounded bg-white border border-dashed border-gray-300" />
          <span>Not your shift · pending pickup or swap</span>
        </div>
      </div>
    </div>
  );
}
