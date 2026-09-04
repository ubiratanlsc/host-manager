import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createCommandInputState,
    getSuggestionPlacement,
    updateCommandInput,
} from './terminalSuggestions.js';

test('keeps the suggestion query current while typing and deleting', () => {
    let result = updateCommandInput(createCommandInputState(), 'git sta');
    assert.equal(result.state.text, 'git sta');
    assert.equal(result.shouldRefresh, true);

    result = updateCommandInput(result.state, 't');
    assert.equal(result.state.text, 'git stat');
    assert.equal(result.shouldRefresh, true);

    result = updateCommandInput(result.state, '\x7f');
    assert.equal(result.state.text, 'git sta');
    assert.equal(result.shouldRefresh, true);
});

test('tracks cursor edits instead of abandoning suggestions', () => {
    let result = updateCommandInput(createCommandInputState(), 'gitx');
    result = updateCommandInput(result.state, '\x1b[D');
    result = updateCommandInput(result.state, '\x1b[3~');

    assert.deepEqual(result.state, {
        text: 'git',
        cursor: 3,
        tracking: true,
    });
    assert.equal(result.shouldRefresh, true);
});

test('resumes tracking promptly after an unknown shell editing sequence', () => {
    let result = updateCommandInput(createCommandInputState(), 'old');
    result = updateCommandInput(result.state, '\x1b[A');
    assert.equal(result.state.tracking, false);

    result = updateCommandInput(result.state, 'gi');
    assert.deepEqual(result.state, {
        text: 'gi',
        cursor: 2,
        tracking: true,
    });
    assert.equal(result.shouldRefresh, true);
});

test('places suggestions above a cursor on the terminal bottom row', () => {
    const placement = getSuggestionPlacement({
        screenRect: { left: 10, top: 20, right: 410, bottom: 220, width: 400, height: 200 },
        cols: 80,
        rows: 10,
        cursorX: 79,
        cursorY: 9,
        itemCount: 8,
    });

    assert.equal(placement.side, 'above');
    assert.equal(placement.top, 200);
    assert.ok(placement.left >= 14);
    assert.ok(placement.left + placement.maxWidth <= 406);
    assert.ok(placement.maxHeight <= 176);
});

test('keeps suggestions below the cursor when there is enough room', () => {
    const placement = getSuggestionPlacement({
        screenRect: { left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400 },
        cols: 100,
        rows: 20,
        cursorX: 4,
        cursorY: 1,
        itemCount: 3,
    });

    assert.equal(placement.side, 'below');
    assert.equal(placement.top, 40);
    assert.ok(placement.maxHeight >= 80);
});
