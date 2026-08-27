import api from './api';

export async function updateProfile(payload) {
  const res = await api.patch('/users/me', payload);
  return res.data.user;
}

export async function changePassword(currentPassword, newPassword) {
  const res = await api.post('/users/me/change-password', { currentPassword, newPassword });
  return res.data;
}

export async function deleteAccount(password) {
  const res = await api.post('/users/me/delete-account', { password });
  return res.data;
}
