import type { GitBlasterSettings } from './interfaces/git-blaster-settings';
export type { GitBlasterSettings };

export const DEFAULT_SETTINGS: GitBlasterSettings = {
  triggerMode: 'both',
  intervalSeconds: 300,
  debounceSeconds: 5,
  pullBeforeSync: true,
  commitMessageTemplate: 'Vault backup: {{datetime}} - {{num_files}} files changed',
  remoteName: 'origin',
  branchName: 'main',
};
