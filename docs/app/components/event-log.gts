import Component from '@glimmer/component';
import { service } from '@ember/service';

import { json } from 'docs/utils/json';

import type EventLogService from 'docs/services/event-log';

const isBool = (value: unknown) => typeof value === 'boolean';

// Every hook the example's controllers were called with, newest first, as
// addParachuteListener hears them
export default class EventLog extends Component {
  @service declare eventLog: EventLogService;

  <template>
    <section class="event-log" aria-label="Hooks">
      <h2 class="panel-title">Hooks <span class="muted">newest first</span></h2>
      {{#if this.eventLog.events.length}}
        <ol class="events">
          {{#each this.eventLog.events as |event|}}
            <li
              class="event event-{{event.hook}}"
              data-test-event={{event.hook}}
            >
              <div class="event-head">
                <span class="hook">{{event.hook}}</span>
                <span class="muted">{{event.routeName}}</span>
                {{#if (isBool event.isExiting)}}
                  <span class="flag">isExiting: {{json event.isExiting}}</span>
                {{/if}}
                <span
                  class="flag {{if event.shouldRefresh 'flag-on'}}"
                >shouldRefresh:
                  {{json event.shouldRefresh}}</span>
              </div>
              <dl class="event-body">
                <dt>changed</dt>
                <dd><code>{{json event.changed}}</code></dd>
                <dt>changes</dt>
                <dd><code>{{json event.changes}}</code></dd>
                <dt>queryParams</dt>
                <dd><code>{{json event.queryParams}}</code></dd>
              </dl>
            </li>
          {{/each}}
        </ol>
      {{else}}
        <p class="muted small">No hook called yet.</p>
      {{/if}}
    </section>
  </template>
}
