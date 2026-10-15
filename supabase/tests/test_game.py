"""End-to-end behaviour tests for the Do You Know migrations (local Postgres + Supabase shim).
Run: python3 test_game.py   (expects a fresh 'dyk' database with 0001–0004 applied)
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import json
import os
import uuid
import psycopg

DSN = os.environ.get("DYK_TEST_DSN", "host=/var/tmp/pgtest port=5499 user=postgres dbname=dyk")
conn = psycopg.connect(DSN, autocommit=True)
results = []


def check(name, cond, info=""):
    results.append((name, bool(cond), info))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{info}]" if info and not cond else ""))


def as_user(uid):
    """Run as Supabase 'authenticated' with auth.uid() = uid (None = anon)."""
    cur = conn.cursor()
    cur.execute("reset role")
    if uid is None:
        cur.execute("set role anon")
        cur.execute("select set_config('request.jwt.claim.sub', '', false)")
    else:
        cur.execute("set role authenticated")
        cur.execute("select set_config('request.jwt.claim.sub', %s, false)", (str(uid),))
    return cur


def superuser():
    cur = conn.cursor()
    cur.execute("reset role")
    cur.execute("select set_config('request.jwt.claim.sub', '', false)")
    return cur


def rpc(uid, fn, *args):
    cur = as_user(uid)
    ph = ",".join(["%s"] * len(args))
    cur.execute(f"select public.{fn}({ph})", args)
    row = cur.fetchone()
    return row[0] if row else None


def rpc_err(uid, fn, *args):
    try:
        rpc(uid, fn, *args)
        return None
    except psycopg.Error as e:
        return e.diag.message_primary


def new_user(anonymous, email=None):
    cur = superuser()
    cur.execute("insert into auth.users (email, is_anonymous) values (%s, %s) returning id", (email, anonymous))
    return cur.fetchone()[0]


# ---------------------------------------------------------------- users
admin = new_user(False, "admin@example.com")
superuser().execute("update public.profiles set role = 'admin' where id = %s", (admin,))
editor = new_user(False, "editor@example.com")
superuser().execute("update public.profiles set role = 'editor' where id = %s", (editor,))
guest = new_user(True)
guest2 = new_user(True)
kid = new_user(True)

cur = superuser()
cur.execute("select role, email from public.profiles where id = %s", (guest,))
check("guest sign-up works with no email, role=guest", cur.fetchone() == ("guest", None))

# Privilege escalation attempt
cur = as_user(guest)
cur.execute("update public.profiles set role = 'admin', streak_best = 99 where id = %s", (guest,))
cur = superuser()
cur.execute("select role, streak_best from public.profiles where id = %s", (guest,))
check("guest cannot promote self or edit streaks", cur.fetchone() == ("guest", 0))

# ---------------------------------------------------------------- content (admin)
cur = as_user(admin)
cur.execute("insert into public.categories (slug, name) values ('science', 'Science & Nature') returning id")
cat = cur.fetchone()[0]


def add_choice(prompt, options, correct_idx, source=True):
    c = as_user(admin)
    c.execute("""insert into public.questions (category_id, type, prompt, explanation, source_url, review_by)
                 values (%s, 'choice', %s, 'Because.', %s, current_date + 180) returning id""",
              (cat, prompt, "https://example.org/src" if source else None))
    qid = c.fetchone()[0]
    for i, lab in enumerate(options):
        c.execute("insert into public.question_options (question_id, label, is_correct, sort_order) values (%s,%s,%s,%s)",
                  (qid, lab, i == correct_idx, i))
    return qid


qids = [add_choice(f"Which option is right number {n}?", ["A", "B", "C", "D"], n % 4) for n in range(6)]
cur = as_user(admin)
cur.execute("""insert into public.questions (category_id, type, prompt, explanation, source_url, review_by)
               values (%s, 'boolean', 'Do sharks have bones at all?', 'Cartilage.', 'https://example.org/sharks', current_date + 180)
               returning id""", (cat,))
bq = cur.fetchone()[0]
cur.execute("insert into public.question_options (question_id, label, is_correct, sort_order) values (%s,'Yes',false,0),(%s,'No',true,1)", (bq, bq))
cur.execute("""insert into public.questions (category_id, type, prompt, explanation, source_url, review_by,
                 slider_min, slider_max, slider_step, slider_unit, correct_value, accept_min, accept_max)
               values (%s, 'slider', 'How many letters in the Hawaiian alphabet?', 'Thirteen.', 'https://example.org/h', current_date + 180,
                       5, 30, 1, 'letters', 13, 12, 14) returning id""", (cat,))
sq = cur.fetchone()[0]
all_q = qids + [bq, sq]

cur.execute("""insert into public.quizzes (slug, title, category_id, question_count)
               values ('science-starter', 'Science Starter', %s, 8) returning id""", (cat,))
quiz = cur.fetchone()[0]
for pos, q in enumerate(all_q):
    cur.execute("insert into public.quiz_questions (quiz_id, question_id, position) values (%s,%s,%s)", (quiz, q, pos))

check("editor cannot publish", rpc_err(editor, "publish_quiz", quiz) == "admins_only")

# A question without a source blocks publishing
bad = add_choice("This one has no source link at all?", ["A", "B"], 0, source=False)
as_user(admin).execute("insert into public.quiz_questions (quiz_id, question_id, position) values (%s,%s,99)", (quiz, bad))
check("publish blocked by missing source", rpc_err(admin, "publish_quiz", quiz) == "question_invalid")
as_user(admin).execute("delete from public.quiz_questions where question_id = %s", (bad,))

ver = rpc(admin, "publish_quiz", quiz)
check("admin publishes quiz", ver is not None)

# ---------------------------------------------------------------- answers never reach players
cur = as_user(guest)
cur.execute("select count(*) from public.questions"); n_q = cur.fetchone()[0]
cur.execute("select count(*) from public.question_options"); n_o = cur.fetchone()[0]
cur.execute("select count(*) from public.quiz_versions"); n_v = cur.fetchone()[0]
check("guest reads 0 questions/options/versions (answers hidden)", (n_q, n_o, n_v) == (0, 0, 0), f"{n_q},{n_o},{n_v}")
cur.execute("select count(*) from public.quizzes"); check("guest can see the published quiz", cur.fetchone()[0] == 1)
cur = as_user(None)
cur.execute("select count(*) from public.quizzes"); check("anon (prerender) sees published quiz", cur.fetchone()[0] == 1)
check("anon cannot start an attempt", rpc_err(None, "start_attempt", "science-starter", "practice", None) is not None)

# Answer-key lookup (test only, as superuser)
def key_for(version_id, question_id):
    c = superuser()
    c.execute("select public._snapshot_question(%s, %s)", (version_id, question_id))
    return c.fetchone()[0]


def play(uid, state, wrong=()):
    """Answer every question; return final summary. `wrong` = positions to answer wrongly."""
    attempt = state["attempt_id"]
    c = superuser(); c.execute("select quiz_version_id from public.attempts where id = %s", (attempt,))
    vid = c.fetchone()[0]
    expected = 0
    while True:
        q = state["question"]
        assert q is not None, state
        assert "is_correct" not in json.dumps(q) and "accept_min" not in json.dumps(q), "answer leaked!"
        k = key_for(vid, q["id"])
        pos = state["position"]
        want_right = pos not in wrong
        if k["type"] == "slider":
            val = k["slider"]["correct"] if want_right else k["slider"]["min"]
            res = rpc(uid, "answer_question", attempt, None, val)
        else:
            opt = next(o["id"] for o in k["options"] if o["is_correct"] == want_right)
            res = rpc(uid, "answer_question", attempt, opt, None)
        expected += 1 if want_right else 0
        assert res["is_correct"] == want_right, res
        if res["is_last"]:
            break
        state = rpc(uid, "next_question", attempt)
    summary = rpc(uid, "finish_attempt", attempt)
    return summary, expected


# ---------------------------------------------------------------- practice play-through
st = rpc(guest, "start_attempt", "science-starter", "practice", None)
check("start_attempt returns question 1 of 8", st["position"] == 1 and st["total"] == 8)
qjson = json.dumps(st["question"])
check("no answer fields in question payload", all(x not in qjson for x in ["is_correct", "accept_min", "accept_max", "explanation", "correct", "source_url"]), qjson)

st_again = rpc(guest, "start_attempt", "science-starter", "practice", None)
check("refresh resumes the same attempt", st_again["attempt_id"] == st["attempt_id"])

err = rpc_err(guest, "answer_question", st["attempt_id"], str(uuid.uuid4()), None)
check("bogus option rejected", err in ("invalid_option", "invalid_value"), err)
err = rpc_err(guest2, "answer_question", st["attempt_id"], str(uuid.uuid4()), None)
check("another player cannot answer my attempt", err == "attempt_not_found", err)

# answer once, then try answering again before next_question
c = superuser(); c.execute("select quiz_version_id from public.attempts where id=%s", (st["attempt_id"],)); vid = c.fetchone()[0]
k = key_for(vid, st["question"]["id"])
if k["type"] == "slider":
    r = rpc(guest, "answer_question", st["attempt_id"], None, k["slider"]["correct"])
    err = rpc_err(guest, "answer_question", st["attempt_id"], None, k["slider"]["correct"])
else:
    o = next(x["id"] for x in k["options"] if x["is_correct"])
    r = rpc(guest, "answer_question", st["attempt_id"], o, None)
    err = rpc_err(guest, "answer_question", st["attempt_id"], o, None)
check("result returns explanation + source after answering", r["explanation"] and r["source_url"])
check("cannot answer twice / before next question is shown", err == "question_not_shown", err)
check("finish before all answered is refused", rpc_err(guest, "finish_attempt", st["attempt_id"]) == "not_all_answered")

st = rpc(guest, "next_question", st["attempt_id"])
summary, expected = play(guest, st, wrong={3, 5})
check("server score = correct answers", summary["correct"] == expected + 1, f"{summary['correct']} vs {expected + 1}")
check("review has all 8 answers with explanations", len(summary["review"]) == 8 and all(x["explanation"] for x in summary["review"]))
check("practice does not touch leaderboards", summary["ranks"] == {})
check("finish is idempotent", rpc(guest, "finish_attempt", summary["attempt_id"])["correct"] == summary["correct"])

# ---------------------------------------------------------------- ranked + leaderboard
st = rpc(guest, "start_attempt", "science-starter", "ranked", None)
ranked, _ = play(guest, st, wrong={1})
check("ranked finish asks for nickname", ranked["needs_nickname"] is True)
lb = rpc(None, "get_leaderboard", "science-starter", "all_time", 50)
check("no nickname → not on public board", lb["top"] == [])
rpc(guest, "set_age_band", "18_plus")
check("13+ can pick a nickname", rpc(guest, "set_nickname", "Quiz Wizard") == "Quiz Wizard")
superuser().execute("insert into public.blocked_words (word) values ('rude')")
check("blocked word refused", rpc_err(guest, "set_nickname", "Mr Rude 1") == "nickname_not_allowed")
lb = rpc(None, "get_leaderboard", "science-starter", "all_time", 50)
check("public board shows nickname + score, no ids/emails",
      len(lb["top"]) == 1 and lb["top"][0]["nickname"] == "Quiz Wizard" and lb["top"][0]["correct"] == 7
      and "user_id" not in lb["top"][0] and "email" not in json.dumps(lb))
lbme = rpc(guest, "get_leaderboard", "science-starter", "weekly", 50)
check("weekly board + my rank", lbme["me"] and lbme["me"]["rank"] == 1)

# ---------------------------------------------------------------- friend challenge
ch = rpc(guest, "create_friend_challenge", ranked["attempt_id"])
check("challenge code created", len(ch["code"]) == 8)
check("same attempt returns same code", rpc(guest, "create_friend_challenge", ranked["attempt_id"])["code"] == ch["code"])
prev = rpc(None, "get_friend_challenge", ch["code"])
check("public preview shows nickname + score only", prev["creator"]["nickname"] == "Quiz Wizard" and prev["creator_correct"] == 7
      and "email" not in json.dumps(prev))
check("can't play own challenge", rpc_err(guest, "start_attempt", None, "challenge", ch["code"]) == "own_challenge")
st2 = rpc(guest2, "start_attempt", None, "challenge", ch["code"])
c = superuser(); c.execute("select question_order from public.attempts where id in (%s, %s)", (ranked["attempt_id"], st2["attempt_id"]))
orders = [r[0] for r in c.fetchall()]
check("friend gets exactly the same questions in the same order", orders[0] == orders[1])
vs, _ = play(guest2, st2, wrong=set())
check("head-to-head result: friend (8/8) beats creator (7/8)", vs["versus"]["you_won"] is True and vs["versus"]["creator_correct"] == 7)

# ---------------------------------------------------------------- daily challenge
check("daily preview empty before schedule", rpc(None, "get_daily_challenge") == {"today": None, "played_today": False, "streak": 0})
cur = superuser()
cur.execute("insert into public.daily_challenges (challenge_date, quiz_id) values ((now() at time zone 'Europe/London')::date, %s)", (quiz,))
check("no daily before activation", rpc_err(guest2, "start_attempt", None, "daily", None) == "no_daily_today")
superuser().execute("select public.activate_daily_challenge()")
preview = rpc(None, "get_daily_challenge")
check("public daily preview contains metadata only", set(preview["today"]) == {"date", "quiz"} and set(preview["today"]["quiz"]) == {"slug", "title", "cover_image_url"})
d = rpc(guest2, "start_attempt", None, "daily", None)
d2 = rpc(guest, "start_attempt", None, "daily", None)
c = superuser(); c.execute("select question_order from public.attempts where id in (%s,%s)", (d["attempt_id"], d2["attempt_id"]))
o = [r[0] for r in c.fetchall()]
check("everyone gets the same daily questions", o[0] == o[1])
ds, _ = play(guest2, d, wrong=set())
check("daily writes daily rank + streak 1", "daily" in ds["ranks"] and ds["streak"] == 1)
check("daily preview reports own completion", rpc(guest2, "get_daily_challenge")["played_today"] is True)
check("daily preview hides another player's completion", rpc(guest, "get_daily_challenge")["played_today"] is False)
check("anonymous daily preview has no private streak", rpc(None, "get_daily_challenge")["streak"] == 0)
check("one daily per day", rpc_err(guest2, "start_attempt", None, "daily", None) == "daily_already_played")

# ---------------------------------------------------------------- children
rpc(kid, "set_age_band", "under_13")
check("age band locked once set", rpc_err(kid, "set_age_band", "18_plus") == "age_band_locked")
check("kids cannot type a nickname", rpc_err(kid, "set_nickname", "Real Name") == "kids_use_generated_nickname")
nick = rpc(kid, "assign_random_nickname")
check("kids get a generated nickname", nick and nick[0].isupper() and nick[-2:].isdigit(), nick)

# ---------------------------------------------------------------- avatars
traits = {"age_look": "teen", "skin_tone": "brown", "face_shape": "round", "hair_style": "afro",
          "hair_colour": "black", "eye_colour": "dark-brown", "outfit": "hoodie", "outfit_colour": "navy",
          "accessory": "none", "facial_hair": "none"}
a1 = rpc(guest, "request_avatar", json.dumps(traits))
check("avatar request accepted (pending)", a1["status"] == "pending")
check("same trait combo refused for another user", rpc_err(guest2, "request_avatar", json.dumps(traits)) == "avatar_combo_taken")
t2 = dict(traits, outfit_colour="red")
check("changing one trait makes it unique", rpc(guest2, "request_avatar", json.dumps(t2))["status"] == "pending")
check("kids cannot pick adult look", rpc_err(kid, "request_avatar", json.dumps(dict(traits, age_look="adult", outfit_colour="pink"))) == "invalid_trait")
check("facial hair only for adult look", rpc_err(guest, "request_avatar", json.dumps(dict(traits, facial_hair="goatee", outfit_colour="teal"))) == "invalid_trait")
check("unknown trait value refused", rpc_err(guest, "request_avatar", json.dumps(dict(traits, hair_style="mohawk-xx"))) == "invalid_trait")
check("cannot activate a pending avatar", rpc_err(guest, "set_active_avatar", a1["avatar_id"]) == "avatar_not_ready")
superuser().execute("update public.avatars set status='ready', image_url='https://ik.imagekit.io/x/a.png' where id=%s", (a1["avatar_id"],))
rpc(guest, "set_active_avatar", a1["avatar_id"])
lb = rpc(None, "get_leaderboard", "science-starter", "all_time", 50)
check("avatar shows on leaderboard", lb["top"][0]["avatar_url"] == "https://ik.imagekit.io/x/a.png")
for i, col in enumerate(["emerald", "mustard"]):
    rpc(guest, "request_avatar", json.dumps(dict(traits, outfit_colour=col)))
check("daily avatar limit (3) enforced", rpc_err(guest, "request_avatar", json.dumps(dict(traits, outfit_colour="purple"))) == "avatar_limit_reached")

# ---------------------------------------------------------------- upgrade + parental consent
superuser().execute("update auth.users set is_anonymous = false, email = 'parent@example.com' where id = %s", (kid,))
c = superuser(); c.execute("select p.role, pc.status, pc.parent_email from public.profiles p join public.parental_consents pc on pc.child_id = p.id where p.id = %s", (kid,))
check("child upgrade → player + pending parental consent", c.fetchone() == ("player", "pending", "parent@example.com"))
rpc(kid, "confirm_parental_consent")
c = superuser(); c.execute("select status from public.parental_consents where child_id=%s", (kid,))
check("parent confirms consent", c.fetchone()[0] == "confirmed")

# ---------------------------------------------------------------- versioning
cur = as_user(admin)
cur.execute("update public.question_options set label = 'Changed' where question_id = %s", (qids[0],))
rpc(admin, "publish_quiz", quiz)
c = superuser(); c.execute("select count(distinct quiz_version_id) from public.attempts where quiz_id=%s", (quiz,))
c2 = superuser(); c2.execute("select max(version) from public.quiz_versions where quiz_id=%s", (quiz,))
check("re-publish makes v2; old attempts keep v1", c2.fetchone()[0] == 2 and c.fetchone()[0] >= 1)
c = superuser(); c.execute("select count(*) from public.audit_log where table_name='question_options' and action='UPDATE'")
check("content edits are audited", c.fetchone()[0] >= 1)

# ---------------------------------------------------------------- AI draft import
cur = as_user(editor)
cur.execute("""insert into public.ai_question_drafts (topic, category_id, status, result) values
  ('Planets', %s, 'ready', %s) returning id""", (cat, json.dumps({"questions": [
    {"type": "choice", "prompt": "Which planet is the hottest?", "explanation": "Venus, due to CO2.",
     "source_url": "https://example.org/venus", "options": [{"label": "Mercury", "is_correct": False}, {"label": "Venus", "is_correct": True}]},
    {"type": "choice", "prompt": "Unsourced question here?", "options": [{"label": "x", "is_correct": True}]}]})))
draft = cur.fetchone()[0]
res = rpc(editor, "import_ai_draft", draft)
check("AI import keeps sourced, skips unsourced", res == {"imported": 1, "skipped": 1}, res)
c = superuser(); c.execute("select status, origin from public.questions where prompt = 'Which planet is the hottest?'")
check("AI questions land as in_review, origin=ai", c.fetchone() == ("in_review", "ai"))
check("players cannot import drafts", rpc_err(guest, "import_ai_draft", draft) == "staff_only")

# ---------------------------------------------------------------- timing is server-side and fair
as_user(admin).execute("update public.quizzes set time_limit_seconds = 10 where id = %s", (quiz,))
t = rpc(guest, "start_attempt", "science-starter", "practice", None)
check("timed question exposes a server deadline", t["question_deadline"] is not None)
resumed = rpc(guest, "start_attempt", "science-starter", "practice", None)
check("resume preserves question deadline", resumed["question_deadline"] == t["question_deadline"])
remaining = (datetime.fromisoformat(t["question_deadline"]) - datetime.fromisoformat(t["server_now"])).total_seconds()
check("deadline matches server timer", 9 <= remaining <= 10)
superuser().execute("update public.attempts set current_sent_at = now() - interval '3 seconds' where id = %s", (t["attempt_id"],))
c = superuser(); c.execute("select quiz_version_id from public.attempts where id=%s", (t["attempt_id"],)); vid = c.fetchone()[0]
k = key_for(vid, t["question"]["id"])
right = (None, k["slider"]["correct"]) if k["type"] == "slider" else (next(o["id"] for o in k["options"] if o["is_correct"]), None)
rpc(guest, "answer_question", t["attempt_id"], *right)
# Player now "reads the explanation" for 30 s before tapping Next — must not count.
superuser().execute("update public.attempts set started_at = started_at where id = %s", (t["attempt_id"],))
c = superuser(); c.execute("select answer_time_ms, current_sent_at from public.attempts where id=%s", (t["attempt_id"],))
ms, sent = c.fetchone()
check("answer time measured by server (~3 s)", 2900 <= ms <= 4500, ms)
check("clock stops while reading the explanation", sent is None)
t = rpc(guest, "next_question", t["attempt_id"])
superuser().execute("update public.attempts set current_sent_at = now() - interval '15 seconds' where id = %s", (t["attempt_id"],))
k = key_for(vid, t["question"]["id"])
right = (None, k["slider"]["correct"]) if k["type"] == "slider" else (next(o["id"] for o in k["options"] if o["is_correct"]), None)
r = rpc(guest, "answer_question", t["attempt_id"], *right)
check("answer after the time limit is marked wrong", r["timed_out"] is True and r["is_correct"] is False)
c = superuser(); c.execute("select answer_time_ms from public.attempts where id=%s", (t["attempt_id"],))
check("timed-out question counts at most the limit (10 s)", c.fetchone()[0] <= 4500 + 10000)
as_user(admin).execute("update public.quizzes set time_limit_seconds = null where id = %s", (quiz,))

# ---------------------------------------------------------------- fresh unranked daily rounds
check("anon cannot start daily practice", rpc_err(None, "start_daily_practice") is not None)
fresh_user = new_user(True)
check("daily completion required for fresh rounds", rpc_err(fresh_user, "start_daily_practice") == "daily_not_finished")
# Use a larger synthetic test-only pool: twelve questions, three per round.
for n in range(4):
    qid = add_choice(f"Fresh synthetic question number {n}?", ["A", "B"], 0)
    as_user(admin).execute("insert into public.quiz_questions (quiz_id, question_id, position) values (%s,%s,%s)", (quiz, qid, 100+n))
as_user(admin).execute("update public.quizzes set question_count = 3, time_limit_seconds = 30 where id = %s", (quiz,))
fresh_ver = rpc(admin, "publish_quiz", quiz)
superuser().execute("update public.daily_challenges set quiz_version_id = %s where challenge_date = public._london_today()", (fresh_ver,))
fd = rpc(fresh_user, "start_attempt", None, "daily", None)
play(fresh_user, fd)
def attempt_order(attempt_id):
    c = superuser(); c.execute("select question_order from public.attempts where id=%s", (attempt_id,))
    return set(c.fetchone()[0])
seen = attempt_order(fd["attempt_id"])
def fresh_connection_start():
    with psycopg.connect(DSN, autocommit=True) as parallel:
        with parallel.cursor() as pc:
            pc.execute("set role authenticated")
            pc.execute("select set_config('request.jwt.claim.sub', %s, false)", (str(fresh_user),))
            pc.execute("select public.start_daily_practice()")
            return pc.fetchone()[0]
with ThreadPoolExecutor(max_workers=2) as pool:
    simultaneous = list(pool.map(lambda _: fresh_connection_start(), range(2)))
check("simultaneous fresh starts reserve one round", simultaneous[0]["attempt_id"] == simultaneous[1]["attempt_id"])
fp = rpc(fresh_user, "start_daily_practice")
check("fresh round is practice with no answer leakage", fp["mode"] == "practice" and "is_correct" not in json.dumps(fp))
check("fresh round excludes ranked daily questions", seen.isdisjoint(attempt_order(fp["attempt_id"])))
resumed = rpc(fresh_user, "start_daily_practice")
check("fresh refresh preserves attempt and deadline", resumed["attempt_id"] == fp["attempt_id"] and resumed["question_deadline"] is not None and resumed["question_deadline"] == fp["question_deadline"])
# Same identity in a new connection still resumes the same reserved set.
other = psycopg.connect(DSN, autocommit=True)
oc = other.cursor(); oc.execute("set role authenticated")
oc.execute("select set_config('request.jwt.claim.sub', %s, false)", (str(fresh_user),))
oc.execute("select public.start_daily_practice()")
check("same account on another connection resumes round", oc.fetchone()[0]["attempt_id"] == fp["attempt_id"])
other.close()
seen |= attempt_order(fp["attempt_id"])
summary, _ = play(fresh_user, fp)
check("fresh round has no ranks and preserves daily streak", not summary["ranks"] and summary["streak"] == 1)
for i in range(2):
    fp = rpc(fresh_user, "start_daily_practice")
    order = attempt_order(fp["attempt_id"])
    check(f"fresh round {i+2} excludes every prior question", seen.isdisjoint(order))
    seen |= order
    play(fresh_user, fp)
check("exhausted pool does not silently repeat", rpc_err(fresh_user, "start_daily_practice") == "fresh_questions_exhausted")
check("fresh rounds do not reopen ranked daily", rpc_err(fresh_user, "start_attempt", None, "daily", None) == "daily_already_played")

# ---------------------------------------------------------------- account deletion
rpc(guest2, "delete_my_account")
c = superuser(); c.execute("select count(*) from public.profiles where id=%s", (guest2,))
check("delete my account removes profile (cascade)", c.fetchone()[0] == 0)

failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
raise SystemExit(1 if failed else 0)
