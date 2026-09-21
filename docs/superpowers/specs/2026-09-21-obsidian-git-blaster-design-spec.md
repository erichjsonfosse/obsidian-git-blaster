# Design Document: Obsidian Git Blaster

An Obsidian plugin that provides lightweight, automated git backups (commits and pushes) either at given intervals or on file changes with safety debouncing, utilizing system Git commands.

## 1. Project Directory Structure

To keep the codebase clean, organized, and modular, we will use the following folder structure:

```
obsidian-git-blaster/
├── .git/
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-09-21-obsidian-git-blaster-design.md  <-- This design spec
├── src/
│   ├── main.ts         # Plugin entry point (Plugin lifecycle, register events/commands)
│   ├── git.ts          # GitManager class (spawns shell git commands and handles outputs)
│   ├── scheduler.ts    # GitScheduler class (manages setInterval, file change debouncing)
│   ├── settings.ts     # GitBlasterSettingTab and settings interface definitions
│   └── constants.ts    # Plugin constants, template placeholders, and default settings
├── manifest.json       # Obsidian plugin manifest
├── package.json        # NPM build configuration & dependencies
├── tsconfig.json       # TypeScript configuration
├── esbuild.config.mjs  # Bundler configuration
└── README.md           # Project documentation
```

---

## 2. Requirements & Behavior

### A. Automation Triggers
1.  **Interval Trigger:** Periodic backup execution.
    *   Configurable in **seconds**.
    *   Defaults to `300` seconds (5 minutes).
2.  **File Change Trigger:** Listens to vault modifications (`modify`, `create`, `delete`, `rename`).
    *   Uses a **debounce timer** to prevent spamming Git.
    *   Defaults to `5` seconds of silent idle time.
3.  **Online Event Trigger:** Listens to `window.addEventListener('online')` and instantly pushes any unpushed local commits made while offline.
4.  **Onload & Onunload Triggers:** 
    *   Performs a pull check on plugin load.
    *   Performs a best-effort final commit and push on unload (when Obsidian closes or the plugin is disabled).

### B. Smart Change Detection
Before executing expensive shell commands, the plugin performs cheap, tiered checks:
*   **Check 1 (Modified Files):** Run `git status --porcelain`. If modified files exist:
    *   Proceed to pull (if enabled), stage, commit, and push.
*   **Check 2 (Unpushed Commits):** If `git status --porcelain` is empty, check if any local commits are ahead of the remote (`git status` or `git cherry -v`).
    *   If there are unpushed commits: **Skip committing, proceed directly to Push**.
    *   If no local modifications and no unpushed commits: **Exit silently** (vault is fully synchronized).

### C. Git pull and Conflict Handling
*   **Pull Before Syncing:** Customizable setting (default: `true`).
*   Runs `git pull --rebase` to pull remote changes and keep git history clean/linear.
*   **Merge Conflict Safety:** If a pull fails with conflict indicators, the plugin:
    1. Stops all automated syncs immediately.
    2. Displays an active, visible Obsidian notification (`Git Blaster: Merge conflict detected! Please resolve manually.`).
    3. Updates the Status Bar to `Git: Conflict ⚠️`.
    4. Resumes auto-syncs only after the conflict is resolved (and the status is verified clean).

---

## 3. Class Definitions & Interfaces

### A. Settings Definition (`src/settings.ts`)

```typescript
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
  commitMessageTemplate: 'Vault backup: {{datetime}}',
  remoteName: 'origin',
  branchName: 'main',
};
```

### B. Git Manager (`src/git.ts`)
Encapsulates executive shell actions. Runs in NodeJS's native environment via Obsidian's Electron thread.

*   `execCommand(cmd: string): Promise<string>`: Spawns a shell execution using NodeJS `child_process.exec`.
*   `hasChanges(): Promise<boolean>`: Returns `true` if `git status --porcelain` is non-empty.
*   `hasUnpushedCommits(): Promise<boolean>`: Checks if local commits are ahead of remote.
*   `pull(): Promise<void>`: Executes `git pull --rebase`. Detects conflicts by searching standard error outputs.
*   `commit(msg: string): Promise<void>`: Runs `git add .` and `git commit -m "[msg]"`.
*   `push(): Promise<void>`: Runs `git push [remote] [branch]`. Detects connection failures gracefully.

### C. Scheduler (`src/scheduler.ts`)
Manages background triggers and timers.

*   `startInterval()`: Instantiates the interval-based loop.
*   `stopInterval()`: Clears the interval timer.
*   `onFileChange()`: Receives file-system events. Resets the debounce timer. When the debounce timer expires, triggers the Git sync pipeline.
*   `registerOnlineListener()`: Hooks `window.addEventListener('online')` to fire pushes when network returns.

---

## 4. UI/UX Elements

### A. Status Bar Icon & Text
A discreet, informative indicator in Obsidian's status bar representing current states:
*   `Git: Synced` ✅
*   `Git: Syncing...` 🔄
*   `Git: Push pending ⚠️` (offline state)
*   `Git: Conflict ⚠️` (merge conflicts)
*   `Git: Idle` 💤

### B. Manual Commands & Ribbon Icon
*   **Ribbon Icon:** Clicking the ribbon icon triggers a manual full sync.
*   **Command Palette Options:**
    *   `Git Blaster: Sync Vault Now (Silent)` (uses message template)
    *   `Git Blaster: Commit and Push Now...` (prompts the user with a text modal for a custom commit message)

---

## 5. Security & Constraints
*   **Credentials:** Since the plugin shells out to the system's `git` command, it inherits the system's active SSH keys, credentials-helper configurations, and GPG signing keys. No passwords or private keys are ever stored inside Obsidian settings.
*   **Vault Protection:** Files are never automatically deleted or forcefully overwritten. Rebase operations are run defensively, and will bail immediately if they cannot be completed cleanly.
