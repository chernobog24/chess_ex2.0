document.getElementById('settingsBtn').addEventListener('click', () => chrome.runtime.openOptionsPage());

document.getElementById('triggerOverlayBtn').addEventListener('click', () => 
  chrome.runtime.sendMessage({action: "triggerOverlay"}));

chrome.runtime.sendMessage({action: "getTimerStatus"}, (response) => {
  document.getElementById('timerStatus').textContent = response.status;
});