/** What `installParachute` was given. */
export interface ParachuteOptions {
  /**
   * Turns a value as the router hands it to Ember's `queryParamsDidChange`
   * into the value the address holds, before `deserialize` sees it.
   *
   * Only needed when the router keeps query params in a shape of its own:
   * with ember-rison-qs, pass its `readValue`.
   */
  readValue?: (value: unknown) => unknown;

  /**
   * Also send each hook as an Ember event, for listeners added with
   * `addListener` from `@ember/object/events` (as ember-parachute 1.x did):
   * pass that module's `sendEvent`. Ember deprecates those events from
   * 7.4: prefer `addParachuteListener`.
   */
  sendEvent?: (target: object, eventName: string, args: unknown[]) => unknown;
}

export const config: {
  readValue: (value: unknown) => unknown;
  sendEvent: ParachuteOptions['sendEvent'];
} = {
  readValue: (value) => value,
  sendEvent: undefined,
};
