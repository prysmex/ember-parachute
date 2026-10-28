// When building your addon for older Ember versions you need to have the required files
const compatFiles = {
  'ember-cli-build.cjs': `const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const { compatBuild } = require('@embroider/compat');
module.exports = async function (defaults) {
  const { buildOnce } = await import('@embroider/vite');
  let app = new EmberApp(defaults);
  return compatBuild(app, buildOnce);
};`,
  'config/optional-features.json': JSON.stringify({
    'application-template-wrapper': false,
    'default-async-observers': true,
    'jquery-integration': false,
    'template-only-glimmer-components': true,
    'no-implicit-route-model': true,
  }),
};

const compatDeps = {
  '@embroider/compat': '^4.0.3',
  'ember-cli': '^5.12.0',
  'ember-auto-import': '^2.10.0',
  '@ember/optional-features': '^2.2.0',
};

export default {
  scenarios: [
    ...['5.8', '5.12'].map((version) => ({
      name: `ember-lts-${version}`,
      npm: {
        devDependencies: {
          'ember-source': `~${version}.0`,
          ...compatDeps,
        },
      },
      env: {
        ENABLE_COMPAT_BUILD: true,
      },
      files: compatFiles,
    })),
    ...['6.4', '6.8', '6.12'].map((version) => ({
      name: `ember-lts-${version}`,
      npm: {
        devDependencies: {
          'ember-source': `npm:ember-source@~${version}.0`,
        },
      },
    })),
    // the version Prysmex runs
    {
      name: 'ember-7.3',
      npm: {
        devDependencies: {
          'ember-source': 'npm:ember-source@~7.3.0',
        },
      },
    },
    ...['latest', 'beta', 'alpha'].map((tag) => ({
      name: `ember-${tag}`,
      npm: {
        devDependencies: {
          'ember-source': `npm:ember-source@${tag}`,
        },
      },
    })),
  ],
};
