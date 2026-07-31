# 004 — Protéger les états :hover contre le "hover collé" tactile

- **Status**: TODO
- **Commit**: 2ed2960
- **Severity**: MEDIUM
- **Category**: Accessibilité (Catégorie 6)
- **Estimated scope**: 1 fichier (index.html), 6 règles CSS

## Problem

AlBarber est une PWA à usage majoritairement mobile/tactile, mais aucune des 6 règles `:hover` du fichier n'est protégée par la media query tactile recommandée. Sur un écran tactile, un `tap` déclenche `:hover` sans qu'aucun `mouseleave` ne vienne jamais l'annuler — l'état "survolé" (fond coloré) reste visuellement collé jusqu'au tap suivant ailleurs sur l'écran.

Règles concernées :

```css
/* index.html:71 */
.i-btn:hover{background:var(--s2)}
/* index.html:75 */
.bell-btn:hover{background:var(--s2)}
/* index.html:104 */
.link:hover{text-decoration:underline}
/* index.html:115 (wk-btn, dans le bloc calendrier) */
.wk-btn:hover:not(:disabled){background:var(--s2)}
/* index.html:133 */
.sc.free:hover{background:#d9ede1}
/* index.html:136 */
.sc.mine:hover{background:#f2e2b6}
/* index.html:141 */
.sc.adm-e:hover{background:var(--s3);color:var(--gold)}
```

(vérifier le numéro de ligne exact de `.wk-btn:hover:not(:disabled)` au moment de l'édition — il peut avoir légèrement bougé).

Les cases du calendrier (`.sc.free`, `.sc.mine`, `.sc.adm-e`) sont particulièrement concernées : ce sont les éléments les plus tapés de toute l'app (sélection de créneau), donc l'effet de hover collé s'y voit le plus souvent.

## Target

Envelopper chacune des 6 règles dans `@media(hover:hover) and (pointer:fine)`, en conservant le sélecteur et la déclaration identiques :

```css
/* target — index.html:71,75,104,115,133,136,141 regroupés */
@media(hover:hover) and (pointer:fine){
  .i-btn:hover{background:var(--s2)}
  .bell-btn:hover{background:var(--s2)}
  .link:hover{text-decoration:underline}
  .wk-btn:hover:not(:disabled){background:var(--s2)}
  .sc.free:hover{background:#d9ede1}
  .sc.mine:hover{background:#f2e2b6}
  .sc.adm-e:hover{background:var(--s3);color:var(--gold)}
}
```

Regrouper les 7 règles dans un seul bloc media query (plutôt que 7 blocs séparés) pour rester lisible — leur emplacement d'origine dans le fichier peut être conservé (ne pas tout déplacer au même endroit si cela complique la lecture du fichier), tant que chacune est bien protégée par la media query.

## Repo conventions to follow

- Le fichier utilise déjà `@media(prefers-reduced-motion:reduce)` et `@media(min-width:480px)` comme blocs de media query groupés en fin de section — suivre le même principe de regroupement pour `@media(hover:hover) and (pointer:fine)`.
- Ne pas introduire de nouvelle variable CSS — toutes les couleurs utilisées existent déjà (`--s2`, `--s3`, `--gold`, `#d9ede1`, `#f2e2b6`).

## Steps

1. Repérer les 7 règles `:hover` listées ci-dessus dans index.html (utiliser une recherche sur `:hover{` pour confirmer qu'il n'y en a pas d'autres apparues depuis le commit 2ed2960).
2. Les extraire de leur emplacement actuel et les regrouper dans un unique bloc `@media(hover:hover) and (pointer:fine){ ... }`, placé juste après le bloc `@media(prefers-reduced-motion:reduce)` existant en fin de feuille de style (autour de index.html:307-311).
3. Vérifier qu'aucune règle `:hover` n'est laissée hors media query après l'édition (recherche finale sur `:hover{` hors du nouveau bloc).

## Boundaries

- Ne pas modifier les couleurs ou propriétés de chaque règle — uniquement les envelopper dans la media query.
- Ne pas toucher aux règles `:active` (index.html:39, presse tactile) — celles-ci doivent rester actives sur tous les pointeurs, elles ne sont pas concernées par ce finding.
- Ne pas ajouter de media query sur des règles qui n'ont pas de `:hover` (ex. `:focus-visible` s'il en existe, hors scope).

## Verification

- **Mechanical**: recharger la page, aucune erreur console, aucune règle CSS orpheline.
- **Feel check**:
  - Sur un appareil tactile (ou via l'émulation tactile de DevTools), taper une case de créneau libre, puis taper ailleurs sur l'écran : confirmer que la couleur de fond ne reste PAS visuellement "allumée" après le tap.
  - Sur desktop avec souris, confirmer que le survol fonctionne toujours normalement sur les mêmes éléments (bouton cloche, liens, cases du calendrier).
  - Dans DevTools, activer l'émulation "No hover" via le panneau Rendering (ou tester sur un vrai téléphone) et confirmer qu'aucun état hover ne reste bloqué après une série de taps rapides sur plusieurs cases du calendrier.
- **Done when**: les 7 règles `:hover` du fichier sont toutes protégées par `(hover:hover) and (pointer:fine)`, et un tap sur mobile ne laisse plus d'état hover collé.
