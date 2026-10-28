import { installParachute } from './route.ts';

/**
 * An initializer that installs ember-parachute, for apps that keep
 * initializers in `app/initializers`:
 *
 * ```js
 * // app/initializers/ember-parachute.js
 * export { default } from 'prysmex-ember-parachute/initializer';
 * ```
 */
export function initialize(): void {
  installParachute();
}

export default { name: 'ember-parachute', initialize };
