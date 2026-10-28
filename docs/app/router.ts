import EmberRouter from '@embroider/router';
import { addDocfyRoutes } from '@docfy/ember';
import config from 'docs/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  addDocfyRoutes(this);

  // Live examples: query params need routes
  this.route('examples', function () {
    this.route('search');
    this.route('decorators');
    this.route('lifecycle', { path: '/lifecycle/:id' });
    this.route('deep-links');
    this.route('adapters');
  });
});
