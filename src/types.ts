import type { z } from 'zod';

// next-safe-action

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

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

// type-fest

export type IsNull<T> = [T] extends [null] ? true : false;
export type IsUnknown<T> = unknown extends T // `T` can be `unknown` or `any`
  ? IsNull<T> extends false // `any` can be `null`, but `unknown` can't be
    ? true
    : false
  : false;
export type IfUnknown<
  T,
  TypeIfUnknown = true,
  TypeIfNotUnknown = false,
> = IsUnknown<T> extends true ? TypeIfUnknown : TypeIfNotUnknown;

//
export type AnyObject = Record<string, any>;
export type AnyAsyncFn<R = any> = (...args: any[]) => Promise<R>;

export type ApiRequest = {
  input: unknown;
  parsedInput: unknown;
};

export type ApiResponse = {
  output: unknown;
  ok: boolean;
};

export type HttpRequest = {
  method: string;
  url: string;
};

export type HttpApiRequest = ApiRequest & HttpRequest;

export type HttpApiConfig<T extends HttpApiRequest> = Omit<
  T,
  keyof HttpApiRequest
>;

export type ApiContext = {};

export type Options = {
  ctx: Record<string, unknown>;
  req: ApiRequest;
};

/**
 * convert 'users/:id' to { id: string }
 */
export type ExtractRouteParams<U extends string> =
  U extends `${string}:${infer P}/${infer R}`
    ? { [K in P | keyof ExtractRouteParams<R>]: string | number }
    : U extends `${string}:${infer P}`
      ? { [K in P]: string | number }
      : // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
        void;
