document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('triggerOverlayBtn').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {target: 'overlay', action: "showOverlay"});
  });
});

// Fetch and display timer status
chrome.runtime.sendMessage({target: 'background', action: "getTimerStatus"}, (response) => {
  document.getElementById('timerStatus').textContent = response.status;
});
