import type { Env, Middleware } from './types.js';

export type ApiContext<E extends Env> = {} & E['Context'];

export interface ApiOptions<
  E extends Env,
  C extends ApiContext<E> = ApiContext<E>,
> {
  onError?: (c: C) => Promise<any>;
  middlewares?: Middleware<any, any>[];
  mergeConfig?: (target: object, source: object) => object;
}

export class ApiBase<
  E extends Env = {},
  C extends ApiContext<E> = ApiContext<E>,
> {
  protected middlewares: Middleware<any, any>[];
  protected onError?: (c: C) => Promise<any>;
  protected mergeConfig: (target: object, source: object) => object;

  constructor(opts: ApiOptions<E, C>) {
    this.middlewares = opts?.middlewares ?? [];
    this.onError = opts.onError;
    this.mergeConfig = opts.mergeConfig ?? Object.assign;
  }

  protected createOverrideHandler<T>(
    handlerConfig: T,
    createHandler: (config: T) => (...args: any[]) => Promise<any>,
    overrides = {},
  ) {
    const handler = createHandler(handlerConfig);
    for (const key in overrides) {
      handler[key] = (value: unknown) =>
        // should create a new override handler with the new value
        this.createOverrideHandler(
          {
            ...handlerConfig,
            ...(overrides[key] ? { [overrides[key]]: value } : {}),
          },
          createHandler,
          overrides,
        );
    }
    return handler;
  }
}
