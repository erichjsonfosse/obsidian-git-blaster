const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Compiling tests...');
try {
  execSync('npx tsc --outDir dist-test --module CommonJS --target ES6', { stdio: 'inherit' });
} catch (err) {
  console.error('TypeScript compilation of tests failed.');
  process.exit(1);
}

console.log('Running test suite...');
try {
  execSync('node dist-test/tests/git-manager.test.js', { stdio: 'inherit' });
  console.log('All tests passed! ✅');
} catch (err) {
  console.error('Some tests failed! ❌');
  process.exit(1);
} finally {
  // Cleanup compiled test assets
  try {
    fs.rmSync('dist-test', { recursive: true, force: true });
  } catch {}
}
