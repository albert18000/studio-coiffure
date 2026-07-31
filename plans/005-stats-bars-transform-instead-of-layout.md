# 005 — Animer les barres du CA via transform plutôt que height/width

- **Status**: TODO
- **Commit**: 2ed2960
- **Severity**: MEDIUM
- **Category**: Performance (Catégorie 5)
- **Estimated scope**: 1 fichier (index.html) — 2 blocs CSS + 4 lignes JS (2 templates × 2 endroits chacun pour les barres verticales, 2 pour les barres horizontales)

## Problem

Les deux graphiques en barres de l'onglet Stats animent des propriétés qui déclenchent layout + paint au lieu du compositeur seul :

```css
/* index.html:232 — barres verticales (CA par jour / par semaine), actuel */
.bar-col .bb{width:100%;background:var(--gold);border-radius:5px 5px 0 0;min-height:3px;transition:height .5s var(--ease-out)}
```
```js
/* index.html:1629 et 1662 — JS qui pilote la hauteur, actuel */
<div class="bb" style="height:${Math.max(d.cents/maxCents*100,3)}%"></div>
```

```css
/* index.html:239 — barres horizontales (répartition par prestation), actuel */
.svc-bar .sb-fill{height:100%;background:var(--gold);transition:width .5s var(--ease-out)}
```
```js
/* index.html:1633 et 1666 — JS qui pilote la largeur, actuel */
<div class="sb-fill" style="width:${s.count/maxSvc*100}%"></div>
```

`renderStats()` (index.html:1591) est maintenant appelée plus souvent depuis le fix du bug d'affichage du CA (chooseService/addManualSlot déclenchent renderAdm() en plus des re-renders realtime déjà en place) — donc ces transitions `height`/`width`, qui forcent un recalcul de layout à chaque déclenchement, s'exécutent plus fréquemment qu'avant.

## Target

### Barres horizontales (répartition par prestation) — changement simple

Le conteneur `.sb-track` a déjà une taille fixe (`height:8px`, `overflow:hidden`) — il suffit de faire remplir `.sb-fill` à 100% de largeur en permanence et de piloter le remplissage visuel via `transform:scaleX()` :

```css
/* target — remplace index.html:239 */
.svc-bar .sb-fill{width:100%;height:100%;background:var(--gold);transform-origin:left;transform:scaleX(var(--pct,0));transition:transform .5s var(--ease-out)}
```

```js
/* target — remplace index.html:1633 et 1666 */
<div class="sb-fill" style="--pct:${s.count/maxSvc}"></div>
```

(`s.count/maxSvc` donne déjà un ratio 0-1 ; ne pas multiplier par 100 puisque `scaleX` attend un facteur, pas un pourcentage.)

### Barres verticales (CA par jour / par semaine) — nécessite un conteneur de taille fixe

Contrairement aux barres horizontales, `.bb` n'a actuellement pas de "piste" de taille fixe : sa hauteur variable est directement un pourcentage du `.bar-col` parent (qui contient aussi le label de valeur et le label du jour empilés au-dessus). Pour passer à `transform:scaleY()`, il faut lui donner un conteneur de hauteur fixe :

```css
/* target — remplace index.html:232, insérer une piste intermédiaire */
.bar-col .bb-track{width:100%;height:64px;display:flex;align-items:flex-end}
.bar-col .bb{width:100%;height:100%;background:var(--gold);border-radius:5px 5px 0 0;transform-origin:bottom;transform:scaleY(var(--pct,.03));transition:transform .5s var(--ease-out)}
```

```js
/* target — remplace index.html:1629 */
<div class="bar-col"><span class="bv">${d.cents?(d.cents/100).toFixed(0)+'€':'-'}</span><div class="bb-track"><div class="bb" style="--pct:${Math.max(d.cents/maxCents,.03)}"></div></div><span class="bd">${d.label}</span></div>
```

```js
/* target — remplace index.html:1662, même principe */
<div class="bar-col"><span class="bv">${w.cents?(w.cents/100).toFixed(0)+'€':'-'}</span><div class="bb-track"><div class="bb" style="--pct:${Math.max(w.cents/maxCents,.03)}"></div></div><span class="bd">${w.label}</span></div>
```

**Note sur la valeur `64px`** : c'est une estimation de départ pour que la piste tienne dans les 88px de hauteur de `.bar-row` (index.html:229) une fois `.bv` et `.bd` retirés de son calcul. Cette valeur doit être vérifiée visuellement (voir Verification) et ajustée de ±10px si les barres semblent tronquées ou si le graphique déborde de `.bar-row` — ne pas la considérer comme figée sans vérification à l'écran.

## Repo conventions to follow

- Le token `--ease-out` (index.html:29) reste utilisé pour la transition, seule la propriété animée change (`transform` au lieu de `height`/`width`).
- Pattern déjà en place dans le fichier pour piloter une variable CSS depuis le JS via `style="--x:...".` : aucun exemple direct actuellement dans ce fichier, donc suivre exactement la syntaxe `style="--pct:${valeur}"` documentée ci-dessus (valeur en ratio 0-1, pas en pourcentage).

## Steps

1. Remplacer la règle `.bar-col .bb{...}` (index.html:232) par les deux règles `.bar-col .bb-track{...}` et `.bar-col .bb{...}` du bloc "target" ci-dessus.
2. Remplacer la règle `.svc-bar .sb-fill{...}` (index.html:239) par la version "target" ci-dessus.
3. Dans `renderWeekStats()` (autour de index.html:1629), remplacer le template de `.bar-col` par la version cible avec `.bb-track > .bb` et `style="--pct:..."`.
4. Dans `renderMonthStats()` (autour de index.html:1662), appliquer le même remplacement pour son propre template de `.bar-col`.
5. Dans les deux mêmes fonctions (index.html:1633 et 1666), remplacer `style="width:${...}%"` par `style="--pct:${s.count/maxSvc}"` sur `.sb-fill`.

## Boundaries

- Ne pas modifier `.bar-row{height:88px}` (index.html:229) — la piste de 64px doit s'insérer dans cet espace existant, pas l'agrandir.
- Ne pas modifier `maxCents`/`maxSvc` ni la logique de calcul des ratios — uniquement la façon dont le ratio est appliqué visuellement.
- Ne pas toucher aux libellés `.bv`/`.bd`/`.sb-label`/`.sb-val`.
- Si le calcul de `${d.cents?(d.cents/100).toFixed(0)+'€':'-'}` ou toute autre partie du template a changé depuis le commit 2ed2960, STOP et signaler plutôt que d'improviser sur un template différent.

## Verification

- **Mechanical**: recharger la page, ouvrir Admin → Stats, aucune erreur console.
- **Feel check**:
  - Comparer visuellement le graphique "CA par jour" avant/après : les barres doivent occuper la même hauteur relative qu'avant (pas de barres visuellement tronquées en haut du `.bar-row`, pas de débordement sous les labels `.bd`).
  - Si les barres semblent trop courtes ou débordent, ajuster la valeur `64px` de `.bb-track` par pas de 10px et revérifier.
  - Basculer entre "Semaine" et "Mois" (`setStatsPeriod`) plusieurs fois de suite : les barres doivent toujours s'animer en douceur depuis leur état précédent (comportement déjà correct avec `transition`, à préserver).
  - Dans DevTools, onglet Performance, enregistrer un basculement Semaine → Mois : confirmer l'absence (ou une forte réduction) d'entrées "Layout"/"Recalculate Style" liées à `.bb`/`.sb-fill` par rapport à l'implémentation `height`/`width` d'origine.
  - Vérifier le graphique "Répartition par prestation" : les barres horizontales doivent se remplir de gauche à droite exactement comme avant.
- **Done when**: les deux graphiques utilisent `transform:scaleX()`/`scaleY()` au lieu de `width`/`height` pour leur animation de remplissage, sans régression visuelle sur les proportions ni le calage dans `.bar-row`.
