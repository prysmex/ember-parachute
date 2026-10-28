import { fn } from '@ember/helper';
import { on } from '@ember/modifier';

import {
  PER_PAGE,
  SORTS,
  TAGS,
  type ProductSearchControls,
} from 'docs/examples/products';
import { eq, includes } from 'docs/utils/json';

import type { TOC } from '@ember/component/template-only';

const pagesOf = (count = 1) => Array.from({ length: count }, (_, i) => i + 1);
const joined = (list: string[]) => list.join(', ');
const firstOf = (page: number) => (page - 1) * PER_PAGE + 1;

// The search UI both search examples share: it reads and calls their
// controller
const ProductSearch: TOC<{ Args: { controller: ProductSearchControls } }> =
  <template>
    <div class="search">
      <div class="controls">
        <label class="field">
          <span>Search <code class="muted">?q=</code></span>
          <input
            type="search"
            value={{@controller.search}}
            placeholder="pump, valve, sensor…"
            data-test-search
            {{on "input" @controller.setSearch}}
          />
        </label>
        <label class="field">
          <span>Sort <code class="muted">?sort=</code></span>
          <select data-test-sort {{on "change" @controller.setSort}}>
            {{#each SORTS as |sort|}}
              <option
                value={{sort}}
                selected={{eq sort @controller.sort}}
              >{{sort}}</option>
            {{/each}}
          </select>
        </label>
        <fieldset class="field">
          <legend>Tags <code class="muted">?tags=</code></legend>
          <div class="chips">
            {{#each TAGS as |tag|}}
              <label class="chip">
                <input
                  type="checkbox"
                  checked={{includes @controller.tags tag}}
                  data-test-tag={{tag}}
                  {{on "change" (fn @controller.toggleTag tag)}}
                />
                {{tag}}
              </label>
            {{/each}}
          </div>
        </fieldset>
        <label class="chip">
          <input
            type="checkbox"
            checked={{@controller.dense}}
            {{on "change" @controller.toggleDense}}
          />
          Dense
          <code class="muted">?dense=</code>
          (no refresh)
        </label>
      </div>

      <div
        class="results
          {{if @controller.loading 'is-loading'}}
          {{if @controller.dense 'is-dense'}}"
      >
        {{#if @controller.results}}
          <p class="muted small" data-test-total>
            {{@controller.results.total}}
            products{{#if @controller.loading}}, loading…{{/if}}
          </p>
          <ol class="products" start={{firstOf @controller.page}}>
            {{#each @controller.results.items as |product|}}
              <li>
                <strong>{{product.name}}</strong>
                <span class="muted">${{product.price}}
                  ·
                  {{product.rating}}★ ·
                  {{joined product.tags}}</span>
              </li>
            {{else}}
              <li class="muted">{{if
                  @controller.results.total
                  "Nothing on this page: it is past the last one."
                  "Nothing matches."
                }}</li>
            {{/each}}
          </ol>
          <nav class="pager" aria-label="Pages">
            {{#each (pagesOf @controller.results.pages) as |page|}}
              <button
                type="button"
                class="page {{if (eq page @controller.page) 'is-current'}}"
                data-test-page={{page}}
                {{on "click" (fn @controller.goTo page)}}
              >{{page}}</button>
            {{/each}}
          </nav>
        {{else}}
          <p class="muted">Loading…</p>
        {{/if}}
      </div>

      <button
        type="button"
        class="button"
        data-test-reset
        {{on "click" @controller.resetAll}}
      >
        resetQueryParams()
      </button>
    </div>
  </template>;

export default ProductSearch;
