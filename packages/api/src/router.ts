import type { AnyParser, Parser, InferParser, Fallback } from './types';

const anyParser = (d: unknown) => d;

export interface RouteDef<I, O, M extends string, P extends string, S extends AnyParser, T extends AnyParser> {
  readonly _input: I;
  readonly _output: O;

  method: M;
  path: P;
  schema: S;
  transform: T;
}

export type AnyRouteDef = RouteDef<unknown, unknown, string, string, AnyParser, AnyParser>;

export interface Route<Def extends AnyRouteDef> {
  _def: Def;

  validator<S extends Parser<Fallback<Def['_input'], any>, any>>(schema: S): Route<{
    method: Def['method'];
    path: Def['path'];
    transform: Def['transform'];
    _input: InferParser<S>['input'];
    _output: Def['_output'];
    schema: S;
  }>;
  selector<T extends Parser<Fallback<Def['_output'], any>, any>>(transform: T): Route<{
    method: Def['method'];
    path: Def['path'];
    schema: Def['schema'];
    _input: Def['_input'];
    _output: InferParser<T>['output'];
    transform: T;
  }>;

  T<O = Def['_output']>(): Route<{
    method: Def['method'];
    path: Def['path'];
    schema: Def['schema'];
    transform: Def['transform'];
    _input: Def['_input'];
    _output: O;
  }>;
  T<I = Def['_input'], O = Def['_output']>(): Route<{
    method: Def['method'];
    path: Def['path'];
    schema: Def['schema'];
    transform: Def['transform'];
    _input: I;
    _output: O;
  }>;
}

export type AnyRoute = Route<AnyRouteDef>;

export type Router<M extends ReadonlyArray<string>> = {
  [K in M[number]]: <P extends string = string>(path: P) => Route<{
    method: K;
    path: P;
    schema: AnyParser;
    transform: AnyParser;
    _input: unknown;
    _output: unknown;
  }>;
};

function createRouteChain(def: any) {
  return {
    _def: def,
    validator: (schema: AnyParser) => createRouteChain({
      ...def,
      schema,
    }),
    selector: (transform: AnyParser) => createRouteChain({
      ...def,
      transform,
    }),
    T: () => createRouteChain({ ...def }),
  };
}

export const allowMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as const;

export function createRouter() {
  const router: any = {};
  for (const method of allowMethods) {
    router[method] = (path: string) => createRouteChain({
      method,
      path,
      schema: anyParser,
      transform: anyParser,
    });
  }
  return router as Router<typeof allowMethods>;
}

export function isRoute(r: unknown): r is AnyRoute {
  return r != null && typeof r === 'object' && '_def' in r;
}

export function getRouteDef(r: AnyRoute) {
  return r._def;
}
