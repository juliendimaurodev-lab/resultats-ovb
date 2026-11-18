# Résultats FFVolley – Ondres Volley-Ball

Le script `scripts/sync.mjs` lit les pages de poules de ffvbbeach.org (liste dans `poules.json`),
enregistre classement + matchs dans `docs/data/`, et `docs/index.html` les affiche.
GitHub Actions relance la lecture toutes les 2 h (toutes les heures le week-end).

## Mise en place

1. Crée un dépôt GitHub **public** (ex. `resultats-ovb`) et envoie-y tout ce dossier,
   y compris `.github/workflows/sync.yml`.
2. Dépôt > Settings > Pages : Source « Deploy from a branch », branche `main`, dossier `/docs`.
3. Dépôt > Actions > « Synchro FFVolley » > Run workflow, pour la première lecture.
   Si les droits d'écriture sont refusés : Settings > Actions > General > Workflow permissions > Read and write.
4. Vérifie dans les logs : `... : 9 équipes, 72 matchs, 20 joués` (régionale) et `8 équipes, 56 matchs, ...` (départementale).
5. Dans Harmony : Ajouter > Embed > code, colle (remplace UTILISATEUR et DEPOT) :

```html
<iframe src="https://UTILISATEUR.github.io/DEPOT/?poule=2026-2027_LIAQ_RFC"
        style="width:100%;height:760px;border:0" title="Classement et résultats"></iframe>
```

   Départementale : `?poule=2026-2027_PTAQ40_SFU`. Tous les matchs de la poule : ajoute `&matchs=tous`.

## Nouvelle équipe ou nouvelle saison

Ajoute une ligne dans `poules.json` (saison, codent, poule, club). La clé de la poule est
`saison-avec-tiret_codent_poule`, par exemple `2027-2028_LIAQ_RFC`.

## Si ça casse

Si ffvbbeach.org change sa page ou si les chiffres ne concordent plus, le script s'arrête en erreur,
GitHub t'envoie un e-mail, et le site continue d'afficher les dernières données valides.
GitHub désactive les workflows planifiés après 60 jours sans activité sur le dépôt : réactive-le dans l'onglet Actions.
