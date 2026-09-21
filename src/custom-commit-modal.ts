import { Modal, TextComponent, ButtonComponent, Notice } from 'obsidian';
import GitBlasterPlugin from './main';

export class CustomCommitModal extends Modal {
  readonly onSubmit: (customMessage: string) => void;
  readonly plugin: GitBlasterPlugin;

  constructor(plugin: GitBlasterPlugin, onSubmit: (customMessage: string) => void) {
    super(plugin.app);
    this.plugin = plugin;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h3', { text: 'Commit and Push with Custom Message' });

    const textComp = new TextComponent(contentEl)
      .setPlaceholder('Enter your custom commit message...')
      .setValue('');
    textComp.inputEl.style.width = '100%';
    textComp.inputEl.style.marginBottom = '1.5em';

    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '10px';

    new ButtonComponent(buttonContainer)
      .setButtonText('Cancel')
      .onClick(() => this.close());

    new ButtonComponent(buttonContainer)
      .setButtonText('Commit & Push')
      .setCta()
      .onClick(() => {
        const val = textComp.getValue().trim();
        if (val) {
          this.onSubmit(val);
          this.close();
        } else {
          new Notice('Please provide a valid commit message.');
        }
      });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
