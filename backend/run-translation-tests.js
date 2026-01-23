import { run } from 'node:test';
import { spec as specReporter } from 'node:test/reporters';
import { glob } from 'node:fs/promises';

// Run all translation PBT tests
const files = [
  './tests/translation-language-switching.pbt.test.js',
  './tests/translation-display-logic.pbt.test.js',
  './tests/translation-fallback.pbt.test.js',
  './tests/translation-association.pbt.test.js',
];

run({ files })
  .compose(specReporter)
  .pipe(process.stdout);
