import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { LinkTo } from '@ember/routing';

import ExampleLayout from 'docs/components/example-layout';
import { PROJECTS, TABS, VIEWS } from 'docs/examples/projects';
import { eq } from 'docs/utils/json';

import controller from '../../controllers/examples/lifecycle.ts?raw';
import route from '../../routes/examples/lifecycle.ts?raw';

import type LifecycleController from 'docs/controllers/examples/lifecycle';
import type { Project } from 'docs/examples/projects';
import type { TOC } from '@ember/component/template-only';

const sources = [
  { name: 'app/controllers/examples/lifecycle.ts', code: controller },
  { name: 'app/routes/examples/lifecycle.ts', code: route },
];

const Lifecycle: TOC<{
  Args: { controller: LifecycleController; model: Project };
}> = <template>
  <ExampleLayout
    @title="Lifecycle & sticky values"
    @guide="guides.sticky-values"
    @guideTitle="Sticky values"
    @sources={{sources}}
  >
    <:intro>
      <p>
        Pick a tab and a view, then switch projects: the
        <strong>tab</strong>
        is kept per project (Ember's default, model-scoped) and the
        <strong>view</strong>
        is one for all (<code>scope: 'controller'</code>). Switching projects is
        the same route with a new model:
        <code>reset</code>
        with
        <code>isExiting: false</code>, then
        <code>setup</code>. Leave, then come back with a link: Ember puts the
        values back. Tick
        <em>reset on exit</em>
        to have the controller forget them.
      </p>
    </:intro>
    <:default>
      <nav class="tabs" aria-label="Projects">
        {{#each PROJECTS as |project|}}
          <LinkTo
            @route="examples.lifecycle"
            @model={{project.id}}
            class="tab"
            data-test-project={{project.id}}
          >{{project.name}}</LinkTo>
        {{/each}}
      </nav>

      <article class="project">
        <h2>{{@model.name}}</h2>
        <p class="muted">{{@model.summary}}</p>

        <div class="field">
          <span>Tab <code class="muted">?tab=</code> (per project)</span>
          <div class="segmented">
            {{#each TABS as |tab|}}
              <button
                type="button"
                class={{if (eq tab @controller.tab) "is-current"}}
                data-test-tab={{tab}}
                {{on "click" (fn @controller.setTab tab)}}
              >{{tab}}</button>
            {{/each}}
          </div>
        </div>

        <div class="field">
          <span>View
            <code class="muted">?view=</code>
            (scope: 'controller')</span>
          <div class="segmented">
            {{#each VIEWS as |option|}}
              <button
                type="button"
                class={{if (eq option @controller.view) "is-current"}}
                data-test-view={{option}}
                {{on "click" (fn @controller.setView option)}}
              >{{option}}</button>
            {{/each}}
          </div>
        </div>

        <p class="project-body">Showing
          <strong>{{@controller.tab}}</strong>
          as
          <strong>{{@controller.view}}</strong>.</p>
      </article>

      <div class="row">
        <label class="chip">
          <input
            type="checkbox"
            checked={{@controller.resetOnExit}}
            data-test-reset-on-exit
            {{on "change" @controller.toggleResetOnExit}}
          />
          reset on exit (<code>resetQueryParams()</code>
          when isExiting)
        </label>
      </div>
      <div class="row">
        <LinkTo
          @route="examples.index"
          class="button"
          data-test-leave
        >Leave</LinkTo>
        <span class="muted small">then come back with the Lifecycle link on the
          examples page (a link by name, so Ember puts sticky values back;
          typing the address doesn't).</span>
      </div>
    </:default>
  </ExampleLayout>
</template>;

export default Lifecycle;
