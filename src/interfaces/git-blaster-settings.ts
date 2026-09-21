export interface GitBlasterSettings {
  triggerMode: 'interval' | 'filechange' | 'both' | 'manual';
  intervalSeconds: number;
  debounceSeconds: number;
  pullBeforeSync: boolean;
  commitMessageTemplate: string;
  remoteName: string;
  branchName: string;
}
