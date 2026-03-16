export default function MarketingLoading() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#060912",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 28,
            height: 28,
            border: "2px solid rgba(59,130,246,0.18)",
            borderTopColor: "#3b82f6",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 14px",
          }}
        />
        <p
          style={{
            fontSize: 9,
            letterSpacing: "0.18em",
            color: "#3a4560",
            textTransform: "uppercase",
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          }}
        >
          GHOST TAX
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
