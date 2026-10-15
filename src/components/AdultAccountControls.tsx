import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react';
import { Button } from '@/components/ui/Button';

/** Account identity only. Game ownership still belongs to the existing backend. */
export function AdultAccountControls(): JSX.Element {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <p role="status">Loading account sign-in…</p>;
  }

  if (isSignedIn) {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <p role="status" className="font-semibold text-content">
          You’re signed in to your adult account.
        </p>
        <UserButton />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <SignInButton mode="modal">
        <Button>Sign in</Button>
      </SignInButton>
      <SignUpButton mode="modal">
        <Button variant="ghost">Create an adult account</Button>
      </SignUpButton>
    </div>
  );
}
