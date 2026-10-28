import { tracked } from '@glimmer/tracking';
import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';

import {
  queryParam,
  withParachute,
  type ParachuteEvent,
  type QueryParamMixin,
} from 'ember-parachute';
import { integer, list, oneOf } from 'ember-parachute/adapters';

import {
  fetchProducts,
  SORTS,
  type Page,
  type ProductSearchControls,
  type SearchValues,
  type Sort,
} from 'docs/examples/products';

import type Owner from '@ember/owner';
import type EventLogService from 'docs/services/event-log';

interface Values extends SearchValues {
  dense: boolean;
}

// The same page as the search example, with each query param declared on
// its field: the value is the default, the field is tracked, so a plain
// assignment is a query param change.
@withParachute
export default class DecoratorsController
  extends Controller
  implements ProductSearchControls
{
  @service declare eventLog: EventLogService;

  @queryParam({ as: 'q', refresh: true, replace: true }) search = '';
  @queryParam({ ...integer(1), refresh: true }) page = 1;
  @queryParam({ ...oneOf(SORTS, 'name'), refresh: true }) sort: Sort = 'name';
  @queryParam({ ...list(), refresh: true }) tags: string[] = [];
  @queryParam dense = false;

  @tracked results?: Page;
  @tracked loading = false;

  #request = 0;

  constructor(owner: Owner) {
    super(owner);
    this.eventLog.listenTo(this, 'examples/decorators');
  }

  setup({ queryParams }: ParachuteEvent<Values>) {
    void this.fetch(queryParams);
  }

  queryParamsDidChange({ shouldRefresh, queryParams }: ParachuteEvent<Values>) {
    if (shouldRefresh) {
      void this.fetch(queryParams);
    }
  }

  async fetch(values: Values) {
    const request = ++this.#request;

    this.loading = true;

    const results = await fetchProducts(values);

    if (request === this.#request) {
      this.results = results;
      this.loading = false;
    }
  }

  // plain assignments: the fields are tracked
  @action setSearch(event: Event) {
    this.search = (event.target as HTMLInputElement).value;
    this.page = 1;
  }

  @action setSort(event: Event) {
    this.sort = (event.target as HTMLSelectElement).value as Sort;
  }

  @action toggleTag(tag: string) {
    this.tags = this.tags.includes(tag)
      ? this.tags.filter((t) => t !== tag)
      : [...this.tags, tag];
    this.page = 1;
  }

  @action goTo(page: number) {
    this.page = page;
  }

  @action toggleDense() {
    this.dense = !this.dense;
  }

  @action resetAll() {
    this.resetQueryParams();
  }
}

// What @withParachute adds, for TypeScript (a decorator can't say it)
export default interface DecoratorsController extends QueryParamMixin<Values> {}
