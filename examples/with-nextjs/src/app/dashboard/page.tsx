'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '../../lib/apiClient';

export default function Page() {
  const qc = useQueryClient();
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [{ name: 'notes', entity: 'list' }],
    queryFn: async ({ signal }) => await notesApi.list({}, { signal }),
  });
  const $create = useMutation({
    mutationFn: notesApi.create,
  });

  // optimistic update
  const $delete = useMutation({
    mutationFn: notesApi.delete,
    onMutate: async (input) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await qc.cancelQueries({ queryKey: [{ name: 'notes' }] });
      const prevNotes = qc.getQueryData([{ name: 'notes', entity: 'list' }]);

      // Optimistically update to the new value
      qc.setQueryData([{ name: 'notes', entity: 'list' }], (old: any) => ({
        ...old,
        records: old.records.filter((note) => note.id !== input.id),
      }));
      return { prevNotes };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context to roll back
      qc.setQueryData([{ name: 'notes', entity: 'list' }], context.prevNotes);
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: [{ name: 'notes' }] });
    },
  });

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome to the dashboard!</p>
      <div>
        <form
          onSubmit={(e) => {
            e.preventDefault();

            const form = e.currentTarget;
            const formData = new FormData(form);
            const title = formData.get('title') as string;
            const content = formData.get('content') as string;
            $create.mutate(
              { title, content },
              {
                onSuccess: async () => {
                  form.reset();
                  await qc.invalidateQueries({
                    queryKey: [{ name: 'notes' }],
                  });
                },
                onError: () => {},
              },
            );
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <label style={{ display: 'inline-flex', flexDirection: 'column' }}>
              Title
              <input required type="text" name="title" />
            </label>
            <label style={{ display: 'inline-flex', flexDirection: 'column' }}>
              Content
              <textarea required name="content" />
            </label>
            <button type="submit">Create Note</button>
          </div>
        </form>
      </div>
      <div>
        <h2>Notes</h2>
        {isLoading || isFetching ? <p>Freshing...</p> : null}
        <ul
          style={{
            padding: 0,
            margin: 0,
          }}
        >
          {data?.records?.map((note) => (
            <li
              key={note.id}
              style={{
                listStyle: 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div>{note.id}</div>
                <div>
                  <h3>{note.title}</h3>
                  <p>{note.content}</p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={(e) => {
                      $delete.mutate({
                        id: note.id,
                      });
                    }}
                  >
                    delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
