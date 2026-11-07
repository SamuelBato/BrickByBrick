"use client";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main>
      <section className="card card-error">
        <p>Niečo sa pokazilo.</p>
        <button onClick={() => retry()}>Skúsiť znova</button>
      </section>
    </main>
  );
}
