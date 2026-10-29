import NoneLocation from '@ember/routing/none-location';
import { type ParachuteHook } from './-private/listeners.ts';
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
export declare class RecordingLocation extends NoneLocation {
    history: Array<['push' | 'replace', string]>;
    setURL(path: string): void;
    replaceURL(path: string): void;
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
export declare function recordParachuteEvents<T = Record<string, any>>(controller: object): {
    events: RecordedEvent<T>[];
    /** The hooks, in the order they ran */
    readonly hooks: ParachuteHook[];
    /** The last event of a hook */
    last(hook: ParachuteHook): ParachuteEvent<T> | undefined;
    clear(): void;
    stop(): void;
};
//# sourceMappingURL=test-support.d.ts.map