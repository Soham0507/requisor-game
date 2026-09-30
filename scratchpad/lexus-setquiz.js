renderQuestionScreens(QUIZ);

// Called by the brand-bridge script (a separate <script> tag, later in
// this file) to swap in a customized quiz — a `let` declared here
// isn't visible from a different <script> element, so this function
// is the bridge between the two. Resets to the start screen, since a
// mid-quiz swap would leave stale progress/answers pointing at
// questions that may no longer exist.
function setQuiz(newQuiz) {
  QUIZ = Array.isArray(newQuiz) && newQuiz.length ? newQuiz : DEFAULT_QUIZ;
  renderQuestionScreens(QUIZ);
  scores = { ES: 0, NX: 0, RZ: 0, RX: 0, TX: 0, TZ: 0 };
  lastAnswer = null;
  answerHistory = [];
  answeredQs.clear();
  const deviceEl = document.querySelector(".device");
  if (deviceEl) deviceEl.classList.add("start-state");
  showScreen("start");
}
