# CampusFlow

**Academic life, made simple.** Plateforme de gestion académique pour les universités et établissements d’enseignement supérieur au Bénin. Elle relie étudiants, professeurs et administration dans une interface inspirée de Notion.

> **Pas de base de données pour l’instant.** Les données vivent en mémoire côté serveur et sont sauvegardées dans un fichier JSON local (`server/data/store.json`, ignoré par git). Tout l’accès aux données passe par `server/src/store/index.js` : brancher Prisma + SQLite plus tard reviendra à réécrire ce seul module.

---

## Démarrage rapide

Prérequis : Node.js 18 ou plus récent.

```bash
npm install        # installe la racine, server/ et client/
npm run dev        # API sur http://localhost:4000 + interface sur http://localhost:5173
```

Ouvrez http://localhost:5173. Les données de démonstration sont générées automatiquement au premier lancement.

| Commande | Effet |
|---|---|
| `npm run dev` | API + front en mode développement |
| `npm run seed` | Régénère les données de démonstration (efface les modifications) |
| `npm test` | Tests de l’API : auth, rôles, CRUD, moyennes, emploi du temps, activités, notifications |
| `npm run build && npm start` | Build de production servi par Express sur http://localhost:4000 |

### Comptes de démonstration

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Étudiant | `etudiant@campusflow.bj` | `Etudiant123!` |
| Professeur | `prof@campusflow.bj` | `Prof123!` |
| Administrateur | `admin@campusflow.bj` | `Admin123!` |

Les autres comptes générés (étudiants et professeurs) utilisent les mêmes mots de passe par rôle (`Etudiant123!`, `Prof123!`). L’établissement, les personnes et les e-mails sont fictifs.

### Variables d’environnement (facultatives)

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `4000` | Port de l’API |
| `JWT_SECRET` | valeur de dev | **À changer en production** |
| `JWT_EXPIRES_IN` | `8h` | Durée de validité des sessions |
| `CAMPUSFLOW_DATA_DIR` | `server/data` | Dossier du fichier JSON |
| `CAMPUSFLOW_PERSIST` | `true` | `false` = mémoire seule (rien n’est écrit) |
| `CORS_ORIGIN` | toutes | Origines autorisées, séparées par des virgules |

---

## Fonctionnalités

**Authentification** : connexion par e-mail et mot de passe, affichage/masquage du mot de passe, validation, messages d’erreur et de succès, état de chargement. JWT, mots de passe hachés avec bcrypt, limitation des tentatives, déconnexion qui invalide le jeton côté serveur.

**Étudiant** : vue d’ensemble (profil, semestre, prochains cours, notes récentes, moyenne générale, annonces, activité récente), mes cours avec détail et professeur, notes par cours avec moyenne pondérée et crédits, emploi du temps hebdomadaire (vue par jour sur mobile), inscription et désinscription aux activités, notifications, paramètres.

**Professeur** : cours assignés, étudiants inscrits, carnet de notes (création, modification et suppression d’évaluations, saisie en tableau avec validation de 0 à 20, aperçu de la moyenne en direct, enregistrement groupé avec Ctrl+S), emploi du temps, notifications.

**Administrateur** : CRUD complet sur les étudiants, professeurs, cours (avec affectation du professeur), classes, créneaux (détection des conflits de salle, de professeur et de classe) et activités (avec gestion des inscrits). S’y ajoutent les annonces ciblées, les dossiers académiques avec export CSV, des rapports (répartition des moyennes, réussite par classe et par cours, remplissage des activités, charge d’enseignement) et les paramètres de l’établissement.

**Interface commune** : barre latérale repliable (Ctrl+\\) avec tiroir sur mobile, fil d’Ariane, recherche globale (Ctrl+K), cloche de notifications avec compteur, menu profil. On y trouve aussi des tableaux triables et paginés, des modales accessibles (Échap, piège du focus), des confirmations avant suppression, des toasts, ainsi que des états de chargement, vides et d’erreur.

### Calcul des moyennes

- Moyenne d’un cours = Σ(note × poids de l’évaluation) / Σ(poids des évaluations notées)
- Moyenne générale = Σ(moyenne du cours × coefficient) / Σ(coefficients des cours notés)
- Un cours est validé (ses crédits sont acquis) à partir de 10/20.

### Notifications automatiques

| Événement | Destinataires |
|---|---|
| Note publiée ou modifiée | l’étudiant concerné |
| Créneau ajouté, modifié ou supprimé | étudiants du cours + professeur |
| Cours créé, réassigné ou supprimé | professeur + étudiants |
| Activité créée | tous les étudiants |
| Activité modifiée ou annulée | inscrits |
| Inscription ou désinscription | l’étudiant + l’administration |
| Annonce | public ciblé (tous, étudiants ou professeurs) |

---

## Architecture

```
client/                 React 18 + Vite + Tailwind + React Router + Axios + Lucide
  public/               logos CampusFlow (sidebar, connexion, favicon)
  src/components/ui     design system : Button, Input, Select, Modal, DataTable, Tabs…
  src/components/layout AppShell, Sidebar, Topbar, recherche, notifications
  src/pages             pages par domaine (overview/, grades/, admin/…)
  tailwind.config.js    jetons de design centralisés (couleurs, rayons, ombres)
server/                 Node.js + Express (API REST)
  src/store             stockage mémoire + JSON, données de démo
  src/services          logique métier partagée (moyennes, droits, notifications)
  src/routes            auth, people, academics, campus
  src/middleware        authentification JWT et autorisation par rôle
  test/                 tests d’intégration (node:test)
```

Les droits sont vérifiés côté serveur sur chaque route (`authorize('ADMIN')`, `assertCanGrade`…). Le front masque simplement ce qu’un rôle ne peut pas faire.

### Passer à une vraie base de données plus tard

Les collections du store correspondent une à une aux futurs modèles Prisma : `users`, `students`, `professors`, `classes`, `courses`, `enrollments`, `evaluations`, `grades`, `timetable`, `activities`, `registrations`, `notifications`, `announcements`, `activityLog`, `settings`. Pour migrer, il faut écrire le `schema.prisma` correspondant et réimplémenter les fonctions de `server/src/store/index.js` (`all`, `byId`, `where`, `insert`, `update`, `remove`…). Les routes ne changent pas.

### Palette

Campus Blue `#315EFB` · Midnight Ink `#172033` · Soft Canvas `#F6F7F5` · Sky `#DCE7FF` · Success `#16845B` · Warning `#E99A32` · Danger `#D94C4C` · Typographie : Inter.
