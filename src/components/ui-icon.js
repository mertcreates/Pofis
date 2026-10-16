export default function Icon({ name, className = '' }) {
  return (
    <span
      className={`ui-icon ${className}`}
      style={{ maskImage: `url(/icons/${name}.svg)` }}
      aria-hidden="true"
    />
  );
}

