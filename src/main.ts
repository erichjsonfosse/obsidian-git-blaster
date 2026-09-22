import { Plugin, Notice } from 'obsidian';
import { GitManager } from './git-manager';
import { GitScheduler } from './git-scheduler';
import { GitBlasterSettings } from './interfaces/git-blaster-settings';
import { DEFAULT_SETTINGS } from './constants';
import { GitBlasterSettingTab } from './settings-tab';
import { CustomCommitModal } from './custom-commit-modal';
import * as os from 'os';

export default class GitBlasterPlugin extends Plugin {
  declare settings: GitBlasterSettings;
  readonly gitManager: GitManager;
  readonly scheduler: GitScheduler;
  readonly statusBarItem: HTMLElement;

  async onload() {
    console.log('Git Blaster loading...');
    await this.loadSettings();

    const adapter = this.app.vault.adapter as any;
    const vaultPath = adapter.basePath;

    (this as any).gitManager = new GitManager(vaultPath);
    (this as any).scheduler = new GitScheduler(
      this.settings,
      (msg) => this.runSyncPipeline(msg)
    );

    (this as any).statusBarItem = this.addStatusBarItem();
    this.updateStatusBar('idle');

    this.addSettingTab(new GitBlasterSettingTab(this.app, this));

    this.registerEvent(
      this.app.vault.on('modify', () => this.scheduler.triggerFileChangeEvent())
    );
    this.registerEvent(
      this.app.vault.on('create', () => this.scheduler.triggerFileChangeEvent())
    );
    this.registerEvent(
      this.app.vault.on('delete', () => this.scheduler.triggerFileChangeEvent())
    );
    this.registerEvent(
      this.app.vault.on('rename', () => this.scheduler.triggerFileChangeEvent())
    );

    this.scheduler.startIntervalTimer();
    this.scheduler.registerOnlineListener();

    this.addRibbonIcon('git-compare-arrows', 'Git Blaster: Sync now', () => {
      new Notice('Git Blaster: Manual Sync Initiated');
      this.runSyncPipeline();
    });

    this.addCommand({
      id: 'git-blaster-sync-now',
      name: 'Sync Vault Now (Silent)',
      callback: () => this.runSyncPipeline()
    });

    this.addCommand({
      id: 'git-blaster-custom-commit',
      name: 'Commit and Push with Custom Message...',
      callback: () => {
        new CustomCommitModal(this, (customMessage) => {
          this.runSyncPipeline(customMessage);
        }).open();
      }
    });
  }

  onunload() {
    console.log('Git Blaster unloading...');
    this.scheduler.cleanup();
    this.runFinalShutdownSync();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  updateStatusBar(state: 'idle' | 'syncing' | 'synced' | 'offline' | 'conflict') {
    let icon = '💤';
    let text = 'Git: Idle';

    if (state === 'syncing') {
      icon = '🔄';
      text = 'Git: Syncing...';
    } else if (state === 'synced') {
      icon = '✅';
      text = 'Git: Synced';
    } else if (state === 'offline') {
      icon = '⚠️';
      text = 'Git: Push pending';
    } else if (state === 'conflict') {
      icon = '❌';
      text = 'Git: Conflict!';
    }

    this.statusBarItem.setText(`${icon} ${text}`);
  }

  private formatCommitMessage(template: string, filesCount: number): string {
    const now = new Date();
    const datetime = now.toISOString().replace('T', ' ').substring(0, 19);
    const hostname = os.hostname() || 'local';

    return template
      .replace(/{{datetime}}/g, datetime)
      .replace(/{{num_files}}/g, String(filesCount))
      .replace(/{{hostname}}/g, hostname);
  }

  async runSyncPipeline(customMsg?: string): Promise<void> {
    this.updateStatusBar('syncing');

    try {
      const hasModified = await this.gitManager.hasChanges();

      if (hasModified) {
        console.log('Git Blaster: Committing changes...');
        const numFiles = await this.gitManager.getModifiedFilesCount();
        const commitMsg = customMsg || this.formatCommitMessage(this.settings.commitMessageTemplate, numFiles);
        await this.gitManager.commit(commitMsg);
      }

      const unpushed = await this.gitManager.hasUnpushedCommits(this.settings.remoteName, this.settings.branchName);

      if (!unpushed) {
        console.log('Git Blaster: Vault up-to-date. Sync aborted.');
        this.updateStatusBar('synced');
        return;
      }

      if (this.settings.pullBeforeSync) {
        console.log('Git Blaster: Pulling changes...');
        const pullResult = await this.gitManager.pull(
          this.settings.remoteName,
          this.settings.branchName,
          this.settings.pullStrategy
        );
        
        if (!pullResult.success) {
          if (pullResult.conflict) {
            new Notice('Git Blaster: Conflict detected during pull! Aborting sync operation.');
            if (this.settings.pullStrategy === 'merge') {
              await this.gitManager.abortMerge();
            } else {
              await this.gitManager.abortRebase();
            }
            this.updateStatusBar('conflict');
            return;
          }
          console.warn('Git Blaster: Pull failed', pullResult.error);
        }
      }

      console.log('Git Blaster: Pushing changes...');
      const pushResult = await this.gitManager.push(this.settings.remoteName, this.settings.branchName);

      if (pushResult.success) {
        new Notice('Git Blaster: Synchronization Complete!');
        this.updateStatusBar('synced');
      } else {
        if (pushResult.offline) {
          new Notice('Git Blaster: Offline. Changes committed locally; sync pending connection.');
          this.updateStatusBar('offline');
        } else {
          new Notice(`Git Blaster Error pushing: ${pushResult.error}`);
          this.updateStatusBar('offline');
        }
      }
    } catch (err: any) {
      console.error('Git Blaster sync failed unexpectedly', err);
      new Notice('Git Blaster encountered an error. Check developer logs.');
      this.updateStatusBar('idle');
    }
  }

  private runFinalShutdownSync() {
    const adapter = this.app.vault.adapter as any;
    const vaultPath = adapter.basePath;
    const { execFileSync } = require('child_process');

    try {
      const checkStatus = execFileSync('git', ['status', '--porcelain'], { cwd: vaultPath, timeout: 10000 }).toString();
      const hasModified = checkStatus.trim().length > 0;

      let hasUnpushed = false;
      try {
        const checkUnpushed = execFileSync('git', ['log', `${this.settings.remoteName}/${this.settings.branchName}..HEAD`, '--oneline'], { cwd: vaultPath, timeout: 10000 }).toString();
        hasUnpushed = checkUnpushed.trim().length > 0;
      } catch (e) {
        hasUnpushed = true;
      }

      if (hasModified || hasUnpushed) {
        if (hasModified) {
          execFileSync('git', ['add', '.'], { cwd: vaultPath, timeout: 10000 });
          const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
          execFileSync('git', ['commit', '-m', `Vault backup on close: ${nowStr}`], { cwd: vaultPath, timeout: 10000 });
        }
        execFileSync('git', ['push', this.settings.remoteName, this.settings.branchName], { cwd: vaultPath, timeout: 10000 });
        console.log('Git Blaster: Sync on exit completed.');
      }
    } catch (e) {
      console.warn('Git Blaster: Exit sync timed out or failed.', e);
    }
  }
}
