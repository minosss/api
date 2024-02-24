export type ZodParser<I, O> = {
  _input: I;
  _output: O;
};

export type ParserFn<I = unknown, O = I> = (v: I) => O;

export type Parser<I = unknown, O = I> = ZodParser<I, O> | ParserFn<I, O>;

export type AnyParser = Parser<any, any>;

export type InferParser<T> =
  T extends Parser<infer I, infer O> ? { _input: I; _output: O } : never;

export const anyParser = (d: any) => d;

export function getParser(value: any): ParserFn<any, any> {
  if (value == null) return anyParser;

  if (typeof value === 'function') return value.bind(value);

  if (typeof value.parse === 'function') return value.parse.bind(value);

  throw new Error(`Invalid parser: ${value}`);
}
