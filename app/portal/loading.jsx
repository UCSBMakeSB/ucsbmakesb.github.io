export default function PortalLoading() {
  return (
    <main
      id="account-main"
      className="portal-main portal-loading"
      aria-busy="true"
      aria-label="Loading account"
    >
      <p className="portal-eyebrow">MakeSB 2027 / Your account</p>
      <div className="portal-skeleton portal-skeleton-eyebrow" />
      <div className="portal-skeleton portal-skeleton-title" />
      <div className="portal-skeleton portal-skeleton-intro" />
      <section className="portal-skeleton-card" aria-hidden="true">
        <div className="portal-skeleton portal-skeleton-heading" />
        <div className="portal-skeleton portal-skeleton-line" />
        <div className="portal-skeleton portal-skeleton-line portal-skeleton-line-short" />
        <div className="portal-skeleton portal-skeleton-button" />
      </section>
    </main>
  );
}
