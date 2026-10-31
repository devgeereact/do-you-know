import { AHead, Panel, Pill } from '@/pages/admin/ui';

const TRUSTED = [
  'bbc.co.uk/bitesize',
  'britannica.com',
  'nasa.gov',
  'nhm.ac.uk',
  'natgeokids.com',
  'metoffice.gov.uk',
  'nhs.uk',
  'rmg.co.uk',
];

const STEPS = [
  ['Search trusted sites', 'Bright Data searches only the sites listed here for the topic.'],
  ['Read the pages', 'The page text is fetched and kept with the run for checking.'],
  ['Write questions from that text', 'Claude drafts questions using only what those pages say.'],
  [
    'Check each quote is on the page',
    'Every draft must quote its source; drafts that don’t are dropped.',
  ],
  ['Send drafts to Check & publish', 'A person checks every question. Nothing publishes itself.'],
] as const;

/** The planned question generator. Switched off: it costs money per run and needs owner approval. */
export function GeneratorScreen(): JSX.Element {
  return (
    <>
      <AHead
        title="Question generator"
        lead="Finds facts on trusted sites, then drafts questions only from what those pages say. Every draft goes to Check & publish."
      />
      <div
        role="status"
        className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-warning/40 bg-warning/15 p-4"
      >
        <b>Not switched on — needs owner approval for Bright Data and Claude costs.</b>
        <span className="text-sm">
          No searches or drafts run from this screen until the owner approves the costs and it is
          built and tested.
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <h2 className="mb-3 font-display text-xl font-extrabold">How it will work</h2>
          <ol className="grid gap-3">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 font-display font-extrabold text-primary">
                  {i + 1}
                </span>
                <span>
                  <b className="block">{title}</b>
                  <span className="text-sm text-content-muted">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>
        <div className="grid content-start gap-4">
          <Panel>
            <h2 className="mb-2 font-display text-lg font-extrabold">Only these sites</h2>
            <div className="flex flex-wrap gap-1.5">
              {TRUSTED.map((t) => (
                <Pill key={t} tone="mute">
                  ✓ {t}
                </Pill>
              ))}
            </div>
          </Panel>
          <Panel>
            <h2 className="mb-2 font-display text-lg font-extrabold">Safeguards</h2>
            <ul className="grid list-disc gap-1 pl-5 text-sm">
              <li>A daily limit of 20 runs</li>
              <li>Every run logged in Activity</li>
              <li>Drafts only; a person publishes</li>
              <li>No player data is ever sent</li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
