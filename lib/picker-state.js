(function (global) {
  const PickerStates = {
    IDLE: 'idle',
    ARMED: 'armed',
    HOVERING: 'hovering',
    SELECTING: 'selecting',
    EXTRACTING: 'extracting',
    COMPLETE: 'complete',
    ERROR: 'error'
  };

  const TRANSITIONS = {
    idle: ['armed'],
    armed: ['hovering', 'idle', 'error'],
    hovering: ['selecting', 'armed', 'idle', 'error'],
    selecting: ['extracting', 'error', 'idle'],
    extracting: ['complete', 'error', 'idle'],
    complete: ['idle', 'armed'],
    error: ['idle', 'armed']
  };

  function createPickerStateMachine(initialState = PickerStates.IDLE) {
    let state = initialState;
    const listeners = [];

    function canTransition(nextState) {
      return (TRANSITIONS[state] || []).includes(nextState);
    }

    function transition(nextState, context = {}) {
      if (!canTransition(nextState)) {
        const err = new Error(`Invalid picker transition: ${state} -> ${nextState}`);
        state = PickerStates.ERROR;
        notify({ state, previous: state, context, error: err.message });
        return { ok: false, state, error: err.message };
      }

      const previous = state;
      state = nextState;
      const event = { state, previous, context };
      notify(event);
      return { ok: true, ...event };
    }

    function notify(event) {
      listeners.forEach((listener) => listener(event));
    }

    function onChange(listener) {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    }

    function getState() {
      return state;
    }

    function isActive() {
      return state !== PickerStates.IDLE && state !== PickerStates.COMPLETE && state !== PickerStates.ERROR;
    }

    function reset() {
      const previous = state;
      state = PickerStates.IDLE;
      notify({ state, previous, context: { reason: 'reset' } });
    }

    return {
      PickerStates,
      getState,
      isActive,
      canTransition,
      transition,
      onChange,
      reset
    };
  }

  const api = { PickerStates, TRANSITIONS, createPickerStateMachine };
  global.WfExtractor = global.WfExtractor || {};
  Object.assign(global.WfExtractor, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
