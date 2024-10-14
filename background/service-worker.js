// State management
const state = {
  websiteTimers: {},
  settings: {
    websites: [],
    globalSettings: {
      minElo: 800,
      maxElo: 2000,
      timeBonus: 2,
      wrongMovePenalty: 1,
      hintPenalty: 1,
      skipPenalty: 2
    }
  }
};

// Initialization
chrome.runtime.onInstalled.addListener(initializeExtension);

// Event listeners
chrome.tabs.onUpdated.addListener(handleTabUpdate);
chrome.tabs.onRemoved.addListener(handleTabRemoval);
chrome.storage.onChanged.addListener(handleStorageChange);
chrome.runtime.onMessage.addListener(handleMessage);

// Initialization function
function initializeExtension() {
  console.log('Extension installed. Loading settings...');
  loadSettings();
}

// Settings management
function loadSettings() {
  chrome.storage.sync.get(['websites', 'globalSettings'], (data) => {
    if (data.websites) state.settings.websites = data.websites;
    if (data.globalSettings) state.settings.globalSettings = data.globalSettings;
    console.log('Settings loaded:', state.settings);
  });
}

// Tab management
function handleTabUpdate(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log(`Tab updated: ${tabId}, URL: ${tab.url}`);
    const website = findMatchingWebsite(tab.url);
    if (website) {
      console.log(`Monitored website detected: ${website.url}`);
      checkPuzzleRequirement(tabId, website);
      updateTimerBar(tabId, website);  // Changed from initializeTimerBar
    }
  }
}
function findMatchingWebsite(url) {
  return state.settings.websites.find(site => url.includes(site.url));
}

// Puzzle management
function checkPuzzleRequirement(tabId, website) {
  console.log(`Checking puzzle requirement for website: ${website.url}`);
  const timer = state.websiteTimers[website.url];
  if (!timer || timer.status === 'expired') {
    console.log(`Puzzle required for website ${website.url}. Reason: ${!timer ? 'New session' : 'Session expired'}`);
    chrome.tabs.sendMessage(tabId, { target: 'overlay', action: "showOverlay", reason: "start" });
  } else if (timer.status === 'active') {
    console.log(`Active session for website ${website.url}. No puzzle required.`);
  }
}

// Timer management
function updateTimerBar(tabId, website) {
  const remainingTime = getTimerStatus(website.url);
  chrome.tabs.sendMessage(tabId, {
    target: 'timerBar',
    action: "updateTimerBar",
    timeLeft: remainingTime * 60, // Convert minutes to seconds
    totalTime: website.timePerSession * 60
  });
}
function startTimer(website) {
  console.log(`Starting timer for website: ${website.url}`);
  if (state.websiteTimers[website.url]) {
    console.log(`Clearing existing timer for website ${website.url}`);
    clearTimeout(state.websiteTimers[website.url].timer);
  }
  
  state.websiteTimers[website.url] = {
    status: 'active',
    startTime: Date.now(),
    timer: setTimeout(() => {
      console.log(`Timer expired for website ${website.url}`);
      state.websiteTimers[website.url].status = 'expired';
      notifyAllTabs(website.url);
    }, website.timePerSession * 60 * 1000)
  };
  console.log(`Timer set for ${website.timePerSession} minutes`);
}

function getTimerStatus(websiteUrl) {
  const timer = state.websiteTimers[websiteUrl];
  if (!timer || timer.status !== 'active') {
    console.log(`No active timer for website ${websiteUrl}`);
    return 0;
  }
  const website = findMatchingWebsite(websiteUrl);
  if (!website) return 0;

  const elapsedTime = Date.now() - timer.startTime;
  const remainingTime = Math.max(0, Math.round((website.timePerSession * 60 * 1000 - elapsedTime) / (60 * 1000)));
  console.log(`Timer status for website ${websiteUrl}: ${remainingTime} minutes remaining`);
  return remainingTime;
}

// Notification management
function notifyAllTabs(websiteUrl) {
  chrome.tabs.query({url: `*://${websiteUrl}/*`}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { target: 'overlay', action: "showOverlay", reason: "timeUp" });
    });
  });
}

// Message handling
function handleMessage(request, sender, sendResponse) {
  console.log('Message received:', request);
  switch (request.action) {
    case "overlayCompleted":
      handleOverlayCompleted(sender, request, sendResponse);
      break;
    case "getTimerStatus":
      handleGetTimerStatus(sender, sendResponse);
      break;
  }
  return true; // Required for sendResponse to work
}

function handleOverlayCompleted(sender, request, sendResponse) {
  if (sender.tab && request.solved) {
    const websiteUrl = new URL(sender.tab.url).hostname;
    const website = findMatchingWebsite(websiteUrl);
    if (website) {
      console.log(`Puzzle solved for website: ${website.url}`);
      startTimer(website);
      updateTimerBar(sender.tab.id, website);  // Changed from initializeTimerBar
      sendResponse({ status: "Timer started" });
    }
  }
}
function handleGetTimerStatus(sender, sendResponse) {
  if (sender.tab) {
    const websiteUrl = new URL(sender.tab.url).hostname;
    const website = findMatchingWebsite(websiteUrl);
    if (website) {
      const remainingTime = getTimerStatus(website.url);
      console.log(`Timer status requested for website ${website.url}. Remaining time: ${remainingTime} minutes`);
      sendResponse({ status: `Time remaining: ${remainingTime} minutes` });
    } else {
      sendResponse({ status: "No active timer for this website" });
    }
  } else {
    console.log('Timer status requested, but no tab information available');
    sendResponse({ status: "No active timer" });
  }
}

// Tab removal handling
function handleTabRemoval(tabId, removeInfo) {
  console.log(`Tab ${tabId} removed`);
  chrome.tabs.query({}, (tabs) => {
    Object.keys(state.websiteTimers).forEach(websiteUrl => {
      if (!tabs.some(tab => tab.url.includes(websiteUrl))) {
        console.log(`Cleaning up timer for website ${websiteUrl}`);
        clearTimeout(state.websiteTimers[websiteUrl].timer);
        delete state.websiteTimers[websiteUrl];
      }
    });
  });
}

// Storage change handling
function handleStorageChange(changes, namespace) {
  for (let key in changes) {
    let storageChange = changes[key];
    console.log('Storage key "%s" in namespace "%s" changed. ' +
                'Old value was "%s", new value is "%s".',
                key,
                namespace,
                storageChange.oldValue,
                storageChange.newValue);
    
    if (key === 'websites' || key === 'globalSettings') {
      state.settings[key] = storageChange.newValue;
    }
  }
  console.log('Updated settings:', state.settings);
}

console.log('Service worker initialized');