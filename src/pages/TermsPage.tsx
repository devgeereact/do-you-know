import { Link } from 'react-router-dom';
import { InfoPage, InfoSection } from '@/components/InfoPage';
import { proseLinkClass } from '@/components/ui/linkClasses';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { CONTROLLER_NAME, POLICY_UPDATED } from '@/lib/site';
import { t } from '@/i18n';

export function TermsPage(): JSX.Element {
  useDocumentMeta({
    title: t.info.terms.metaTitle,
    description: t.info.terms.metaDescription,
  });

  return (
    <InfoPage title={t.info.terms.title} lead={t.info.terms.lead(POLICY_UPDATED)}>
      <InfoSection heading={t.info.terms.headings.short}>
        <ul>
          <li>Play fair and be kind.</li>
          <li>Do not try to cheat or break the game.</li>
          <li>We do our best to get every answer right, but we can make mistakes.</li>
          <li>You can delete your player whenever you like.</li>
        </ul>
      </InfoSection>

      <InfoSection heading={t.info.terms.headings.who}>
        <p>
          Do You Know is run by {CONTROLLER_NAME}. It is free to play. By using it you agree to
          these terms. If you are a child, please read them with a grown-up.
        </p>
      </InfoSection>

      <InfoSection heading={t.info.terms.headings.fair}>
        <ul>
          <li>
            Answer the questions yourself. Looking things up during a ranked game is not fair on
            other players.
          </li>
          <li>
            Do not try to get answers early, change scores or times, flood the server with requests,
            or get around the one-go-a-day rule for the daily challenge.
          </li>
          <li>
            If you are 13 or over and choose a nickname, keep it friendly. Never use your real name
            or anything rude.
          </li>
        </ul>
        <p>
          The server marks every game. If we find cheating or an unkind nickname, we may hide
          results from the leaderboards, change the nickname, or remove the player.
        </p>
      </InfoSection>

      <InfoSection heading={t.info.terms.headings.content}>
        <p>
          We write and check questions carefully and add an explanation to each one, but facts can
          change and mistakes happen. The quizzes are for fun and learning, not professional advice.
          If you spot a mistake, please{' '}
          <Link to="/contact" className={proseLinkClass}>
            tell us
          </Link>
          . The questions, pictures and words in the app belong to us or the people who made them,
          so please do not copy them into other quizzes.
        </p>
      </InfoSection>

      <InfoSection heading={t.info.terms.headings.player}>
        <p>
          You do not need an account to play. You can delete your player, games and scores at any
          time from{' '}
          <Link to="/me" className={proseLinkClass}>
            My profile
          </Link>
          . The{' '}
          <Link to="/privacy" className={proseLinkClass}>
            privacy notice
          </Link>{' '}
          explains what we keep.
        </p>
      </InfoSection>

      <InfoSection heading={t.info.terms.headings.wrong}>
        <p>
          We try to keep the app running, but it may sometimes be offline, slow or change. We are
          not responsible for losses caused by the app being unavailable, as far as the law allows.
          Nothing here takes away your legal rights.
        </p>
      </InfoSection>

      <InfoSection heading={t.info.terms.headings.changes}>
        <p>
          We may update these terms. When we do, we will change the date at the top of this page.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
