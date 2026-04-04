import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import {
  MdClose, MdPerson, MdEmail, MdBadge, MdLocationOn,
  MdEdit, MdLock, MdSave, MdAccessTime, MdInfo
} from 'react-icons/md';

const CAPTURE_LABELS = {
  login:  '🔑 Login',
  '11am': '🕙 11:00 AM',
  '730pm':'🕖 7:30 PM',
  manual: '📌 Manual',
};

export default function ProfileModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [profile,  setProfile]  = useState(null);
  const [location, setLocation] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const [form, setForm] = useState({ name:'', email:'', currentPassword:'', newPassword:'' });
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    api.get('/profile/me').then(r => {
      setProfile(r.data.user);
      setLocation(r.data.location);
      setForm({ name: r.data.user.name, email: r.data.user.email, currentPassword:'', newPassword:'' });
    }).catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      const res = await api.put('/profile/me', form);
      setProfile(res.data.user);
      updateUser(res.data.user);
      toast.success('Profile updated!');
      setEditMode(false);
      setForm(f => ({ ...f, currentPassword:'', newPassword:'' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', {
    day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
  }) : '—';

  const avatarBg = isAdmin ? 'bg-blue-600' : 'bg-emerald-600';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${isAdmin ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-emerald-600 to-emerald-700'} p-6 rounded-t-2xl text-white`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl font-black`}>
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <h2 className="text-xl font-black">{profile?.name || user?.name}</h2>
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-white/20 font-bold uppercase tracking-wide">
                  {user?.role}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl"><MdClose/></button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading profile…</div>
          ) : (
            <>
              {/* Info / Edit form */}
              {editMode && isAdmin ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Full Name</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={form.name} onChange={e => setForm(f=>({...f, name:e.target.value}))} placeholder="Full name"/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Email</label>
                    <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={form.email} onChange={e => setForm(f=>({...f, email:e.target.value}))} placeholder="Email"/>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Change Password (optional)</p>
                    <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={form.currentPassword} onChange={e => setForm(f=>({...f, currentPassword:e.target.value}))} placeholder="Current password"/>
                    <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={form.newPassword} onChange={e => setForm(f=>({...f, newPassword:e.target.value}))} placeholder="New password"/>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSave} disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-lg transition">
                      <MdSave/> {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button onClick={() => setEditMode(false)}
                      className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* View mode */}
                  <div className="space-y-3">
                    <InfoRow icon={<MdPerson/>} label="Full Name" value={profile?.name} color="blue"/>
                    <InfoRow icon={<MdEmail/>}   label="Email"     value={profile?.email} color="blue"/>
                    <InfoRow icon={<MdBadge/>}   label="Role"      value={profile?.role?.toUpperCase()} color={isAdmin ? 'blue':'emerald'}/>
                    <InfoRow icon={<MdAccessTime/>} label="Member Since"
                      value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) : '—'}
                      color="gray"/>
                  </div>

                  {isAdmin && (
                    <button onClick={() => setEditMode(true)}
                      className="w-full flex items-center justify-center gap-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 text-sm font-semibold py-2 rounded-lg transition">
                      <MdEdit/> Edit Profile
                    </button>
                  )}

                  {/* Employee read-only notice */}
                  {!isAdmin && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                      <MdInfo className="mt-0.5 flex-shrink-0 text-base"/>
                      <span>Profile editing is restricted. Contact your admin to update your name, email, or password.</span>
                    </div>
                  )}
                </>
              )}

              {/* Location section */}
              <div className="border-t pt-5">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
                  <MdLocationOn className="text-red-500 text-lg"/> Last Known Location
                </h3>
                {location ? (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-500">Capture:</span>
                      <span className="text-gray-700">{CAPTURE_LABELS[location.capture_type] || location.capture_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-500">Time:</span>
                      <span className="text-gray-700">{fmtDate(location.captured_at)}</span>
                    </div>
                    {location.house_no && (
                      <div><span className="font-semibold text-gray-500">House/Building:</span> <span className="text-gray-700">{location.house_no}</span></div>
                    )}
                    {location.street && (
                      <div><span className="font-semibold text-gray-500">Street:</span> <span className="text-gray-700">{location.street}</span></div>
                    )}
                    {(location.city || location.state) && (
                      <div><span className="font-semibold text-gray-500">City/State:</span> <span className="text-gray-700">{[location.city, location.state].filter(Boolean).join(', ')}</span></div>
                    )}
                    {location.pincode && (
                      <div><span className="font-semibold text-gray-500">Pincode:</span> <span className="text-gray-700">{location.pincode}</span></div>
                    )}
                    <div className="pt-1">
                      <a
                        href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                        target="_blank" rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        📍 View on Google Maps ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-4 text-center">
                    No location captured yet. Location is captured on login.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, color='gray' }) {
  const colors = {
    blue:    'text-blue-500',
    emerald: 'text-emerald-500',
    gray:    'text-gray-400',
  };
  return (
    <div className="flex items-center gap-3">
      <span className={`text-lg ${colors[color]}`}>{icon}</span>
      <div>
        <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide leading-none">{label}</p>
        <p className="text-sm text-gray-800 font-medium mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );
}
