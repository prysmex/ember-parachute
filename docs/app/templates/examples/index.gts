import { LinkTo } from '@ember/routing';
import { pageTitle } from 'ember-page-title';

<template>
  {{pageTitle "Examples"}}
  <section class="intro">
    <h1>Examples</h1>
    <p>
      Each one is a route of this site, with its query params declared once.
      Beside each: the address (and whether each change pushed a history entry
      or replaced one) and every hook its controller was called with. Below: its
      source, as it is in the repository.
    </p>
  </section>
  <ul class="cards">
    <li class="card">
      <h2><LinkTo @route="examples.search">Search &amp; paginate</LinkTo></h2>
      <p>A search, a page, a sort and tags in the address, an API call when one
        that says
        <code>refresh</code>
        changes, a reset.
        <code>mixInto</code>
        and the adapters.</p>
    </li>
    <li class="card">
      <h2><LinkTo @route="examples.decorators">Decorators</LinkTo></h2>
      <p>The same page with
        <code>@queryParam</code>
        fields: the value is the default, a plain assignment is a change.</p>
    </li>
    <li class="card">
      <h2><LinkTo @route="examples.lifecycle" @model="1">Lifecycle &amp; sticky
          values</LinkTo></h2>
      <p>Switch models, leave and come back:
        <code>setup</code>,
        <code>reset</code>
        and
        <code>isExiting</code>, values kept per model or for the controller, and
        resetting on exit.</p>
    </li>
    <li class="card">
      <h2><LinkTo @route="examples.deep-links">Deep links</LinkTo></h2>
      <p>Build links from the definitions (<code>forLink</code>,
        <code>serialize</code>), and read an address without its route (<code
        >recognize</code>
        +
        <code>deserialize</code>).</p>
    </li>
    <li class="card">
      <h2><LinkTo @route="examples.adapters">Adapters</LinkTo></h2>
      <p>Type an address value: what each adapter reads, what it writes back,
        and that it takes its own output.</p>
    </li>
  </ul>
</template>
