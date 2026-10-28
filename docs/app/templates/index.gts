import { LinkTo } from '@ember/routing';
import { pageTitle } from 'ember-page-title';

const QUICK_START = `import Controller from '@ember/controller';
import QueryParams from 'ember-parachute';
import { integer, list } from 'ember-parachute/adapters';

const queryParams = new QueryParams({
  search: { as: 'q', defaultValue: '', refresh: true, replace: true },
  page: { defaultValue: 1, refresh: true, ...integer(1) },
  tags: { defaultValue: [] as string[], ...list() },
});

export default class PostsController extends queryParams.mixInto(Controller) {
  setup({ queryParams }) {
    this.fetch(queryParams);
  }

  queryParamsDidChange({ shouldRefresh, queryParams }) {
    if (shouldRefresh) this.fetch(queryParams);
  }

  reset(_event, isExiting) {
    if (isExiting) this.resetQueryParams();
  }
}`;

const DECORATORS = `@withParachute
export default class PostsController extends Controller {
  @queryParam({ as: 'q', refresh: true, replace: true }) search = '';
  @queryParam({ ...integer(1), refresh: true }) page = 1;
  @queryParam({ ...list() }) tags: string[] = [];

  next = () => this.page++; // a plain assignment: the address follows
}`;

<template>
  {{pageTitle "Query params for Ember, declared once"}}
  <section class="hero">
    <p class="eyebrow">ember-parachute 2</p>
    <h1>Query params for Ember, declared once.</h1>
    <p class="lead">
      Each query param's default, name in the address, serializer, and whether a
      change refreshes or replaces the history entry, in one place. Then
      <code>setup</code>,
      <code>queryParamsDidChange</code>
      and
      <code>reset</code>
      hooks on the controller, with what changed, typed. Links and deep links
      built from the same definitions.
    </p>
    <p class="hero-actions">
      <LinkTo @route="guides.getting-started" class="button button-primary">Get
        started</LinkTo>
      <LinkTo @route="examples" class="button">See it live</LinkTo>
    </p>
    <pre class="install"><code>pnpm add ember-parachute</code></pre>
  </section>

  <section class="two-up">
    <div>
      <h2>A definition set</h2>
      <pre class="code"><code>{{QUICK_START}}</code></pre>
    </div>
    <div>
      <h2>Or on the fields</h2>
      <pre class="code"><code>{{DECORATORS}}</code></pre>
      <h2>Then link to it</h2>
      <pre class="code"><code>// &lt;LinkTo @route="posts"
          @query=&#123;&#123;forLink&#125;&#125;&gt; const forLink =
          queryParams.forLink({ search: 'ember', page: 2 }); // a link in an
          email, a push notification router.urlFor('posts', { queryParams:
          queryParams.serialize(values) }); // and read one back, without the
          route queryParams.deserialize(router.recognize(url).queryParams);</code></pre>
    </div>
  </section>

  <ul class="cards">
    <li class="card">
      <h2>Native, for Ember 8</h2>
      <p>No mixins, no
        <code>reopen</code>, no
        <code>@ember/object/events</code>: Ember 7.4 deprecates them. The tests
        run with every Ember deprecation turned on.</p>
    </li>
    <li class="card">
      <h2>Typed</h2>
      <p>Values inferred from each
        <code>defaultValue</code>, through
        <code>mixInto</code>, the events,
        <code>serialize</code>
        and
        <code>deserialize</code>.</p>
    </li>
    <li class="card">
      <h2>Deep links that survive a cold start</h2>
      <p>Links to split routes that haven't loaded, addresses read without a
        route, hand-edited values falling back instead of breaking.</p>
    </li>
    <li class="card">
      <h2>Pinned to Ember</h2>
      <p>What Ember's router has to keep doing is a test of its own, run from
        Ember 5.8 to its alpha.
        <LinkTo @route="guides.how-it-works">How it works</LinkTo>.</p>
    </li>
  </ul>
</template>
