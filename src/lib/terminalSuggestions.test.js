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

test('supports application-mode cursor keys used by some shells', () => {
    let result = updateCommandInput(createCommandInputState(), 'gitx');
    result = updateCommandInput(result.state, '\x1bOD');
    result = updateCommandInput(result.state, '\x1b[3~');

    assert.deepEqual(result.state, {
        text: 'git',
        cursor: 3,
        tracking: true,
    });
});

test('handles home, end, forward movement, and Unicode code points', () => {
    let result = updateCommandInput(createCommandInputState(), 'a😀c');
    result = updateCommandInput(result.state, '\x1b[H');
    result = updateCommandInput(result.state, '\x1b[C');
    result = updateCommandInput(result.state, '\x1b[3~');
    assert.equal(result.state.text, 'ac');

    result = updateCommandInput(result.state, '\x1b[F');
    result = updateCommandInput(result.state, '\x7f');
    assert.equal(result.state.text, 'a');
});

test('mirrors common shell line editing controls', () => {
    let result = updateCommandInput(createCommandInputState(), 'git status now');
    result = updateCommandInput(result.state, '\x17');
    assert.equal(result.state.text, 'git status ');

    result = updateCommandInput(result.state, '\x01');
    result = updateCommandInput(result.state, '\x05');
    result = updateCommandInput(result.state, '\x0b');
    assert.equal(result.state.text, 'git status ');

    result = updateCommandInput(result.state, '\x15');
    assert.deepEqual(result.state, createCommandInputState());
    assert.equal(result.shouldHide, true);
});

test('submits multiline input and clears interrupted or completed lines', () => {
    let result = updateCommandInput(createCommandInputState(), 'pwd\r\necho ok\r');
    assert.deepEqual(result.submittedCommands, ['pwd', 'echo ok']);
    assert.deepEqual(result.state, createCommandInputState());

    result = updateCommandInput(updateCommandInput(createCommandInputState(), 'draft').state, '\x03');
    assert.deepEqual(result.state, createCommandInputState());

    result = updateCommandInput(updateCommandInput(createCommandInputState(), 'git').state, '\t');
    assert.equal(result.state.tracking, false);
    assert.equal(result.shouldHide, true);
});

test('ignores empty data and hides on an unrecognized control byte', () => {
    const initial = createCommandInputState();
    assert.deepEqual(updateCommandInput(initial, '').state, initial);

    const result = updateCommandInput(initial, '\x04');
    assert.equal(result.shouldHide, true);
    assert.equal(result.shouldRefresh, false);
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

test('fits a suggestion popup inside a narrow terminal', () => {
    const placement = getSuggestionPlacement({
        screenRect: { left: 50, top: 50, right: 170, bottom: 90 },
        cols: 0,
        rows: 0,
        cursorX: -2,
        cursorY: 99,
        itemCount: 0,
    });

    assert.equal(placement.left, 54);
    assert.equal(placement.maxWidth, 112);
    assert.ok(placement.maxHeight >= 0);
});
