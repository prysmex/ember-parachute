import EmberApp from 'ember-strict-application-resolver';
import EmberRouter from '@ember/routing/router';
import * as QUnit from 'qunit';
import { registerDeprecationHandler, registerWarnHandler } from '@ember/debug';
import { setApplication } from '@ember/test-helpers';
import { setup } from 'qunit-dom';
import { start as qunitStart, setupEmberOnerrorValidation } from 'ember-qunit';
import { setTesting } from '@embroider/macros';

import { installParachute } from '#src/index.ts';
import {
  ROUTER_CONTRACT,
  resetRouterContract,
} from '#src/-private/contract.ts';

import { routerWarnings } from './helpers/index.ts';

class Router extends EmberRouter {
  location = 'none';
  rootURL = '/';
}

class TestApp extends EmberApp {
  modules = {
    './router': Router,
  };
}

Router.map(function () {});

// The tests of what ember-parachute 1.x did (a Mixin, Ember's events), and
// ember-qunit's own check of Ember.onerror: the only ones allowed to hit a
// deprecation
const DEPRECATED = /\(Mixin\)|\[deprecated\]|^ember-qunit/;

let deprecations: string[] = [];

registerDeprecationHandler((message, options) => {
  deprecations.push(`${options?.id}: ${message}`);
});

// Ember's router no longer doing what ember-parachute needs: a failure in
// every test, unless the test expects it (and empties routerWarnings)
registerWarnHandler((message, options, next) => {
  if (options?.id === ROUTER_CONTRACT) {
    routerWarnings.push(message);
  } else {
    next(message, options);
  }
});

QUnit.hooks.beforeEach(() => {
  deprecations = [];
  routerWarnings.length = 0;
  resetRouterContract();
});

QUnit.hooks.afterEach(function (assert) {
  const { testName, module } = QUnit.config.current as {
    testName: string;
    module: { name: string };
  };

  if (!DEPRECATED.test(`${module.name}: ${testName}`)) {
    assert.deepEqual(deprecations, [], 'no deprecations, all of them enabled');
  }

  // (only when failing: ember-qunit's own tests count their assertions)
  if (routerWarnings.length > 0) {
    assert.deepEqual(
      routerWarnings,
      [],
      "Ember's router does what parachute needs",
    );
  }
});

export function start() {
  setTesting(true);
  // as an app does, before any route is made
  installParachute();
  setApplication(
    TestApp.create({
      autoboot: false,
      rootElement: '#ember-testing',
    }),
  );
  setup(QUnit.assert);
  setupEmberOnerrorValidation();
  // testem prints objects as [object Object]: a failed deepEqual's sides as
  // JSON, in the browser log
  QUnit.log((details) => {
    if (!details.result && typeof details.actual === 'object') {
      console.log(
        JSON.stringify({ actual: details.actual, expected: details.expected }),
      );
    }
  });
  qunitStart();
}
