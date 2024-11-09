'use client';

import { useFormState } from 'react-dom';
import { signInAction } from '../actions';

export default function Page() {
  const [state, action] = useFormState(signInAction, {
    message: '',
  });

  return (
    <div>
      <h1>Sign In</h1>
      <p>Sign in form goes here</p>
      <form action={action}>
        <label>
          Email
          <input required type="email" name="email" />
        </label>
        <label>
          Password
          <input required type="password" name="password" />
        </label>
        <p>{state.message}</p>
        <button type="submit">Sign In</button>
      </form>
    </div>
  )
};
