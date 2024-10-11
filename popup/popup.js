document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  document.getElementById('triggerOverlayBtn').addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "showOverlay"});
    });
  });
  
  // Fetch and display timer status
  chrome.runtime.sendMessage({action: "getTimerStatus"}, (response) => {
    document.getElementById('timerStatus').textContent = response.status;
  });