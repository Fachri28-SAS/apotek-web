export default function Spinner({ size = 18, color = "currentColor", text = null, className = "" }) {
  return (
    <span className={`inline-spinner-wrap ${className}`} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
      <svg
        className="btn-spinner-icon"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: "spinFast 0.75s linear infinite" }}
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke={color}
          strokeWidth="3"
          strokeOpacity="0.25"
        />
        <path
          d="M12 3a9 9 0 0 1 9 9"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {text && <span className="spinner-text-label">{text}</span>}
    </span>
  );
}
