# Git Blaster for Obsidian

**Git Blaster** is a lightweight Obsidian plugin that automatically syncs and backs up your vault to any remote Git repository. It provides redundancy checking, and conflict protection.

---

## 🚀 Key Features

*   **Interval-Based Syncing**: Automate synchronization at customizable, regular intervals (e.g., every 5 minutes).
*   **File Watcher Syncing**: Trigger sync automatically when vault files are created, modified, renamed, or deleted, utilizing an adjustable debounce mechanism (defaulting to 5 seconds).
*   **Configurable Pull Strategy**: Choose between `Rebase` (default, for linear history without merge commit spam), `Merge` (standard merge commits), or `Fast-Forward Only` (fails if history has diverged).
*   **Merge Conflict Protection**: If a merge conflict occurs during sync, Git Blaster automatically aborts the rebase operation, reverts to the safe pre-pull state, notifies you, and marks the status as in conflict so no data is corrupted or lost.
*   **Catchup Syncs**: Triggers a synchronization automatically as soon as network connection is restored (listening to online/offline state changes).
*   **Graceful Shutdown Sync**: Guarantees your vault is fully committed and pushed on plugin unload or Obsidian shutdown/restart via synchronous final backup.
*   **Zero Redundant Git Operations**: Uses porcelain checks to avoid empty commits, and checks for unpushed commits before executing network requests.
*   **Custom Commit Messages**: Highly customizable automatic commit messages with dynamic placeholders (`{{datetime}}`, `{{num_files}}`, `{{hostname}}`).
*   **Ribbon Icon & Command Palette Integration**: Manual sync button on the left ribbon, manual sync commands, and a command to specify custom commit messages on the fly.
*   **Real-time Status Bar Indicator**: Displays current status at-a-glance (`💤 Idle`, `🔄 Syncing...`, `✅ Synced`, `⚠️ Push pending`, `❌ Conflict!`).

---

## 🛠️ Requirements

To use Git Blaster, ensure your environment meets the following requirements:
1.  **System Git**: Git must be installed on your machine and available in your shell path (verify with `git --version` in terminal).
2.  **SSH / Credentials Helper**: Since the plugin does not store sensitive credentials, configure your local environment to handle authentication seamlessly. Use an active local SSH agent (`ssh-add`) or an HTTPS credential helper (e.g., Git Credential Manager). Alternatively, you can install ssh-askpass, and git will use that and ask for password whenever it's needed.

---

## 📦 Installation

### Manual Installation (From Source)

1.  Navigate to your Obsidian vault's plugin directory:
    ```bash
    cd /path/to/your/vault/.obsidian/plugins
    ```
2.  Create a directory for the plugin:
    ```bash
    mkdir -p obsidian-git-blaster
    ```
3.  Copy the compiled files `main.js` and `manifest.json` from the `dist/` directory of this repository into the newly created folder:
    *   `dist/main.js` ➡️ `.obsidian/plugins/obsidian-git-blaster/main.js`
    *   `dist/manifest.json` ➡️ `.obsidian/plugins/obsidian-git-blaster/manifest.json`
4.  Open Obsidian, go to **Settings > Community Plugins**, reload plugins, and enable **Git Blaster**.

---

## 🔧 Configuration Options

Go to **Settings > Git Blaster** within Obsidian to configure the following options:

*   **Trigger Mode**:
    *   *Interval & File Changes* (Default) - Runs both interval timer and file watcher triggers.
    *   *Intervals Only* - Only executes syncs at regular intervals.
    *   *File Changes Only* - Executes syncs only after files are modified and the debounce window closes.
    *   *Manual Syncs Only* - Disables background automation; syncs only when manual commands are invoked.
*   **Sync Interval (seconds)**: Frequency of interval checks (Default: `300` seconds / 5 mins).
*   **File Change Debounce (seconds)**: Wait duration after the last file edit before auto-sync begins (Default: `5` seconds).
*   **Pull Before Syncing**: Pull and rebase from remote before pushing to keep a linear history (Default: `true`).
*   **Commit Message Template**: Format for auto-commits. Supported placeholders:
    *   `{{datetime}}` - Current date and time (ISO format)
    *   `{{num_files}}` - Number of modified/added/deleted files
    *   `{{hostname}}` - Name of the current computer
*   **Git Remote Name**: Name of the remote repository to push to (Default: `origin`).
*   **Git Branch Name**: Name of the git branch to sync (Default: `main`).

---

## 💻 Development Setup

If you wish to build, contribute to, or inspect the codebase:

### 1. Clone the Repository
```bash
git clone https://github.com/erichjsonfosse/obsidian-git-blaster.git
cd obsidian-git-blaster
```

### 2. Install Dependencies
```bash
npm i
```

### 3. Build & Watch
To compile the TypeScript source into production-grade bundles (`dist/main.js` and `dist/manifest.json`):
*   **Production Build**:
    ```bash
    npm run build
    ```
*   **Development Watch Mode** (recompiles on any file save):
    ```bash
    npm run dev
    ```

### 4. Running the Test Suite
Git Blaster features a robust, isolated testing infrastructure that spawns sandbox git repositories to verify execution of the `GitManager` and `GitScheduler` under safe conditions.
```bash
npm run test
```
The command automatically checks TypeScript syntax, compiles testing modules, executes integration runs, and cleans up temporary sandbox folders upon completion.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
