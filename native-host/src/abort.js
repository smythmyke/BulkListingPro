class AbortError extends Error {
  constructor(reason = 'aborted') {
    super(`Operation aborted: ${reason}`);
    this.name = 'AbortError';
    this.reason = reason;
  }
}

let abortState = {
  paused: false,
  skip: false,
  cancel: false
};

function setPaused(value) {
  abortState.paused = value;
}

function setSkip(value) {
  abortState.skip = value;
}

function setCancel(value) {
  abortState.cancel = value;
}

function reset() {
  abortState.paused = false;
  abortState.skip = false;
  abortState.cancel = false;
}

function checkAbort() {
  if (abortState.cancel) {
    throw new AbortError('cancel');
  }
  if (abortState.skip) {
    throw new AbortError('skip');
  }
}

async function interruptibleDelay(ms) {
  const interval = 100;
  let elapsed = 0;

  while (elapsed < ms) {
    while (abortState.paused && !abortState.cancel && !abortState.skip) {
      await new Promise(r => setTimeout(r, interval));
    }

    checkAbort();

    await new Promise(r => setTimeout(r, Math.min(interval, ms - elapsed)));
    elapsed += interval;
  }
}

function isPaused() {
  return abortState.paused;
}

module.exports = {
  AbortError,
  setPaused,
  setSkip,
  setCancel,
  reset,
  checkAbort,
  interruptibleDelay,
  isPaused
};
