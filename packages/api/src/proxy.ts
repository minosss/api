/* eslint-disable n/no-callback-literal */
// From Hono
interface CallbackOptions {
  path: string[];
  args: any[];
}
export type Callback = (opts: CallbackOptions) => unknown;

export const createProxy = (callback: Callback, path: string[]) => {
  const proxy: unknown = new Proxy(() => {}, {
    get(_obj, key) {
      if (typeof key !== 'string') return undefined;
      return createProxy(callback, [...path, key]);
    },
    apply(_1, _2, args) {
      return callback({
        path,
        args,
      });
    },
  });
  return proxy;
};
