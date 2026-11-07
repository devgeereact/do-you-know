# Direction: Do You Know as a learning app

Status: **APPROVED by the owner at Gate 1 on 7 Nov 2026**, with one change: the **daily board and crown stay on** for everyone (built and live 7 Nov). Revised after `docs/VERIFIED-STATE.md`. The purpose is fixed by the owner. Rule 3 applies throughout: nothing that works is deleted; what does not fit moves off the child's default path behind a parent switch (default off).

## Purpose
**Do You Know helps children practise literacy, numeracy, science and humanities in short, calm sessions where every answer is a tap.** The child plays. The parent sets up the child, chooses the level and sees progress.

## Who is who
| Role | What they do | What they hold |
|---|---|---|
| **Child** | taps answers; never types | a preset nickname, a preset avatar, a level the parent set. Nothing else |
| **Parent** | signs in (Clerk email code), adds children, sets level, flips switches, reads progress, contacts us | the account; progress hangs off it |
| **Studio owner** | writes, imports, reviews, publishes content (unchanged) | staff sign-in |

A guest (no parent) can try a short session that saves nothing.

## The three things it must do best
1. **Tap-only learning in all four areas.** Letter tiles, number tiles, word banks and cards replace the keyboard. Today only 3 of the ~11 answer formats exist.
2. **Short sessions that adapt gently.** 10 questions, about 5 minutes, a clear ending, a wrong answer shown with a one-line reason and asked again later; one step up or down inside a level.
3. **Progress a parent can trust with nothing personal about the child.** A skill map by topic and a "practise next" hint.

## What moves behind parent switches (all default OFF; nothing deleted)
| Existing feature | New home | Note |
|---|---|---|
| Quiz leaderboards (all-time, weekly), likes, ranked rounds | switch "Public boards" | routes and server code stay working; hidden from tabs and results. **The daily board and its crown are not behind the switch: they stay on** |
| Friend challenges | switch "Challenge a friend" | same |
| Countdown timer | switch "Beat the clock" | off = untimed; server still owns the clock when on |
| Slider question | switch "Slider questions" | number tiles become the default; slider stays for those who want it |
| Adult band and 18+ quizzes, General Knowledge, "Great minds" / "Record breakers" trivia | switch "Trivia and grown-up sets" | the 60 General Knowledge and 18+ quizzes stay live, just not offered to children |
| Typed nickname (13+), reply box, contact form, "I'm 18 or over" tick | **parent area only** | the child path no longer reaches any keyboard field; the age-band tick is no longer reachable by a child. The column and the API stay |
| Daily challenge | stays, plays once a day; the Play tab stops sending children to a finished daily | fix, not removal |
| Ranked label, uppercase answers | child path shows normal case, no "Ranked" tag | restyle, no feature lost |
| Dead code (ImageKit helper, PostHog settings, unused columns) | **left in place**, listed for a later owner-approved clean-up | not on any child path |

**Kept as they are:** server-side grading and answer-hiding, the Studio, import and AI review, versions and audit, prerendered SEO pages, the release pipeline, UK English, the Pop & Ink tokens (softened), all 262 live quizzes.

## Re-homing existing content (no rewrite, no retire)
Technology → Science (computer science). School Science → Science. Bible and faith → Humanities (religious knowledge, neutrality rule kept). School English, Maths, Geography, History, Computing map to their areas. General Knowledge and trivia sets sit behind the trivia switch.

## Five levels, five steps each
| Level | Years | Today's content bands |
|---|---|---|
| 1 Starters | 4–5 | 36 quizzes at 4–5 |
| 2 Explorers | 6–8 | 36 at 6–8 |
| 3 Adventurers | 9–11 | 36 at 9–11 |
| 4 Challengers | 12–14 | 36 at 12–14 |
| 5 Scholars | 15–16 | 36 at 15–16 |

The parent picks a level per child (shown as a year hint, never as the child's age). Inside a level, steps 1 to 5 move the child up or down gently per area. The 18+ band is not a level.

## Defaults I chose (say if you want any reversed)
1. Read-aloud uses the device's own British voice: free, nothing leaves the device.
2. Guests save nothing; saved progress needs a parent account.
3. Sound is off until a parent turns it on; motion respects reduced-motion.
4. Switches are per parent account and apply to all that parent's children.
5. Hidden does not mean unreachable: a direct link to a board or challenge still works, so shared links and old links do not break.
6. Branch only. Nothing is pushed, deployed, retired or changed in the live database without your explicit OK. Re-labelling live subjects and hiding General Knowledge on the live site are live changes and get their own approval.
