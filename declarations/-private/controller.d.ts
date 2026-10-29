import Mixin from '@ember/object/mixin';
import type { QueryParamOption } from './query-param.ts';
type Class = abstract new (...args: any[]) => object;
/**
 * `Base`, set up with a definition set, as a native subclass: no mixin, no
 * `extend()`.
 *
 * @param defineDefaults put the default values on the prototype (the
 *   decorators leave them to the class's own fields)
 */
export declare function parachuteClass<B extends Class>(Base: B, definitions: Record<string, QueryParamOption>, defineDefaults?: boolean): B;
/**
 * The same, as an Ember Mixin (`Controller.extend(queryParams.Mixin)`), as
 * ember-parachute 1.x made it. Ember deprecates mixins from 7.4.
 */
export declare function parachuteMixin(definitions: Record<string, QueryParamOption>): Mixin;
export {};
//# sourceMappingURL=controller.d.ts.map