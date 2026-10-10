---
name: Quiz and survey vertical
description: Quiz-game classification, visual constraints, and customer question-authoring scope.
---

The imported fivegames library belongs under the **Quiz / Questionnaire / Survey** vertical.

Its game interfaces should retain Apple's light look: SF Pro via the system font on Apple devices, with iOS-style forms, switches, and sheets.

**Why:** The user explicitly stated this product classification and visual direction. These experiences should not inherit an arcade-style identity or the portal's dark theme merely because the catalog also contains action games.

**How to apply:** Preserve this classification during catalog changes and keep game-level light styling isolated from portal themes. Do not bundle proprietary SF Pro font files; use the Apple system font stack.

Customers must be able to write their own questions or import questions across the six-game quiz collection. The user chose direct Excel (.xlsx), CSV, and JSON uploads.

**Why:** The user requested self-service question customization across the six quiz games, not just visual branding, and explicitly selected these three upload formats.

**How to apply:** Preserve all three import paths when extending the authoring experience. Keep each game's distinct question mechanics; numeric guesses and product recommendations are not conventional right/wrong multiple-choice quizzes.