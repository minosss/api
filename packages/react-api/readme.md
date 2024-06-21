# @yme/react-api

## Installation

```bash
npm install @yme/api @yme/react-api
```

## Usage

```tsx

// define your api
const router = createRouter();
const api = createApi({
  http: fetch,
  routes: {
    users: {
      list: router.get('/users'),
      one: ruoter.get('/users/:id')
        .T<{ id: number; name: string }>(),
    }
  }
});

// create a provider
const { ApiProvider, useApi, useApiClient } = createApiProvider(api);

// use the provider
function App() {
  return (
    <ApiProvider>
      <User id={123}>
    </ApiProvider>
  );
}

// use the hook to get the api client
function User({ id }: { id: number }) {
  const api = useApiClient();
  // or use the hook to get the api function
  // const getUser = useApi('users.one');

  const {
    data,
  } = useQuery({
    queryKey: ['users.one', { id }],
    queryFn: ({ signal }) => api.users.one({ id }, { signal }),
  });

  return (
    <div>
      User: {data.name}
    </div>
  );
}
```
