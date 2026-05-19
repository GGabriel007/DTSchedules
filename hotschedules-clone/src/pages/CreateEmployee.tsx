import { useState, type FormEvent } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import type { UserRole } from '../types';

interface CreateEmployeePayload {
  displayName: string;
  email: string;
  password: string;
  position: string;
  phoneNumber: string;
  role: UserRole;
}

const POSITIONS = ['Server', 'Bartender', 'Cook', 'Host', 'Busser', 'Manager', 'Dishwasher', 'Barback'];

const defaultForm: CreateEmployeePayload = {
  displayName: '',
  email: '',
  password: '',
  position: '',
  phoneNumber: '',
  role: 'employee',
};

export default function CreateEmployee() {
  const [form, setForm] = useState<CreateEmployeePayload>(defaultForm);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const createEmployee = httpsCallable(functions, 'createEmployee');
      await createEmployee(form);
      setStatus('success');
      setMessage(`Account created for ${form.displayName}`);
      setForm(defaultForm);
    } catch (err: unknown) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : 'Failed to create employee.';
      setMessage(msg);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Add Employee</h2>
        <p className="text-slate-500 text-sm mt-1">Create a new staff account. They'll receive their login via email.</p>
      </div>

      {status === 'success' && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {message}
        </div>
      )}
      {status === 'error' && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <Field label="Full Name" name="displayName" type="text" value={form.displayName} onChange={handleChange} placeholder="Jane Smith" required />
        <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="jane@restaurant.com" required />
        <Field label="Temporary Password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min. 6 characters" required />
        <Field label="Phone Number" name="phoneNumber" type="tel" value={form.phoneNumber} onChange={handleChange} placeholder="(555) 000-0000" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Position</label>
            <select name="position" value={form.position} onChange={handleChange} required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="">Select position</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
            <select name="role" value={form.role} onChange={handleChange}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
            </select>
          </div>
        </div>

        <button type="submit" disabled={status === 'loading'}
          className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors">
          {status === 'loading' ? 'Creating account…' : 'Create Employee Account'}
        </button>
      </form>
    </div>
  );
}

interface FieldProps {
  label: string;
  name: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
}

function Field({ label, name, type, value, onChange, placeholder, required }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
      />
    </div>
  );
}
