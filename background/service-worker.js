// State management
const state = {
  websiteTimers: {},
  settings: {
    websites: [],
    globalSettings: {
      minElo: 1000,
      maxElo: 1900,
      timeBonus: 2,
      wrongMovePenalty: 1,
      hintPenalty: 1,
      skipPenalty: 2
    }
  },
  sessions: {}
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

    // Load sessions from local storage
    chrome.storage.local.get(['sessions'], (result) => {
      if (result.sessions) {
        state.sessions = result.sessions;
        console.log('Sessions loaded from storage');
      } else {
        console.log('No saved sessions found, initializing empty sessions');
      }

      // Initialize or update session counters
      state.settings.websites.forEach(website => {
        if (!state.sessions[website.url]) {
          state.sessions[website.url] = {
            count: 0,
            lastResetDate: new Date().toDateString()
          };
        }
      });

      console.log('Sessions initialized:', state.sessions);
    });
  });
}

// Tab management
function handleTabUpdate(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log(`Tab updated: ${tabId}, URL: ${tab.url}`);
    const website = findMatchingWebsite(tab.url);
    if (website) {
      console.log(`Monitored website detected: ${website.url}`);
      updateSessionCount(website);
      checkPuzzleRequirement(tabId, website);
      updateTimerBar(tabId, website);
    }
  }
}

function findMatchingWebsite(url) {
  return state.settings.websites.find(site => url.includes(site.url));
}

function updateSessionCount(website) {
  const today = new Date().toDateString();
  const websiteTimer = state.websiteTimers[website.url];

  // Only update if there's no active timer
  if (!websiteTimer || websiteTimer.status !== 'active') {
    if (state.sessions[website.url].lastResetDate !== today) {
      state.sessions[website.url] = {
        count: 0,
        lastResetDate: today
      };
    }
    if (state.sessions[website.url].count < website.sessions) {
      state.sessions[website.url].count++;
    }

    // Save the updated state to Chrome's storage
    chrome.storage.local.set({ sessions: state.sessions }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving sessions:', chrome.runtime.lastError);
      } else {
        console.log('Sessions saved successfully');
      }
    });
  }
}
// Puzzle management
function checkPuzzleRequirement(tabId, website) {
  console.log(`Checking puzzle requirement for website: ${website.url}`);
  const timer = state.websiteTimers[website.url];
  if (!timer || timer.status === 'expired') {
    console.log(`Puzzle required for website ${website.url}. Reason: ${!timer ? 'New session' : 'Session expired'}`);
    sendOverlayMessage(tabId, "start", website.url);
  } else if (timer.status === 'active') {
    console.log(`Active session for website ${website.url}. No puzzle required.`);
  }
}

function calculateCurrentElo(website) {
  const { minElo, maxElo } = state.settings.globalSettings;
  const sessionProgress = state.sessions[website.url].count / website.sessions;
  console.log(`Session progress for ${website.url}: ${sessionProgress}`)
  console.log(`Elo set to ${minElo + (maxElo - minElo) * sessionProgress}`)
  return Math.round(minElo + (maxElo - minElo) * sessionProgress);
}

// Timer management
function updateTimerBar(tabId, website) {
  const remainingTime = getTimerStatus(website.url);
  const timer = state.websiteTimers[website.url];
  chrome.tabs.sendMessage(tabId, {
    target: 'timerBar',
    action: "updateTimerBar",
    timeLeft: remainingTime,
    totalTime: timer ? timer.duration : (website.timePerSession * 60) // Use actual duration instead of max time
  });
}

// In service-worker.js
function startTimer(website, bonusTime = 0) {
  console.log(`Starting timer for website: ${website.url}`);
  if (state.websiteTimers[website.url]) {
    console.log(`Clearing existing timer for website ${website.url}`);
    clearTimeout(state.websiteTimers[website.url].timer);
  }
  
  // Convert website.timePerSession from minutes to seconds for comparison
  const maxSessionSeconds = website.timePerSession * 60;
  // bonusTime is already in seconds from overlay
  const timerDuration = Math.min(maxSessionSeconds, bonusTime);
  
  state.websiteTimers[website.url] = {
    status: 'active',
    startTime: Date.now(),
    duration: timerDuration, // Store in seconds
    timer: setTimeout(() => {
      console.log(`Timer expired for website ${website.url}`);
      state.websiteTimers[website.url].status = 'expired';
      notifyAllTabs(website.url);
    }, timerDuration * 1000) // Convert to milliseconds for setTimeout
  };
  console.log(`Timer set for ${timerDuration} seconds (${timerDuration/60} minutes)`);
}

function getTimerStatus(websiteUrl) {
  const timer = state.websiteTimers[websiteUrl];
  if (!timer || timer.status !== 'active') {
    console.log(`No active timer for website ${websiteUrl}`);
    return 0;
  }

  const elapsedTime = (Date.now() - timer.startTime) / 1000; // Convert to seconds
  const remainingTime = Math.max(0, Math.round(timer.duration - elapsedTime));
  console.log(`Timer status for website ${websiteUrl}: ${remainingTime} seconds remaining`);
  return remainingTime;
}

// Notification management
function sendOverlayMessage(tabId, reason, websiteUrl) {
  const website = findMatchingWebsite(websiteUrl);
  if (website) {
    const currentElo = calculateCurrentElo(website);
    const overlayData = {
      currentElo,
      currentSession: state.sessions[website.url].count,
      maxSessions: website.sessions,
      globalSettings: state.settings.globalSettings,
      websiteSettings: website
    };
    chrome.tabs.sendMessage(tabId, { 
      target: 'overlay', 
      action: "showOverlay", 
      reason: reason,
      data: overlayData
    });
  }
}

function notifyAllTabs(websiteUrl) {
  chrome.tabs.query({url: `*://${websiteUrl}/*`}, (tabs) => {
    tabs.forEach(tab => {
      sendOverlayMessage(tab.id, "timeUp", websiteUrl);
    });
  });
}

// Message 
function handleMessage(request, sender, sendResponse) {
  console.log('Message received:', request);
  switch (request.action) {
    case "overlayCompleted":
      handleOverlayCompleted(sender, request, sendResponse);
      break;
    case "getTimerStatus":
      handleGetTimerStatus(sendResponse);
      break;
    case "triggerOverlay":
      handleTriggerOverlay(sendResponse);
      break;
  }
  return true;
}

function handleOverlayCompleted(sender, request, sendResponse) {
  if (sender.tab && request.solved) {
    const websiteUrl = new URL(sender.tab.url).hostname;
    const website = findMatchingWebsite(websiteUrl);
    if (website) {
      console.log(`Puzzle solved for website: ${website.url}`);
      // Pass timeAdded in seconds to startTimer
      startTimer(website, request.timeAdded);
      updateTimerBar(sender.tab.id, website);
      sendResponse({ status: "Timer started" });
    }
  }
}

function handleGetTimerStatus(sendResponse) {
  chrome.tabs.query({active: true, currentWindow: true}, ([tab]) => {
    if (tab) {
      const websiteUrl = new URL(tab.url).hostname;
      const website = findMatchingWebsite(websiteUrl);
      if (website) {
        const remainingTime = getTimerStatus(website.url);
        console.log(`Timer status requested for website ${website.url}. Remaining time: ${remainingTime} minutes`);
        sendResponse({ status: `Time remaining: ${remainingTime} minutes` });
      } else {
        sendResponse({ status: "No active timer for this website" });
      }
    } else {
      sendResponse({ status: "No active tab" });
    }
  });
}

function handleTriggerOverlay(sendResponse) {
  chrome.tabs.query({active: true, currentWindow: true}, ([tab]) => {
    if (tab) {
      const websiteUrl = new URL(tab.url).hostname;
      const website = findMatchingWebsite(websiteUrl);
      if (website) {
        sendOverlayMessage(tab.id, "start", websiteUrl);
        sendResponse({ status: "Overlay triggered" });
      } else {
        sendResponse({ status: "Website not monitored" });
      }
    } else {
      sendResponse({ status: "No active tab" });
    }
  });
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