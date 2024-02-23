import { anyParser } from '../parser';
import { createRouter } from '../router';

describe('createRouter', () => {
  test('should return a router object', () => {
    const router = createRouter();
    expect(router).toBeInstanceOf(Object);
  });

  test('should create a route with initial def when calling get', () => {
    const router = createRouter();
    const route = router.get('/users');
    expect(route).toBeInstanceOf(Object);
    expect(route.def.method).toBe('get');
    expect(route.def.path).toBe('/users');
    expect(route.def.schema).toBe(anyParser);
    expect(route.def.transform).toBeUndefined();
    expect(route.def._input).toBeUndefined();
    expect(route.def._output).toBeUndefined();
  });

  test('custom validator should be set to the route', () => {
    const router = createRouter();
    const validator = () => {};
    const route = router.get('/users').validator(validator);
    expect(route.def.schema).toBe(validator);
  });

  test('custom selector should be set to the route', () => {
    const router = createRouter();
    const selector = () => {};
    const route = router.get('/users').selector(selector);
    expect(route.def.transform).toBe(selector);
  });

  test('create a route with get, post, put, delete methods', () => {
    const router = createRouter();
    const routeGet = router.get('/users');
    const routePost = router.post('/users');
    const routePut = router.put('/users');
    const routeDelete = router.delete('/users');
    expect(routeGet.def.method).toBe('get');
    expect(routePost.def.method).toBe('post');
    expect(routePut.def.method).toBe('put');
    expect(routeDelete.def.method).toBe('delete');
  });

  test('T should not to change the route', () => {
    const router = createRouter();
    const route = router.get('/users').T();
    expect(route.def.method).toBe('get');
    expect(route.def.path).toBe('/users');
    expect(route.def.schema).toBe(anyParser);
    expect(route.def.transform).toBeUndefined();
    expect(route.def._input).toBeUndefined();
    expect(route.def._output).toBeUndefined();
  });
});
