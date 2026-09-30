// ── Quiz data — questions/options, and each option's contribution
// toward every vehicle's score. Additive scoring: every answer adds
// its points to every vehicle simultaneously, per the original v5
// matrix. No elimination, no branching. Customizable via the
// CDH_BRAND_UPDATE postMessage (theme.quiz) — see the brand-bridge
// script at the end of this file.
const DEFAULT_QUIZ = [
  {
    text: "How far does the road usually take you?",
    options: [
      { text: "A quick trip around town — under 25 miles", scores: { ES: 3, NX: 0, RZ: 0, RX: 1, TX: 0, TZ: 1 } },
      { text: "An easy daily commute — 25–50 miles", scores: { ES: 0, NX: 3, RZ: 1, RX: 0, TX: 0, TZ: 0 } },
      { text: "However far it takes — 100+ miles", scores: { ES: 0, NX: 0, RZ: 0, RX: 3, TX: 0, TZ: 0 } },
    ],
  },
  {
    text: "Who's usually along for the drive?",
    options: [
      { text: "Just me, no compromises", scores: { ES: 1, NX: 3, RZ: 0, RX: 0, TX: 0, TZ: 0 } },
      { text: "A tight crew — 2–4 people", scores: { ES: 0, NX: 0, RZ: 3, RX: 0, TX: 0, TZ: 1 } },
      { text: "Everyone's coming — 5–6 people", scores: { ES: 0, NX: 0, RZ: 1, RX: 3, TX: 1, TZ: 0 } },
    ],
  },
  {
    text: "Describe your everyday drive.",
    options: [
      { text: "City streets, sharp turns, tight spots", scores: { ES: 1, NX: 2, RZ: 1, RX: 1, TX: 0, TZ: 0 } },
      { text: "Highway miles, cruise control earned", scores: { ES: 0, NX: 0, RZ: 2, RX: 0, TX: 0, TZ: 3 } },
      { text: "Long hauls that reward a good ride", scores: { ES: 0, NX: 0, RZ: 0, RX: 0, TX: 3, TZ: 0 } },
    ],
  },
  {
    text: "What should your Lexus be ready for?",
    options: [
      { text: "Getting you there, exactly on time", scores: { ES: 1, NX: 0, RZ: 1, RX: 0, TX: 0, TZ: 3 } },
      { text: "Family first — every seat matters", scores: { ES: 2, NX: 0, RZ: 0, RX: 2, TX: 1, TZ: 0 } },
      { text: "People and gear, no trade-offs", scores: { ES: 0, NX: 2, RZ: 0, RX: 0, TX: 2, TZ: 0 } },
    ],
  },
  {
    text: "Plans change. Where does the day take you?",
    options: [
      { text: "Somewhere close, decided on a whim", scores: { ES: 3, NX: 0, RZ: 0, RX: 0, TX: 0, TZ: 1 } },
      { text: "Worth the drive — 100+ miles out", scores: { ES: 1, NX: 2, RZ: 0, RX: 0, TX: 2, TZ: 0 } },
      { text: "A weekend worth chasing", scores: { ES: 0, NX: 0, RZ: 3, RX: 0, TX: 0, TZ: 1 } },
    ],
  },
];

let QUIZ = DEFAULT_QUIZ;

// Builds the <div class="screen" id="s-qN"> question elements from
// QUIZ into #question-screens-slot, replacing whatever was there
// before. Used for the initial render and to rebuild everything when
// a customized quiz arrives via CDH_BRAND_UPDATE. Every class name
// here matches the original hand-authored markup exactly, so all
// existing CSS/animation code — which selects by class, and by the
// `[id^="s-q"]` prefix for the landscape two-column layout — keeps
// working no matter how many questions/options there are.
function renderQuestionScreens(quiz) {
  const slot = document.getElementById("question-screens-slot");
  if (!slot) return;
  slot.innerHTML = "";
  quiz.forEach((q, qi) => {
    const qNum = qi + 1;
    const screen = document.createElement("div");
    screen.className = "screen";
    screen.id = "s-q" + qNum;

    const scrim = document.createElement("div");
    scrim.className = "text-scrim";
    const label = document.createElement("div");
    label.className = "q-label";
    label.textContent = "Question " + qNum + " of " + quiz.length;
    const text = document.createElement("div");
    text.className = "q-text";
    text.textContent = q.text;
    scrim.appendChild(label);
    scrim.appendChild(text);
    screen.appendChild(scrim);

    const options = document.createElement("div");
    options.className = "options";
    q.options.forEach((opt, oi) => {
      const btn = document.createElement("button");
      btn.className = "opt-btn";
      btn.addEventListener("click", function () {
        answer(qNum, oi, btn);
      });
      const optLabel = document.createElement("span");
      optLabel.className = "opt-label";
      optLabel.textContent = opt.text;
      btn.appendChild(optLabel);
      options.appendChild(btn);
    });
    screen.appendChild(options);

    slot.appendChild(screen);
  });
}
renderQuestionScreens(QUIZ);
