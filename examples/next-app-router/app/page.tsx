/**
 * Verification fixture.
 *
 * Every block here exists to exercise a specific correction from the plan.
 * Do not "tidy" it — the awkward bits are the test.
 */
export default function Home() {
  return (
    <main>
      <div className="hero">
        <h1>Reading preferences, built into the page</h1>
        <p>
          This example is the harness the widget is verified against. It is intentionally
          px-based, uses a serif body font, and mixes in the content shapes that blanket CSS
          transformations tend to break.
        </p>
      </div>

      <h2>Links and inline text</h2>
      <p>
        High contrast must turn links yellow while leaving body text white — see{' '}
        <a href="https://www.w3.org/TR/WCAG22/">WCAG 2.2</a> and{' '}
        <a href="https://opendyslexic.org/">OpenDyslexic</a>. If these render white rather than
        yellow, the specificity fix in the contrast stylesheet has regressed.
      </p>

      <h2>Icon fonts</h2>
      <p className="icon-row">
        <span className="material-symbols-outlined" aria-hidden="true">
          home
        </span>
        <span className="material-symbols-outlined" aria-hidden="true">
          settings
        </span>
        <span className="material-symbols-outlined" aria-hidden="true">
          search
        </span>
        <span>
          These must stay glyphs with the dyslexic font on. If they read as the words
          &ldquo;home settings search&rdquo;, icon tagging has regressed.
        </span>
      </p>

      <h2>Transparent media</h2>
      <p>
        The image below has a transparent background. Under high contrast it must not gain a
        black box.
      </p>
      <img
        src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAXklEQVR4nO3QMQ0AMAzAsPInvZ3ppROZiCXvzJzHnLcDfjMgbkDcgLgBcQPiBsQNiBsQNyBuQNyAuAFxA+IGxA2IGxA3IG5A3IC4AXED4gbEDYgbEDcgbkDcgLgL0wsBvVJbfjsAAAAASUVORK5CYII="
        alt="A translucent square"
        width={64}
        height={64}
      />

      <h2>Code, which should not be transformed</h2>
      <p>
        Inline <code>const scale = 1.5</code> and a block:
      </p>
      <pre data-a11y-exclude>
        <code>{`engine.apply({
  dyslexicFont: true,
  fontScale: 1.4,
});`}</code>
      </pre>

      <h2>Form controls</h2>
      <p>
        <label htmlFor="demo-input">Sample field </label>
        <input id="demo-input" type="text" placeholder="Type here" />{' '}
        <button type="button">A button</button>
      </p>

      <h2>Long-form text</h2>
      <p>
        Readable typography is the whole point. Letter spacing, line spacing and text size each
        change how this paragraph sits on the page, and turning all of them off again must return
        it to exactly the state it started in — no leftover inline styles, no stray attributes.
        That round trip is the property most of the test suite exists to protect.
      </p>
      <p>
        The reading aid draws on top of everything here without touching the document: a ruler
        tints one band, a focus mask dims everything outside it. Neither may intercept clicks,
        and neither may survive being switched off.
      </p>
    </main>
  );
}
