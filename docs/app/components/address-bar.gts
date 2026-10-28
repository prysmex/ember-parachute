import Component from '@glimmer/component';
import { on } from '@ember/modifier';
import { service } from '@ember/service';

import type RouterService from '@ember/routing/router-service';
import type EventLogService from 'docs/services/event-log';

// The current address, and every address the router wrote: pushed (Back
// goes to the one before) or replaced (Back skips it)
export default class AddressBar extends Component {
  @service declare router: RouterService;
  @service declare eventLog: EventLogService;

  get url() {
    return decodeURIComponent(this.router.currentURL ?? '/');
  }

  get rawUrl() {
    return this.router.currentURL ?? '/';
  }

  clear = () => this.eventLog.clear();

  <template>
    <section class="address" aria-label="The address">
      <div class="address-bar">
        <span class="address-dot" aria-hidden="true"></span>
        <code
          class="address-url"
          data-test-url
          title={{this.rawUrl}}
        >{{this.url}}</code>
      </div>
      <details class="address-history" open>
        <summary>
          History
          <span class="muted">({{this.eventLog.addresses.length}})</span>
        </summary>
        {{#if this.eventLog.addresses.length}}
          <ol class="history-list">
            {{#each this.eventLog.addresses as |entry|}}
              <li>
                <span class="badge badge-{{entry.kind}}">{{entry.kind}}</span>
                <code>{{entry.url}}</code>
              </li>
            {{/each}}
          </ol>
        {{else}}
          <p class="muted small">Nothing written yet: change something.</p>
        {{/if}}
      </details>
      <button
        type="button"
        class="link-button clear"
        {{on "click" this.clear}}
      >Clear the logs</button>
    </section>
  </template>
}
