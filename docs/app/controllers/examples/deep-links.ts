import { tracked } from '@glimmer/tracking';
import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';

import { searchQueryParams } from 'docs/controllers/examples/search';
import { type Sort } from 'docs/examples/products';

import type RouterService from '@ember/routing/router-service';

// Links to the search example, built from its definitions
export default class DeepLinksController extends Controller {
  @service declare router: RouterService;

  @tracked search = 'pump';
  @tracked page = 2;
  @tracked sort: Sort = 'price';
  @tracked tags = 'pumps,valves';
  @tracked address = '/examples/search?q=valve&page=x&sort=nope&tags=valves';

  /** The values, as the controller holds them */
  get values() {
    return {
      search: this.search,
      page: this.page,
      sort: this.sort,
      tags: this.tags ? this.tags.split(',').map((tag) => tag.trim()) : [],
    };
  }

  /** For <LinkTo @query>, transitionTo, replaceWith */
  get forLink() {
    return searchQueryParams.forLink(this.values);
  }

  /** For router.urlFor, or an address you write yourself */
  get serialized() {
    return searchQueryParams.serialize(this.values);
  }

  get urlFor() {
    return this.router.urlFor('examples.search', {
      queryParams: this.serialized,
    });
  }

  /** What urlFor writes when handed the values as they are */
  get urlForTyped() {
    return this.router.urlFor('examples.search', {
      queryParams: { q: this.values.search, tags: this.values.tags },
    });
  }

  /** An address read without its route: recognize, then deserialize */
  get recognized() {
    try {
      return this.router.recognize(this.address)?.queryParams ?? {};
    } catch {
      return {};
    }
  }

  get deserialized() {
    return searchQueryParams.deserialize(this.recognized);
  }

  @action setText(key: 'search' | 'tags' | 'address', event: Event) {
    this[key] = (event.target as HTMLInputElement).value;
  }

  @action setPage(event: Event) {
    this.page = Number((event.target as HTMLInputElement).value);
  }

  @action setSort(event: Event) {
    this.sort = (event.target as HTMLSelectElement).value as Sort;
  }

  @action go() {
    void this.router.transitionTo('examples.search', {
      queryParams: this.forLink,
    });
  }
}
