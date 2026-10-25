import { Link } from 'react-router-dom';
import { InfoPage, InfoSection } from '@/components/InfoPage';
import { proseLinkClass } from '@/components/ui/linkClasses';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { t } from '@/i18n';
import { CONTACT_EMAIL } from '@/lib/site';

export function ContactPage(): JSX.Element {
  const copy = t.info.contact;
  useDocumentMeta({ title: copy.metaTitle, description: copy.metaDescription });

  return (
    <InfoPage title={copy.title} lead={copy.lead}>
      <InfoSection heading={copy.touchTitle}>
        {CONTACT_EMAIL ? (
          <>
            <p>{copy.emailUs}</p>
            <p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className={`${proseLinkClass} inline-flex min-h-tap items-center break-all`}
              >
                {CONTACT_EMAIL}
              </a>
            </p>
            <p className="text-content-muted">{copy.children}</p>
          </>
        ) : (
          <p>{copy.settingUp}</p>
        )}
      </InfoSection>

      <InfoSection heading={copy.correctionsTitle}>
        <p>{copy.corrections}</p>
      </InfoSection>

      <InfoSection heading={copy.deleteTitle}>
        <p>
          {copy.deleteStart}{' '}
          <Link to="/me" className={proseLinkClass}>
            {t.common.myGames}
          </Link>{' '}
          {copy.deleteMiddle}{' '}
          <Link to="/privacy" className={proseLinkClass}>
            {t.common.privacyNotice}
          </Link>{' '}
          {copy.deleteEnd}
        </p>
      </InfoSection>
    </InfoPage>
  );
}
