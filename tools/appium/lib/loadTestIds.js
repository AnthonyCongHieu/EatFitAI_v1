const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadTestIds() {
  const sourcePath = path.resolve(__dirname, '..', '..', '..', 'eatfitai-mobile', 'src', 'testing', 'testIds.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const match = source.match(/export const TEST_IDS = ([\s\S]*?) as const;/);

  if (!match) {
    throw new Error(`Unable to parse TEST_IDS from ${sourcePath}`);
  }

  return vm.runInNewContext(`(${match[1]})`, {});
}

module.exports = {
  loadTestIds,
};
