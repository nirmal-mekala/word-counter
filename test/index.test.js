const test = require('node:test');
const assert = require('node:assert/strict');

const {
  countHtmlAndUpdateState,
  countWords,
} = require('../src/index');

test('keeps a zero-word session baseline after later saves', () => {
  const state = { initialWordCount: null, wordCount: null };

  countHtmlAndUpdateState('<p></p>', state);
  countHtmlAndUpdateState('<p>one two three</p>', state);

  assert.equal(state.initialWordCount, 0);
  assert.equal(state.wordCount, 3);
  assert.equal(state.wordCount - state.initialWordCount, 3);
});

test('keeps an existing nonzero session baseline after later saves', () => {
  const state = { initialWordCount: null, wordCount: null };

  countHtmlAndUpdateState('<p>one two</p>', state);
  countHtmlAndUpdateState('<p>one two three four</p>', state);

  assert.equal(state.initialWordCount, 2);
  assert.equal(state.wordCount, 4);
  assert.equal(state.wordCount - state.initialWordCount, 2);
});

test('counts word runs', () => {
  assert.equal(countWords('one two 3'), 3);
  assert.equal(countWords(''), 0);
});
