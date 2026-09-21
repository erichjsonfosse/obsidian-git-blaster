export interface GitBlasterSettings {
  triggerMode: 'interval' | 'filechange' | 'both' | 'manual';
  intervalSeconds: number;
  debounceSeconds: number;
  pullBeforeSync: boolean;
  commitMessageTemplate: string;
  remoteName: string;
  branchName: string;
}

export const DEFAULT_SETTINGS: GitBlasterSettings = {
  triggerMode: 'both',
  intervalSeconds: 300,
  debounceSeconds: 5,
  pullBeforeSync: true,
  commitMessageTemplate: 'Vault backup: {{datetime}} - {{num_files}} files changed',
  remoteName: 'origin',
  branchName: 'main',
};
