# 006 — Remplacer les easings en dur par les tokens existants

- **Status**: DONE
- **Commit**: 2ed2960
- **Severity**: LOW
- **Category**: Cohésion (Catégorie 7)
- **Estimated scope**: 1 fichier (index.html), 1 ligne CSS

## Problem

Le fichier définit trois tokens d'easing centralisés :

```css
/* index.html:29 */
--ease-out:cubic-bezier(.23,1,.32,1);--ease-in-out:cubic-bezier(.77,0,.175,1);--ease-spring:cubic-bezier(.34,1.32,.44,1);
```

Mais une animation utilise une valeur `ease-in-out` écrite en dur au lieu du token :

```css
/* index.html:45 — actuel */
.loader-glow::before{content:'';position:absolute;inset:-14px;border-radius:50%;background:radial-gradient(circle,rgba(181,140,245,.4),transparent 70%);animation:loaderBreathe 2.6s ease-in-out infinite}
```

Le mot-clé CSS natif `ease-in-out` (courbe standard du navigateur) n'est pas exactement la même courbe que le token `var(--ease-in-out)` (`cubic-bezier(.77,0,.175,1)`, une courbe "forte" personnalisée). Aucun impact visuel majeur ici — la respiration du halo reste discrète dans les deux cas — mais c'est une incohérence pour la maintenance future : si `--ease-in-out` est un jour ajusté, cette animation ne suivra pas le changement.

(`.rt-dot{animation:pulse 2s infinite}`, index.html:54, n'a pas d'easing explicite — utilise le mot-clé natif `ease` par défaut du navigateur. C'est un choix par défaut raisonnable pour un indicateur de statut discret et continu ; ne pas y toucher, il ne fait pas partie de ce finding.)

## Target

```css
/* target — index.html:45 */
.loader-glow::before{content:'';position:absolute;inset:-14px;border-radius:50%;background:radial-gradient(circle,rgba(181,140,245,.4),transparent 70%);animation:loaderBreathe 2.6s var(--ease-in-out) infinite}
```

Seul `ease-in-out` devient `var(--ease-in-out)` ; aucune autre valeur ne change.

## Repo conventions to follow

- Tous les autres usages de `--ease-in-out` dans le fichier passent déjà par le token (ex. `.loader-wrap{transition:opacity .45s var(--ease-in-out)}` à index.html:42) — aligner celui-ci sur le même principe.

## Steps

1. Repérer la règle `.loader-glow::before{...}` à index.html:45.
2. Remplacer le mot-clé `ease-in-out` par `var(--ease-in-out)` dans la valeur de la propriété `animation`.

## Boundaries

- Ne pas modifier la valeur du token `--ease-in-out` lui-même.
- Ne pas toucher à `.rt-dot` (index.html:54) — hors scope, comportement par défaut volontaire.
- Ne pas modifier la durée (`2.6s`) ni les autres propriétés de l'animation.

## Verification

- **Mechanical**: recharger la page, écran de chargement visible au premier lancement, aucune erreur console.
- **Feel check**:
  - Observer le halo derrière la silhouette pendant le chargement : la respiration doit rester visuellement quasi identique à avant (léger changement de timing, non perceptible à l'œil nu à cette vitesse).
  - Dans DevTools, panneau Animations, ralentir à 10% pendant le chargement et confirmer que `loaderBreathe` utilise bien la courbe du token (visible dans l'inspecteur de timing de l'animation).
- **Done when**: `.loader-glow::before` référence `var(--ease-in-out)` au lieu du mot-clé natif.
