import { Link } from 'react-router-dom';
import { InfoPage, InfoSection } from '@/components/InfoPage';
import { proseLinkClass } from '@/components/ui/linkClasses';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { t } from '@/i18n';

/** Game rules in plain words. Every rule here matches backend/src/Game.php and Competition.php. */
export function HowToPlayPage(): JSX.Element {
  const copy = t.info.howToPlay;
  useDocumentMeta({ title: copy.metaTitle, description: copy.metaDescription });

  return (
    <InfoPage title={copy.title} lead={copy.lead}>
      <InfoSection heading={copy.kindsTitle}>
        <ul>
          {copy.kinds.map((kind) => (
            <li key={kind.name}>
              <strong>{kind.name}</strong> {kind.text}
            </li>
          ))}
        </ul>
        <p>{copy.timer}</p>
      </InfoSection>

      <InfoSection heading={copy.modesTitle}>
        <p>
          <strong>{copy.rankedName}</strong> {copy.ranked}
        </p>
        <p>
          <strong>{copy.practiceName}</strong> {copy.practice}
        </p>
      </InfoSection>

      <InfoSection heading={copy.dailyTitle}>
        <ul>
          {copy.daily.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p>
          <Link to="/daily" className={`${proseLinkClass} inline-flex min-h-tap items-center`}>
            {copy.dailyLink}
          </Link>
        </p>
      </InfoSection>

      <InfoSection heading={copy.friendsTitle}>
        <ul>
          {copy.friends.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </InfoSection>

      <InfoSection heading={copy.scoringTitle}>
        <ul>
          {copy.scoring.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p>{copy.clock}</p>
        <p>{copy.server}</p>
      </InfoSection>

      <InfoSection heading={copy.boardsTitle}>
        <p>{copy.boards}</p>
        <p>
          <Link
            to="/leaderboards"
            className={`${proseLinkClass} inline-flex min-h-tap items-center`}
          >
            {copy.boardsLink}
          </Link>
        </p>
      </InfoSection>
    </InfoPage>
  );
}
