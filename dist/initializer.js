import { installParachute } from './route.js';

/**
 * An initializer that installs ember-parachute, for apps that keep
 * initializers in `app/initializers`:
 *
 * ```js
 * // app/initializers/ember-parachute.js
 * export { default } from 'prysmex-ember-parachute/initializer';
 * ```
 */
function initialize() {
  installParachute();
}
var initializer = {
  name: 'ember-parachute',
  initialize
};

export { initializer as default, initialize };
//# sourceMappingURL=initializer.js.map
