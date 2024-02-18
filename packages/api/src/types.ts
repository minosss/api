export type IsNull<T> = [T] extends [null] ? true : false;
export type IsUnknown<T> = unknown extends T
  ? IsNull<T> extends false
    ? true
    : false
  : false;
export type Fallback<T, F> = IsUnknown<T> extends true ? F : T;

export type AnyFn = (...args: any[]) => any;
//
export type ZodParser<I, O> = {
  _input: I;
  _output: O;
};
export type ParserFn<I = unknown, O = I> = (v: I) => O;
export type Parser<I = unknown, O = I> = ZodParser<I, O> | ParserFn<I, O>;
export type AnyParser = Parser<any, any>;
export type IsParser<T> = T extends AnyParser ? true : false;
export type InferParser<T> = T extends Parser<infer I, infer O> ? { input: I; output: O } : never;

//
export type ErrorMessage<T extends string> = T;

export function getParser(value: any): ParserFn<any, any> {
  if (value == null) return (v: unknown) => v;

  if (typeof value === 'function') return value.bind(value);

  if (typeof value.parse === 'function') return value.parse.bind(value);

  throw new Error(`Invalid parser: ${value}`);
}

export type ObjectType = Record<string, any>;

export function isPlainObject(value: any): value is ObjectType {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
