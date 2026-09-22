export interface CyberAttack {
  id: string;
  name: string;
  indicator: string;
  correctAnswer: string; // the correct defense option text
  wrongAnswers: string[]; // exactly 3 wrong options
  icon: string;
}

// Shuffled representation used in-game (built fresh per attack)
export interface ShuffledAttack {
  attack: CyberAttack;
  options: string[]; // 4 options in random order
  correctOption: number; // 1-indexed position of the correct answer
}

/** Fisher-Yates shuffle — returns a new array */
export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const CYBER_ATTACKS: CyberAttack[] = [
  {
    id: "phishing",
    name: "Phishing Attack",
    indicator: "Suspicious login domain detected",
    correctAnswer: "Block Domain",
    wrongAnswers: ["Ignore", "Allow Access", "Download File"],
    icon: "🎣",
  },
  {
    id: "malware",
    name: "Malware Detected",
    indicator: "Unknown executable triggered",
    correctAnswer: "Quarantine File",
    wrongAnswers: ["Run File", "Ignore", "Share File"],
    icon: "🦠",
  },
  {
    id: "sql-injection",
    name: "SQL Injection",
    indicator: "Input detected: ' OR 1=1 --",
    correctAnswer: "Sanitize Input",
    wrongAnswers: ["Execute Query", "Log Only", "Ignore"],
    icon: "💉",
  },
  {
    id: "brute-force",
    name: "Brute Force Attack",
    indicator: "Multiple failed login attempts",
    correctAnswer: "Enable MFA / Lock Account",
    wrongAnswers: ["Ignore", "Reset Server", "Allow Access"],
    icon: "🔓",
  },
  {
    id: "data-exfiltration",
    name: "Data Exfiltration",
    indicator: "Large outbound traffic detected",
    correctAnswer: "Block Transfer",
    wrongAnswers: ["Allow Transfer", "Monitor Only", "Restart System"],
    icon: "📤",
  },
  {
    id: "mitm",
    name: "MITM Attack",
    indicator: "Certificate mismatch detected",
    correctAnswer: "Validate Certificate",
    wrongAnswers: ["Accept Anyway", "Ignore Warning", "Disable HTTPS"],
    icon: "🕵️",
  },
  {
    id: "zero-day",
    name: "Zero-Day Exploit",
    indicator: "Unknown vulnerability behavior detected",
    correctAnswer: "Apply Patch",
    wrongAnswers: ["Ignore Alert", "Roll Back Logs", "Increase Bandwidth"],
    icon: "💣",
  },
  {
    id: "dns-spoofing",
    name: "DNS Spoofing",
    indicator: "Redirect to fake domain despite correct URL",
    correctAnswer: "Use Secure DNS",
    wrongAnswers: ["Clear Cache", "Retry Request", "Disable Firewall"],
    icon: "🌐",
  },
  {
    id: "reverse-shell",
    name: "Reverse Shell",
    indicator: "Unexpected outbound connection to external server",
    correctAnswer: "Kill Process",
    wrongAnswers: ["Monitor Traffic", "Allow Connection", "Restart App"],
    icon: "🔩",
  },
  {
    id: "privilege-escalation",
    name: "Privilege Escalation",
    indicator: "User gaining admin access unexpectedly",
    correctAnswer: "Revoke Access",
    wrongAnswers: ["Log Event", "Allow Temporarily", "Reset Password"],
    icon: "👑",
  },
];

/** Pick a random attack and shuffle its options */
export function getShuffledAttack(): ShuffledAttack {
  const attack = CYBER_ATTACKS[Math.floor(Math.random() * CYBER_ATTACKS.length)];
  const options = shuffleArray([attack.correctAnswer, ...attack.wrongAnswers]);
  const correctOption = options.indexOf(attack.correctAnswer) + 1; // 1-indexed
  return { attack, options, correctOption };
}
