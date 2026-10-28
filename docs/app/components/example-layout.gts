import { LinkTo } from '@ember/routing';
import { pageTitle } from 'ember-page-title';

import AddressBar from 'docs/components/address-bar';
import EventLog from 'docs/components/event-log';
import SourceCode from 'docs/components/source-code';

import type { TOC } from '@ember/component/template-only';

const isFirst = (index: number) => index === 0;

export interface Source {
  name: string;
  code: string;
}

// An example's page: what it is, the example, the address and the hooks
// beside it, then its source
const ExampleLayout: TOC<{
  Args: {
    title: string;
    guide?: string;
    guideTitle?: string;
    sources: Source[];
  };
  Blocks: { intro: []; default: [] };
}> = <template>
  {{pageTitle @title}}
  <div class="example">
    <header class="example-head">
      <p class="eyebrow"><LinkTo @route="examples.index">Examples</LinkTo></p>
      <h1>{{@title}}</h1>
      <div class="example-intro">{{yield to="intro"}}</div>
      {{#if @guide}}
        <p class="small">Guide:
          <LinkTo @route={{@guide}}>{{@guideTitle}}</LinkTo></p>
      {{/if}}
    </header>
    <AddressBar />
    <div class="example-grid">
      <section class="panel example-demo" aria-label="The example">
        {{yield}}
      </section>
      <aside class="panel example-log">
        <EventLog />
      </aside>
    </div>
    <section class="example-sources" aria-label="Source">
      <h2>Source</h2>
      {{#each @sources as |source index|}}
        <SourceCode
          @name={{source.name}}
          @code={{source.code}}
          @open={{isFirst index}}
        />
      {{/each}}
    </section>
  </div>
</template>;

export default ExampleLayout;
