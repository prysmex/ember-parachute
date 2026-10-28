import { fn } from '@ember/helper';
import { on } from '@ember/modifier';

import ExampleLayout from 'docs/components/example-layout';
import { SAMPLES } from 'docs/controllers/examples/adapters';

import controller from '../../controllers/examples/adapters.ts?raw';
import adapters from '../../../../src/adapters.ts?raw';

import type AdaptersController from 'docs/controllers/examples/adapters';
import type { TOC } from '@ember/component/template-only';

const sources = [
  { name: 'app/controllers/examples/adapters.ts', code: controller },
  { name: 'ember-parachute: src/adapters.ts', code: adapters },
];

const quoted = (value: string) => (value === '' ? '(empty)' : value);

const Adapters: TOC<{ Args: { controller: AdaptersController } }> = <template>
  <ExampleLayout
    @title="Adapters"
    @guide="guides.adapters"
    @guideTitle="Adapters"
    @sources={{sources}}
  >
    <:intro>
      <p>
        A value as an address holds it: what each adapter's
        <code>deserialize</code>
        reads (its fallback, when it can't), what
        <code>serialize</code>
        writes back, and whether
        <code>serialize</code>
        takes its own output (links run it twice).
      </p>
    </:intro>
    <:default>
      <label class="field">
        <span>The address value</span>
        <input
          value={{@controller.input}}
          data-test-input
          {{on "input" @controller.setInput}}
        />
      </label>
      <div class="chips">
        {{#each SAMPLES as |sample|}}
          <button
            type="button"
            class="chip"
            {{on "click" (fn @controller.pick sample)}}
          >{{quoted sample}}</button>
        {{/each}}
      </div>
      <table class="table" data-test-adapters>
        <thead>
          <tr><th>adapter</th><th>deserialize</th><th>serialize</th><th
            >idempotent</th></tr>
        </thead>
        <tbody>
          {{#each @controller.rows as |row|}}
            <tr>
              <td><code>{{row.name}}</code></td>
              <td><code>{{row.read}}</code></td>
              <td><code>{{row.written}}</code></td>
              <td>{{if row.idempotent "✓" "✗"}}</td>
            </tr>
          {{/each}}
        </tbody>
      </table>
    </:default>
  </ExampleLayout>
</template>;

export default Adapters;
