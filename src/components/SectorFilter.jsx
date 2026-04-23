/**
 * SectorFilter — row of pill buttons for filtering the dashboard by sector.
 *
 * Props:
 *   sectors      string[]  — sorted list of unique sectors in the watchlist
 *   active       string    — currently selected sector ('All' or a sector name)
 *   onChange     fn        — called with the newly selected sector string
 *   loading      boolean   — when true, shows skeleton pills instead
 */
export function SectorFilter({ sectors, active, onChange, loading = false }) {
  if (loading) {
    return (
      <div className="sector-filter" aria-label="Sector filter loading">
        {[80, 110, 90, 70].map((w, i) => (
          <div
            key={i}
            className="skeleton-line sector-filter-skeleton"
            style={{ width: w }}
          />
        ))}
      </div>
    )
  }

  if (!sectors || sectors.length === 0) return null

  const pills = ['All', ...sectors]

  return (
    <div className="sector-filter" role="group" aria-label="Filter by sector">
      {pills.map((sector) => (
        <button
          key={sector}
          type="button"
          className={`sector-pill${active === sector ? ' sector-pill--active' : ''}`}
          onClick={() => onChange(sector)}
          aria-pressed={active === sector}
        >
          {sector}
        </button>
      ))}
    </div>
  )
}
