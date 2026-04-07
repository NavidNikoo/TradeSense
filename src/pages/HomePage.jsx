import { Link } from 'react-router-dom';
import DashboardImg from '../photos/Dashboard.jpeg';

export function HomePage() {
  return (
    <div className="landing-page">
      {/* ---- Nav ---- */}
      <nav className="landing-nav">
        <Link className="landing-nav-brand" to="/">TradeSense</Link>
        <div className="landing-nav-links">
          <a className="landing-nav-link" href="#features">Features</a>
          <a className="landing-nav-link" href="#product">Product</a>
          <Link className="landing-nav-link" to="/login">Log in</Link>
          <Link className="landing-nav-cta" to="/signup">Sign up free</Link>
        </div>
      </nav>

      {/* ---- Hero ---- */}
      <header className="landing-hero">
        <h1 className="landing-headline">
          Understand market behavior<br />
          <span className="landing-headline-accent">before you trade</span>
        </h1>

        <p className="landing-subheadline">
          TradeSense combines real-time stock data, company news, and AI-powered
          sentiment analysis so new traders can learn the ropes — and seasoned
          ones can reinforce their edge.
        </p>

        <div className="landing-cta-row">
          <Link className="landing-cta-primary" to="/signup">
            Get started &mdash; it&rsquo;s free &rarr;
          </Link>
          <Link className="landing-cta-secondary" to="/login">
            Log in
          </Link>
        </div>
      </header>

      {/* ---- Product showcase ---- */}
      <section className="landing-showcase" id="product">
        <div className="landing-mock">
          <img
            className="landing-mock-img"
            src={DashboardImg}
            alt="TradeSense dashboard showing ticker panels, price charts, and sentiment analysis"
          />
        </div>
      </section>

      <hr className="landing-divider" />

      {/* ---- Features ---- */}
      <section id="features">
        <div className="landing-section-header">
          <span className="landing-section-kicker">Features</span>
          <h2 className="landing-section-title">
            Everything you need to read the market
          </h2>
          <p className="landing-section-body">
            A focused toolkit that pulls together price action, headlines, and
            sentiment — no information overload, no paid tiers.
          </p>
        </div>

        <div className="landing-features">
          <div className="landing-feature">
            <div className="landing-feature-icon" aria-hidden="true">&#128200;</div>
            <h3>Live Quotes &amp; Charts</h3>
            <p>
              Real-time prices from Finnhub and interactive historical charts
              with multiple time ranges — from intraday to yearly.
            </p>
          </div>

          <div className="landing-feature">
            <div className="landing-feature-icon" aria-hidden="true">&#128240;</div>
            <h3>Company News</h3>
            <p>
              Latest headlines pulled directly from Finnhub, surfaced alongside
              each stock so you see what&rsquo;s moving the price.
            </p>
          </div>

          <div className="landing-feature">
            <div className="landing-feature-icon" aria-hidden="true">&#129504;</div>
            <h3>AI Sentiment Scoring</h3>
            <p>
              Every article is scored by a FinBERT language model — positive,
              negative, or neutral — so you don&rsquo;t have to read them all.
            </p>
          </div>

          <div className="landing-feature">
            <div className="landing-feature-icon" aria-hidden="true">&#128203;</div>
            <h3>Personal Watchlist</h3>
            <p>
              Add the tickers you care about, reorder by priority, and see
              everything at a glance on your dashboard.
            </p>
          </div>

          <div className="landing-feature">
            <div className="landing-feature-icon" aria-hidden="true">&#9200;</div>
            <h3>Sentiment Time-Lapse</h3>
            <p>
              Snapshot a stock&rsquo;s price and sentiment, then review how both
              evolved over days or weeks on a dual-axis timeline.
            </p>
          </div>

          <div className="landing-feature">
            <div className="landing-feature-icon" aria-hidden="true">&#128274;</div>
            <h3>Completely Free</h3>
            <p>
              No credit card, no premium tier. Sign up with an email and start
              exploring the market immediately.
            </p>
          </div>
        </div>
      </section>

      {/* ---- Built-with strip ---- */}
      <div className="landing-strip">
        <span className="landing-strip-label">Built with</span>
        <div className="landing-strip-row">
          <span className="landing-strip-item">React</span>
          <span className="landing-strip-item">Firebase</span>
          <span className="landing-strip-item">Finnhub</span>
          <span className="landing-strip-item">Hugging Face</span>
          <span className="landing-strip-item">Recharts</span>
        </div>
      </div>

      {/* ---- Footer ---- */}
      <footer className="landing-footer">
        &copy; {new Date().getFullYear()} TradeSense &middot; CPSC&nbsp;491
        Senior Capstone &middot;{' '}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}
