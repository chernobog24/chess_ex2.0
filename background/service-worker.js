let websiteTimers = {};
let settings = {
  websites: [],
  timerDuration: 30 // Default 30 minutes
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['websites', 'timerDuration'], (data) => {
    if (data.websites) settings.websites = data.websites;
    if (data.timerDuration) settings.timerDuration = data.timerDuration;
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const website = settings.websites.find(site => tab.url.includes(site));
    if (website) {
      startTimer(tabId, website);
    }
  }
});

function startTimer(tabId, website) {
  if (websiteTimers[tabId]) {
    clearTimeout(websiteTimers[tabId]);
  }
  websiteTimers[tabId] = setTimeout(() => {
    chrome.tabs.sendMessage(tabId, { action: "showOverlay" });
  }, settings.timerDuration * 60 * 1000);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "getTimerStatus":
      if (sender.tab) {
        const remainingTime = getTimerStatus(sender.tab.id);
        sendResponse({ status: `Time remaining: ${remainingTime} minutes` });
      } else {
        sendResponse({ status: "No active timer" });
      }
      break;
    case "overlayCompleted":
      if (request.solved) {
        resetTimer(sender.tab.id);
      }
      break;
    case "updateSettings":
      updateSettings(request.settings);
      break;
  }
  return true; // Required for sendResponse to work
});

function getTimerStatus(tabId) {
  if (!websiteTimers[tabId]) return 0;
  const elapsed = Date.now() - websiteTimers[tabId].startTime;
  return Math.max(0, Math.round((settings.timerDuration * 60 * 1000 - elapsed) / (60 * 1000)));
}

function resetTimer(tabId) {
  if (websiteTimers[tabId]) {
    clearTimeout(websiteTimers[tabId]);
    delete websiteTimers[tabId];
  }
}

function updateSettings(newSettings) {
  settings = { ...settings, ...newSettings };
  chrome.storage.sync.set(settings);
  // Optionally reset all timers here if settings have changed significantly
}

// Listen for tab removal to clean up timers
chrome.tabs.onRemoved.addListener((tabId) => {
  if (websiteTimers[tabId]) {
    clearTimeout(websiteTimers[tabId]);
    delete websiteTimers[tabId];
  }
});