import { GitScheduler } from '../src/git-scheduler';
import { GitManager } from '../src/git-manager';
import { GitBlasterSettings } from '../src/constants';

// A mock GitManager for testing
class MockGitManager extends GitManager {
  constructor() {
    super('');
  }
}

async function runTests() {
  console.log('Running GitScheduler tests...');

  // Mock settings
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

  // Test 1: Interval Timer Triggering
  {
    console.log('Test 1: Interval Timer triggers sync');
    let triggerCount = 0;
    const getCount = () => triggerCount;

    const scheduler = new GitScheduler(mockGitManager, { ...settings, triggerMode: 'interval' }, async () => {
      triggerCount++;
    });

    scheduler.startIntervalTimer();

    // Wait 120ms (should trigger ~2 times)
    await new Promise(resolve => setTimeout(resolve, 120));

    scheduler.stopIntervalTimer();
    const countAfterStop = getCount();

    if (countAfterStop === 0) {
      throw new Error(`Expected interval timer to trigger sync, but triggerCount was 0`);
    }

    // Wait another 100ms and verify no more triggers
    await new Promise(resolve => setTimeout(resolve, 100));
    if (getCount() !== countAfterStop) {
      throw new Error(`Expected interval timer to be stopped, but triggerCount increased from ${countAfterStop} to ${getCount()}`);
    }

    scheduler.cleanup();
  }

  // Test 2: File Change Debouncing
  {
    console.log('Test 2: File Change debounces sync');
    let triggerCount = 0;
    const getCount = () => triggerCount;

    const scheduler = new GitScheduler(mockGitManager, { ...settings, triggerMode: 'file-change' }, async () => {
      triggerCount++;
    });

    // Trigger three times rapidly
    scheduler.triggerFileChangeEvent();
    scheduler.triggerFileChangeEvent();
    scheduler.triggerFileChangeEvent();

    // Verify it hasn't triggered immediately
    if (getCount() !== 0) {
      throw new Error(`Expected 0 triggers immediately after calling triggerFileChangeEvent, but got ${getCount()}`);
    }

    // Wait 80ms (slightly more than 50ms debounce)
    await new Promise(resolve => setTimeout(resolve, 80));

    if (getCount() !== 1) {
      throw new Error(`Expected exactly 1 trigger after debounce period, but got ${getCount()}`);
    }

    scheduler.cleanup();
  }

  // Test 3: Setting updates change behavior
  {
    console.log('Test 3: Update settings dynamically restarts / disables triggers');
    let triggerCount = 0;
    const getCount = () => triggerCount;

    const scheduler = new GitScheduler(mockGitManager, { ...settings, triggerMode: 'interval' }, async () => {
      triggerCount++;
    });

    scheduler.startIntervalTimer();

    // Wait 70ms (should trigger 1 time)
    await new Promise(resolve => setTimeout(resolve, 70));
    if (getCount() === 0) {
      throw new Error(`Expected at least 1 trigger`);
    }

    const firstPeriodCount = getCount();

    // Change triggerMode to manual (which disables interval)
    scheduler.updateSettings({
      ...settings,
      triggerMode: 'manual'
    });

    // Wait another 100ms
    await new Promise(resolve => setTimeout(resolve, 100));

    if (getCount() !== firstPeriodCount) {
      throw new Error(`Expected interval timer to stop after changing triggerMode to manual, but triggerCount increased from ${firstPeriodCount} to ${getCount()}`);
    }

    scheduler.cleanup();
  }

  console.log('GitScheduler tests PASS! 🎉');
}

runTests().catch(err => {
  console.error('GitScheduler test failed with error:', err);
  process.exit(1);
});
