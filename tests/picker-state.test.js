const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { PickerStates, createPickerStateMachine } = require('../lib/picker-state.js');

describe('picker-state', () => {
  it('starts in idle state', () => {
    const picker = createPickerStateMachine();
    assert.equal(picker.getState(), PickerStates.IDLE);
    assert.equal(picker.isActive(), false);
  });

  it('follows a guarded extraction workflow', () => {
    const picker = createPickerStateMachine();
    assert.equal(picker.transition(PickerStates.ARMED).ok, true);
    assert.equal(picker.transition(PickerStates.HOVERING).ok, true);
    assert.equal(picker.transition(PickerStates.SELECTING).ok, true);
    assert.equal(picker.transition(PickerStates.EXTRACTING).ok, true);
    assert.equal(picker.transition(PickerStates.COMPLETE).ok, true);
    assert.equal(picker.transition(PickerStates.IDLE).ok, true);
    assert.equal(picker.isActive(), false);
  });

  it('rejects invalid transitions', () => {
    const picker = createPickerStateMachine();
    const result = picker.transition(PickerStates.EXTRACTING);
    assert.equal(result.ok, false);
    assert.equal(picker.getState(), PickerStates.ERROR);
  });
});
