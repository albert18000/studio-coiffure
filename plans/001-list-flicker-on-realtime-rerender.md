# 001 — Arrêter le re-clignotement des listes admin à chaque événement realtime

- **Status**: DONE (renderMembres exclu — voir note ci-dessous)
- **Commit**: 2ed2960
- **Severity**: HIGH
- **Category**: Interruptibilité (Catégorie 4)
- **Estimated scope**: 1 fichier (index.html), ~6 fonctions JS + 1 flag global

## Problem

Les listes admin (créneaux, prestations, moyens de paiement, annonces, membres) utilisent une animation d'entrée en `@keyframes` :

```css
/* index.html:194 — actuel */
.sli{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--s2);border-radius:var(--r-sm);margin-bottom:6px;font-size:13px;gap:8px;flex-wrap:wrap;animation:riseIn .3s var(--ease-out) both}
```
(même schéma pour `.svc-row` à index.html:234, `.ann-item` à index.html:176, `.pay-card` à index.html:242, `.hist-item` à index.html:272)

```css
/* index.html:288 — keyframe */
@keyframes riseIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
```

Le problème : ces listes sont entièrement re-rendues (le HTML est remplacé en bloc, pas de diff par ligne) via `innerHTML=...map(...).join('')` dans plusieurs fonctions :

- `renderASlots()` — index.html:1560
- `renderServices()` — index.html:926
- `renderAdminPayments()` — index.html:1008
- `renderAdmAnnonces()` — index.html:1465
- `renderMembres()` — index.html:1682

Ces fonctions sont rappelées automatiquement à chaque événement Supabase Realtime, via `flashAndRender()` (index.html:871) :

```js
/* index.html:871 — actuel */
function flashAndRender(){
  const tbl=document.getElementById('cal-tbl');
  if(tbl){tbl.classList.remove('cal-flash');void tbl.offsetWidth;tbl.classList.add('cal-flash');}
  if(document.getElementById('s-adm').classList.contains('on')){
    if(admTab==='slots')renderASlots();
    if(admTab==='stats')renderStats();
  }
}
```

Une `@keyframes` redémarre toujours de zéro à chaque montage DOM (contrairement à une `transition`, qui repart de l'état courant). Donc : si l'admin est sur l'onglet "Créneaux" et qu'un client réserve un créneau ailleurs (ou que n'importe quelle ligne `slots` change), la liste ENTIÈRE se re-remplace et TOUTES les lignes rejouent leur animation d'entrée (translateY + fade), y compris celles qui n'ont pas changé. Résultat : un clignotement visible sur toute la liste à chaque mise à jour temps réel, potentiellement plusieurs fois par session — c'est justement le genre de re-render qu'on a rendu plus fréquent en corrigeant le bug d'affichage du CA (chooseService/addManualSlot appellent maintenant renderAdm() en plus).

## Target

Deux changements complémentaires :

1. **Ne pas rejouer l'animation d'entrée sur les re-renders déclenchés par le realtime** — seulement au premier affichage de l'écran admin (quand on ouvre l'onglet, ou quand on change de sous-onglet). Techniquement : ajouter une classe `.no-anim` qui neutralise l'animation, appliquée automatiquement dès que le re-render vient de `flashAndRender()` plutôt que d'une navigation utilisateur.

```css
/* target — ajouter juste après la règle .sli existante à index.html:194 (même bloc pour les 4 autres sélecteurs) */
.sli.no-anim,.svc-row.no-anim,.ann-item.no-anim,.pay-card.no-anim,.hist-item.no-anim{animation:none}
```

2. **Chaque fonction de rendu accepte un paramètre `silent`** qui, si `true`, ajoute `no-anim` sur les lignes générées :

```js
/* target — exemple pour renderASlots, même principe pour les 4 autres */
function renderASlots(silent){
  // ... code existant identique jusqu'au .map ...
  const cls = silent ? 'sli no-anim' : 'sli';
  list.innerHTML=sorted.map(s=>{
    // remplacer `<div class="sli">` par :
    return `<div class="${cls}">...`; // reste du template identique
  }).join('');
}
```

3. **`flashAndRender()` passe `true`** puisqu'il s'agit toujours d'un re-render déclenché par un événement externe, pas d'une navigation :

```js
/* target — index.html:871 */
function flashAndRender(){
  const tbl=document.getElementById('cal-tbl');
  if(tbl){tbl.classList.remove('cal-flash');void tbl.offsetWidth;tbl.classList.add('cal-flash');}
  if(document.getElementById('s-adm').classList.contains('on')){
    if(admTab==='slots')renderASlots(true);
    if(admTab==='stats')renderStats();
  }
}
```

`renderAdm()` (index.html vers 1423, qui route vers `renderServices()`, `renderAdminPayments()`, `renderAdmAnnonces()`, `renderMembres()`) garde ses appels normaux (sans `silent`) quand elle est déclenchée par une vraie navigation (clic sur un onglet), mais les appels venant des handlers `postgres_changes` (`.on('postgres_changes',{event:'*',...` pour announcements/users/services/payment_methods, autour de index.html:833-847) doivent passer par une variante silencieuse — soit en dupliquant le routage, soit en passant un flag à `renderAdm(silent)` qui le propage à la fonction cible qu'il appelle.

Le flash global `cal-flash` sur le calendrier (index.html:119, `.cal-flash{animation:flash .4s var(--ease-out)}`) reste inchangé — c'est un signal volontaire et déjà correct (voir audit, non reporté comme finding).

## Repo conventions to follow

- Les easings sont déjà en tokens (`--ease-out`, `--ease-in-out`, `--ease-spring` à index.html:29) — ne pas en introduire de nouveaux ici, ce plan ne touche à aucune durée/courbe.
- Le pattern `animation:none` pour désactiver une animation existe déjà dans le bloc `prefers-reduced-motion` à index.html:307-310 — s'en inspirer pour le nommage de la règle `.no-anim`.
- Garder le style "un seul fichier, CSS/JS inline" du projet — pas de nouveau fichier.

## Steps

1. Dans le bloc CSS `/* LISTES */` (autour de index.html:194), ajouter la règle `.no-anim` groupée juste après la déclaration existante de `.sli`.
2. Modifier `renderASlots()` (index.html:1560) pour accepter un paramètre `silent` et injecter la classe conditionnelle sur le template `.sli`.
3. Modifier `renderServices()` (index.html:926), `renderAdminPayments()` (index.html:1008), `renderAdmAnnonces()` (index.html:1465), `renderMembres()` (index.html:1682) de la même façon pour leurs classes respectives (`.svc-row`, `.pay-card`, `.ann-item`, lignes de `renderMembres` — vérifier le nom de classe exact utilisé dans cette fonction avant d'éditer).
4. Modifier `flashAndRender()` (index.html:871) pour appeler `renderASlots(true)`.
5. Repérer les handlers `.on('postgres_changes',{event:'*',schema:'public',table:'announcements'}...)`, `table:'users'`, `table:'services'`, `table:'payment_methods'` (autour de index.html:833-847) : chacun doit déclencher son render correspondant avec `silent=true` plutôt qu'un appel normal à `renderAdm()`.
6. Vérifier que les appels à ces mêmes fonctions de rendu depuis une navigation utilisateur normale (clic sur un onglet admin, `atab()`, ou fonctions comme `addAnnonce`/`addService` juste après une action explicite de l'admin) restent SANS le flag `silent` — ces cas-là doivent continuer à animer normalement.

## Boundaries

- Ne pas toucher au flash `cal-flash` du calendrier.
- Ne pas changer les durées/courbes des animations `riseIn` elles-mêmes — seulement les neutraliser conditionnellement.
- Ne pas ajouter de logique de diff DOM ligne par ligne (ce serait un chantier plus large) — la neutralisation par flag `silent` suffit pour ce fix.
- Si le nom exact d'une classe de ligne dans `renderMembres()` ou `renderAdminPayments()` diffère de ce qui est cité ici (le code a pu bouger depuis le commit 2ed2960), STOP et signaler plutôt que d'improviser.

## Note d'exécution (drift constaté vs plan)

- `renderAdminPayments()` utilise en réalité la classe `.sli` (pas `.pay-card` comme indiqué) — `.pay-card` appartient à `renderPaiement()`, l'écran client (`s-paiement`), hors scope de ce plan. Corrigé sans ambiguïté : réutilise `.sli.no-anim` déjà en place pour `renderASlots()`.
- `renderMembres()` : la ligne générée est un `<div style="...">` sans aucune classe CSS, donc sans animation `riseIn` à neutraliser — il n'y a rien à corriger dans cette fonction, elle ne clignote pas via keyframe. Conformément au boundary du plan ("STOP et signaler" en cas de classe différente), elle a été laissée intacte plutôt que d'improviser une classe/animation qui n'existe pas. Son appel realtime (`table:'users'`, index.html:853) reste donc un appel normal sans flag `silent`.

## Verification

- **Mechanical**: ouvrir index.html dans un navigateur, aucune erreur console au chargement de l'onglet admin.
- **Feel check**:
  - Ouvrir l'admin sur l'onglet "Créneaux" dans un onglet, réserver ou modifier un créneau depuis un second onglet/appareil connecté au même compte.
  - Confirmer que la liste des créneaux se met à jour SANS que les lignes existantes ne re-fondent/re-glissent — seul le flash du calendrier (si visible) doit signaler le changement.
  - Confirmer qu'en revanche, ouvrir l'onglet "Créneaux" pour la première fois (navigation normale) fait toujours apparaître les lignes avec l'animation `riseIn` d'origine, décalée par ligne.
  - Répéter le test sur les onglets "Prestations", "Paiement", "Annonces", "Membres".
  - Dans DevTools, passer la vitesse de lecture à 10% (panneau Animations) pendant un re-render realtime et confirmer qu'aucune animation `riseIn` ne se déclenche sur les lignes déjà présentes.
- **Done when**: un changement de données déclenché par un autre client (ou un autre onglet) ne fait plus clignoter les listes admin déjà affichées, tout en préservant l'animation d'entrée lors d'une vraie navigation.
