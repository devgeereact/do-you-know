import { Link } from 'react-router-dom';
import { InfoPage, InfoSection } from '@/components/InfoPage';
import { proseLinkClass } from '@/components/ui/linkClasses';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

/** Game rules in plain words. Every rule here matches backend/src/Game.php and Competition.php. */
export function HowToPlayPage(): JSX.Element {
  useDocumentMeta({
    title: 'How to play',
    description:
      'How Do You Know works: question types, practice and ranked play, the daily challenge, friend challenges and fair scoring.',
  });

  return (
    <InfoPage
      title="How to play"
      lead="Pick a quiz, answer the questions, and see the answer and why after each one."
    >
      <InfoSection heading="Three kinds of question">
        <ul>
          <li>
            <strong>Multiple choice:</strong> pick the one answer you think is right.
          </li>
          <li>
            <strong>True or false:</strong> decide if the sentence is true or not.
          </li>
          <li>
            <strong>Slider estimate:</strong> slide to the number you think it is. You score if your
            guess lands close enough to the real answer.
          </li>
        </ul>
        <p>
          Some quizzes give you a set number of seconds for each question. If the time runs out,
          that question counts as not right, and the game moves on.
        </p>
      </InfoSection>

      <InfoSection heading="Practice or ranked">
        <p>
          <strong>Play now</strong> is a ranked game: your best result goes on that quiz’s all-time
          board and this week’s board. A new week starts on Monday, UK time.
        </p>
        <p>
          <strong>Just practise</strong> is for fun and learning. Practice games never go on a
          leaderboard. A few quizzes are practice only.
        </p>
      </InfoSection>

      <InfoSection heading="The daily challenge">
        <ul>
          <li>
            There is one daily challenge, and everyone gets the same questions in the same order.
          </li>
          <li>You get one go each day, and it counts as a ranked game.</li>
          <li>A new challenge starts each day, shortly after midnight UK time.</li>
          <li>
            Play on days in a row to grow your streak. Miss a day and your streak starts again from
            one.
          </li>
        </ul>
        <p>
          <Link to="/daily" className={`${proseLinkClass} inline-flex min-h-tap items-center`}>
            Try today’s challenge
          </Link>
        </p>
      </InfoSection>

      <InfoSection heading="Friend challenges">
        <ul>
          <li>After you finish a quiz, you can make a challenge link to share with a friend.</li>
          <li>The link ends in an 8-character code and works for 30 days.</li>
          <li>
            Your friend gets the same questions, in the same order, with the same timer. You cannot
            play your own challenge.
          </li>
          <li>The winner has more right answers. If it is a tie, the faster player wins.</li>
        </ul>
      </InfoSection>

      <InfoSection heading="Fair scoring">
        <ul>
          <li>First, the most right answers wins.</li>
          <li>If scores are level, the lower total answer time wins.</li>
          <li>If both are level, whoever got there first goes higher.</li>
        </ul>
        <p>
          The clock only runs while a question is on screen. It stops the moment you answer, so time
          spent reading the answer and explanation never counts.
        </p>
        <p>
          All marking and timing happens on our server, not on your device. Nobody can see the
          answers before they play, and nobody can send in a made-up score.
        </p>
      </InfoSection>

      <InfoSection heading="Leaderboards">
        <p>
          Boards show a nickname, a preset avatar, the score and the time. Nothing else about a
          player is shown. You only appear once you have a nickname, and players under 13 get a
          made-up fun nickname instead of typing one.
        </p>
        <p>
          <Link
            to="/leaderboards"
            className={`${proseLinkClass} inline-flex min-h-tap items-center`}
          >
            See the leaderboards
          </Link>
        </p>
      </InfoSection>
    </InfoPage>
  );
}
