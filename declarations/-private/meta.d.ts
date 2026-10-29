import QueryParam from './query-param.ts';
import type { QueryParamOption } from './query-param.ts';
export declare const HAS_PARACHUTE = "__has_parachute__";
export declare const PARACHUTE_META = "__parachute_meta__";
/**
 * A definition set, in the shapes each side needs: the controller's
 * `queryParams` map, the route's, and the default values.
 */
export default class ParachuteMeta {
    queryParams: Record<string, QueryParam<any>>;
    queryParamsArray: QueryParam<any>[];
    qpMapForController: Record<string, {
        as: string;
        scope: QueryParam['scope'];
    }>;
    qpMapForRoute: Record<string, {
        replace: boolean;
    }>;
    defaultValues: Record<string, unknown>;
    constructor(queryParams?: Record<string, QueryParamOption>);
}
//# sourceMappingURL=meta.d.ts.map