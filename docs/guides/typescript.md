---
order: 10
---

# TypeScript

ember-parachute is written in TypeScript and ships its declarations. It needs TypeScript 5.4 or later (it uses `NoInfer`).

## Values are inferred from `defaultValue`

```ts
const queryParams = new QueryParams({
  page: { defaultValue: 1, ...integer(1) },
  tags: { defaultValue: [] as string[], ...list() },
  sort: {
    defaultValue: 'name' as 'name' | 'date',
    ...oneOf(['name', 'date'], 'name'),
  },
});
```

`page` is a `number`, `tags` a `string[]`, `sort` `'name' | 'date'`. Only `defaultValue` says it: `serialize` and `deserialize` are `NoInfer`, so an adapter's fallback can't widen a type. When the default doesn't say it all, say it (`[] as string[]`, `null as number | null`).

## `mixInto`

```ts
class PostsController extends queryParams.mixInto(Controller) {
  check() {
    this.page; // number
    this.allQueryParams.tags; // string[]
    this.queryParamsState.page.changed; // boolean
    this.resetQueryParams(['page']); // keys checked
    this.setDefaultQueryParamValue('page', 2); // value checked
  }
}
```

## Events: `QueryParamValues`

```ts
import { type ParachuteEvent, type QueryParamValues } from 'prysmex-ember-parachute';

type Values = QueryParamValues<typeof queryParams>;

class PostsController extends queryParams.mixInto(Controller) {
  setup({ queryParams, changed }: ParachuteEvent<Values>) {
    queryParams.sort; // 'name' | 'date'
    changed.page; // number | undefined
  }
}
```

`addParachuteListener<Values, 'reset'>(controller, 'reset', (event, isExiting) => ...)` types its listener's arguments.

## `serialize`, `forLink`, `deserialize`, `extend`

`serialize({ page: 'two' })` doesn't compile; `deserialize()` returns the values typed. `extend<{ extra: boolean }>({ extra: { defaultValue: false } })` adds to the type.

## Decorators

A decorator can't change a class's type: merge `QueryParamMixin` in, as shown in [Decorators](/guides/decorators#types).

## The 1.x Mixin

`Controller.extend(queryParams.Mixin)` puts a mixin's members on the class's statics in Ember's types, not on its instances. `mixInto` is typed: prefer it.
