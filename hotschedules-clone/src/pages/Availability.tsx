import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Availability, AvailabilitySchedule, WeekDays, AppUser } from '../types';

const DAYS: { key: WeekDays; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

function defaultSchedule(): AvailabilitySchedule {
  const s = {} as AvailabilitySchedule;
  for (const { key } of DAYS) {
    s[key] = { available: true, allDay: true, startTime: '09:00', endTime: '17:00', note: '' };
  }
  return s;
}

export default function Availability() {
  const { userProfile } = useAuth();
  return userProfile?.role === 'manager' ? <ManagerAvailability /> : <EmployeeAvailability />;
}

function EmployeeAvailability() {
  const { userProfile } = useAuth();
  const [existing, setExisting] = useState<Availability | null>(null);
  const [schedule, setSchedule] = useState<AvailabilitySchedule>(defaultSchedule());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!userProfile) return;
    const q = query(
      collection(db, 'availability'),
      where('employeeId', '==', userProfile.uid),
    );
    return onSnapshot(q, (snap) => {
      const recurring = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Availability))
        .find(a => a.isRecurring);
      if (recurring) {
        setExisting(recurring);
        setSchedule(recurring.schedule);
      }
      setLoading(false);
    });
  }, [userProfile]);

  const updateDay = (day: WeekDays, field: string, value: unknown) => {
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const handleSubmit = async () => {
    if (!userProfile) return;
    setSubmitting(true);
    try {
      if (existing) {
        await updateDoc(doc(db, 'availability', existing.id), {
          schedule,
          status: 'pending',
          submittedAt: serverTimestamp(),
          reviewedBy: null,
          reviewedAt: null,
        });
      } else {
        await addDoc(collection(db, 'availability'), {
          employeeId: userProfile.uid,
          isRecurring: true,
          weekStartDate: null,
          schedule,
          status: 'pending',
          submittedAt: serverTimestamp(),
          reviewedBy: null,
          reviewedAt: null,
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    active: 'bg-blue-100 text-blue-700',
  };

  if (loading) return <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Availability</h2>
          <p className="text-slate-500 text-sm mt-1">Set your weekly recurring availability for manager review.</p>
        </div>
        <div className="flex items-center gap-3">
          {existing && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded capitalize ${statusColors[existing.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {existing.status}
            </span>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded transition-colors"
          >
            {submitting ? 'Saving...' : saved ? 'Saved!' : 'Submit Availability'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded border border-gray-200 divide-y divide-gray-100">
        {DAYS.map(({ key, label }) => {
          const day = schedule[key];
          return (
            <div key={key} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="w-28 text-sm font-medium text-slate-700 shrink-0">{label}</span>

                <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={day.available}
                    onChange={e => updateDay(key, 'available', e.target.checked)}
                    className="rounded"
                  />
                  Available
                </label>

                {day.available ? (
                  <>
                    <label className="flex items-center gap-1.5 text-sm text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={day.allDay}
                        onChange={e => updateDay(key, 'allDay', e.target.checked)}
                        className="rounded"
                      />
                      All day
                    </label>

                    {!day.allDay && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="time"
                          value={day.startTime}
                          onChange={e => updateDay(key, 'startTime', e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-slate-400">to</span>
                        <input
                          type="time"
                          value={day.endTime}
                          onChange={e => updateDay(key, 'endTime', e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    )}

                    <input
                      type="text"
                      placeholder="Note (optional)"
                      value={day.note}
                      onChange={e => updateDay(key, 'note', e.target.value)}
                      className="ml-auto border border-gray-200 rounded px-2.5 py-1 text-xs text-slate-500 w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded bg-red-100 text-red-600 font-medium">
                    Unavailable
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ManagerAvailability() {
  const { userProfile } = useAuth();
  const [submissions, setSubmissions] = useState<Availability[]>([]);
  const [users, setUsers] = useState<Record<string, AppUser>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      const map: Record<string, AppUser> = {};
      snap.docs.forEach(d => { map[d.id] = { uid: d.id, ...d.data() } as AppUser; });
      setUsers(map);
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'availability'), where('status', '==', 'pending'));
    return onSnapshot(q, (snap) => {
      setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Availability)));
      setLoading(false);
    });
  }, []);

  const review = async (id: string, status: 'approved' | 'denied') => {
    if (!userProfile) return;
    await updateDoc(doc(db, 'availability', id), {
      status,
      reviewedBy: userProfile.uid,
      reviewedAt: serverTimestamp(),
    });
  };

  if (loading) return <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Availability Requests</h2>
        <p className="text-slate-500 text-sm mt-1">Review and approve employee availability submissions.</p>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-white rounded border border-gray-200 p-8 text-center">
          <p className="text-slate-400 text-sm">No pending availability submissions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map(sub => {
            const employee = users[sub.employeeId];
            return (
              <div key={sub.id} className="bg-white rounded border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {employee?.displayName ?? sub.employeeId}
                    </p>
                    <p className="text-xs text-slate-400">{employee?.position ?? ''} · Recurring weekly</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => review(sub.id, 'approved')}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => review(sub.id, 'denied')}
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded transition-colors"
                    >
                      Deny
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map(({ key, label }) => {
                    const day = sub.schedule[key];
                    return (
                      <div
                        key={key}
                        className={`rounded p-2 text-center text-xs ${day.available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
                      >
                        <p className="font-medium">{label.slice(0, 3)}</p>
                        <p className="mt-0.5 text-[10px]">
                          {day.available
                            ? day.allDay ? 'All day' : `${day.startTime}–${day.endTime}`
                            : 'Off'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
