import { Link } from 'react-router-dom';
import { InfoPage, InfoSection } from '@/components/InfoPage';
import { Card } from '@/components/ui/Card';
import { proseLinkClass } from '@/components/ui/linkClasses';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { CONTACT_EMAIL, CONTROLLER_NAME, POLICY_UPDATED } from '@/lib/site';

/**
 * Privacy notice. Every statement is based on the code: backend/migrations (fields held),
 * backend/bin/cleanup.php and Config.php (retention), src/lib/api.ts and ThemeContext
 * (device storage), src/lib/sentry.ts (error reports), AccountPage (Clerk, adults only).
 * Change this page whenever any of those change.
 */
export function PrivacyPage(): JSX.Element {
  useDocumentMeta({
    title: 'Privacy notice',
    description:
      'What Do You Know keeps about players, why, for how long, and how to delete it. Written for children and grown-ups.',
  });

  return (
    <InfoPage
      title="Privacy notice"
      lead={`How we look after your information. Last updated ${POLICY_UPDATED}.`}
    >
      <Card
        as="section"
        aria-labelledby="for-children-heading"
        className="border-primary bg-primary/10"
      >
        <h2 id="for-children-heading" className="text-2xl font-semibold text-content">
          For children: the short version
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-content">
          <li>We never ask for your real name, email, photo, birthday or where you live.</li>
          <li>Other players only see your nickname, your avatar, your score and your time.</li>
          <li>We keep your games so you can see your scores and streaks.</li>
          <li>There are no adverts and nothing that follows you around the internet.</li>
          <li>You can delete everything any time on My games. A grown-up can help you.</li>
          <li>If something worries you, talk to a grown-up you trust.</li>
        </ul>
      </Card>

      <InfoSection heading="Who we are">
        <p>
          {CONTROLLER_NAME} is responsible for the information described here (the “controller”
          under UK data protection law, the UK GDPR and the Data Protection Act 2018). We follow the
          ICO’s Children’s Code: privacy settings are high for every player by default.
        </p>
        <ContactLine />
      </InfoSection>

      <InfoSection heading="What we keep on our server">
        <p>
          Players do not sign up. The first time you play, our server gives this device a random
          code, and we keep:
        </p>
        <ul>
          <li>a random player number that is not linked to who you are</li>
          <li>your nickname (a made-up one, or one you choose if you are 13 or over)</li>
          <li>your age group: under 13, 13 to 17, or 18 and over (never your birthday)</li>
          <li>the preset avatar you pick</li>
          <li>your daily streak and the date you last played the daily challenge</li>
          <li>
            your games: which quiz, the answer you gave to each question, whether it was right, how
            long you took, and when you played
          </li>
          <li>your best results on the leaderboards, and any friend challenge links you make</li>
          <li>a scrambled copy of this device’s code, so the server can recognise it</li>
        </ul>
        <p>
          To stop people flooding the server, it also keeps a scrambled, one-way version of your
          internet (IP) address for a short time (no more than about two hours). The plain address
          is not stored with your games.
        </p>
      </InfoSection>

      <InfoSection heading="What is kept on your device">
        <p>The app saves a few small things in your browser’s storage. We do not set cookies.</p>
        <ul>
          <li>the code that lets this device carry on as the same player</li>
          <li>whether you chose light or dark colours</li>
          <li>whether you said “Not now” to installing the app</li>
          <li>the app’s own files, so it can open without internet</li>
        </ul>
        <p>
          If you clear your browser’s storage, this device forgets your player. We cannot bring it
          back, because we do not know who you are.
        </p>
      </InfoSection>

      <InfoSection heading="What other people can see">
        <p>
          Leaderboards and friend challenge links show a nickname, an avatar, a score and a time.
          They never show an email, an age group or a player number. There is no chat and no way to
          message other players.
        </p>
      </InfoSection>

      <InfoSection heading="Why we use it">
        <p>
          We use this information only to run the game: to mark answers, keep scores and streaks
          fair, show leaderboards, run friend challenges, keep the service safe from misuse, and fix
          problems. Our lawful basis is legitimate interests: running a fair quiz game that players
          have chosen to use, with as little data as possible.
        </p>
        <p>
          We do not sell information, show adverts, build profiles for marketing, or use your
          location. There are no analytics tools in the app.
        </p>
      </InfoSection>

      <InfoSection heading="Grown-ups’ accounts">
        <p>
          Parents and staff can sign in on the{' '}
          <Link to="/account" className={proseLinkClass}>
            Parents and staff
          </Link>{' '}
          page. Sign-in is handled by Clerk, which holds the adult’s email address and sign-in
          details. Our own database stores only Clerk’s account number, linked to a player record:
          no email, name or photo. Children should not use this sign-in. Adult accounts are not
          linked to a child’s games.
        </p>
      </InfoSection>

      <InfoSection heading="Companies that help us">
        <ul>
          <li>
            <strong>Namecheap</strong> hosts the app and our database. Like any web host, its
            servers may keep standard logs (such as IP addresses and pages visited) for security.
          </li>
          <li>
            <strong>Cloudflare</strong> sits in front of the website to keep it fast and protect it
            from attacks. It sees your IP address and browser details when you visit, and may use a
            strictly necessary security cookie.
          </li>
          <li>
            <strong>Clerk</strong> handles sign-in for grown-ups only, on the Parents and staff
            page.
          </li>
          <li>
            <strong>Sentry</strong> receives a report when the app breaks: the error, the page
            address, and the browser and device type. Like any website it can see your IP address.
            Screen recording (“session replay”) is switched off, and reports do not include
            nicknames or player numbers.
          </li>
          <li>
            <strong>ImageKit</strong> may deliver some quiz pictures. Like any website that sends a
            picture, it sees your IP address and browser details.
          </li>
        </ul>
        <p>
          Some of these companies may handle information outside the UK. Where they do, they use the
          legal safeguards UK law requires.
        </p>
      </InfoSection>

      <InfoSection heading="How long we keep it">
        <ul>
          <li>
            Your player, games and leaderboard results are kept until you delete them. They are
            needed to show your scores and keep leaderboards fair.
          </li>
          <li>
            This device’s sign-in code is renewed while you keep playing. It expires after a set
            time without playing (7 days unless we change it), and an hourly clean-up removes
            expired codes from our server.
          </li>
          <li>
            The scrambled internet address used to stop flooding is removed within about two hours.
          </li>
          <li>Friend challenge links stop working after 30 days.</li>
        </ul>
        <p>
          When this device’s code expires, the app starts a new player and the old one can no longer
          be reached from the device. We do not yet delete those older players automatically. If you
          would like one removed, contact us.
        </p>
      </InfoSection>

      <InfoSection heading="Deleting your information">
        <p>
          Go to{' '}
          <Link to="/me" className={proseLinkClass}>
            My games
          </Link>{' '}
          and choose “Delete my account”. This straight away removes your player, every game and
          answer, your leaderboard results, your friend challenge links and this device’s code. It
          cannot be undone.
        </p>
        <p>
          A grown-up’s Clerk sign-in is separate: delete it from the account menu on the Parents and
          staff page.
        </p>
      </InfoSection>

      <InfoSection heading="Your rights">
        <p>
          You, or a parent or carer for a child, can ask to see, correct or delete information about
          you, or object to how we use it. Because we do not know who players are, we may need you
          to use the device you play on so we can find the right player.
        </p>
        <p>
          If you are unhappy with how we use information, you can complain to the Information
          Commissioner’s Office (ICO) at{' '}
          <a href="https://ico.org.uk/make-a-complaint/" className={proseLinkClass}>
            ico.org.uk/make-a-complaint
          </a>{' '}
          or by phone on 0303 123 1113. We would like the chance to help first.
        </p>
      </InfoSection>

      <InfoSection heading="Changes to this notice">
        <p>
          If we change what we collect or why, we will update this page and the date at the top
          before the change happens. Read our{' '}
          <Link to="/terms" className={proseLinkClass}>
            terms of use
          </Link>{' '}
          too.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

function ContactLine(): JSX.Element {
  if (CONTACT_EMAIL) {
    return (
      <p>
        Contact us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className={`${proseLinkClass} break-all`}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    );
  }
  return (
    <p>
      Our contact details are being set up. You can already delete a player yourself: see{' '}
      <a href="#deleting-your-information-heading" className={proseLinkClass}>
        Deleting your information
      </a>{' '}
      below.
    </p>
  );
}
