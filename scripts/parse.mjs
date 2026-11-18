// Lecture d'une page "calendrier" de ffvbbeach.org : classement + matchs.
// Basé sur la structure réelle de la page : un <tr> par équipe (classement) ou par match,
// avec les valeurs dans des <td> (cellules vides = valeur 0 ou absente).

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function textOf(fragment) {
  return decodeEntities(
    fragment
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

// Cellule vide = 0. Valeur non numérique (ex. coefficient "MAX") = null.
const num = (s) => {
  if (s === '' || s == null) return 0;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
};

// Découpe sur les balises complètes (attributs compris) : <tr ...> et <td ...>
const TR = /<tr\b[^>]*>/i;
const TD = /<td\b[^>]*>/i;

export function parsePage(html, poule) {
  const rows = html.split(TR).slice(1);
  const classement = [];
  const matchs = [];
  let journee = null;

  for (const row of rows) {
    const cells = row.split(TD).slice(1).map(textOf);
    if (cells.length === 0) continue;

    // Titre de journée : "Journée 06"
    if (cells.length === 1) {
      const j = cells[0].match(/^Journ.{1,2}e\s+(\d+)$/i);
      if (j) { journee = Number(j[1]); continue; }
    }

    // Ligne de classement : "1." | équipe | 17 valeurs
    if (cells.length >= 19 && /^\d+\.$/.test(cells[0])) {
      const n = cells.slice(2, 19).map(num);
      classement.push({
        rang: parseInt(cells[0], 10),
        equipe: cells[1],
        points: n[0], joues: n[1], gagnes: n[2], perdus: n[3], forfaits: n[4],
        v30: n[5], v31: n[6], v32: n[7], d23: n[8], d13: n[9], d03: n[10],
        setsPour: n[11], setsContre: n[12], coeffSets: n[13],
        ptsPour: n[14], ptsContre: n[15], coeffPts: n[16],
      });
      continue;
    }

    const m = parseMatchRow(cells, journee);
    if (m) matchs.push(m);
  }

  if (classement.length === 0) throw new Error('Classement introuvable (structure de la page changée ?)');

  const lib = textOf(html).match(new RegExp(`\\b${poule} - (.+?)\\s+ACCUEIL`));
  return { libelle: lib ? `${poule} - ${lib[1]}` : poule, classement, matchs };
}

// Colonnes d'une ligne de match :
//  0 code | 1 date | 2 heure | 3 domicile | 4 (ballon) | 5 extérieur
//  match joué    : 6 sets dom | 7 sets ext | 8 détail des sets | 9 points "082-096" | 10 arbitres
//  match à venir : 6 (icône) | 7 salle | 8 (vide) | 9 arbitres
function parseMatchRow(cells, journee) {
  if (cells.length < 6 || !/^[A-Z]{2,}\d+$/.test(cells[0])) return null;
  const [code, dateTxt, heureTxt, domicile, , exterieur] = cells;
  if (/^x+$/i.test(domicile) || /^x+$/i.test(exterieur)) return null; // équipe exempte

  let date = null;
  let heure = null;
  const d = dateTxt.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (d) {
    date = `20${d[3]}-${d[2]}-${d[1]}`;
    heure = /^\d{1,2}:\d{2}$/.test(heureTxt) ? heureTxt.padStart(5, '0') : null;
  }

  const match = {
    code, journee, date, heure, domicile, exterieur,
    statut: 'a_venir', setsDom: null, setsExt: null, sets: [], ptsDom: null, ptsExt: null,
    infos: cells[7] || '', // salle
  };

  if (/^\d$/.test(cells[6] || '') && /^\d$/.test(cells[7] || '')) {
    match.statut = 'joue';
    match.setsDom = Number(cells[6]);
    match.setsExt = Number(cells[7]);
    match.sets = (cells[8] || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.split(':').map(Number));
    const p = (cells[9] || '').match(/^(\d+)-(\d+)$/);
    match.ptsDom = p ? Number(p[1]) : null;
    match.ptsExt = p ? Number(p[2]) : null;
    match.infos = cells[10] || ''; // arbitres
  }
  return match;
}
