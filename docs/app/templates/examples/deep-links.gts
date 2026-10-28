import { fn, get } from '@ember/helper';
import { on } from '@ember/modifier';
import { LinkTo } from '@ember/routing';

import ExampleLayout from 'docs/components/example-layout';
import { SORTS } from 'docs/examples/products';
import { eq, json } from 'docs/utils/json';

import controller from '../../controllers/examples/deep-links.ts?raw';

import type DeepLinksController from 'docs/controllers/examples/deep-links';
import type { TOC } from '@ember/component/template-only';

const sources = [
  { name: 'app/controllers/examples/deep-links.ts', code: controller },
];

const entries = (value: object) => Object.entries(value);
const decoded = (url: string) => decodeURIComponent(url);

const DeepLinks: TOC<{ Args: { controller: DeepLinksController } }> = <template>
  <ExampleLayout
    @title="Deep links"
    @guide="guides.links-and-deep-links"
    @guideTitle="Links & deep links"
    @sources={{sources}}
  >
    <:intro>
      <p>
        Links to the
        <LinkTo @route="examples.search">search example</LinkTo>, built from its
        definitions (<code>searchQueryParams</code>, exported by its
        controller): no route, no controller needed. Ember takes query params by
        their
        <strong>name in the address</strong>
        (<code>q</code>, not
        <code>search</code>), and writes them two ways: a
        <code>&lt;LinkTo&gt;</code>
        or
        <code>transitionTo</code>
        runs each definition's
        <code>serialize</code>,
        <code>router.urlFor</code>
        runs none.
      </p>
    </:intro>
    <:default>
      <div class="controls">
        <label class="field">
          <span>search</span>
          <input
            value={{@controller.search}}
            {{on "input" (fn @controller.setText "search")}}
          />
        </label>
        <label class="field">
          <span>page</span>
          <input
            type="number"
            min="1"
            value={{@controller.page}}
            {{on "input" @controller.setPage}}
          />
        </label>
        <label class="field">
          <span>sort</span>
          <select {{on "change" @controller.setSort}}>
            {{#each SORTS as |sort|}}
              <option
                value={{sort}}
                selected={{eq sort @controller.sort}}
              >{{sort}}</option>
            {{/each}}
          </select>
        </label>
        <label class="field">
          <span>tags (comma separated)</span>
          <input
            value={{@controller.tags}}
            {{on "input" (fn @controller.setText "tags")}}
          />
        </label>
      </div>

      <dl class="outputs">
        <dt><code>searchQueryParams.forLink(values)</code>
          <span class="muted">for &lt;LinkTo @query&gt;, transitionTo,
            replaceWith</span></dt>
        <dd><pre data-test-for-link>{{json @controller.forLink true}}</pre></dd>

        <dt>A live
          <code>&lt;LinkTo @route="examples.search"
            @query=&#123;&#123;forLink&#125;&#125;&gt;</code></dt>
        <dd>
          <LinkTo
            @route="examples.search"
            @query={{@controller.forLink}}
            data-test-live-link
          >Open the search</LinkTo>
          <button
            type="button"
            class="button"
            {{on "click" @controller.go}}
          >transitionTo</button>
        </dd>

        <dt><code>searchQueryParams.serialize(values)</code>
          <span class="muted">what the address holds</span></dt>
        <dd><pre data-test-serialized>{{json
              @controller.serialized
              true
            }}</pre></dd>

        <dt><code>router.urlFor('examples.search', { queryParams: serialized })</code></dt>
        <dd><code data-test-url-for>{{decoded @controller.urlFor}}</code></dd>

        <dt class="warning">Not this:
          <code>router.urlFor</code>
          with the values as they are</dt>
        <dd><code>{{decoded @controller.urlForTyped}}</code>
          <span class="muted small">(no serializer ran: a list becomes
            <code>tags[]=</code>)</span></dd>
      </dl>

      <h3>Read an address</h3>
      <label class="field">
        <span>An address, as a push notification or an email would have it</span>
        <input
          value={{@controller.address}}
          data-test-address
          {{on "input" (fn @controller.setText "address")}}
        />
      </label>
      <table class="table">
        <thead>
          <tr><th>key</th><th><code
              >router.recognize(url).queryParams</code></th></tr>
        </thead>
        <tbody>
          {{#each (entries @controller.recognized) as |entry|}}
            <tr><td><code>{{get entry 0}}</code></td><td><code>{{json
                    (get entry 1)
                  }}</code></td></tr>
          {{/each}}
        </tbody>
      </table>
      <table class="table" data-test-deserialized>
        <thead>
          <tr><th>property</th><th><code
              >searchQueryParams.deserialize(…)</code></th></tr>
        </thead>
        <tbody>
          {{#each (entries @controller.deserialized) as |entry|}}
            <tr><td><code>{{get entry 0}}</code></td><td><code>{{json
                    (get entry 1)
                  }}</code></td></tr>
          {{/each}}
        </tbody>
      </table>
    </:default>
  </ExampleLayout>
</template>;

export default DeepLinks;
