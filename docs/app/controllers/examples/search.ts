import { tracked } from '@glimmer/tracking';
import Controller from '@ember/controller';
import { action, set } from '@ember/object';
import { service } from '@ember/service';

import QueryParams, {
  type ParachuteEvent,
  type QueryParamValues,
} from 'ember-parachute';
import { integer, list, oneOf } from 'ember-parachute/adapters';

import {
  fetchProducts,
  SORTS,
  type Page,
  type ProductSearchControls,
  type Sort,
} from 'docs/examples/products';

import type Owner from '@ember/owner';
import type EventLogService from 'docs/services/event-log';

// The definitions, declared once. Exported: the deep-link builder makes
// links to this page from them.
export const searchQueryParams = new QueryParams({
  // ?q=, a new history entry would be one per keystroke: replace
  search: { as: 'q', defaultValue: '', refresh: true, replace: true },
  page: { defaultValue: 1, refresh: true, ...integer(1) },
  // a hand-edited ?sort=nope reads as 'name'
  sort: {
    defaultValue: 'name' as Sort,
    refresh: true,
    ...oneOf(SORTS, 'name'),
  },
  // ?tags=pumps,valves
  tags: { defaultValue: [] as string[], refresh: true, ...list() },
  // how the results look, not which: no refresh
  dense: { defaultValue: false },
});

type Values = QueryParamValues<typeof searchQueryParams>;

export default class SearchController
  extends searchQueryParams.mixInto(Controller)
  implements ProductSearchControls
{
  @service declare eventLog: EventLogService;

  @tracked results?: Page;
  @tracked loading = false;

  #request = 0;

  constructor(owner: Owner) {
    super(owner);
    // what the page's event log shows (addParachuteListener)
    this.eventLog.listenTo(this, 'examples/search');
  }

  // entering the route (or a new model): fetch with every value
  setup({ queryParams }: ParachuteEvent<Values>) {
    void this.fetch(queryParams);
  }

  // a value changed: fetch again, if it is one that says so
  queryParamsDidChange({ shouldRefresh, queryParams }: ParachuteEvent<Values>) {
    if (shouldRefresh) {
      void this.fetch(queryParams);
    }
  }

  async fetch(values: Values) {
    const request = ++this.#request;

    this.loading = true;

    const results = await fetchProducts(values);

    // only the last request's answer
    if (request === this.#request) {
      this.results = results;
      this.loading = false;
    }
  }

  // Changing a query param is setting the controller property: the
  // address follows. Two at once are one change.
  @action setSearch(event: Event) {
    set(this, 'search', (event.target as HTMLInputElement).value);
    set(this, 'page', 1);
  }

  @action setSort(event: Event) {
    set(this, 'sort', (event.target as HTMLSelectElement).value as Sort);
  }

  @action toggleTag(tag: string) {
    set(
      this,
      'tags',
      this.tags.includes(tag)
        ? this.tags.filter((t) => t !== tag)
        : [...this.tags, tag],
    );
    set(this, 'page', 1);
  }

  @action goTo(page: number) {
    set(this, 'page', page);
  }

  @action toggleDense() {
    set(this, 'dense', !this.dense);
  }

  @action resetAll() {
    this.resetQueryParams();
  }
}
