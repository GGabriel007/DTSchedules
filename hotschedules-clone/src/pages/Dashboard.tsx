import type React from 'react';
import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Shift, Announcement } from '../types';

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

export default function Dashboard() {
  const { userProfile, currentUser } = useAuth();
  const firstName = userProfile?.displayName?.split(' ')[0] ?? 'there';
  const isManager = userProfile?.role === 'manager';

  const [weekShifts, setWeekShifts] = useState('—');
  const [pendingCount, setPendingCount] = useState('—');
  const [thirdStat, setThirdStat] = useState('—');
  const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  // Upcoming shifts + this week count
  useEffect(() => {
    if (!currentUser) return;
    const q = isManager
      ? query(collection(db, 'shifts'), where('status', '==', 'scheduled'))
      : query(collection(db, 'shifts'), where('employeeId', '==', currentUser.uid));

    return onSnapshot(q, snap => {
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Shift))
        .filter(s => tsToDate(s.date) >= today)
        .sort((a, b) => tsToDate(a.date).getTime() - tsToDate(b.date).getTime());

      const thisWeek = all.filter(s => tsToDate(s.date) <= weekEnd);
      setWeekShifts(String(thisWeek.length));
      setUpcomingShifts(all.slice(0, 5));
    });
  }, [currentUser, isManager]);

  // Pending requests
  useEffect(() => {
    if (!currentUser) return;
    const q = isManager
      ? query(collection(db, 'shiftRequests'), where('status', '==', 'pending'))
      : query(collection(db, 'shiftRequests'), where('requestedBy', '==', currentUser.uid));

    return onSnapshot(q, snap => {
      if (isManager) {
        setPendingCount(String(snap.size));
      } else {
        const pending = snap.docs.filter(d => d.data().status === 'pending');
        setPendingCount(String(pending.length));
      }
    });
  }, [currentUser, isManager]);

  // Third stat: active employees (manager) or available shifts (employee)
  useEffect(() => {
    const q = isManager
      ? query(collection(db, 'users'), where('role', '==', 'employee'))
      : query(collection(db, 'shifts'), where('status', '==', 'available'));

    return onSnapshot(q, snap => {
      if (isManager) {
        const active = snap.docs.filter(d => d.data().isActive !== false);
        setThirdStat(String(active.length));
      } else {
        setThirdStat(String(snap.size));
      }
    });
  }, [isManager]);

  // Recent announcements
  useEffect(() => {
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(3),
    );
    return onSnapshot(q, snap => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));
    });
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Welcome back, {firstName}</h2>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="This Week's Shifts" value={weekShifts} />
        <StatCard label="Pending Requests" value={pendingCount} />
        <StatCard label={isManager ? 'Active Employees' : 'Available Shifts'} value={thirdStat} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Upcoming Shifts">
          {upcomingShifts.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming shifts scheduled.</p>
          ) : (
            <div className="space-y-2">
              {upcomingShifts.map(shift => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {formatDate(tsToDate(shift.date))}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatTime(shift.startTime)} – {formatTime(shift.endTime)} · {shift.position}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium capitalize">
                    {shift.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent Announcements">
          {announcements.length === 0 ? (
            <p className="text-sm text-slate-500">No announcements yet.</p>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                  <p className="text-sm font-medium text-slate-700">{a.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.content}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded border border-gray-200 p-5">
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}
