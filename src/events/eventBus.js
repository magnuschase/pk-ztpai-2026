const { EventEmitter } = require("events");

// In-process event bus on top of EventEmitter. Listeners are side effects (audit log,
// notifications) of an operation that has already succeeded, so they are isolated from
// the publisher:
//   - publish() returns right away - the API response never waits for a listener,
//   - every listener runs on its own, after publish() returns: a throw or a rejected
//     promise is logged and reaches neither the publisher nor the other listeners.
// A plain emitter.on(type, listener) would not give that: emit() calls listeners
// synchronously, so a throwing listener would throw out of publish() - into the request.
function createEventBus({ now = () => new Date(), logger = console } = {}) {
  const emitter = new EventEmitter();
  // Listener runs still in progress - drain() waits for them
  const pending = new Set();

  function subscribe(type, listener) {
    emitter.on(type, (event) => {
      const run = Promise.resolve()
        .then(() => listener(event))
        .catch((err) => {
          logger.error(`[events] listener ${listener.name || "(anonymous)"} failed for ${type}:`, err);
        })
        .finally(() => pending.delete(run));
      pending.add(run);
    });
  }

  function publish(type, payload) {
    emitter.emit(type, { type, payload, occurredAt: now().toISOString() });
  }

  // Resolves when every listener started so far has finished (including runs started by
  // those listeners). For graceful shutdown (audit log writes before the pool closes) and
  // for tests that check what the listeners did.
  async function drain() {
    while (pending.size > 0) {
      await Promise.all(pending);
    }
  }

  return { subscribe, publish, drain };
}

module.exports = createEventBus;
