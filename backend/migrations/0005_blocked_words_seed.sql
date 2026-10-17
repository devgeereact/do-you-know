-- Starter nickname moderation list. Player::isBlocked matches each word as a substring of the
-- lower-cased, letters-and-digits-only nickname and of its leetspeak reading (0=o 1=i 3=e 4=a 5=s 7=t),
-- so short words that sit inside innocent ones (for example rape in grape, coon in raccoon,
-- cock in peacock, dick in dickens, pedo in torpedo, sex in sussex) are left out on purpose.
-- The owner reviews and extends this list before launch. INSERT IGNORE keeps re-runs safe.
INSERT IGNORE INTO blocked_words (word) VALUES
 ('fuck'),('shit'),('cunt'),('bitch'),('bastard'),('wanker'),('wank'),('twat'),('bollocks'),
 ('asshole'),('arsehole'),('dickhead'),('cocksucker'),('slut'),('whore'),('penis'),('vagina'),
 ('porn'),('dildo'),('jizz'),('sexy'),('pussy'),('rapist'),('paedo'),('pedophile'),('killyourself'),
 ('nazi'),('hitler'),('nigger'),('nigga'),('faggot'),('retard'),('tranny'),('kike'),('chink'),
 ('wetback'),('spastic'),('gook'),('raghead'),
 ('admin'),('moderator'),('staff'),('official');
