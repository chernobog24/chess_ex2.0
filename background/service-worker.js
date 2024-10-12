let websiteTimers = {};
let settings = {
  websites: [],
  timerDuration: 30 // Default 30 minutes per session
};

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed. Loading settings...');
  chrome.storage.sync.get(['websites', 'timerDuration'], (data) => {
    if (data.websites) settings.websites = data.websites;
    if (data.timerDuration) settings.timerDuration = data.timerDuration;
    console.log('Settings loaded:', settings);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log(`Tab updated: ${tabId}, URL: ${tab.url}`);
    const website = settings.websites.find(site => tab.url.includes(site));
    if (website) {
      console.log(`Monitored website detected: ${website}`);
      checkPuzzleRequirement(tabId, website);
    }
  }
});

function checkPuzzleRequirement(tabId, website) {
  console.log(`Checking puzzle requirement for website: ${website}`);
  if (!websiteTimers[website] || websiteTimers[website].status === 'expired') {
    console.log(`Puzzle required for website ${website}. Reason: ${!websiteTimers[website] ? 'New session' : 'Session expired'}`);
    chrome.tabs.sendMessage(tabId, { action: "showOverlay", reason: "start" });
  } else if (websiteTimers[website].status === 'active') {
    console.log(`Active session for website ${website}. No puzzle required.`);
  }
}

function startTimer(website) {
  console.log(`Starting timer for website: ${website}`);
  if (websiteTimers[website]) {
    console.log(`Clearing existing timer for website ${website}`);
    clearTimeout(websiteTimers[website].timer);
  }
  
  websiteTimers[website] = {
    status: 'active',
    startTime: Date.now(),
    timer: setTimeout(() => {
      console.log(`Timer expired for website ${website}`);
      websiteTimers[website].status = 'expired';
      notifyAllTabs(website);
    }, settings.timerDuration * 1000)
  };
  console.log(`Timer set for ${settings.timerDuration} minutes`);
}

function notifyAllTabs(website) {
  chrome.tabs.query({url: `*://${website}/*`}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: "showOverlay", reason: "timeUp" });
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  switch (request.action) {
    case "overlayCompleted":
      if (sender.tab && request.solved) {
        const website = new URL(sender.tab.url).hostname;
        console.log(`Puzzle solved for website: ${website}`);
        startTimer(website);
        sendResponse({ status: "Timer started" });
      }
      break;
    case "getTimerStatus":
      if (sender.tab) {
        const website = new URL(sender.tab.url).hostname;
        const remainingTime = getTimerStatus(website);
        console.log(`Timer status requested for website ${website}. Remaining time: ${remainingTime} minutes`);
        sendResponse({ status: `Time remaining: ${remainingTime} minutes` });
      } else {
        console.log('Timer status requested, but no tab information available');
        sendResponse({ status: "No active timer" });
      }
      break;
    case "updateSettings":
      console.log('Updating settings:', request.settings);
      updateSettings(request.settings);
      break;
  }
  return true; // Required for sendResponse to work
});

function getTimerStatus(website) {
  if (!websiteTimers[website] || websiteTimers[website].status !== 'active') {
    console.log(`No active timer for website ${website}`);
    return 0;
  }
  const elapsedTime = Date.now() - websiteTimers[website].startTime;
  const remainingTime = Math.max(0, Math.round((settings.timerDuration * 60 * 1000 - elapsedTime) / (60 * 1000)));
  console.log(`Timer status for website ${website}: ${remainingTime} minutes remaining`);
  return remainingTime;
}

function updateSettings(newSettings) {
  console.log('Updating settings. Old settings:', settings);
  settings = { ...settings, ...newSettings };
  console.log('New settings:', settings);
  chrome.storage.sync.set(settings);
}

// Listen for tab removal to clean up timers if it's the last tab for a website
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log(`Tab ${tabId} removed`);
  chrome.tabs.query({}, (tabs) => {
    let websites = Object.keys(websiteTimers);
    websites.forEach(website => {
      if (!tabs.some(tab => tab.url.includes(website))) {
        console.log(`Cleaning up timer for website ${website}`);
        clearTimeout(websiteTimers[website].timer);
        delete websiteTimers[website];
      }
    });
  });
});

console.log('Service worker initialized');