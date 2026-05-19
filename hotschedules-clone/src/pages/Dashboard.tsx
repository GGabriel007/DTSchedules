import type React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { userProfile } = useAuth();
  const firstName = userProfile?.displayName?.split(' ')[0] ?? 'there';
  const isManager = userProfile?.role === 'manager';

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">
          Welcome back, {firstName} 👋
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="This Week's Shifts" value="—" icon="📅" />
        <StatCard label="Pending Requests" value="—" icon="↔" />
        {isManager
          ? <StatCard label="Active Employees" value="—" icon="👥" />
          : <StatCard label="Available Shifts" value="—" icon="✓" />
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Upcoming Shifts">
          <p className="text-sm text-slate-500">Your shifts will appear here once a schedule is published.</p>
        </SectionCard>
        <SectionCard title="Recent Announcements">
          <p className="text-sm text-slate-500">No announcements yet.</p>
        </SectionCard>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}
