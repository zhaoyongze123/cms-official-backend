type PlaceholderItem = {
  label: string;
  status: string;
};

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  currentSupport: PlaceholderItem[];
  missingApi: string[];
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  currentSupport,
  missingApi,
}: PlaceholderPageProps) {
  return (
    <div className="page-stack">
      <section className="hero">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>

      <section className="overview-grid">
        <article className="panel">
          <h2>当前真实支撑</h2>
          <div className="status-table">
            {currentSupport.map((item) => (
              <div className="status-table-row" key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.status}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>缺失的公开 API</h2>
          <ul className="mono-list">
            {missingApi.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
