import type { z } from 'zod';

export type TransformFn<I = any, O = I> = (v: I) => O | Promise<O>;

export type IfInstalled<T> = any extends T ? never : T;

export type Transform<I = any, O = I> =
  | IfInstalled<z.ZodType>
  | TransformFn<I, O>;

export type InferInput<S extends Transform> = S extends IfInstalled<z.ZodType>
  ? z.input<S>
  : S extends TransformFn<infer I, any>
    ? I
    : never;

export type InferOutput<S extends Transform> = S extends IfInstalled<z.ZodType>
  ? z.output<S>
  : S extends TransformFn<any, infer O>
    ? O
    : never;

export interface Context {
  config: ActionConfig;
  dispatch: () => Promise<any>;
  error?: Error;
  data: any;
  finalized: boolean;
}

export interface ActionConfig {
  data?: unknown;
  method: string;
  url: string;
}

export type Action<C extends Context, I = unknown, O = unknown> = (
  config: C['config'] & { data: I },
  c: C,
) => Promise<O>;

export type MiddlewareFn<C extends Context = Context> = (
  ctx: C,
  next: () => Promise<any>,
) => Promise<any>;

export type AnyPromiseFn = (...args: any[]) => Promise<any>;
