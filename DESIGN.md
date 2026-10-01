# DESIGN.md

Règles de design d'AlBarber. Toute modification du site les respecte.
Si un choix manque ici, on l'ajoute ici avant de l'appliquer.

## Direction

Un salon la nuit : fond sombre, une seule lueur pourpre venue de la photo, texte clair et net, peu d'éléments.
Chaque écran sert une action : réserver un créneau.

Références (pistes à valider, non vérifiées une à une) :
- la maquette d'accueil fournie : portrait à droite, grand titre en capitales, verre ;
- Barber & Co (Miami) : photos sombres, ton éditorial ;
- Abels on Queen : fond sombre, message clair ;
- Bonefade Barbers : typographie forte, bouton de réservation bien visible.

## Couleurs

Toutes les couleurs sont des variables dans `:root` de `index.html`. Aucune couleur n'est écrite ailleurs dans le CSS.

| Rôle | Variable | Valeur |
| --- | --- | --- |
| Fond (nuit) | `--bg` | `#0C0820` |
| Texte | `--tx` | `#F4EFFC` |
| Texte secondaire | `--muted` | texte à 68 % |
| Texte discret | `--hint` | texte à 62 % (contraste 4,5:1 minimum) |
| Principale (marque) | `--brand` | `#8F63E8` (pourpre) |
| Accent | `--acc` | `#D9C6FF` (lavande clair) |
| Bouton principal | `--cta` / `--on-cta` | `#F4EFFF` / `#1A1035` |
| Succès | `--green` | `#7FD6A4` |
| Erreur, annulation | `--red` | `#FF8FA3` |
| Attention, ma réservation | `--amber` | `#F0C36B` |
| Masqué, neutre | `--purple` | `#C9BFE3` |

Surfaces en verre : fonds blancs transparents (`--f1` à `--f4`), bordures (`--l1` à `--l3`), barres et fenêtres (`--bar`, `--panel`), voile sur photo (`--veil-hero`, `--veil-app`).
Pas de dégradé ni de halo dessiné en CSS. La seule lueur est celle de la photo. Un fond uni sinon.
Seule exception hors CSS : `<meta name="theme-color">` doit contenir une valeur en dur (`#0C0820`).

## Typographie

Une seule famille : Libre Franklin, hébergée dans le site (`assets/fonts/`). Graisses : 400, 500, 600, 700, 800.

| Usage | Taille | Graisse |
| --- | --- | --- |
| Titre d'accueil | de 38 à 156 px (adaptatif) | 800, capitales, interligne 0,9 |
| Titre de page | 28 px | 700 |
| Titre de fenêtre | 19 px | 700 |
| Titre de carte | 13 px | 700 |
| Texte | 15 px | 400 |
| Texte secondaire | 13 px | 400 |
| Légende, case du calendrier | 11 px minimum | 600 |

Pas de capitales espacées en dehors du nom « ALBARBER » et du titre d'accueil.

## Formes

- Un seul rayon d'arrondi pour tout : `--r` = 14 px (boutons, cartes, champs, fenêtres, badges, avatars). Pas de pilule.
- Espacements sur une grille de 4 px : 4, 8, 12, 16, 24, 32.
- Bordures de 1 px. Pas d'ombre décorative, seulement l'ombre des fenêtres.
- Matière : verre dépoli (flou 18 à 30 px) pour le calendrier, les cartes, les barres et les fenêtres. Jamais du verre sur du verre.
- Boutons : un principal (fond `--cta`), un secondaire (contour `--l2`). Destructif : fond `--red`.

## Icônes

Un seul jeu : Phosphor, style Regular, 20 px, trait de la couleur du texte.
Usages autorisés : calendrier et cloche sur l'accueil. Le reste de l'interface est en texte.
Aucun emoji dans l'interface.

## Mouvement

Autorisé :
1. apparition d'un écran : fondu et 6 px de translation, 200 ms ;
2. fenêtres : fondu et 24 px de translation, 220 ms, sortie par le même chemin, sans rebond ;
3. appui : réduction à 97 %, 120 ms ;
4. survol (souris seulement) : changement de fond, 150 ms ;
5. écran de chargement : fondu, 350 ms ;
6. barres de statistiques : 300 ms.

Interdit : rebond, cascade, parallaxe, animation au défilement, pastille qui pulse, curseur personnalisé.
Avec « réduire les animations » activé dans le système, plus aucune animation.

## Ton des textes

- Tutoiement partout, côté client comme côté admin.
- Phrases courtes, 15 mots au maximum, verbe à l'impératif pour les actions.
- On dit ce qui s'est passé : « Créneau réservé. », pas « Votre réservation a bien été prise en compte ! ».
- Ni point d'exclamation, ni tiret long, ni tiret de liaison utilisé comme ponctuation, ni emoji.
- Mots à ne jamais utiliser : expérience, solution, boost, booster, libérer, potentiel, découvrir, magique, unique, révolutionnaire, ultime, premium.
- Aucun avis, chiffre, logo de client ou photo qui ne soit pas réel et confirmé.

## Accessibilité

- Contraste minimum 4,5:1 pour tout texte.
- Zoom autorisé (pas de `user-scalable=no`).
- Zones tactiles de 44 px minimum pour les actions principales.
- Chaque image porte un texte alternatif utile.

## Identité et fichiers publics

- Logo : pas encore de logo. Le monogramme « A » (`assets/icons/icon.svg`) est un remplaçant. À changer quand le logo existe.
- Favicon : `favicon.ico` (16 et 32 px), `assets/icons/icon.svg`, `apple-touch-icon.png` (180 px), `icon-192.png`, `icon-512.png`, déclarés dans `manifest.webmanifest`.
- Image de partage : `assets/og.png` (1200 × 630), texte seul, sans portrait.
- Portrait d'accueil : `assets/hero.jpg` est une image générée, provisoire. À remplacer par une vraie photo.
- Pages : `index.html`, `confidentialite.html`, `mentions-legales.html`, `404.html`. Styles des pages statiques dans `assets/page.css`, mêmes variables.
- `netlify.toml` masque `plans/`, `.claude/`, `netlify/`, `DESIGN.md` et fixe les en-têtes de sécurité.
