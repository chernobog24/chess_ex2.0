document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('addWebsite').addEventListener('click', addWebsite);

function loadSettings() {
  chrome.storage.sync.get(['websites', 'showTimer'], (data) => {
    if (data.websites) updateWebsiteList(data.websites);
    if (data.showTimer !== undefined) document.getElementById('showTimer').checked = data.showTimer;
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
      <span>${site}</span>
      <div class="website-controls">
        <select class="time-select">
          ${generateTimeOptions()}
        </select>
        <span>min/session</span>
        <select class="session-select">
          ${generateSessionOptions()}
        </select>
        <span>sessions/day</span>
        <button class="remove-website" data-site="${site}">✖</button>
      </div>
    `;
    list.appendChild(li);
  });
  
  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-website').forEach(btn => {
    btn.addEventListener('click', function() {
      removeWebsite(this.getAttribute('data-site'));
    });
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

function generateTimeOptions() {
  let options = '';
  for (let i = 5; i <= 60; i += 5) {
    options += `<option value="${i}">${i}</option>`;
  }
  return options;
}

function generateSessionOptions() {
  let options = '';
  for (let i = 1; i <= 10; i++) {
    options += `<option value="${i}">${i}</option>`;
  }
  return options;
}

// Save showTimer setting when toggled
document.getElementById('showTimer').addEventListener('change', function() {
  chrome.storage.sync.set({showTimer: this.checked});
});