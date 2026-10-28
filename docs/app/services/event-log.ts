import { tracked } from '@glimmer/tracking';
import Service from '@ember/service';

import { addParachuteListener, type ParachuteEvent } from 'ember-parachute';

export interface LoggedEvent {
  id: number;
  hook: 'setup' | 'queryParamsDidChange' | 'reset';
  controller: string;
  routeName: string;
  changed: unknown;
  changes: unknown;
  queryParams: unknown;
  shouldRefresh: boolean;
  /** reset's isExiting */
  isExiting?: boolean;
}

export interface LoggedAddress {
  id: number;
  kind: 'push' | 'replace';
  url: string;
}

const LIMIT = 40;

/**
 * What the examples show beside themselves: every hook a controller was
 * called with (heard with addParachuteListener), and every address the
 * router wrote.
 */
export default class EventLogService extends Service {
  @tracked events: LoggedEvent[] = [];
  @tracked addresses: LoggedAddress[] = [];

  #id = 0;

  /** Logs the hooks of a controller, under a name. */
  listenTo(controller: object, name: string) {
    const log = (
      hook: LoggedEvent['hook'],
      event: ParachuteEvent,
      isExiting?: boolean,
    ) => {
      this.events = [
        {
          id: ++this.#id,
          hook,
          controller: name,
          routeName: event.routeName,
          changed: event.changed,
          changes: event.changes,
          queryParams: event.queryParams,
          shouldRefresh: event.shouldRefresh,
          isExiting,
        },
        ...this.events,
      ].slice(0, LIMIT);
    };

    addParachuteListener(controller, 'setup', (event) => log('setup', event));
    addParachuteListener(controller, 'queryParamsDidChange', (event) =>
      log('queryParamsDidChange', event),
    );
    addParachuteListener(controller, 'reset', (event, isExiting) =>
      log('reset', event, isExiting),
    );
  }

  recordAddress(kind: LoggedAddress['kind'], url: string) {
    this.addresses = [{ id: ++this.#id, kind, url }, ...this.addresses].slice(
      0,
      LIMIT,
    );
  }

  clear() {
    this.events = [];
    this.addresses = [];
  }
}

declare module '@ember/service' {
  interface Registry {
    'event-log': EventLogService;
  }
}
