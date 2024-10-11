document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('addWebsite').addEventListener('click', addWebsite);
document.getElementById('saveSettings').addEventListener('click', saveSettings);
document.getElementById('resetSettings').addEventListener('click', resetSettings);

function loadSettings() {
  chrome.storage.sync.get(['websites', 'timerDuration'], (data) => {
    if (data.websites) updateWebsiteList(data.websites);
    if (data.timerDuration) document.getElementById('timerDuration').value = data.timerDuration;
  });
}

function addWebsite() {
  const input = document.getElementById('websiteInput');
  const website = input.value.trim();
  if (website) {
    chrome.storage.sync.get({websites: []}, (data) => {
      if (!data.websites.includes(website)) {
        data.websites.push(website);
        chrome.storage.sync.set({websites: data.websites}, () => {
          updateWebsiteList(data.websites);
          input.value = '';
        });
      }
    });
  }
}

function updateWebsiteList(websites) {
  const list = document.getElementById('websiteList');
  list.innerHTML = '';
  websites.forEach(site => {
    const li = document.createElement('li');
    li.textContent = site;
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => removeWebsite(site);
    li.appendChild(removeBtn);
    list.appendChild(li);
  });
}

function removeWebsite(site) {
  chrome.storage.sync.get({websites: []}, (data) => {
    const updatedWebsites = data.websites.filter(w => w !== site);
    chrome.storage.sync.set({websites: updatedWebsites}, () => {
      updateWebsiteList(updatedWebsites);
    });
  });
}

function saveSettings() {
  const timerDuration = document.getElementById('timerDuration').value;
  chrome.storage.sync.set({timerDuration: parseInt(timerDuration)}, () => {
    alert('Settings saved');
  });
}

function resetSettings() {
  const defaultSettings = {
    websites: [],
    timerDuration: 30
  };
  chrome.storage.sync.set(defaultSettings, () => {
    loadSettings();
    alert('Settings reset to default');
  });
}