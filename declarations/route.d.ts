import { type ParachuteOptions } from './-private/config.ts';
export type { ParachuteOptions } from './-private/config.ts';
/** Whether `installParachute` has run (in this app, or any copy of it). */
export declare function isParachuteInstalled(): boolean;
/**
 * Adds ember-parachute's hooks to every route: calls the controller's
 * `setup` / `reset` / `queryParamsDidChange`, runs address values through
 * the definitions' `serialize` / `deserialize`, and gives the route the
 * definitions' `replace` flags.
 *
 * Call it once, before the first route is made: in an initializer, or in
 * `app.ts`. Calling it again only updates the options.
 *
 * ```ts
 * // app/initializers/ember-parachute.ts
 * import { installParachute } from 'prysmex-ember-parachute';
 *
 * export function initialize() {
 *   installParachute();
 * }
 *
 * export default { initialize };
 * ```
 */
export declare function installParachute(options?: ParachuteOptions): void;
/**
 * Takes ember-parachute's hooks off the routes again, putting back the very
 * functions it replaced. For tests; an app installs once.
 */
export declare function uninstallParachute(): void;
//# sourceMappingURL=route.d.ts.map