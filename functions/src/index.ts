import * as admin from 'firebase-admin';
import {
  onDocumentCreated,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { Resend } from 'resend';

admin.initializeApp();
const db = admin.firestore();

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const FROM_EMAIL = 'schedules@yourrestaurant.com';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getAllActiveEmails(): Promise<string[]> {
  const snap = await db.collection('users').where('isActive', '==', true).get();
  return snap.docs.map((d) => d.data().email as string).filter(Boolean);
}

async function getManagerEmails(): Promise<string[]> {
  const snap = await db
    .collection('users')
    .where('role', '==', 'manager')
    .where('isActive', '==', true)
    .get();
  return snap.docs.map((d) => d.data().email as string).filter(Boolean);
}

async function getUserEmail(uid: string): Promise<string | null> {
  const doc = await db.collection('users').doc(uid).get();
  return doc.exists ? (doc.data()?.email as string) ?? null : null;
}

async function getUserName(uid: string): Promise<string> {
  const doc = await db.collection('users').doc(uid).get();
  return doc.exists ? (doc.data()?.displayName as string) ?? 'An employee' : 'An employee';
}

// ── Callable: Create Employee (manager-only) ──────────────────────────────────

export const createEmployee = onCall(
  { secrets: [] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated.');
    }

    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'manager') {
      throw new HttpsError('permission-denied', 'Only managers can create employee accounts.');
    }

    const { email, password, displayName, position, phoneNumber, role } =
      request.data as {
        email: string;
        password: string;
        displayName: string;
        position: string;
        phoneNumber: string;
        role: 'employee' | 'manager';
      };

    const userRecord = await admin.auth().createUser({ email, password, displayName });

    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName,
      role: role ?? 'employee',
      position: position ?? '',
      phoneNumber: phoneNumber ?? '',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { uid: userRecord.uid, message: 'Employee account created.' };
  }
);

// ── Trigger: Schedule published → email all staff ─────────────────────────────

export const onSchedulePublished = onDocumentUpdated(
  { document: 'schedules/{scheduleId}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.status === 'published' || after.status !== 'published') return;

    const resend = new Resend(RESEND_API_KEY.value());
    const emails = await getAllActiveEmails();
    if (!emails.length) return;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: emails,
      subject: 'New Weekly Schedule Published',
      html: `
        <h2>Your new schedule is ready!</h2>
        <p>A manager has published the schedule for the upcoming week.</p>
        <p>Log in to <strong>DT Schedules</strong> to view your shifts.</p>
      `,
    });
  }
);

// ── Trigger: Shift request created → notify managers ─────────────────────────

export const onShiftRequestCreated = onDocumentCreated(
  { document: 'shiftRequests/{requestId}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const resend = new Resend(RESEND_API_KEY.value());
    const managerEmails = await getManagerEmails();
    const requesterName = await getUserName(data.requestedBy as string);

    if (data.type === 'drop') {
      if (managerEmails.length) {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: managerEmails,
          subject: `Shift Drop Request from ${requesterName}`,
          html: `
            <h2>Shift Drop Request Needs Approval</h2>
            <p><strong>${requesterName}</strong> has requested to drop a shift.</p>
            <p>Log in to <strong>DT Schedules</strong> to approve or deny this request.</p>
          `,
        });
      }
    } else if (data.type === 'pickup') {
      if (managerEmails.length) {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: managerEmails,
          subject: `Shift Pickup Request from ${requesterName}`,
          html: `
            <h2>Shift Pickup Request Needs Approval</h2>
            <p><strong>${requesterName}</strong> wants to pick up an available shift.</p>
            <p>Log in to <strong>DT Schedules</strong> to approve or deny this request.</p>
          `,
        });
      }

      const requesterEmail = await getUserEmail(data.requestedBy as string);
      if (requesterEmail) {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: [requesterEmail],
          subject: 'Your Shift Pickup Request is Pending',
          html: `
            <h2>Request Received</h2>
            <p>Your request to pick up a shift is pending manager approval.</p>
            <p>You'll receive another email once a decision is made.</p>
          `,
        });
      }
    }
  }
);

// ── Trigger: Shift request reviewed → notify requester ───────────────────────

export const onShiftRequestReviewed = onDocumentUpdated(
  { document: 'shiftRequests/{requestId}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.status !== 'pending' || after.status === 'pending') return;

    const resend = new Resend(RESEND_API_KEY.value());
    const requesterEmail = await getUserEmail(after.requestedBy as string);
    if (!requesterEmail) return;

    const approved = after.status === 'approved';
    const label = approved ? 'Approved' : 'Denied';
    const color = approved ? '#16a34a' : '#dc2626';

    await resend.emails.send({
      from: FROM_EMAIL,
      to: [requesterEmail],
      subject: `Your Shift Request Was ${label}`,
      html: `
        <h2 style="color:${color}">Shift Request ${label}</h2>
        <p>Your shift <strong>${after.type}</strong> request has been
          <strong style="color:${color}">${label.toLowerCase()}</strong>.
        </p>
        ${after.managerNote ? `<p><em>Manager note: ${after.managerNote}</em></p>` : ''}
        <p>Log in to <strong>DT Schedules</strong> to view your updated schedule.</p>
      `,
    });
  }
);

// ── Trigger: Announcement created → notify all staff ─────────────────────────

export const onAnnouncementCreated = onDocumentCreated(
  { document: 'announcements/{announcementId}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const resend = new Resend(RESEND_API_KEY.value());
    const emails = await getAllActiveEmails();
    if (!emails.length) return;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: emails,
      subject: `New Announcement: ${data.title}`,
      html: `
        <h2>${data.title}</h2>
        <p>${(data.content as string).replace(/\n/g, '<br>')}</p>
        <hr>
        <p style="color:#6b7280;font-size:12px">Posted by ${data.postedByName} on DT Schedules.</p>
      `,
    });
  }
);
