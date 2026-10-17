import { Link } from 'react-router-dom';
import { InfoPage, InfoSection } from '@/components/InfoPage';
import { proseLinkClass } from '@/components/ui/linkClasses';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export function AboutPage(): JSX.Element {
  useDocumentMeta({
    title: 'About',
    description:
      'Do You Know is a free quiz app for all ages, including children: fair server-side marking, no ads and no trackers.',
  });

  return (
    <InfoPage title="About Do You Know" lead="Quick, fun quizzes for curious minds of every age.">
      <InfoSection heading="What it is">
        <p>
          Do You Know is a quiz app you can play in your browser or install on a phone, tablet or
          computer. There are general knowledge quizzes, school-subject quizzes, a daily challenge
          and friend challenges.
        </p>
        <p>
          After every question you see the right answer and a short explanation, so each game
          teaches you something.
        </p>
      </InfoSection>

      <InfoSection heading="Made for everyone, including children">
        <ul>
          <li>You can play straight away. There is no sign-up for players.</li>
          <li>Players never give a real name, email, photo or birthday.</li>
          <li>Players under 13 get a made-up nickname and pick a preset avatar.</li>
          <li>There is no chat and no way to message other players.</li>
        </ul>
      </InfoSection>

      <InfoSection heading="Fair play">
        <p>
          Answers stay on our server until you have answered. The server marks every answer and
          times every question, so scores on the leaderboards are fair for everyone.
        </p>
      </InfoSection>

      <InfoSection heading="No ads, no trackers">
        <p>
          There are no adverts, no advertising trackers and no analytics tools in the app. Read the{' '}
          <Link to="/privacy" className={proseLinkClass}>
            privacy notice
          </Link>{' '}
          to see exactly what we keep and why.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
