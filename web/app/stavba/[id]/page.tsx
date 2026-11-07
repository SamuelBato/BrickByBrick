import Link from "next/link";
import { notFound } from "next/navigation";
import { addEntryAction, deleteEntryAction, deleteStavbaAction } from "@/app/actions";
import FilmingGuide from "@/components/filming-guide";
import FormButton from "@/components/form-button";
import ReelApp from "@/components/reel-app";
import ReelResult from "@/components/reel-result";
import StavbaTabs from "@/components/stavba-tabs";
import { getStavba, listEntries, listReels } from "@/lib/store";

const formatDate = (date: string) => new Date(date).toLocaleDateString("sk-SK", { timeZone: "Europe/Bratislava" });

export default async function StavbaPage({ params }: PageProps<"/stavba/[id]">) {
  const { id } = await params;
  const stavba = await getStavba(id);
  if (!stavba) notFound();

  const [entries, reels] = await Promise.all([listEntries(id), listReels(id)]);
  // The Swedish format is the ISO date a date input expects.
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Bratislava" });

  return (
    <main className="stack">
      <Link href="/">← Všetky stavby</Link>
      <h1 className="stavba-name">{stavba.name}</h1>

      <StavbaTabs
        reels={
          <>
            <FilmingGuide open={reels.length === 0} />
            <ReelApp stavbaId={id} />
            {reels.length > 0 && (
              <section className="card">
                <h2>Hotové Reely</h2>
                <ul className="saved-reels">
                  {reels.map((reel) => (
                    <li key={reel.id}>
                      <p className="reason">{formatDate(reel.createdAt)}</p>
                      <ReelResult reel={reel} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        }
        diary={
          <section className="card">
            <h2>Stavbársky denník</h2>
            <form className="form" action={addEntryAction.bind(null, id)}>
              <label>
                Dátum
                <input type="date" name="date" required defaultValue={today} />
              </label>
              <label>
                Čo sa robilo
                <textarea name="text" required rows={4} maxLength={5000} />
              </label>
              <FormButton>Pridať záznam</FormButton>
            </form>

            {entries.length === 0 && <p>Zatiaľ tu nie je žiadny záznam.</p>}
            <ul className="entries">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <strong>{formatDate(entry.date)}</strong>
                  <p>{entry.text}</p>
                  <form action={deleteEntryAction.bind(null, id, entry.id)}>
                    <FormButton confirmText="Naozaj zmazať tento záznam?" quiet>Zmazať</FormButton>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        }
      />

      <form action={deleteStavbaAction.bind(null, id)}>
        <FormButton confirmText={`Naozaj zmazať stavbu ${stavba.name} aj s denníkom a Reelmi?`} quiet>
          Zmazať stavbu
        </FormButton>
      </form>
    </main>
  );
}
