export function MealMenuSkeleton() {
  return (
    <div className="meal-menu-skeleton" aria-hidden="true">
      <div className="meal-tray">
        <div className="meal-main-group">
          <div className="meal-main-header"><span className="meal-skeleton-line meal-skeleton-label" /></div>
          <div className="meal-main-options">
            {[0, 1, 2].map((row) => <span key={row} className="meal-skeleton-line meal-skeleton-main" />)}
          </div>
        </div>
        <div className="meal-top-cards">
          {[0, 1].map((column) => <div key={column} className="meal-side-card">
            <div className="meal-side-card-heading"><span className="meal-skeleton-line meal-skeleton-label" /></div>
            <div className="meal-side-card-featured"><span className="meal-skeleton-line" /></div>
          </div>)}
        </div>
        <div className="meal-finishes">
          {[2, 3, 2].map((rows, column) => <div key={column} className={`meal-side-card meal-side-card--finish${column === 2 ? " meal-side-card--dessert" : ""}`}>
            <div className="meal-side-card-heading"><span className="meal-skeleton-line meal-skeleton-label" /></div>
            <div className="meal-side-card-items">
              {Array.from({ length: rows }, (_, row) => <span key={row} className="meal-skeleton-line" />)}
            </div>
          </div>)}
        </div>
      </div>
      <div className="meal-pofi-note">
        <span className="meal-skeleton-line meal-skeleton-avatar" />
        <div className="meal-skeleton-copy"><span className="meal-skeleton-line" /><span className="meal-skeleton-line" /></div>
      </div>
    </div>
  );
}
