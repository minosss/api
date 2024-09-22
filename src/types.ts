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

export interface GenericRequestConfig {
  method: string;
  url: string;
  params?: any;
  data?: any;
}

export type HttpRequest = <C extends GenericRequestConfig>(
  config: C,
) => Promise<any>;

export type HttpConfig<H extends AnyHttpRequest> = Parameters<H>[0];

export type AnyHttpRequest = (...args: any[]) => Promise<any>;

export interface RequestDef<I, O, M, U, S, T, H extends AnyHttpRequest> {
  input: I;
  output: O;
  method: M;
  url: U;
  schema?: S;
  transform?: T;
  http: H;
}

export type AnyRequestDef = RequestDef<any, any, any, any, any, any, any>;

export type RequestConfig<H extends AnyHttpRequest> = Omit<
  HttpConfig<H>,
  keyof GenericRequestConfig
>;

export interface Request<Def extends AnyRequestDef> {
  _def: Def;

  (input: Def['input']): Promise<Def['output']>;
  (
    input: Def['input'],
    requestConfig: RequestConfig<Def['http']>,
  ): Promise<Def['output']>;

  validator<OS extends Transform = Transform<Def['input'], unknown>>(
    schema: OS,
  ): Request<
    RequestDef<
      InferInput<OS>,
      Def['output'],
      Def['method'],
      Def['url'],
      OS,
      Def['transform'],
      Def['http']
    >
  >;

  selector<OT extends Transform = Transform<Def['output'], unknown>>(
    transform: OT,
  ): Request<
    RequestDef<
      Def['input'],
      InferOutput<OT>,
      Def['method'],
      Def['url'],
      Def['schema'],
      OT,
      Def['http']
    >
  >;

  T<O = Def['output']>(): Request<
    RequestDef<
      Def['input'],
      O,
      Def['method'],
      Def['url'],
      Def['schema'],
      Def['transform'],
      Def['http']
    >
  >;
  T<I = Def['input'], O = Def['output']>(): Request<
    RequestDef<
      I,
      O,
      Def['method'],
      Def['url'],
      Def['schema'],
      Def['transform'],
      Def['http']
    >
  >;
}

export interface MiddlewareContext<H extends AnyHttpRequest = AnyHttpRequest> {
  http: H;
  config: HttpConfig<H>;
  parsedInput: unknown;
  output?: unknown;
}

export type MiddlewareFn<H extends AnyHttpRequest = AnyHttpRequest> = (
  ctx: MiddlewareContext<H>,
  next: () => Promise<void>,
) => Promise<void>;
