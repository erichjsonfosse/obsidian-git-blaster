export interface GitBlasterSettings {
  triggerMode: 'interval' | 'file-change' | 'both' | 'manual';
  intervalSeconds: number;
  debounceSeconds: number;
  pullBeforeSync: boolean;
  commitMessageTemplate: string;
  remoteName: string;
  branchName: string;
}
