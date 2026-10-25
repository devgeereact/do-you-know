import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react';
import { Button } from '@/components/ui/Button';
import { t } from '@/i18n';

/** Account identity only. Game ownership still belongs to the existing backend. */
export function AdultAccountControls(): JSX.Element {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <p role="status">{t.account.loading}</p>;
  }

  if (isSignedIn) {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <p role="status" className="font-semibold text-content">
          {t.account.signedIn}
        </p>
        <UserButton />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <SignInButton mode="modal">
        <Button>{t.account.signIn}</Button>
      </SignInButton>
      <SignUpButton mode="modal">
        <Button variant="ghost">{t.account.signUp}</Button>
      </SignUpButton>
    </div>
  );
}
