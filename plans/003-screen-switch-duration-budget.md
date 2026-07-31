# 003 — Raccourcir l'animation de changement d'écran sous le budget 300ms

- **Status**: TODO
- **Commit**: 2ed2960
- **Severity**: MEDIUM
- **Category**: Durée & fréquence (Catégories 1 et 2)
- **Estimated scope**: 1 fichier (index.html), 1 ligne CSS

## Problem

Chaque changement d'écran principal (calendrier ↔ admin ↔ profil ↔ historique, via `showScr()`) déclenche cette animation :

```css
/* index.html:81 — actuel */
.scr.on{display:block;animation:screenIn .4s var(--ease-spring) both}
```

```css
/* index.html:82 */
@keyframes screenIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
```

`showScr()` est appelée à chaque clic sur un onglet de navigation — c'est l'une des interactions les plus fréquentes de l'app (potentiellement des dizaines de fois par session admin). Le budget de durée pour ce niveau de fréquence est sous 300ms ; à 400ms, l'animation ralentit perceptiblement la navigation la plus courante de l'app, alors qu'elle devrait être quasi instantanée.

## Target

```css
/* target — index.html:81 */
.scr.on{display:block;animation:screenIn .2s var(--ease-out) both}
```

Deux changements : la durée passe de `.4s` à `.2s`, et la courbe passe de `--ease-spring` (rebond, pensé pour des panneaux qui arrivent physiquement) à `--ease-out` classique (plus adapté à une transition de contenu fréquente, sans overshoot qui accentuerait la lenteur perçue).

## Repo conventions to follow

- `--ease-out:cubic-bezier(.23,1,.32,1)` déjà défini à index.html:29 — c'est la courbe standard du projet pour les entrées, utilisée par exemple sur `.msg.on{animation:riseIn .25s var(--ease-out) both}` (index.html:107) à une durée comparable.
- Le budget de durée par fréquence est documenté dans AUDIT.md §1-2 : actions "tens of times/day" → réduire nettement ; UI générale → rester sous 300ms.

## Steps

1. Ouvrir index.html, repérer la règle `.scr.on{display:block;animation:screenIn .4s var(--ease-spring) both}` à la ligne 81.
2. Remplacer `.4s var(--ease-spring)` par `.2s var(--ease-out)`.
3. Ne pas modifier le `@keyframes screenIn` lui-même (translateY(6px) reste un déplacement adapté à une durée plus courte).

## Boundaries

- Ne pas toucher au bloc `prefers-reduced-motion` qui neutralise déjà `.scr.on{animation:none}` (index.html:308) — comportement à conserver tel quel.
- Ne pas modifier `--ease-spring` ni son usage ailleurs (modales, loader) — hors scope.
- Ne pas changer la logique de `showScr()` (index.html, fonction JS) — uniquement la déclaration CSS.

## Verification

- **Mechanical**: recharger la page, cliquer sur chaque onglet principal (Calendrier, Admin, Profil), aucune erreur console.
- **Feel check**:
  - Enchaîner plusieurs changements d'onglet rapidement : la navigation doit paraître nettement plus réactive qu'avant, sans à-coup ni saut de contenu brut (le fondu doit rester perceptible, juste plus rapide).
  - Dans DevTools, panneau Animations, ralentir à 10% pendant un changement d'écran et confirmer une simple montée en fondu (translateY + opacity) sans dépassement/rebond.
  - Activer `prefers-reduced-motion` (panneau Rendering) et confirmer que le changement d'écran reste instantané comme avant (comportement déjà géré, à ne pas casser).
- **Done when**: chaque clic sur un onglet de navigation principal produit une transition sous 300ms, sans rebond.
