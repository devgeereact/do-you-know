-- One step of a generator run at a time: a step claims the run until busy_until, so two browser
-- tabs (or a double click) can never search, fetch or call the model twice for the same step.
ALTER TABLE generator_runs ADD COLUMN IF NOT EXISTS busy_until DATETIME(6) NULL;
