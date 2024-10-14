// overlay/timerBar.js

class TimerBar {
    constructor() {
        this.barElement = null;
        this.timeLeft = 0;
        this.totalTime = 0;
        this.isVisible = false;
        this.lastUpdateTime = 0;
        this.BAR_HEIGHT = '20px';  // Define bar height as a constant
      }
    
      init() {
        this.setupMessageListener();
        this.createElements();
        console.log('TimerBar initialized');
      }

      createElements() {
        if (!this.barElement) {
          this.barElement = document.createElement('div');
          this.barElement.id = 'chess-puzzle-timer-bar';
          this.barElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: ${this.BAR_HEIGHT};
            background-color: #4CAF50;
            z-index: 9999999;
            transition: width 0.1s linear;
          `;
          document.body.insertBefore(this.barElement, document.body.firstChild);
        }
    
        // Add CSS variable for width
        document.documentElement.style.setProperty('--timer-width', '100%');
        this.barElement.style.width = 'var(--timer-width)';
      }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.target !== 'timerBar') return;
        console.log('Received message in timerBar:', request);
        switch (request.action) {
            case 'updateTimerBar':
            this.updateTimerBar(request.timeLeft, request.totalTime);
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

    updateTimerBar(timeLeft, totalTime) {
        this.timeLeft = timeLeft;
        this.totalTime = totalTime;
        this.lastUpdateTime = Date.now();
        this.updateBarDisplay();
    }

    updateBarDisplay() {
        if (this.barElement) {
        const now = Date.now();
        const elapsedSinceUpdate = (now - this.lastUpdateTime) / 1000; // in seconds
        const currentTimeLeft = Math.max(0, this.timeLeft - elapsedSinceUpdate);
        const percentage = (currentTimeLeft / this.totalTime) * 100;
        this.barElement.dataset.width = `${percentage}%`;
        document.documentElement.style.setProperty('--timer-width', `${percentage}%`);

        if (currentTimeLeft > 0) {
            requestAnimationFrame(() => this.updateBarDisplay());
        }
        }
    }

    showTimer() {
        this.isVisible = true;
        if (this.barElement) {
          this.barElement.style.display = 'block';
          document.body.style.paddingTop = this.BAR_HEIGHT;
        }
      }
    
    hideTimer() {
    this.isVisible = false;
    if (this.barElement) {
        this.barElement.style.display = 'none';
        document.body.style.paddingTop = '0px';
    }
    }
}
  
// Initialize the timer bar
const timerBar = new TimerBar();
timerBar.init();