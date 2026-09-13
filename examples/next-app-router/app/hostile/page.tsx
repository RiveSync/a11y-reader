/**
 * Shadow-DOM isolation fixture (PRD 12.5).
 *
 * An aggressive global stylesheet that would wreck the widget if any of it
 * crossed the shadow boundary.
 */
export default function HostileFixture() {
  return (
    <main>
      <style>{`
        * {
          font-family: "Comic Sans MS", cursive !important;
          color: #ff0000 !important;
          letter-spacing: 4px !important;
          border-radius: 0 !important;
          text-transform: uppercase !important;
        }
        button { background: magenta !important; padding: 40px !important; }
      `}</style>
      <h1>Hostile stylesheet</h1>
      <p id="victim">
        This page forces Comic Sans, red text and uppercase on every element with
        !important. The widget must be completely unaffected.
      </p>
    </main>
  );
}
