import ExampleLayout from 'docs/components/example-layout';
import ProductSearch from 'docs/components/product-search';

import controller from '../../controllers/examples/search.ts?raw';
import component from '../../components/product-search.gts?raw';
import products from '../../examples/products.ts?raw';

import type SearchController from 'docs/controllers/examples/search';
import type { TOC } from '@ember/component/template-only';

const sources = [
  { name: 'app/controllers/examples/search.ts', code: controller },
  { name: 'app/components/product-search.gts', code: component },
  { name: 'app/examples/products.ts', code: products },
];

const Example: TOC<{ Args: { controller: SearchController } }> = <template>
  <ExampleLayout
    @title="Search & paginate"
    @guide="guides.defining-query-params"
    @guideTitle="Defining query params"
    @sources={{sources}}
  >
    <:intro>
      <p>
        Type a search: the address changes with each keystroke but the history
        doesn't grow (<code>replace: true</code>). Change the sort, a tag or the
        page: each one pushes. Each change with
        <code>refresh: true</code>
        sets
        <code>shouldRefresh</code>, and the controller fetches. Reload the page,
        or copy the address into another tab: the same results.
      </p>
      <p>
        Try a hand-edited address:
        <a
          href="/examples/search?page=x&sort=nope&tags=valves"
        >?page=x&amp;sort=nope&amp;tags=valves</a>.
      </p>
    </:intro>
    <:default>
      <ProductSearch @controller={{@controller}} />
    </:default>
  </ExampleLayout>
</template>;

export default Example;
