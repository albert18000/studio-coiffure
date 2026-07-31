# Plans d'animation — AlBarber (studio-coiffure)

Issus de l'audit `improve-animations` sur `index.html` au commit `2ed2960`. Aucun code n'a été modifié en écrivant ces plans — chacun est autonome et exécutable indépendamment par n'importe quel agent (`skills use emilkowalski/skills@improve-animations` puis `execute <plan>`, ou manuellement).

| # | Plan | Sévérité | Catégorie | Statut |
|---|---|---|---|---|
| 001 | [Arrêter le re-clignotement des listes admin à chaque événement realtime](001-list-flicker-on-realtime-rerender.md) | HIGH | Interruptibilité | DONE (partiel, voir note) |
| 002 | [Retirer l'easing à rebond du fondu du fond des popups](002-backdrop-overshoot-easing-misapplied.md) | MEDIUM | Cohésion / Easing | DONE |
| 003 | [Raccourcir l'animation de changement d'écran sous 300ms](003-screen-switch-duration-budget.md) | MEDIUM | Durée & fréquence | DONE |
| 004 | [Protéger les :hover contre le "hover collé" tactile](004-gate-hover-states-for-touch.md) | MEDIUM | Accessibilité | DONE |
| 005 | [Animer les barres du CA via transform plutôt que height/width](005-stats-bars-transform-instead-of-layout.md) | MEDIUM | Performance | DONE |
| 006 | [Remplacer les easings en dur par les tokens existants](006-consolidate-easing-tokens.md) | LOW | Cohésion | DONE |

## Ordre d'exécution recommandé

1. **002, 003, 004, 006** en premier — chacun est une modification CSS isolée de quelques lignes, sans dépendance entre eux ni avec le reste. Peuvent être faits dans n'importe quel ordre, même en une seule passe.
2. **005** ensuite — touche à la fois CSS et JS (deux fonctions de rendu), un peu plus d'effort mais toujours indépendant des autres.
3. **001** en dernier — le plus gros chantier (6 fonctions de rendu à modifier + les handlers realtime), et le seul qui touche à de la logique JS partagée. Le faire après les autres évite d'avoir à re-tester les listes plusieurs fois pendant qu'elles bougent encore pour d'autres raisons.

Aucune dépendance bloquante entre les 6 plans — ils peuvent aussi être exécutés en parallèle par des agents différents si besoin, chacun ne touchant pas les mêmes lignes (à l'exception de 001 et 005 qui passent tous les deux par les fonctions `render*Stats`/`render*` autour de la ligne 1560-1700 : vérifier après coup qu'aucune des deux séries d'édits ne s'est écrasée l'une l'autre si elles sont faites en parallèle).

## Après exécution

Relancer `improve-animations reconcile` pour vérifier que chaque plan est bien marqué DONE et que les références `file:line` sont toujours à jour.
