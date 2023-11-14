Hey 👋, `@yme/api` is a package that defines the type-safe API routes. No server required and zero dependencies.

> If you are developing a full-stack web application, you should take a look [tRPC](https://trpc.io/).

[![NPM version](https://img.shields.io/npm/v/@yme/api)](https://www.npmjs.com/package/@yme/api)
[![NPM Downloads](https://img.shields.io/npm/dm/@yme/api)](https://www.npmjs.com/package/@yme/api)
[![Bundle Size](https://deno.bundlejs.com/?q=@yme/api&badge=detailed)](https://bundlejs.com/?q=@yme/api&badge=detailed)

<img src="./api.gif" width=480 />

## Why

- I am a frond-end developer.
- `[module].[action]` is good for me. (e.g. `post.create(input)`)
- I usually use axios but there may be others. (e.g. fetch)
- It may be need some transformer for each api response. because my colleagues are very unrestrained

So I create this package to solve these problems. (I hope so)

🚧 TODOs

- with react-query

## Install

```sh
pnpm add @yme/api
```

## Quick Start

```ts
const router = createRouter();
const routes = {
  users: {
    create: router.post('/users').validator(schema).selector(user => user.id),
  }
}
const api = createApi({
  http: fetch,
  routes,
});

api.users.create({name: 'yoyo'});
// should output user id
```

How to define a route?

```ts
// method and path always required
router.post('/users');
// method, path and validator (input)
router.post('/users').validator(schema);
// with selector
router.post('/users').T<UserType>().selector((user) => user.id);
router.post('/users').selector((user: UserType) => user.id);
// method, path, validator (input) and selector (output)
router.post('/users').validator(schema).selector((user: UserType) => user.id);
// with types (input, output)
router.post('/users').T<In, Out>();
// validator and output
router.post('/users').validator(schema).T<Out>();
// types first
router.post('/users').T<In, Out>().validator((in) => in).selector(out => out);
```

## License

MIT
