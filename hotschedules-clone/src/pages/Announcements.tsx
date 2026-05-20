import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Announcement } from '../types';

function tsToDate(ts: unknown): Date {
  if (!ts) return new Date();
  if ((ts as any).toDate) return (ts as any).toDate();
  return new Date(ts as any);
}

export default function Announcements() {
  const { userProfile } = useAuth();
  const isManager = userProfile?.role === 'manager';
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'announcements'),
      orderBy('isPinned', 'desc'),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));
      setLoading(false);
    });
  }, []);

  const handlePost = async () => {
    if (!title.trim() || !content.trim() || !userProfile) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        title: title.trim(),
        content: content.trim(),
        postedBy: userProfile.uid,
        postedByName: userProfile.displayName,
        isPinned,
        createdAt: serverTimestamp(),
        updatedAt: null,
      });
      setTitle('');
      setContent('');
      setIsPinned(false);
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    await deleteDoc(doc(db, 'announcements', id));
  };

  const togglePin = async (a: Announcement) => {
    await updateDoc(doc(db, 'announcements', a.id), {
      isPinned: !a.isPinned,
      updatedAt: serverTimestamp(),
    });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Announcements</h2>
          <p className="text-slate-500 text-sm mt-1">Company-wide bulletin board.</p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
          >
            {showForm ? 'Cancel' : '+ Post Announcement'}
          </button>
        )}
      </div>

      {isManager && showForm && (
        <div className="bg-white rounded border border-gray-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">New Announcement</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <textarea
              placeholder="Content"
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={e => setIsPinned(e.target.checked)}
                  className="rounded"
                />
                Pin to top
              </label>
              <button
                onClick={handlePost}
                disabled={submitting || !title.trim() || !content.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded transition-colors"
              >
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded border border-gray-200 p-8 text-center">
          <p className="text-slate-400 text-sm">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => (
            <div
              key={a.id}
              className={`bg-white rounded border p-5 ${a.isPinned ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {a.isPinned && (
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                      Pinned
                    </span>
                  )}
                  <h3 className="font-semibold text-slate-800 text-sm">{a.title}</h3>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-xs text-slate-400">
                    {tsToDate(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {isManager && (
                    <>
                      <button
                        onClick={() => togglePin(a)}
                        className="text-xs text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        {a.isPinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="text-xs text-slate-400 hover:text-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-600">{a.content}</p>
              <p className="text-xs text-slate-400 mt-3">Posted by: {a.postedByName}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
