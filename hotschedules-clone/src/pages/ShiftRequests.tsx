import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, updateDoc,
  doc, serverTimestamp, getDoc, getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { ShiftRequest, Shift, AppUser } from '../types';

function tsToDate(ts: unknown): Date {
  if (!ts) return new Date();
  if ((ts as any).toDate) return (ts as any).toDate();
  return new Date(ts as any);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'denied';

const statusStyle: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-600',
};

const typeStyle: Record<string, string> = {
  drop: 'bg-orange-100 text-orange-700',
  pickup: 'bg-blue-100 text-blue-700',
};

export default function ShiftRequests() {
  const { userProfile } = useAuth();
  return userProfile?.role === 'manager' ? <ManagerRequests /> : <EmployeeRequests />;
}

function EmployeeRequests() {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [shifts, setShifts] = useState<Record<string, Shift>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'shiftRequests'), where('requestedBy', '==', currentUser.uid));
    return onSnapshot(q, async (snap) => {
      const reqs = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as ShiftRequest))
        .sort((a, b) => tsToDate(b.createdAt).getTime() - tsToDate(a.createdAt).getTime());
      setRequests(reqs);

      const shiftMap: Record<string, Shift> = {};
      await Promise.all(
        [...new Set(reqs.map(r => r.shiftId))].map(async id => {
          const snap = await getDoc(doc(db, 'shifts', id));
          if (snap.exists()) shiftMap[id] = { id: snap.id, ...snap.data() } as Shift;
        }),
      );
      setShifts(shiftMap);
      setLoading(false);
    });
  }, [currentUser]);

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  if (loading) return <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">My Requests</h2>
        <p className="text-slate-500 text-sm mt-1">Track the status of your submitted shift requests.</p>
      </div>

      <FilterTabs filter={filter} onChange={setFilter} pendingCount={0} />

      {filtered.length === 0 ? (
        <div className="bg-white rounded border border-gray-200 p-8 text-center">
          <p className="text-slate-400 text-sm">No requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const shift = shifts[req.shiftId];
            return (
              <div key={req.id} className="bg-white rounded border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded capitalize ${typeStyle[req.type]}`}>
                        {req.type}
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded capitalize ${statusStyle[req.status]}`}>
                        {req.status}
                      </span>
                    </div>
                    {shift ? (
                      <p className="text-sm text-slate-700">
                        {formatDate(tsToDate(shift.date))} · {formatTime(shift.startTime)} – {formatTime(shift.endTime)} · {shift.position}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Shift details unavailable</p>
                    )}
                    {req.managerNote && (
                      <p className="text-xs text-slate-500 mt-1.5 italic">Note: {req.managerNote}</p>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 shrink-0 ml-4">
                    {formatDate(tsToDate(req.createdAt))}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ManagerRequests() {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [shifts, setShifts] = useState<Record<string, Shift>>({});
  const [users, setUsers] = useState<Record<string, AppUser>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      const map: Record<string, AppUser> = {};
      snap.docs.forEach(d => { map[d.id] = { uid: d.id, ...d.data() } as AppUser; });
      setUsers(map);
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'shiftRequests'));
    return onSnapshot(q, async (snap) => {
      const reqs = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as ShiftRequest))
        .sort((a, b) => tsToDate(b.createdAt).getTime() - tsToDate(a.createdAt).getTime());
      setRequests(reqs);

      const shiftMap: Record<string, Shift> = {};
      await Promise.all(
        [...new Set(reqs.map(r => r.shiftId))].map(async id => {
          const s = await getDoc(doc(db, 'shifts', id));
          if (s.exists()) shiftMap[id] = { id: s.id, ...s.data() } as Shift;
        }),
      );
      setShifts(shiftMap);
      setLoading(false);
    });
  }, []);

  const handleReview = async (req: ShiftRequest, status: 'approved' | 'denied') => {
    if (!currentUser) return;
    setProcessing(req.id);
    try {
      await updateDoc(doc(db, 'shiftRequests', req.id), {
        status,
        reviewedBy: currentUser.uid,
        reviewedAt: serverTimestamp(),
        managerNote: note.trim() || null,
      });

      if (status === 'approved') {
        if (req.type === 'drop') {
          await updateDoc(doc(db, 'shifts', req.shiftId), {
            status: 'available',
            droppedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else if (req.type === 'pickup') {
          await updateDoc(doc(db, 'shifts', req.shiftId), {
            status: 'filled',
            pickedUpBy: req.requestedBy,
            updatedAt: serverTimestamp(),
          });
        }
      }

      setReviewingId(null);
      setNote('');
    } finally {
      setProcessing(null);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  if (loading) return <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Approval Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">Review and approve shift drops and pickups.</p>
      </div>

      <FilterTabs filter={filter} onChange={setFilter} pendingCount={pendingCount} />

      {filtered.length === 0 ? (
        <div className="bg-white rounded border border-gray-200 p-8 text-center">
          <p className="text-slate-400 text-sm">No requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const shift = shifts[req.shiftId];
            const employee = users[req.requestedBy];
            const isReviewing = reviewingId === req.id;

            return (
              <div key={req.id} className="bg-white rounded border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm">
                        {employee?.displayName ?? req.requestedBy}
                      </p>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded capitalize ${typeStyle[req.type]}`}>
                        {req.type}
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded capitalize ${statusStyle[req.status]}`}>
                        {req.status}
                      </span>
                    </div>
                    {shift ? (
                      <p className="text-sm text-slate-600">
                        {formatDate(tsToDate(shift.date))} · {formatTime(shift.startTime)} – {formatTime(shift.endTime)} · {shift.position}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Shift details unavailable</p>
                    )}
                    {req.managerNote && (
                      <p className="text-xs text-slate-500 mt-1 italic">Note: {req.managerNote}</p>
                    )}
                  </div>
                  {req.status === 'pending' && (
                    <button
                      onClick={() => {
                        setReviewingId(isReviewing ? null : req.id);
                        setNote('');
                      }}
                      className="text-xs text-blue-600 hover:underline font-medium shrink-0 ml-4"
                    >
                      {isReviewing ? 'Cancel' : 'Review'}
                    </button>
                  )}
                </div>

                {isReviewing && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <input
                      type="text"
                      placeholder="Manager note (optional)"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReview(req, 'approved')}
                        disabled={processing === req.id}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded transition-colors disabled:opacity-50"
                      >
                        {processing === req.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReview(req, 'denied')}
                        disabled={processing === req.id}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded transition-colors disabled:opacity-50"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterTabs({
  filter,
  onChange,
  pendingCount,
}: {
  filter: FilterStatus;
  onChange: (f: FilterStatus) => void;
  pendingCount: number;
}) {
  const tabs: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: pendingCount > 0 ? `Pending (${pendingCount})` : 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'denied', label: 'Denied' },
  ];

  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-1.5 text-sm font-medium rounded border transition-colors ${filter === t.key ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-slate-600 hover:bg-gray-50'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
