let speaking = false;

export function speak(text: string, priority = false): void {
  if (!window.speechSynthesis) return;
  if (speaking && !priority) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.15;
  utterance.pitch = 0.85;
  utterance.volume = 0.9;

  utterance.onstart = () => { speaking = true; };
  utterance.onend = () => { speaking = false; };
  utterance.onerror = () => { speaking = false; };

  window.speechSynthesis.speak(utterance);
}

export function announceAttack(attackName: string): void {
  speak(`Warning! ${attackName} detected!`, true);
}

export function announceCorrect(streak: number): void {
  if (streak >= 8) speak("Incredible! Combo times four!", true);
  else if (streak >= 5) speak("Amazing! Triple combo!", true);
  else if (streak >= 3) speak("Double combo! Threat neutralized!", true);
  else speak("Threat neutralized!");
}

export function announceWrong(): void {
  speak("Security breach! System compromised!", true);
}

export function announceTimeout(): void {
  speak("Time's up! System compromised!", true);
}

export function announceBonusRound(): void {
  speak("Bonus round! Double points activated!", true);
}

export function announceLevelUp(level: number): void {
  speak(`Level ${level} reached! Threat level increasing!`, true);
}
