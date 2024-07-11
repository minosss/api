# @yme/api

A simple API client for TypeScript.

## Quick Start

```ts
const router = createRouter();
const api = createApi({
  http: fetch,
  routes: {
    users: {
      list: router.get('/users'),
      create: router.post('/users').validator(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
        age: z.number().optional(),
      })).T<{
        id: number;
        username: string;
        age?: number;
      }>(),
    },
  }
});

api.users.create({
  username: 'john',
  password: 'password',
  age: 30,
}).then((user) => {
  console.log(user);
});

api.users.list().then((users) => {
  console.log(users);
});
```
