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

export type AnyAsyncFn = (...args: any[]) => Promise<any>;

export type Env = {
  Context?: object;
}

export type ExtractConfig<E extends Env> = E['Context'] extends { config: infer R } ? R & {} : object;

export type Middleware<C extends object, _NextCtx extends object> = (
  c: C,
  next: <NC extends object>(nextCtx?: NC) => Promise<any>,
) => Promise<any>;
