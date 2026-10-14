import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

export function HomePage(): JSX.Element {
  const { user } = useSupabaseAuth();
  const signedIn = user !== null && user.is_anonymous !== true;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-10 text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <img src="/favicon.svg" alt="" className="mx-auto mb-6 h-20 w-20" />
        <p className="mb-4 inline-block rounded-full bg-secondary px-4 py-1 text-sm font-bold text-secondary-fg">
          Quizzes for curious minds of all ages
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-content md:text-6xl">
          Do You <span className="text-primary">Know?</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-content-muted">
          Play a quiz in seconds, learn something new with every answer, take today’s
          challenge and see if your friends can beat your score.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {signedIn ? (
            <Link to="/dashboard">
              <Button size="lg">My profile</Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button size="lg">Save my progress</Button>
            </Link>
          )}
        </div>
      </motion.div>
    </main>
  );
}
