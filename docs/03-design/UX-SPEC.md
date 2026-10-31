# UX Specification

Pop & Ink redesign, 31 October 2026 (ADR-014). Phones (under 1024 px) get the bottom tab bar (Explore, Daily, Play, Boards); computers get the top bar (Explore, Daily, Leaderboards, "Play today's quiz") and multi-column layouts. The avatar in the top bar is one link to the profile on both, with a dot when a reply is waiting.

| Screen or flow | Purpose | Primary action | Secondary action | Required states | Mobile decision | Desktop decision |
|---|---|---|---|---|---|---|
| Home `/` | Get a player into a game fast | Play today's quiz | Try one question, browse worlds and subjects | Loading skeleton, no daily, offline | Greeting, compact daily card, streak card, "Carry on" carousel, subject chips that filter the list plus "See all {subject} quizzes" | Hero (ocean world, real practice question), progress + daily + this week's top 3, world tiles, subject tiles padded to full rows, quiz rows, all quizzes by age, parents band |
| Subject `/c/:slug` | Every quiz in one subject | Play a quiz | Suggest a quiz | Empty subject, loading | World banner, single list | World banner, two-column list with filler tile |
| Quiz `/q/:slug` | Choose a mode | Play ranked | Practice, challenge a friend, top players | Not found, not ranked | Stacked cards | Play card beside top players, equal heights |
| Play `/play/...` | Answer one question at a time | Pick an answer | Leave, report a question | Loading, answering, right, wrong, timeout, blocked, error | Framed stage fills the screen; chips at the top | Framed stage centred on the question's world |
| Feedback sheet | Teach after each answer | Next question | Why (explanation), stay here, report | Auto-advance countdown, reduced motion (no auto-advance animation) | Sheet slides up inside the frame | Same |
| Results | Score and what next | Play again | Challenge a friend, board, review | Personal best, rank, guest without nickname | Score frame, then actions | Score frame beside board |
| Daily `/daily` | Today's challenge and its board | Play today's challenge | Countdown, streak week | Played already, none today | Fits one screen: animated world stops, stats, board scrolls inside | Same with host character and wider board |
| Leaderboards `/leaderboards` | Who is doing best overall | Switch period (Today default, week, month, all time) | How points work, a quiz's own board (`?quiz=`) | Empty podium (characters), you not ranked yet, pinned "you" row | Fits one screen; list scrolls inside | Podium + facts beside the list |
| Contact `/contact` | Feedback, ideas, problems | Send | Pick a quiz | Thanks (points to Messages), error, child refused free text | Player: preset chips only. Grown-up: message (email optional) after an 18+ tick | In the info shell: form beside the help tiles |
| Me `/me` | Everything about the player | Pick a character | Change nickname once (confirm step), messages and replies (`#messages`), rounds (`#games`), settings, delete | No games yet, no messages, nickname locked, new reply | Stacked: identity, stats, nickname, character, messages, rounds | Sticky identity column beside character, messages and rounds |
| Info pages | How to play, About, Privacy, Terms, Contact, Settings | Read or act | Move between them from the side menu | Long pages get an "On this page" list | Title band, pill menu that scrolls, content | Title band, side menu, content, "On this page" (≥1280) |
| Studio `/admin` | Run the site (owner only) | Depends on screen | Audit trail | Not signed in, not allowed (403), loading | Usable but desktop-first | Sidebar + screen |

Rules: one primary action per screen; grids always fill their rows (filler "Suggest" tiles); right/wrong always shows an icon and words as well as colour; nothing animates under reduced motion except state colour.
