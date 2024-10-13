document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('addWebsite').addEventListener('click', addWebsite);

function loadSettings() {
  chrome.storage.sync.get(['websites', 'showTimer', 'globalSettings'], (data) => {
    if (data.websites) {
      // Filter out invalid entries
      const validWebsites = data.websites.filter(site => 
        site && typeof site === 'object' && site.url && typeof site.url === 'string' && site.url !== 'undefined'
      );
      
      // If we filtered out any invalid entries, update the storage
      if (validWebsites.length !== data.websites.length) {
        chrome.storage.sync.set({websites: validWebsites}, () => {
          console.log('Removed invalid website entries');
        });
      }
      
      updateWebsiteList(validWebsites);
    }
    if (data.showTimer !== undefined) document.getElementById('showTimer').checked = data.showTimer;
    if (data.globalSettings) updateGlobalSettings(data.globalSettings);
    else initializeGlobalSettings();
  });
}

function initializeGlobalSettings() {
  const defaultGlobalSettings = {
    minElo: 800,
    maxElo: 2000,
    timeBonus: 2,
    wrongMovePenalty: 1,
    hintPenalty: 1,
    skipPenalty: 2
  };
  chrome.storage.sync.set({globalSettings: defaultGlobalSettings}, () => {
    updateGlobalSettings(defaultGlobalSettings);
  });
}

function updateGlobalSettings(settings) {
  Object.keys(settings).forEach(key => {
    const element = document.getElementById(key);
    if (element) element.value = settings[key];
  });
}

function addWebsite() {
  const input = document.getElementById('websiteInput');
  const website = input.value.trim();
  if (website) {
    chrome.storage.sync.get({websites: []}, (data) => {
      if (!data.websites.some(site => site.url === website)) {
        data.websites.push({
          url: website,
          sessions: 3,
          timePerSession: 30
        });
        chrome.storage.sync.set({websites: data.websites}, () => {
          updateWebsiteList(data.websites);
          input.value = '';
        });
      } else {
        alert('This website is already in the list.');
      }
    });
  }
}

function updateWebsiteList(websites) {
  const list = document.getElementById('websiteList');
  list.innerHTML = '';
  websites.forEach(site => {
    const li = document.createElement('li');
    li.innerHTML = `
      <h3>${site.url}</h3>
      <div class="website-controls">
        <label>Sessions per day: <input type="number" class="sessions" value="${site.sessions}" min="1" max="10"></label>
        <label> per session: <input type="number" class="timePerSession" value="${site.timePerSession}" min="1" max="120"></label>
        <button class="remove-website" data-site="${site.url}">Remove</button>
      </div>
    `;
    list.appendChild(li);
  });
  
  // Add event listeners to remove buttons and input fields
  document.querySelectorAll('.remove-website').forEach(btn => {
    btn.addEventListener('click', function() {
      removeWebsite(this.getAttribute('data-site'));
    });
  });

  document.querySelectorAll('.website-controls input').forEach(input => {
    input.addEventListener('change', function() {
      updateWebsiteSettings(this);
    });
  });
}

function removeWebsite(siteUrl) {
  chrome.storage.sync.get({websites: []}, (data) => {
    const updatedWebsites = data.websites.filter(site => site.url !== siteUrl);
    chrome.storage.sync.set({websites: updatedWebsites}, () => {
      updateWebsiteList(updatedWebsites);
    });
  });
}

function updateWebsiteSettings(input) {
  const li = input.closest('li');
  const siteUrl = li.querySelector('h3').textContent;
  const newValue = parseInt(input.value);
  const settingName = input.className;

  chrome.storage.sync.get({websites: []}, (data) => {
    const updatedWebsites = data.websites.map(site => {
      if (site.url === siteUrl) {
        site[settingName] = newValue;
      }
      return site;
    });
    chrome.storage.sync.set({websites: updatedWebsites});
  });
}

// Save showTimer setting when toggled
document.getElementById('showTimer').addEventListener('change', function() {
  chrome.storage.sync.set({showTimer: this.checked});
});

// Save global settings when changed
document.querySelectorAll('#globalSettings input').forEach(input => {
  input.addEventListener('change', function() {
    saveGlobalSettings();
  });
});

function saveGlobalSettings() {
  const globalSettings = {
    minElo: parseInt(document.getElementById('minElo').value),
    maxElo: parseInt(document.getElementById('maxElo').value),
    timeBonus: parseInt(document.getElementById('timeBonus').value),
    wrongMovePenalty: parseInt(document.getElementById('wrongMovePenalty').value),
    hintPenalty: parseInt(document.getElementById('hintPenalty').value),
    skipPenalty: parseInt(document.getElementById('skipPenalty').value)
  };
  chrome.storage.sync.set({globalSettings});
}