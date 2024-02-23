import { vi } from 'vitest';
import { createProxy } from '../proxy';

describe('createProxy', () => {
  test('should return a proxy object', () => {
    const proxy = createProxy(() => {}, []);
    expect(proxy).toBeInstanceOf(Object);
  });

  test('should create a nested proxy when accessing properties', () => {
    const callback = vi.fn();
    const proxy: any = createProxy(callback, []);
    const nestedProxy = proxy.foo.bar.baz;
    expect(callback).not.toHaveBeenCalled();
    expect(nestedProxy).toBeInstanceOf(Object);
  });

  test('should call the callback function when applying the proxy', () => {
    const callback = vi.fn();
    const proxy: any = createProxy(callback, []);
    proxy();
    expect(callback).toHaveBeenCalledWith({
      path: [],
      args: [],
    });
  });

  test('should call the callback function with the correct path and args', () => {
    const callback = vi.fn();
    const proxy: any = createProxy(callback, []);
    proxy.foo.bar.baz(1, 2, 3);
    expect(callback).toHaveBeenCalledWith({
      path: ['foo', 'bar', 'baz'],
      args: [1, 2, 3],
    });
  });
});
