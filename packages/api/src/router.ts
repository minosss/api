import type { DefaultValue, Overrite } from './types';
import type { AnyParser, InferParser, Parser } from './parser';
import { anyParser } from './parser';

// private symbol, it is used to check if the value is a route. It is not exported to the user.
const IsRoute = Symbol('isRoute');

export interface RouteDef<I, O, M, P, S, T> {
  /** what type you should submit to serve */
  _input: I;

  /** what type returns from serve */
  _output: O;

  /** HTTP method */
  method: M;

  /** path of the route */
  path: P;

  /** input parser */
  schema?: S;

  /** output parser */
  transform?: T;
}

// any route
export type AnyRouteDef = RouteDef<any, any, any, any, any, any>;
export type AnyRoute = RouteBuilder<AnyRouteDef>;

/**
 * Route builder
 *
 * @example
 * ```ts
 * const route = createRouter()
 *  .post('/users')
 *  .T<{page: number}, {list: UserType[]}>();
 * ```
 */
export class RouteBuilder<Def extends AnyRouteDef> {
  [IsRoute] = true;
  // private
  #def: Def;

  constructor(def: Def) {
    this.#def = def;
  }

  get def() {
    return this.#def;
  }

  /**
   * define the input and output type of the route
   *
   * @example
   * ```ts
   * const route = createRouter()
   *   .post('/users')
   *   .T<{list: UserType[]}>();
   * // route should be (input: unknown) => Promise<{list: UserType[]}>
   * ```
   *
   * ```ts
   * const route = createRouter()
   *  .post('/users')
   *  .T<{page: number}, {list: UserType[]}>();
   * // route should be (input: {page: number}) => Promise<{list: UserType[]}>
   * ```
   *
   */
  T<O = Def['_output']>(): RouteBuilder<Overrite<Def, { _input: Def['_input']; _output: O }>>;
  T<I = Def['_input'], O = Def['_output']>(): RouteBuilder<
    Overrite<Def, { _input: I; _output: O }>
  >;
  T() {
    return new RouteBuilder({
      ...this.#def,
    });
  }

  /**
   * input transformer, run before request. you can use this to validate input (like zod schema) or custom parser
   *
   * @example
   *
   * Use Zod schema
   * ```ts
   * const route = createRouter()
   *  .post('/users')
   *  .validator(z.object({
   *    name: z.string(),
   *    age: z.number(),
   *  }));
   * // route should be (input: {name: string; age: number}) => Promise<unknown>
   * ```
   *
   * Or use custom parser
   * ```ts
   * const route = createRouter()
   *   .post('/users')
   *   .validator((input: string) => ({ name: input }));
   * // route should be (input: string) => Promise<unknown>
   * ```
   *
   */
  validator<
    S extends AnyParser = Parser<
      DefaultValue<Def['_input'], unknown>,
      InferParser<Def['schema']>['_output']
    >,
  >(
    schemaOrTransform: S,
  ): RouteBuilder<Overrite<Def, { schema: S; _input: InferParser<S>['_input'] }>> {
    return new RouteBuilder({
      ...this.#def,
      schema: schemaOrTransform,
    } as any);
  }

  /**
   * output (response) transformer, run after request. you can use this to format output.
   *
   * @example
   *
   * Take the first item of the array
   * ```ts
   * const route = createRouter()
   *  .get('/users')
   *  .validator(z.string())
   *  .selector((users: UserType[]) => users[0]);
   * // route should be (input: string) => Promise<UserType>
   * ```
   */
  selector<T extends AnyParser = Parser<DefaultValue<Def['_output'], unknown>>>(
    transform: T,
  ): RouteBuilder<Overrite<Def, { transform: T; _output: InferParser<T>['_output'] }>> {
    return new RouteBuilder({
      ...this.#def,
      transform,
    } as any);
  }
}

export type ParamValue = string | number;

// split string by delimiter
type SplitString<T extends string, D extends string = '.'> = string extends T
  ? string[]
  : T extends `${infer T1}${D}${infer T2}`
    ? [T1, ...SplitString<T2, D>]
    : [T];

// extract params from path
type ParamsFilter<T extends unknown[]> = T extends [infer T1, ...infer R]
  ? T1 extends `:${infer P}`
    ? [P, ...ParamsFilter<R>]
    : ParamsFilter<R>
  : [];

type ExtractParams<T extends string> = ParamsFilter<SplitString<T, '/'>>;

/** extract params type base on path */
export type PathParams<T extends string> = T extends `${string}:${string}`
  ?
      | {
          [K in ExtractParams<T>[number]]: ParamValue;
        }
      // Supports without key if only one parameter
      | (ExtractParams<T>['length'] extends 1 ? ParamValue : never)
  : unknown;

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Router builder
 */
export class RouterBuilder {
  private createRoute<M extends Method, T extends string>(
    method: M,
    path: T,
  ): RouteBuilder<{
    method: M;
    path: T;
    schema: Parser<PathParams<T>>;
    transform: AnyParser;
    _input: PathParams<T>;
    _output: unknown;
  }> {
    return new RouteBuilder({
      method,
      path,
      schema: anyParser,
    } as any);
  }

  /**
   * define a route with method `GET`
   */
  get<T extends string>(path: T) {
    return this.createRoute('GET', path);
  }

  /**
   * define a route with method `post`
   *
   * @example
   * ```ts
   * const createUserSchema = z.object({
   *   name: z.string(),
   *   age: z.number(),
   * }});
   * const route = createRouter()
   *   .post('/users')
   *   .validator(createUserSchema)
   *   .T<UserType>();
   * ```
   */
  post<T extends string>(path: T) {
    return this.createRoute('POST', path);
  }

  /**
   * define a route with method `put`
   */
  put<T extends string>(path: T) {
    return this.createRoute('PUT', path);
  }

  /**
   * define a route with method `delete`
   */
  delete<T extends string>(path: T) {
    return this.createRoute('DELETE', path);
  }
}

export const createRouter: () => RouterBuilder = () => new RouterBuilder();

export const isRoute = (value: any): value is AnyRoute => value && value[IsRoute] === true;

/**
 * Create a resource with base path
 *
 * @example
 * ```ts
 * const userResource = createResource('/users');
 * // user routes
 * const user = {
 *   list: userResource.get(), // GET /users
 *   create: userResource.post(), // POST /users
 *   update: userResource.put('/:id'), // PUT /users/:id
 *   delete: userResource.delete('/:id'), // DELETE /users/:id
 *   disabeld: userResource.post('/:id/disable'), // POST /users/:id/disable
 * };
 *
 * const api = createApi({
 *   routes: {
 *     // add user routes
 *     user
 *   }
 * })
 * ```
 *
 * @param path base path
 * @returns
 */
export const createResource = <T extends string>(path: T) => {
  return {
    get: <I extends string = ''>(pk: I = '' as I) => new RouterBuilder().get(`${path}${pk}`),
    post: <I extends string = ''>(action: I = '' as I) =>
      new RouterBuilder().post(`${path}${action}`),
    put: <I extends string = '/:id'>(pk: I = '/:id' as I) =>
      new RouterBuilder().put(`${path}${pk}`),
    delete: <I extends string = '/:id'>(pk: I = '/:id' as I) =>
      new RouterBuilder().delete(`${path}${pk}`),
  };
};
