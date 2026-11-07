import Link from "next/link";
import { addStavbaAction } from "@/app/actions";
import FilmingGuide from "@/components/filming-guide";
import FormButton from "@/components/form-button";
import { listStavby } from "@/lib/store";

// The list lives in Blob, so it is read on every request and not once at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const stavby = await listStavby();

  return (
    <main className="stack">
      <FilmingGuide open={stavby.length === 0} />

      <section className="card">
        <h2>Nová stavba</h2>
        <form className="form" action={addStavbaAction}>
          <label>
            Názov stavby
            <input name="name" required maxLength={80} placeholder="Rodinný dom Prešov" />
          </label>
          <FormButton>Vytvoriť stavbu</FormButton>
        </form>
      </section>

      <section className="card">
        <h2>Moje stavby</h2>
        {stavby.length === 0 && <p>Zatiaľ tu nie je žiadna stavba.</p>}
        <ul className="clips">
          {stavby.map(({ id, name }) => (
            <li key={id}>
              <Link className="clip-name" href={`/stavba/${id}`}>{name}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
