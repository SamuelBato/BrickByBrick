import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <section className="card">
        <p>Táto stránka neexistuje.</p>
        <Link href="/">← Všetky stavby</Link>
      </section>
    </main>
  );
}
