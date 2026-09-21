import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { GitScheduler } from '../src/git-scheduler';
import { GitManager } from '../src/git-manager';
import { GitBlasterSettings } from '../src/interfaces/git-blaster-settings';

// A mock GitManager for testing
class MockGitManager extends GitManager {
  constructor() {
    super('');
  }
}

describe('GitScheduler', () => {
  const settings: GitBlasterSettings = {
    triggerMode: 'both',
    intervalSeconds: 0.05, // 50ms for fast testing
    debounceSeconds: 0.05, // 50ms for fast testing
    pullBeforeSync: true,
    commitMessageTemplate: 'test',
    remoteName: 'origin',
    branchName: 'main',
  };

  const mockGitManager = new MockGitManager();

  it('triggers sync via interval timer', async () => {
    let triggerCount = 0;
    const scheduler = new GitScheduler(mockGitManager, { ...settings, triggerMode: 'interval' }, async () => {
      triggerCount++;
    });

    scheduler.startIntervalTimer();

    // Wait 120ms (should trigger ~2 times)
    await new Promise(resolve => setTimeout(resolve, 120));

    scheduler.stopIntervalTimer();
    const countAfterStop = triggerCount;

    assert.ok(countAfterStop > 0, 'Expected interval timer to trigger sync at least once');

    // Wait another 100ms and verify no more triggers
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.strictEqual(triggerCount, countAfterStop, 'Expected interval timer to stop triggering sync after stopping');

    scheduler.cleanup();
  });

  it('debounces file change events', async () => {
    let triggerCount = 0;
    const scheduler = new GitScheduler(mockGitManager, { ...settings, triggerMode: 'file-change' }, async () => {
      triggerCount++;
    });

    // Trigger three times rapidly
    scheduler.triggerFileChangeEvent();
    scheduler.triggerFileChangeEvent();
    scheduler.triggerFileChangeEvent();

    // Verify it hasn't triggered immediately
    assert.strictEqual(triggerCount, 0, 'Expected 0 triggers immediately after calling triggerFileChangeEvent');

    // Wait 80ms (slightly more than 50ms debounce)
    await new Promise(resolve => setTimeout(resolve, 80));

    assert.strictEqual(triggerCount, 1, 'Expected exactly 1 trigger after debounce period');

    scheduler.cleanup();
  });

  it('restarts or disables triggers when settings are dynamically updated', async () => {
    let triggerCount = 0;
    const scheduler = new GitScheduler(mockGitManager, { ...settings, triggerMode: 'interval' }, async () => {
      triggerCount++;
    });

    scheduler.startIntervalTimer();

    // Wait 70ms (should trigger 1 time)
    await new Promise(resolve => setTimeout(resolve, 70));
    assert.ok(triggerCount > 0, 'Expected at least 1 trigger initially');

    const firstPeriodCount = triggerCount;

    // Change triggerMode to manual (which disables interval)
    scheduler.updateSettings({
      ...settings,
      triggerMode: 'manual',
    });

    // Wait another 100ms
    await new Promise(resolve => setTimeout(resolve, 100));

    assert.strictEqual(triggerCount, firstPeriodCount, 'Expected interval timer to stop after changing triggerMode to manual');

    scheduler.cleanup();
  });
});
