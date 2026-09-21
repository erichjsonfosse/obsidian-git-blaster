import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { GitManager } from '../src/git-manager';

const testDir = path.join(__dirname, 'test-sandbox-repo');

function setupSandbox() {
  fs.mkdirSync(testDir, { recursive: true });
  execSync('git init', { cwd: testDir });
  execSync('git config user.name "Tester"', { cwd: testDir });
  execSync('git config user.email "test@tester.com"', { cwd: testDir });
}

function teardownSandbox() {
  fs.rmSync(testDir, { recursive: true, force: true });
}

async function runTests() {
  console.log('Setting up sandbox repo...');
  setupSandbox();

  try {
    const git = new GitManager(testDir);

    console.log('Test 1: Initial state has no changes');
    const hasChangesInitial = await git.hasChanges();
    if (hasChangesInitial !== false) throw new Error('Expected no changes in fresh repo');

    console.log('Test 2: Creating a file creates untracked changes');
    fs.writeFileSync(path.join(testDir, 'note.md'), 'Hello world');
    const hasChangesAfterWrite = await git.hasChanges();
    if (hasChangesAfterWrite !== true) throw new Error('Expected untracked changes');

    console.log('Test 3: Modified files count matches exactly');
    const count = await git.getModifiedFilesCount();
    if (count !== 1) throw new Error(`Expected exactly 1 modified file, got ${count}`);

    console.log('Test 4: Committing modifications clean status');
    await git.commit('Initial note commit');
    const hasChangesAfterCommit = await git.hasChanges();
    if (hasChangesAfterCommit !== false) throw new Error('Expected clean state after commit');

    console.log('Test 5: Commits are saved in git log');
    const logOutput = execSync('git log -n 1 --oneline', { cwd: testDir }).toString();
    if (!logOutput.includes('Initial note commit')) throw new Error('Commit message not found in git log');

    console.log('GitManager tests PASS! 🎉');
  } finally {
    console.log('Cleaning up sandbox repo...');
    teardownSandbox();
  }
}

runTests().catch(err => {
  console.error('GitManager test failed with error:', err);
  process.exit(1);
});
