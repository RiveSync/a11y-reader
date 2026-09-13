/**
 * Perf fixture: 3,000 text-bearing elements (PRD 11).
 *
 * Font scaling has to read every element's computed size before writing any of
 * them; interleaving reads and writes forces a style recalculation per element,
 * which is the difference between ~15 ms and several seconds here.
 */
const COUNT = 3000;

export default function PerfFixture() {
  return (
    <main>
      <h1>Perf fixture</h1>
      <p data-testid="perf-count">{COUNT} paragraphs below.</p>
      <div id="bulk">
        {Array.from({ length: COUNT }, (_, i) => (
          <p key={i} style={{ fontSize: `${13 + (i % 5)}px` }}>
            Paragraph {i} — mixed px sizes so the walker cannot shortcut by assuming a
            single inherited value.
          </p>
        ))}
      </div>
    </main>
  );
}
