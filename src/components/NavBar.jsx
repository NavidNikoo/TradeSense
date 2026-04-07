import { Link } from 'react-router-dom';

const NavBar = () => (
  <nav className="landing-nav">
    <Link className="landing-nav-brand" to="/">TradeSense</Link>
    <div className="landing-nav-links">
      <Link className="landing-nav-link" to="/login">Log in</Link>
      <Link className="landing-nav-cta" to="/signup">Sign up</Link>
    </div>
  </nav>
);

export default NavBar;
