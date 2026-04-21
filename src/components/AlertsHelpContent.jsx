export function AlertsHelpContent() {
  return (
    <div className="alerts-help">
      <section>
        <h3>What are alerts?</h3>
        <p>
          An <strong>alert rule</strong> is a saved condition you attach to a
          ticker (e.g. <em>“tell me if AAPL drops below $180”</em>). When the
          condition becomes true, TradeSense records a{' '}
          <strong>triggered event</strong> on this page and bumps the red
          badge on the <strong>Alerts</strong> nav link.
        </p>
      </section>

      <section>
        <h3>How triggering works</h3>
        <ul>
          <li>
            <strong>Edge detection</strong>: an alert fires only when the
            condition <em>becomes</em> true (not every render while it stays
            true).
          </li>
          <li>
            <strong>Cooldown</strong>: a rule can trigger at most once every
            30 minutes so you don’t get spammed by small oscillations.
          </li>
          <li>
            <strong>Evaluation</strong>: rules are checked while you’re on the{' '}
            <strong>Dashboard</strong>, whenever a ticker card finishes
            loading its price / sentiment / RSI.
          </li>
        </ul>
      </section>

      <section>
        <h3>Trigger types</h3>
        <dl className="alerts-help-dl">
          <dt>Price crosses above $X</dt>
          <dd>Fires when the current price rises to or past your threshold.</dd>

          <dt>Price crosses below $X</dt>
          <dd>Fires when the current price falls to or past your threshold.</dd>

          <dt>Daily % change beyond ±X%</dt>
          <dd>
            Fires when today’s move (up or down) is bigger than ±X%.
            Threshold <code>0.1</code> fires on almost any move — handy for
            testing.
          </dd>

          <dt>RSI enters overbought (≥ 70)</dt>
          <dd>
            RSI is a momentum indicator on 0–100. Readings ≥ 70 suggest a
            stock may be overextended.
          </dd>

          <dt>RSI enters oversold (≤ 30)</dt>
          <dd>Readings ≤ 30 suggest a stock may be undervalued in the short term.</dd>

          <dt>Sentiment turns to target label</dt>
          <dd>
            Fires when the aggregate FinBERT sentiment for the ticker becomes
            your chosen label (Positive, Neutral, or Negative).
          </dd>
        </dl>
      </section>

      <section>
        <h3>Reading a triggered event</h3>
        <ul>
          <li><strong>Bold symbol</strong> + short time — which ticker, when.</li>
          <li>One-line <strong>message</strong> — what was hit and the value.</li>
          <li>Red dot — unread. Click the event to mark it read.</li>
          <li><strong>Mark N read</strong> / <strong>Clear all</strong> — top-right controls.</li>
        </ul>
      </section>

      <section>
        <h3>Quick demo recipe</h3>
        <ol>
          <li>Create a rule: <em>Daily % change beyond ±0.1%</em> on a ticker from your watchlist.</li>
          <li>Open the <strong>Dashboard</strong> and wait ~2 seconds.</li>
          <li>Come back here — you should see a new triggered event and the nav badge.</li>
        </ol>
      </section>

      <section>
        <h3>Known limits (MVP)</h3>
        <ul>
          <li>
            Rules live in Firestore (synced across devices). Triggered events
            are stored on <strong>this device</strong> only.
          </li>
          <li>
            There’s no background polling yet — you have to visit the
            Dashboard for evaluation to run.
          </li>
          <li>
            RSI-based rules only fire after you expand a ticker’s chart at
            least once (that’s when history is loaded and RSI is computed).
          </li>
        </ul>
      </section>
    </div>
  )
}
