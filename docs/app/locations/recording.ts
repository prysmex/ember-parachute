import { getOwner } from '@ember/owner';
import HistoryLocation from '@ember/routing/history-location';

import type EventLogService from 'docs/services/event-log';

/**
 * The browser's history, keeping every address the router writes and how:
 * pushed (a new entry, Back goes to the one before) or replaced. The
 * examples show it, to tell `replace: true` from the rest.
 */
export default class RecordingLocation extends HistoryLocation {
  get #log() {
    return getOwner(this)?.lookup('service:event-log') as
      EventLogService | undefined;
  }

  setURL(path: string) {
    this.#log?.recordAddress('push', path);
    super.setURL(path);
  }

  replaceURL(path: string) {
    this.#log?.recordAddress('replace', path);
    super.replaceURL(path);
  }
}
