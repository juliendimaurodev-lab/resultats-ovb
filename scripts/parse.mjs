// Lecture d'une page "calendrier" de ffvbbeach.org : classement + matchs.

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

export function parsePage(html, poule) {
  const chunks = html.split(/<tr[\s>]/i).slice(1);

  const classement = [];
  for (const chunk of chunks) {
    const cells = chunk.split(/<td[\s>]/i).slice(1).map(textOf);
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
    }
  }
  if (classement.length === 0) throw new Error('Classement introuvable (structure de la page changée ?)');

  const equipes = classement.map((c) => c.equipe).sort((a, b) => b.length - a.length);
  const matchs = [];
  let journee = null;
  for (const chunk of chunks) {
    let text = textOf(chunk);
    const j = text.match(/Journ\S{1,2}e\s+(\d+)/i);
    if (j) {
      journee = parseInt(j[1], 10);
      text = text.replace(j[0], '').trim();
    }
    const m = parseMatch(text, journee, equipes);
    if (m) matchs.push(m);
  }

  const lib = textOf(html).match(new RegExp(`\\b${poule} - (.+?)\\s+ACCUEIL`));
  return { libelle: lib ? `${poule} - ${lib[1]}` : poule, classement, matchs };
}

function takeTeam(str, equipes) {
  for (const e of equipes) {
    if (str === e || str.startsWith(e + ' ')) return { team: e, rest: str.slice(e.length).trim() };
  }
  return null;
}

export function parseMatch(text, journee, equipes) {
  const head = text.match(/^([A-Z]{2,}\d+)\s+(.*)$/);
  if (!head) return null;
  let rest = head[2];
  if (/\bxxxxx\b/i.test(rest)) return null; // exempt

  let date = null;
  let heure = null;
  const d = rest.match(/^(\d{2})\/(\d{2})\/(\d{2})\s+(\d{1,2}:\d{2})\s+(.*)$/);
  if (d) {
    date = `20${d[3]}-${d[2]}-${d[1]}`;
    heure = d[4].padStart(5, '0');
    rest = d[5];
  }

  const home = takeTeam(rest, equipes);
  if (!home) return null;
  const away = takeTeam(home.rest, equipes);
  if (!away) return null;

  const match = {
    code: head[1], journee, date, heure,
    domicile: home.team, exterieur: away.team,
    statut: 'a_venir', setsDom: null, setsExt: null, sets: [], ptsDom: null, ptsExt: null,
    infos: away.rest,
  };

  const played = away.rest.match(/^(\d)\s+(\d)\s+((?:\d+:\d+,?\s*)+)\s+(\d{2,3})-(\d{2,3})\s*(.*)$/);
  if (played) {
    match.statut = 'joue';
    match.setsDom = Number(played[1]);
    match.setsExt = Number(played[2]);
    match.sets = played[3].split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.split(':').map(Number));
    match.ptsDom = Number(played[4]);
    match.ptsExt = Number(played[5]);
    match.infos = played[6];
  }
  return match;
}
