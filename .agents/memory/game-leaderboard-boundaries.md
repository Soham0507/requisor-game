---
name: Imported game leaderboard boundaries
description: Privacy and retry boundaries when connecting imported games to the shared portal.
---

Connect imported game leaderboards to the portal's existing private player-submission storage, with a separately validated, game-scoped public score response that never includes contact details.

**Why:** Soccer's imported standalone server and other games use the same root score URLs and browser cache keys. Reusing them in the portal can mix unrelated rankings, expose emails, or make failed saves appear successful. A separate database is unnecessary when the portal already captures player leads.

**How to apply:** Scope API URLs and browser caches to the game. Keep a stable submission ID for each round so uncertain network responses can be retried safely. Confirm server persistence before showing success. Prevent generic lead-capture metadata from bypassing score validation. Preserve existing contact-collection forms but explain which fields are public and keep email out of public responses and cached rankings.

Do not automatically replay legacy shared offline queues when connecting a game to the portal.

**Why:** Imported games reused queue keys, so existing entries cannot reliably establish which game produced them or whether they were already saved. Replaying them risks misattributed or duplicate results and retransmitting contacts.

**How to apply:** Use confirmed portal results as the ranking source. If offline capture is requested later, design a new game-scoped queue with stable round identifiers and an explicit pending state rather than migrating anonymous legacy entries.
