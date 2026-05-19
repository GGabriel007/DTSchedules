export type UserRole = 'manager' | 'employee';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  position: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface Schedule {
  id: string;
  weekStartDate: unknown;
  weekEndDate: unknown;
  status: 'draft' | 'published';
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
  publishedAt: unknown | null;
}

export interface Shift {
  id: string;
  scheduleId: string;
  employeeId: string;
  date: unknown;
  startTime: string;
  endTime: string;
  position: string;
  status: 'scheduled' | 'dropped' | 'available' | 'filled';
  droppedAt: unknown | null;
  pickedUpBy: string | null;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface ShiftRequest {
  id: string;
  type: 'drop' | 'pickup';
  shiftId: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'denied';
  managerNote: string | null;
  reviewedBy: string | null;
  reviewedAt: unknown | null;
  createdAt: unknown;
}

export interface AvailabilityDay {
  available: boolean;
  allDay: boolean;
  startTime: string;
  endTime: string;
  note: string;
}

export type WeekDays = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type AvailabilitySchedule = Record<WeekDays, AvailabilityDay>;

export interface Availability {
  id: string;
  employeeId: string;
  isRecurring: boolean;
  weekStartDate: unknown | null;
  schedule: AvailabilitySchedule;
  status: 'pending' | 'approved' | 'active';
  submittedAt: unknown;
  reviewedBy: string | null;
  reviewedAt: unknown | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  postedBy: string;
  postedByName: string;
  isPinned: boolean;
  createdAt: unknown;
  updatedAt: unknown | null;
}
