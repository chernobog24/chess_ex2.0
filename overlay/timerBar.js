// overlay/timerBar.js

class TimerBar {
  constructor() {
    this.barElement = null;
    this.timeLeft = 0;
    this.isVisible = false;
  }

  init() {
    this.createBarElement();
    this.setupMessageListener();
    console.log('TimerBar initialized');
  }

  createBarElement() {
    if (!this.barElement) {
      this.barElement = document.createElement('div');
      this.barElement.id = 'chess-puzzle-timer-bar';
      this.barElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 25px;
        background-color: #4CAF50;
        z-index: 99999;
        transition: width 1s linear;
      `;
      document.body.appendChild(this.barElement);
      this.showTimer(); // Make the timer visible by default
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.target !== 'timerBar') return; // Only process messages targeted at timerBar

      switch (request.action) {
        case 'initializeTimerBar':
          this.createBarElement();
          break;
        case 'updateTimer':
          this.updateTimer(request.timeLeft, request.totalTime);
          break;
        case 'showTimer':
          this.showTimer();
          break;
        case 'hideTimer':
          this.hideTimer();
          break;
      }
    });
  }

  updateTimer(timeLeft, totalTime) {
    this.timeLeft = timeLeft;
    const percentage = (timeLeft / totalTime) * 100;
    if (this.barElement) {
      this.barElement.style.width = `${percentage}%`;
    }
  }

  showTimer() {
    this.isVisible = true;
    if (this.barElement) {
      this.barElement.style.display = 'block';
    }
  }

  hideTimer() {
    this.isVisible = false;
    if (this.barElement) {
      this.barElement.style.display = 'none';
    }
  }
}

// Initialize the timer bar
const timerBar = new TimerBar();
timerBar.init();
