import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { updateProfile, changePassword, deleteAccount } from '../services/userService';

function Section({ title, description, children }) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [notificationPref, setNotificationPref] = useState(
    user?.defaultNotificationPreference || 'every_change'
  );
  const [profileMsg, setProfileMsg] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');

  async function handleProfileSave(e) {
    e.preventDefault();
    setProfileMsg('');
    try {
      await updateProfile({ name, defaultNotificationPreference: notificationPref });
      setProfileMsg('Saved.');
    } catch {
      setProfileMsg('Could not save changes.');
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPasswordMsg('');
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMsg('Password updated. Please log in again.');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => logout().then(() => navigate('/login')), 1500);
    } catch (err) {
      setPasswordMsg(err.response?.data?.error || 'Could not change password.');
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault();
    setDeleteMsg('');
    if (!window.confirm('This will permanently delete your account. Continue?')) return;
    try {
      await deleteAccount(deletePassword);
      await logout();
      navigate('/login');
    } catch (err) {
      setDeleteMsg(err.response?.data?.error || 'Could not delete account.');
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Settings</h1>

      <Section title="Profile">
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input className={`${inputClass} bg-slate-50 text-slate-500`} value={user?.email} disabled />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Default notification preference
            </label>
            <select
              className={inputClass}
              value={notificationPref}
              onChange={(e) => setNotificationPref(e.target.value)}
            >
              <option value="every_change">Every change</option>
              <option value="important_only">Important changes only</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          {profileMsg && <p className="text-sm text-slate-600">{profileMsg}</p>}
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Save
          </button>
        </form>
      </Section>

      <Section title="Change password" description="You'll be logged out after changing your password.">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Current password</label>
            <input
              type="password"
              className={inputClass}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">New password</label>
            <input
              type="password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {passwordMsg && <p className="text-sm text-slate-600">{passwordMsg}</p>}
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Update password
          </button>
        </form>
      </Section>

      <Section title="Delete account" description="This permanently deletes your account. This cannot be undone.">
        <form onSubmit={handleDeleteAccount} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Confirm password</label>
            <input
              type="password"
              className={inputClass}
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
            />
          </div>
          {deleteMsg && <p className="text-sm text-red-600">{deleteMsg}</p>}
          <button
            type="submit"
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete my account
          </button>
        </form>
      </Section>
    </DashboardLayout>
  );
}
