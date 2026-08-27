import api from './api';

export async function listWatches(status) {
  const res = await api.get('/watches', { params: status ? { status } : {} });
  return res.data.watches;
}

export async function getWatch(id) {
  const res = await api.get(`/watches/${id}`);
  return res.data;
}

export async function createWatch(payload) {
  const res = await api.post('/watches', payload);
  return res.data.watch;
}

export async function updateWatch(id, payload) {
  const res = await api.patch(`/watches/${id}`, payload);
  return res.data.watch;
}

export async function deleteWatch(id) {
  await api.delete(`/watches/${id}`);
}

export async function pauseWatch(id) {
  const res = await api.post(`/watches/${id}/pause`);
  return res.data.watch;
}

export async function resumeWatch(id) {
  const res = await api.post(`/watches/${id}/resume`);
  return res.data.watch;
}

export async function checkWatchNow(id) {
  const res = await api.post(`/watches/${id}/check`);
  return res.data.watch;
}

export async function listChanges(watchId, params = {}) {
  const res = await api.get(`/watches/${watchId}/changes`, { params });
  return res.data.changes;
}

export async function getChange(id) {
  const res = await api.get(`/changes/${id}`);
  return res.data.change;
}

export async function getDashboardStats() {
  const res = await api.get('/dashboard/stats');
  return res.data.stats;
}
