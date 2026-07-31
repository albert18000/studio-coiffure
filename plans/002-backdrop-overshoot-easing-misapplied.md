# 002 — Retirer l'easing à rebond du fondu du fond des popups

- **Status**: DONE
- **Commit**: 2ed2960
- **Severity**: MEDIUM
- **Category**: Cohésion / Easing (Catégories 2 et 7)
- **Estimated scope**: 1 fichier (index.html), 2 lignes CSS

## Problem

Le fond assombri derrière les fenêtres modales (`.ov`) utilise le token `--ease-spring`, une courbe à rebond (valeurs y > 1), pour animer sa propre opacité :

```css
/* index.html:149-151 — actuel */
.ov{display:flex;position:fixed;inset:0;background:rgba(24,22,14,.42);backdrop-filter:blur(3px);z-index:500;align-items:flex-end;justify-content:center;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .28s var(--ease-spring),visibility 0s linear .28s}
@media(min-width:480px){.ov{align-items:center}}
.ov.on{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .22s var(--ease-spring),visibility 0s linear 0s}
```

Le token en question :

```css
/* index.html:29 */
--ease-spring:cubic-bezier(.34,1.32,.44,1);
```

Le rebond d'une courbe à ressort se voit sur une valeur qui peut dépasser sa cible puis revenir (typiquement un `transform: scale()` ou `translate()`). Sur une `opacity`, le navigateur borne toujours le rendu entre 0 et 1 — la portion de la courbe qui dépasse 1 n'a donc aucun effet visible, elle est silencieusement écrêtée. Le résultat pratique : le fondu du fond a l'air d'un `ease-out` classique mais légèrement "cassé" dans son timing (une partie de la courbe est gaspillée sans bénéfice), alors que la sensation de ressort voulue ne se lit que sur le panneau lui-même (`.modal`, qui anime bien un `transform: translateY/scale`, cas légitime pour `--ease-spring`).

## Target

```css
/* target — index.html:149,151 */
.ov{display:flex;position:fixed;inset:0;background:rgba(24,22,14,.42);backdrop-filter:blur(3px);z-index:500;align-items:flex-end;justify-content:center;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .28s var(--ease-out),visibility 0s linear .28s}
@media(min-width:480px){.ov{align-items:center}}
.ov.on{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .22s var(--ease-out),visibility 0s linear 0s}
```

Seul le mot-clé de la courbe change (`var(--ease-spring)` → `var(--ease-out)`), les durées (`.28s`/`.22s`) restent identiques — elles sont déjà dans le budget 200-500ms recommandé pour les modales.

`--ease-spring` reste utilisé tel quel sur `.modal`, `.alert-modal`, `.ann-popup` (index.html:152,164,171) — ces éléments animent un `transform`, c'est l'usage correct de la courbe, ne pas y toucher.

## Repo conventions to follow

- Les trois tokens d'easing sont définis une seule fois à index.html:29 (`--ease-out`, `--ease-in-out`, `--ease-spring`) — ce plan ne fait que changer lequel des trois est référencé, sans en créer un nouveau.
- Exemplaire de bon usage de `--ease-out` sur un fondu déjà dans le fichier : `.toast{transition:transform .32s var(--ease-out)}` à index.html:285.

## Steps

1. Ouvrir index.html, repérer les deux occurrences de `var(--ease-spring)` dans le bloc `.ov{...}` (ligne 149) et `.ov.on{...}` (ligne 151).
2. Remplacer chacune par `var(--ease-out)`, sans modifier le reste de la déclaration (durées, `visibility`, etc. inchangés).
3. Ne pas toucher aux autres occurrences de `--ease-spring` dans le fichier (`.modal`, `.alert-modal`, `.ann-popup`, `.loader-glow`, `.loader-brand`, `.loader-txt`, `.scr.on` — hors scope de ce plan).

## Boundaries

- Ne pas modifier la valeur du token `--ease-spring` lui-même (il reste correct pour les usages sur `transform`).
- Ne pas toucher aux durées `.28s`/`.22s`.
- Ne pas modifier `.modal`, `.alert-modal`, `.ann-popup` ni leurs animations `su`/`pi`/`sd`/`po`.

## Verification

- **Mechanical**: recharger la page dans un navigateur, ouvrir n'importe quelle modale, aucune erreur console.
- **Feel check**:
  - Ouvrir une modale (ex : cliquer sur un créneau) et observer le fond : le fondu doit être linéairement progressif, sans "palier" ni ressaut perceptible près de la fin.
  - Dans DevTools, panneau Animations, ralentir à 10% pendant l'ouverture d'une modale : le fond (`opacity`) doit progresser de façon monotone (jamais de retour en arrière ni de plateau), pendant que le panneau (`.modal`) garde son léger effet de rebond sur sa position/échelle.
  - Fermer la modale et confirmer que le fondu de sortie (`.ov` sans `.on`) est identique en sensation, juste plus rapide (.22s vs .28s côté sortie/entrée — comportement déjà en place, non modifié).
- **Done when**: le fond des popups utilise `--ease-out` et le rebond visuel reste uniquement perceptible sur le panneau modal lui-même.
