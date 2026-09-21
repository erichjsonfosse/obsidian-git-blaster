import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { GitManager } from '../src/git-manager';

describe('GitManager', () => {
  const testDir = path.join(__dirname, 'test-sandbox-repo');
  let git: GitManager;

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
    execSync('git init', { cwd: testDir });
    execSync('git config user.name "Tester"', { cwd: testDir });
    execSync('git config user.email "test@tester.com"', { cwd: testDir });
    git = new GitManager(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('detects that initial state has no changes', async () => {
    const hasChanges = await git.hasChanges();
    assert.strictEqual(hasChanges, false);
  });

  it('detects untracked changes after creating a file', async () => {
    fs.writeFileSync(path.join(testDir, 'note.md'), 'Hello world');
    const hasChanges = await git.hasChanges();
    assert.strictEqual(hasChanges, true);
  });

  it('matches modified files count exactly', async () => {
    fs.writeFileSync(path.join(testDir, 'note.md'), 'Hello world');
    const count = await git.getModifiedFilesCount();
    assert.strictEqual(count, 1);
  });

  it('cleans status after committing modifications', async () => {
    fs.writeFileSync(path.join(testDir, 'note.md'), 'Hello world');
    await git.commit('Initial note commit');
    const hasChanges = await git.hasChanges();
    assert.strictEqual(hasChanges, false);
  });

  it('saves commits in git log', async () => {
    fs.writeFileSync(path.join(testDir, 'note.md'), 'Hello world');
    await git.commit('Initial note commit');
    const logOutput = execSync('git log -n 1 --oneline', { cwd: testDir }).toString();
    assert.match(logOutput, /Initial note commit/);
  });
});
