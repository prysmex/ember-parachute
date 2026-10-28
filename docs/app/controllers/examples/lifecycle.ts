import { tracked } from '@glimmer/tracking';
import Controller from '@ember/controller';
import { action, set } from '@ember/object';
import { service } from '@ember/service';

import QueryParams, {
  type ParachuteEvent,
  type QueryParamValues,
} from 'prysmex-ember-parachute';
import { oneOf } from 'prysmex-ember-parachute/adapters';

import {
  TABS,
  VIEWS,
  type Project,
  type Tab,
  type View,
} from 'docs/examples/projects';

import type Owner from '@ember/owner';
import type EventLogService from 'docs/services/event-log';

export const lifecycleQueryParams = new QueryParams({
  // model-scoped (Ember's default): each project keeps its own tab
  tab: { defaultValue: 'overview' as Tab, ...oneOf(TABS, 'overview') },
  // scope: 'controller': one value, whatever the project
  view: {
    defaultValue: 'cards' as View,
    scope: 'controller',
    ...oneOf(VIEWS, 'cards'),
  },
});

type Values = QueryParamValues<typeof lifecycleQueryParams>;

export default class LifecycleController extends lifecycleQueryParams.mixInto(
  Controller,
) {
  @service declare eventLog: EventLogService;

  declare model: Project;

  /** Whether leaving the route puts the values back to their defaults. */
  @tracked resetOnExit = false;

  constructor(owner: Owner) {
    super(owner);
    this.eventLog.listenTo(this, 'examples/lifecycle');
  }

  // Called on leaving the route (isExiting) and on moving to another
  // project (not exiting: the same route, a new model)
  reset(_event: ParachuteEvent<Values>, isExiting: boolean) {
    if (isExiting && this.resetOnExit) {
      // Ember keeps ("sticky") values for when you come back: unless
      this.resetQueryParams();
    }
  }

  @action setTab(tab: Tab) {
    set(this, 'tab', tab);
  }

  @action setView(view: View) {
    set(this, 'view', view);
  }

  @action toggleResetOnExit() {
    this.resetOnExit = !this.resetOnExit;
  }
}
