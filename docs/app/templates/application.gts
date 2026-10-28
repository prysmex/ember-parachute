import { LinkTo } from '@ember/routing';
import { pageTitle } from 'ember-page-title';

<template>
  {{pageTitle "ember-parachute"}}
  <header class="site-header">
    <LinkTo @route="index" class="brand">
      <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
        <path
          d="M3 15a13 13 0 0 1 26 0c-2.2-1.6-4.4-1.6-6.5 0-2.2-1.6-4.3-1.6-6.5 0-2.2-1.6-4.3-1.6-6.5 0-2.1-1.6-4.3-1.6-6.5 0Z"
        />
        <path d="M4 15.5 16 27l12-11.5M10 15.5 16 27l6-11.5" fill="none" />
        <rect x="13.5" y="26" width="5" height="4" rx="1" />
      </svg>
      ember-parachute
    </LinkTo>
    <nav aria-label="Site">
      <LinkTo @route="guides.getting-started">Guides</LinkTo>
      <LinkTo @route="examples">Examples</LinkTo>
      <a
        href="https://github.com/prysmex/ember-parachute"
        target="_blank"
        rel="noopener noreferrer"
      >GitHub</a>
      <a
        href="https://www.npmjs.com/package/ember-parachute"
        target="_blank"
        rel="noopener noreferrer"
      >npm</a>
    </nav>
  </header>
  <main class="site-main">
    {{outlet}}
  </main>
  <footer class="site-footer">
    MIT · by Offir Golan &amp; Lauren Tan, v2 by Alberto Cantú Gómez
  </footer>
</template>
