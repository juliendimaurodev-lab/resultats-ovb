// Télécharge les pages FFVolley listées dans poules.json et écrit docs/data/<cle>.json.
// Si une poule échoue (page changée, incohérence), son ancien fichier est conservé
// et le script se termine en erreur pour que GitHub te prévienne.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { parsePage } from './parse.mjs';

const BASE_URL = 'https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php';
const poules = JSON.parse(await readFile(new URL('../poules.json', import.meta.url), 'utf8'));
const outDir = new URL('../docs/data/', import.meta.url);
await mkdir(outDir, { recursive: true });

const keyOf = (p) => `${p.saison.replace('/', '-')}_${p.codent}_${p.poule}`;
const urlOf = (p) =>
  `${BASE_URL}?saison=${encodeURIComponent(p.saison)}&codent=${p.codent}&poule=${p.poule}&calend=COMPLET`;

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'OndresVolleyBall-site/1.0 (resultats du club)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('windows-1252').decode(buf);
  }
}

let echec = false;
for (const p of poules) {
  const key = keyOf(p);
  const debugFile = new URL(`debug_${key}.txt`, outDir);
  let html = null;
  try {
    html = await download(urlOf(p));
    const { libelle, classement, matchs } = parsePage(html, p.poule);

    // Contrôle : chaque match joué compte pour 2 équipes dans la colonne "Jou."
    const joues = matchs.filter((m) => m.statut === 'joue').length;
    const attendu = classement.reduce((s, c) => s + c.joues, 0) / 2;
    if (joues !== attendu) throw new Error(`${joues} matchs joués lus, ${attendu} attendus d'après le classement`);

    const data = { cle: key, saison: p.saison, club: p.club, libelle, source: urlOf(p), classement, matchs };
    const file = new URL(`${key}.json`, outDir);
    let ancien = null;
    try { ancien = JSON.parse(await readFile(file, 'utf8')); } catch {}
    const memeContenu = ancien && JSON.stringify({ ...ancien, majLe: 0 }) === JSON.stringify({ ...data, majLe: 0 });
    if (!memeContenu) {
      await writeFile(file, JSON.stringify({ ...data, majLe: new Date().toISOString() }, null, 1));
    }
    await rm(debugFile, { force: true });
    console.log(`${key} : ${classement.length} équipes, ${matchs.length} matchs, ${joues} joués${memeContenu ? ' (inchangé)' : ' (mis à jour)'}`);
  } catch (e) {
    console.error(`ÉCHEC ${key} : ${e.message}`);
    if (html) {
      // Diagnostic : on garde la page reçue pour comprendre ce qui a changé.
      const nb = (re) => (html.match(re) || []).length;
      console.error(`  page reçue : ${html.length} caractères, ${nb(/<tr[\s>]/gi)} <tr>, ${nb(/<td[\s>]/gi)} <td>`);
      console.error(`  début : ${html.slice(0, 300).replace(/\s+/g, ' ')}`);
      await writeFile(debugFile, html);
    }
    echec = true;
  }
}
if (echec) process.exit(1);
