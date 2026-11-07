import { MAX_CLIPS } from "@/lib/plan";

export default function FilmingGuide({ open }: { open: boolean }) {
  return (
    <details className="card guide" open={open}>
      <summary>Ako natáčať klipy</summary>

      <h3>Čo natočiť</h3>
      <ul>
        <li>Prácu v pohybe: betónovanie, murovanie, krov, omietky, žeriav.</li>
        <li>Každú fázu stavby, od základov po interiér.</li>
        <li>Výsledok práce na konci dňa, pokojne aj z diaľky.</li>
      </ul>

      <h3>Ako natočiť</h3>
      <ul>
        <li>Drž telefón na výšku, video na šírku sa oreže.</li>
        <li>Jeden klip nech má 10 až 30 sekúnd, z dlhšieho sa použije len prvá minúta.</li>
        <li>Drž telefón pevne oboma rukami a hýb sa pomaly.</li>
        <li>To hlavné maj v strede záberu, hore a dole býva text.</li>
        <li>Dávaj pozor, aby v zábere neboli ŠPZ, adresy ani tváre cudzích ľudí.</li>
      </ul>

      <p>Na jeden Reel nahráš najviac {MAX_CLIPS} klipov.</p>
    </details>
  );
}
