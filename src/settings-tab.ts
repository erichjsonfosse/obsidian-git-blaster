import { App, PluginSettingTab, Setting } from 'obsidian';
import GitBlasterPlugin from './main';

export class GitBlasterSettingTab extends PluginSettingTab {
  plugin: GitBlasterPlugin;

  constructor(app: App, plugin: GitBlasterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Git Blaster Settings' });

    new Setting(containerEl)
      .setName('Trigger Mode')
      .setDesc('How should Git Blaster automate syncs?')
      .addDropdown(cb => {
        cb.addOption('both', 'Interval & File Changes')
          .addOption('interval', 'Intervals Only')
          .addOption('filechange', 'File Changes Only')
          .addOption('manual', 'Manual Syncs Only')
          .setValue(this.plugin.settings.triggerMode)
          .onChange(async (val: any) => {
            this.plugin.settings.triggerMode = val;
            await this.plugin.saveSettings();
            this.plugin.scheduler.updateSettings(this.plugin.settings);
            this.display(); // Refresh tab since options change dynamically
          });
      });

    if (this.plugin.settings.triggerMode === 'interval' || this.plugin.settings.triggerMode === 'both') {
      new Setting(containerEl)
        .setName('Sync Interval (seconds)')
        .setDesc('Frequency at which local commits and remote pushes are executed.')
        .addText(cb => {
          cb.setValue(String(this.plugin.settings.intervalSeconds))
            .onChange(async (val) => {
              const num = parseInt(val, 10);
              if (!isNaN(num) && num > 0) {
                this.plugin.settings.intervalSeconds = num;
                await this.plugin.saveSettings();
                this.plugin.scheduler.updateSettings(this.plugin.settings);
              }
            });
        });
    }

    if (this.plugin.settings.triggerMode === 'filechange' || this.plugin.settings.triggerMode === 'both') {
      new Setting(containerEl)
        .setName('File Change Debounce (seconds)')
        .setDesc('Wait duration after typing/modifications stop before initiating a backup.')
        .addText(cb => {
          cb.setValue(String(this.plugin.settings.debounceSeconds))
            .onChange(async (val) => {
              const num = parseInt(val, 10);
              if (!isNaN(num) && num >= 1) {
                this.plugin.settings.debounceSeconds = num;
                await this.plugin.saveSettings();
                this.plugin.scheduler.updateSettings(this.plugin.settings);
              }
            });
        });
    }

    new Setting(containerEl)
      .setName('Pull Before Syncing')
      .setDesc('Pulls from remote with automatic rebase to keep your vault in sync before pushing.')
      .addToggle(cb => {
        cb.setValue(this.plugin.settings.pullBeforeSync)
          .onChange(async (val) => {
            this.plugin.settings.pullBeforeSync = val;
            await this.plugin.saveSettings();
            this.plugin.scheduler.updateSettings(this.plugin.settings);
          });
      });

    new Setting(containerEl)
      .setName('Commit Message Template')
      .setDesc('Format for auto-backups. Supported placeholders: {{datetime}}, {{num_files}}, {{hostname}}')
      .addText(cb => {
        cb.setValue(this.plugin.settings.commitMessageTemplate)
          .onChange(async (val) => {
            this.plugin.settings.commitMessageTemplate = val;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Git Remote Name')
      .setDesc('Name of git remote.')
      .addText(cb => {
        cb.setValue(this.plugin.settings.remoteName)
          .onChange(async (val) => {
            this.plugin.settings.remoteName = val.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Git Branch Name')
      .setDesc('Name of branch to pull/push.')
      .addText(cb => {
        cb.setValue(this.plugin.settings.branchName)
          .onChange(async (val) => {
            this.plugin.settings.branchName = val.trim();
            await this.plugin.saveSettings();
          });
      });
  }
}
