export interface GitBlasterSettings {
  triggerMode: 'interval' | 'file-change' | 'both' | 'manual';
  intervalSeconds: number;
  debounceSeconds: number;
  pullBeforeSync: boolean;
  pullStrategy: 'rebase' | 'merge' | 'ff-only';
  commitMessageTemplate: string;
  remoteName: string;
  branchName: string;
}
