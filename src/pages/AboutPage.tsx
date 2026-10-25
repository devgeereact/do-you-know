import { Link } from 'react-router-dom';
import { InfoPage, InfoSection } from '@/components/InfoPage';
import { proseLinkClass } from '@/components/ui/linkClasses';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { t } from '@/i18n';

export function AboutPage(): JSX.Element {
  const copy = t.info.about;
  useDocumentMeta({ title: copy.metaTitle, description: copy.metaDescription });

  return (
    <InfoPage title={copy.title} lead={copy.lead}>
      <InfoSection heading={copy.whatTitle}>
        {copy.what.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </InfoSection>

      <InfoSection heading={copy.everyoneTitle}>
        <ul>
          {copy.everyone.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </InfoSection>

      <InfoSection heading={copy.fairTitle}>
        <p>{copy.fair}</p>
      </InfoSection>

      <InfoSection heading={copy.noAdsTitle}>
        <p>
          {copy.noAdsBefore}{' '}
          <Link to="/privacy" className={proseLinkClass}>
            {t.common.privacyNotice}
          </Link>{' '}
          {copy.noAdsAfter}
        </p>
      </InfoSection>
    </InfoPage>
  );
}
