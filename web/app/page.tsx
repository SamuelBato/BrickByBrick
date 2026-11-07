import Link from "next/link";
import { addStavbaAction } from "@/app/actions";
import FilmingGuide from "@/components/filming-guide";
import FormButton from "@/components/form-button";
import { canEdit } from "@/lib/can-edit";
import { listStavby } from "@/lib/store";

// The list lives in Blob, so it is read on every request and not once at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [stavby, editable] = await Promise.all([listStavby(), canEdit()]);

  return (
    <main className="stack">
      {!editable && <p className="notice">Ukážka našich stavieb, len na pozretie.</p>}

      <FilmingGuide open={stavby.length === 0} />

      {editable && (
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
      )}

      <section className="card">
        <h2>{editable ? "Moje stavby" : "Demo stavby"}</h2>
        {stavby.length === 0 && <p>Zatiaľ tu nie je žiadna stavba.</p>}
        <ul className="clips">
          {stavby.map(({ id, name }) => (
            <li key={id}>
              <Link className="clip-name" href={`/stavba/${id}`}>{name}</Link>
            </li>
          ))}
        </ul>
      </section>

      {/* A plain link, because only a full page load makes the browser ask for the password. */}
      {!editable && <a href="/prihlasenie">Prihlásiť sa</a>}
    </main>
  );
}
