import NoneLocation from '@ember/routing/none-location';
import { addParachuteListener } from './-private/listeners.js';

/**
 * A `location: 'none'` that keeps every address the router wrote, and how:
 * pushed (a new history entry) or replaced. To assert `replace`.
 *
 * ```js
 * this.owner.register('location:recording', RecordingLocation);
 * // with the router's `location = 'recording'`
 * assert.deepEqual(this.owner.lookup('router:main').location.history, [
 *   ['replace', '/posts?q=ember'],
 * ]);
 * ```
 */
class RecordingLocation extends NoneLocation {
  history = [];
  setURL(path) {
    this.history.push(['push', path]);
    super.setURL(path);
  }
  replaceURL(path) {
    this.history.push(['replace', path]);
    // NoneLocation has no replaceURL of its own
    super.setURL(path);
  }
}
/**
 * Every parachute event a controller is sent, in order, until `stop()`.
 *
 * ```js
 * const recorder = recordParachuteEvents(this.owner.lookup('controller:posts'));
 * await visit('/posts?q=ember');
 * assert.deepEqual(recorder.hooks, ['setup']);
 * ```
 */
function recordParachuteEvents(controller) {
  const events = [];
  const stops = ['setup', 'queryParamsDidChange', 'reset'].map(hook => addParachuteListener(controller, hook, (event, extra) => {
    events.push({
      hook,
      event,
      extra
    });
  }));
  return {
    events,
    /** The hooks, in the order they ran */
    get hooks() {
      return events.map(({
        hook
      }) => hook);
    },
    /** The last event of a hook */
    last(hook) {
      return events.filter(recorded => recorded.hook === hook).at(-1)?.event;
    },
    clear() {
      events.length = 0;
    },
    stop() {
      for (const stop of stops) {
        stop();
      }
    }
  };
}

export { RecordingLocation, recordParachuteEvents };
//# sourceMappingURL=test-support.js.map
