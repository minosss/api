// From type-fest
export type IsNull<T> = [T] extends [null] ? true : false;
export type IsUnknown<T> = unknown extends T ? (IsNull<T> extends false ? true : false) : false;
export type IfUnknown<T, TypeIfUnknown = true, TypeIfNotUnknown = false> =
  IsUnknown<T> extends true ? TypeIfUnknown : TypeIfNotUnknown;

export type DefaultValue<A, B> = IfUnknown<A, B, A>;

export type ErrorMessage<T extends string> = T;

export type Overrite<A, B> = Omit<A, keyof B> & B;

export type AnyFn = (...args: any[]) => any;
