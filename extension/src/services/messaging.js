export function sendMessage(type, payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (!response) return reject(new Error('No response from background service worker'));
      if (!response.ok) return reject(Object.assign(new Error(response.error || 'Request failed'), response));
      return resolve(response);
    });
  });
}
