export async function getToken() {
  const { watchweb_token } = await chrome.storage.local.get('watchweb_token');
  return watchweb_token || null;
}

export async function setToken(token) {
  await chrome.storage.local.set({ watchweb_token: token });
}

export async function clearToken() {
  await chrome.storage.local.remove('watchweb_token');
}

export async function getUser() {
  const { watchweb_user } = await chrome.storage.local.get('watchweb_user');
  return watchweb_user || null;
}

export async function setUser(user) {
  await chrome.storage.local.set({ watchweb_user: user });
}
