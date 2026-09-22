import { GitBlasterSettings } from './interfaces/git-blaster-settings';

export class GitScheduler {
  private settings: GitBlasterSettings;
  private readonly onSyncTrigger: (customMessage?: string) => Promise<void>;

  private intervalId: NodeJS.Timeout | null = null;
  private debounceId: NodeJS.Timeout | null = null;
  private onlineListener: (() => void) | null = null;

  constructor(
    settings: GitBlasterSettings,
    onSyncTrigger: (customMessage?: string) => Promise<void>
  ) {
    this.settings = settings;
    this.onSyncTrigger = onSyncTrigger;
  }

  updateSettings(newSettings: GitBlasterSettings) {
    this.settings = newSettings;
    this.restart();
  }

  startIntervalTimer() {
    this.stopIntervalTimer();
    if (this.settings.triggerMode === 'interval' || this.settings.triggerMode === 'both') {
      const ms = this.settings.intervalSeconds * 1000;
      this.intervalId = setInterval(() => {
        console.log('Git Blaster: Interval triggered sync');
        this.onSyncTrigger();
      }, ms);
    }
  }

  stopIntervalTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  triggerFileChangeEvent() {
    if (this.settings.triggerMode !== 'file-change' && this.settings.triggerMode !== 'both') {
      return;
    }

    if (this.debounceId) {
      clearTimeout(this.debounceId);
    }

    const ms = this.settings.debounceSeconds * 1000;
    this.debounceId = setTimeout(() => {
      console.log('Git Blaster: Debounced file change trigger');
      this.onSyncTrigger();
    }, ms);
  }

  registerOnlineListener() {
    if (this.onlineListener) return;

    this.onlineListener = () => {
      console.log('Git Blaster: Back online event detected. Running catch-up sync.');
      this.onSyncTrigger();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onlineListener);
    }
  }

  private unregisterOnlineListener() {
    if (this.onlineListener) {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', this.onlineListener);
      }
      this.onlineListener = null;
    }
  }

  restart() {
    this.stopIntervalTimer();
    if (this.debounceId) {
      clearTimeout(this.debounceId);
      this.debounceId = null;
    }
    this.startIntervalTimer();
  }

  cleanup() {
    this.stopIntervalTimer();
    if (this.debounceId) {
      clearTimeout(this.debounceId);
    }
    this.unregisterOnlineListener();
  }
}
