import ExampleLayout from 'docs/components/example-layout';
import ProductSearch from 'docs/components/product-search';

import controller from '../../controllers/examples/decorators.ts?raw';
import component from '../../components/product-search.gts?raw';
import products from '../../examples/products.ts?raw';

import type DecoratorsController from 'docs/controllers/examples/decorators';
import type { TOC } from '@ember/component/template-only';

const sources = [
  { name: 'app/controllers/examples/decorators.ts', code: controller },
  { name: 'app/components/product-search.gts', code: component },
  { name: 'app/examples/products.ts', code: products },
];

const Example: TOC<{ Args: { controller: DecoratorsController } }> = <template>
  <ExampleLayout
    @title="Decorators"
    @guide="guides.decorators"
    @guideTitle="Decorators"
    @sources={{sources}}
  >
    <:intro>
      <p>
        The search example again, with each query param declared on its field
        with
        <code>@queryParam</code>: the field's value is its default, and the
        field is tracked, so
        <code>this.page = 2</code>
        is a query param change like
        <code>set(this, 'page', 2)</code>. Same address, same hooks.
      </p>
    </:intro>
    <:default>
      <ProductSearch @controller={{@controller}} />
    </:default>
  </ExampleLayout>
</template>;

export default Example;
