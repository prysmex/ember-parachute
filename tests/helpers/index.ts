import Controller from '@ember/controller';
import Route from '@ember/routing/route';
import EmberRouter from '@ember/routing/router';
import { precompileTemplate } from '@ember/template-compilation';

import { RecordingLocation } from '#src/test-support.ts';

import type Owner from '@ember/owner';

type RouterMap = Parameters<typeof EmberRouter.map>[0];

/**
 * A JSON-safe copy of a value for deepEqual pins: functions and undefined
 * become readable markers, so a pin can hold any value or definition.
 */
export function snapshot(value: unknown): any {
  return JSON.parse(
    JSON.stringify(value === undefined ? '<undefined>' : value, (_key, v) => {
      if (typeof v === 'function') return '<function>';
      if (v === undefined) return '<undefined>';

      return v as unknown;
    }),
  );
}

/**
 * The router contract warnings of the current test: the test fails with
 * any left (a test expecting one empties it).
 */
export const routerWarnings: string[] = [];

/** Registers, replacing whatever was there. */
export function register(owner: Owner, name: string, factory: unknown) {
  // a test's owner can unregister, the public Owner type doesn't say so
  (owner as Owner & { unregister(name: string): void }).unregister(name);
  owner.register(name as never, factory as never);
}

export const outlet = precompileTemplate('{{outlet}}', { strictMode: true });

/** A router on a map of its own, writing to a RecordingLocation. */
export function routerFor(
  map: RouterMap,
  Base: typeof EmberRouter = EmberRouter,
) {
  class TestRouter extends Base {
    location = 'recording';
    rootURL = '/';
  }

  TestRouter.map(map);

  return TestRouter;
}

/** The router itself (`router:main`), as the test needs to see it. */
export function routerMain<T = { location: RecordingLocation }>(
  owner: Owner,
): T {
  const router: unknown = owner.lookup('router:main');

  return router as T;
}

/**
 * The app around a test's routes: its router (a RecordingLocation), an
 * empty application route, controller and template.
 */
export function setupApp(
  owner: Owner,
  map: RouterMap,
  Base: typeof EmberRouter = EmberRouter,
) {
  register(owner, 'router:main', routerFor(map, Base));
  register(owner, 'location:recording', RecordingLocation);
  register(owner, 'route:application', class extends Route {});
  register(owner, 'controller:application', class extends Controller {});
  register(owner, 'template:application', outlet);

  return {
    /** Every address written: ['push' | 'replace', url] */
    get history() {
      return routerMain(owner).location.history;
    },
    clearHistory() {
      routerMain(owner).location.history.length = 0;
    },
  };
}

/** A promise and the function that resolves it. */
export function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));

  return { promise, resolve };
}
