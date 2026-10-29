import NoneLocation from '@ember/routing/none-location';

import {
  addParachuteListener,
  type ParachuteHook,
} from './-private/listeners.ts';

import type ParachuteEvent from './-private/event.ts';

export type { ParachuteHook } from './-private/listeners.ts';

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
export class RecordingLocation extends NoneLocation {
  history: Array<['push' | 'replace', string]> = [];

  setURL(path: string) {
    this.history.push(['push', path]);
    super.setURL(path);
  }

  replaceURL(path: string) {
    this.history.push(['replace', path]);
    // NoneLocation has no replaceURL of its own
    super.setURL(path);
  }
}

export interface RecordedEvent<T = Record<string, any>> {
  hook: ParachuteHook;
  event: ParachuteEvent<T>;
  /** `setup`'s transition, `reset`'s isExiting */
  extra: unknown;
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
export function recordParachuteEvents<T = Record<string, any>>(
  controller: object,
) {
  const events: RecordedEvent<T>[] = [];
  const stops = (['setup', 'queryParamsDidChange', 'reset'] as const).map(
    (hook) =>
      addParachuteListener<T>(controller, hook, (event, extra?: unknown) => {
        events.push({ hook, event, extra });
      }),
  );

  return {
    events,
    /** The hooks, in the order they ran */
    get hooks(): ParachuteHook[] {
      return events.map(({ hook }) => hook);
    },
    /** The last event of a hook */
    last(hook: ParachuteHook): ParachuteEvent<T> | undefined {
      return events.filter((recorded) => recorded.hook === hook).at(-1)?.event;
    },
    clear() {
      events.length = 0;
    },
    stop() {
      for (const stop of stops) {
        stop();
      }
    },
  };
}
