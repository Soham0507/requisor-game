/** Tailwind config for the Lexus Energy Quiz single-file build.
 *  preflight is OFF so Tailwind's CSS reset never touches the
 *  hand-tuned quiz styles. Rebuild command:
 *  npx tailwindcss -c tailwind.config.js -i tailwind.input.css -o tailwind.build.css --minify
 */
module.exports = {
  content: ['./lexus_energy_quiz_tuned_v018.html'],
  corePlugins: { preflight: false },
  blocklist: ['visible'],  // quiz has its own .visible (opacity toggle)
  theme: { extend: {} },
  plugins: [],
};
