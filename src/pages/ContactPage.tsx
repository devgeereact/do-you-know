import { Link } from 'react-router-dom';
import { InfoPage, InfoSection } from '@/components/InfoPage';
import { proseLinkClass } from '@/components/ui/linkClasses';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { CONTACT_EMAIL } from '@/lib/site';

export function ContactPage(): JSX.Element {
  useDocumentMeta({
    title: 'Contact',
    description: 'How parents, carers, teachers and players can contact Do You Know.',
  });

  return (
    <InfoPage title="Contact" lead="For parents, carers, teachers and anyone who spots a mistake.">
      <InfoSection heading="Get in touch">
        {CONTACT_EMAIL ? (
          <>
            <p>
              Email us about privacy, a question that looks wrong, or anything else about the app.
            </p>
            <p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className={`${proseLinkClass} inline-flex min-h-tap items-center break-all`}
              >
                {CONTACT_EMAIL}
              </a>
            </p>
            <p className="text-content-muted">
              Children: please ask a grown-up to send the email for you.
            </p>
          </>
        ) : (
          <p>
            Our contact details are being set up and will appear here soon. Thank you for your
            patience.
          </p>
        )}
      </InfoSection>

      <InfoSection heading="Content corrections">
        <p>
          Every question should have a short explanation and a source. If you think an answer is
          wrong or out of date, tell us the quiz name and the question, and we will check it.
        </p>
      </InfoSection>

      <InfoSection heading="Deleting a player’s data">
        <p>
          You do not need to contact us to delete a player. Open{' '}
          <Link to="/me" className={proseLinkClass}>
            My games
          </Link>{' '}
          on the device they play on and choose “Delete my account”. The{' '}
          <Link to="/privacy" className={proseLinkClass}>
            privacy notice
          </Link>{' '}
          explains what is removed.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
