let websiteTimers = {};
let settings = {
  websites: [],
  globalSettings: {
    minElo: 800,
    maxElo: 2000,
    timeBonus: 2,
    wrongMovePenalty: 1,
    hintPenalty: 1,
    skipPenalty: 2
  }
};

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed. Loading settings...');
  chrome.storage.sync.get(['websites', 'globalSettings'], (data) => {
    if (data.websites) settings.websites = data.websites;
    if (data.globalSettings) settings.globalSettings = data.globalSettings;
    console.log('Settings loaded:', settings);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log(`Tab updated: ${tabId}, URL: ${tab.url}`);
    const website = settings.websites.find(site => tab.url.includes(site.url));
    if (website) {
      console.log(`Monitored website detected: ${website.url}`);
      checkPuzzleRequirement(tabId, website);
      initializeTimerBar(tabId, website);
    }
  }
});

function checkPuzzleRequirement(tabId, website) {
  console.log(`Checking puzzle requirement for website: ${website.url}`);
  if (!websiteTimers[website.url] || websiteTimers[website.url].status === 'expired') {
    console.log(`Puzzle required for website ${website.url}. Reason: ${!websiteTimers[website.url] ? 'New session' : 'Session expired'}`);
    chrome.tabs.sendMessage(tabId, { target: 'overlay', action: "showOverlay", reason: "start" });
  } else if (websiteTimers[website.url].status === 'active') {
    console.log(`Active session for website ${website.url}. No puzzle required.`);
  }
}

function initializeTimerBar(tabId, website) {
  chrome.tabs.sendMessage(tabId, { 
    target: 'timerBar',
    action: "initializeTimerBar",
    totalTime: website.timePerSession * 60 // Convert minutes to seconds
  });
  updateTimerBar(tabId, website);
}

function updateTimerBar(tabId, website) {
  const remainingTime = getTimerStatus(website.url);
  chrome.tabs.sendMessage(tabId, {
    target: 'timerBar',
    action: "updateTimer",
    timeLeft: remainingTime * 60, // Convert minutes to seconds
    totalTime: website.timePerSession * 60
  });
}

function startTimer(website) {
  console.log(`Starting timer for website: ${website.url}`);
  if (websiteTimers[website.url]) {
    console.log(`Clearing existing timer for website ${website.url}`);
    clearTimeout(websiteTimers[website.url].timer);
  }
  
  websiteTimers[website.url] = {
    status: 'active',
    startTime: Date.now(),
    timer: setTimeout(() => {
      console.log(`Timer expired for website ${website.url}`);
      websiteTimers[website.url].status = 'expired';
      notifyAllTabs(website.url);
    }, website.timePerSession * 60 * 1000)
  };
  console.log(`Timer set for ${website.timePerSession} minutes`);
}

function notifyAllTabs(websiteUrl) {
  chrome.tabs.query({url: `*://${websiteUrl}/*`}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { target: 'overlay', action: "showOverlay", reason: "timeUp" });
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  switch (request.action) {
    case "overlayCompleted":
      if (sender.tab && request.solved) {
        const websiteUrl = new URL(sender.tab.url).hostname;
        const website = settings.websites.find(site => websiteUrl.includes(site.url));
        if (website) {
          console.log(`Puzzle solved for website: ${website.url}`);
          startTimer(website);
          sendResponse({ status: "Timer started" });
        }
      }
      break;
    case "getTimerStatus":
      if (sender.tab) {
        const websiteUrl = new URL(sender.tab.url).hostname;
        const website = settings.websites.find(site => websiteUrl.includes(site.url));
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
      break;
  }
  return true; // Required for sendResponse to work
});

function getTimerStatus(websiteUrl) {
  if (!websiteTimers[websiteUrl] || websiteTimers[websiteUrl].status !== 'active') {
    console.log(`No active timer for website ${websiteUrl}`);
    return 0;
  }
  const website = settings.websites.find(site => websiteUrl.includes(site.url));
  if (!website) return 0;

  const elapsedTime = Date.now() - websiteTimers[websiteUrl].startTime;
  const remainingTime = Math.max(0, Math.round((website.timePerSession * 60 * 1000 - elapsedTime) / (60 * 1000)));
  console.log(`Timer status for website ${websiteUrl}: ${remainingTime} minutes remaining`);
  return remainingTime;
}

// Listen for tab removal to clean up timers if it's the last tab for a website
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log(`Tab ${tabId} removed`);
  chrome.tabs.query({}, (tabs) => {
    let websites = Object.keys(websiteTimers);
    websites.forEach(websiteUrl => {
      if (!tabs.some(tab => tab.url.includes(websiteUrl))) {
        console.log(`Cleaning up timer for website ${websiteUrl}`);
        clearTimeout(websiteTimers[websiteUrl].timer);
        delete websiteTimers[websiteUrl];
      }
    });
  });
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let key in changes) {
    let storageChange = changes[key];
    console.log('Storage key "%s" in namespace "%s" changed. ' +
                'Old value was "%s", new value is "%s".',
                key,
                namespace,
                storageChange.oldValue,
                storageChange.newValue);
    
    if (key === 'websites' || key === 'globalSettings') {
      settings[key] = storageChange.newValue;
    }
  }
  console.log('Updated settings:', settings);
});

console.log('Service worker initialized');
