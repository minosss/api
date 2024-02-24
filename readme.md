Hey 👋, `@yme/api` is a package that defines the type-safe API routes. No server required and zero dependencies.

> If you are developing a full-stack web application, you should take a look [tRPC](https://trpc.io/).

[![NPM version](https://img.shields.io/npm/v/@yme/api)](https://www.npmjs.com/package/@yme/api)
[![NPM Downloads](https://img.shields.io/npm/dm/@yme/api)](https://www.npmjs.com/package/@yme/api)
[![Bundle Size](https://deno.bundlejs.com/?q=@yme/api&badge=detailed)](https://bundlejs.com/?q=@yme/api&badge=detailed)

<img src="./api.gif" width=800 />

## Why

- I am a frond-end developer.
- `[module].[action]` is good for me. (e.g. `post.create(input)`)
- I usually use axios but there may be others. (e.g. fetch)
- It may be need some transformer for each api response. because my colleagues are very unrestrained

So I create this package to solve these problems. (I hope so)

🚧 TODOs

- with react-query
- generate from api docs e.g. swagger

## Install

```sh
pnpm add @yme/api
```

## Quick Start

```ts
import { createApi, createRouter } from '@yme/api';
import axios from 'axios';
import { z } from 'zod';

const request = axios.create({}).request;

const router = createRouter();

const createUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  age: z.number().optional(),
});

type CreateUserInput = z.infer<typeof createUserSchema>;

interface UserType {
  id: number;
  username: string;
}

const routes = {
  users: {
    create: router
      .post('/users') // api.user.create({...}) => POST /users
      .validator(createUserSchema) // (input: CreateUserInput) => any
      .T<UserType>()
      .selector((user) => user.id), // (user: UserType) => number
    delete: router
      .delete('/users/:id') // api.user.delete(123) replace path with input => DELETE /users/123
      .validator(z.number())
      .T<void>(), // (input: number) => void
    update: router
      .put('/users/:id') // api.user.update(input) will replace with input[id] => PUT /users/{id}
      .validator(
        z.object({
          username: z.string().optional(),
          age: z.number().optional(),
          id: z.number(),
        }),
      )
      .T<UserType>(), // (input: {username?: string; age?: number; id: number}) => UserType
    list: router
      .get('/users') // api.user.list({page: 1}) => GET /users?page=1
      .T<{ page: number }, { list: UserType[] }>()
      .validator(({ page }) => (page > 0 ? { page } : { page: 1 })) // (input: {page: number}) => {page: number}
      .selector(({ list }) => list), // (listResult: {list: UserType[]}) => UserType[]
  },
};

const api = createApi({
  http: request,
  routes,
});

declare module '@yme/api' {
  interface Register {
    api: typeof api;
  }
}

// use api
const userId = await api.users.create({ username: 'yoyo', password: 'yoyo123' });
console.log(`user id: ${userId}`);

// delete user
await api.users.delete(userId);
// done.
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
