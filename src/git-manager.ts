import { execFile } from 'child_process';

export class GitManager {
  private readonly vaultPath: string;

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
  }

  private execCommand(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile('git', args, { cwd: this.vaultPath }, (error, stdout, stderr) => {
        if (error) {
          reject({ error, stdout, stderr });
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  async hasChanges(): Promise<boolean> {
    try {
      const out = await this.execCommand(['status', '--porcelain']);
      return out.length > 0;
    } catch (err) {
      console.error('Git Blaster: Error checking status', err);
      return false;
    }
  }

  async getModifiedFilesCount(): Promise<number> {
    try {
      const out = await this.execCommand(['status', '--porcelain']);
      if (!out) return 0;
      return out.split('\n').filter(line => line.trim().length > 0).length;
    } catch {
      return 0;
    }
  }

  async hasUnpushedCommits(remote: string, branch: string): Promise<boolean> {
    try {
      const out = await this.execCommand(['log', `${remote}/${branch}..HEAD`, '--oneline']);
      return out.trim().length > 0;
    } catch (err) {
      // If the tracking branch doesn't exist yet, we assume we have unpushed commits
      return true;
    }
  }

  async pull(remote: string, branch: string): Promise<{ success: boolean; conflict: boolean; error?: string }> {
    try {
      await this.execCommand(['pull', '--rebase', remote, branch]);
      return { success: true, conflict: false };
    } catch (err: any) {
      const stderr = err.stderr || '';
      const stdout = err.stdout || '';
      const combined = stderr + ' ' + stdout;
      
      const isConflict = combined.includes('CONFLICT') || combined.includes('Merge conflict') || combined.includes('rebase in progress');
      return {
        success: false,
        conflict: isConflict,
        error: stderr || err.error?.message || 'Unknown pull error'
      };
    }
  }

  async commit(msg: string): Promise<void> {
    await this.execCommand(['add', '.']);
    await this.execCommand(['commit', '-m', msg]);
  }

  async push(remote: string, branch: string): Promise<{ success: boolean; offline: boolean; error?: string }> {
    try {
      await this.execCommand(['push', remote, branch]);
      return { success: true, offline: false };
    } catch (err: any) {
      const stderr = err.stderr || '';
      const stdout = err.stdout || '';
      const combined = stderr + ' ' + stdout;

      const isOffline = combined.includes('Could not resolve host') || 
                        combined.includes('Connection timed out') || 
                        combined.includes('network is unreachable') ||
                        combined.includes('Could not read from remote repository');

      return {
        success: false,
        offline: isOffline,
        error: stderr || err.error?.message || 'Unknown push error'
      };
    }
  }

  async abortRebase(): Promise<void> {
    try {
      await this.execCommand(['rebase', '--abort']);
    } catch (e) {
      console.warn('Git Blaster: Failed to abort rebase', e);
    }
  }
}
