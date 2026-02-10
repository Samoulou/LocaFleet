# Prompt — Maquettes LocaFleet (Flux Complet)

> Utilise ce prompt avec un outil de génération UI (Claude Artifacts, v0, Figma AI, etc.)

---

## Contexte

Tu es un UI/UX designer senior spécialisé dans les applications SaaS B2B. Tu dois créer les maquettes haute fidélité pour **LocaFleet**, un back-office de gestion de flotte et location de véhicules destiné aux loueurs indépendants (30-100 véhicules).

L'application est **desktop-first** (responsive tablet pour les constats terrain). L'interface doit être **fonctionnelle, dense en information, et rapide à utiliser** — c'est un outil de travail quotidien, pas un site vitrine.

---

## Design System

- **Component library :** shadcn/ui
- **Styling :** Tailwind CSS
- **Icons :** Lucide React
- **Font :** Inter (ou système)
- **Border radius :** 8px (rounded-lg)
- **Mode :** Light (dark mode en V2)

### Palette de couleurs

| Usage | Color | Hex | Tailwind |
|-------|-------|-----|----------|
| Primary (actions, liens) | Blue | `#2563EB` | `blue-600` |
| Success / Disponible | Green | `#16A34A` | `green-600` |
| Warning / Maintenance | Amber | `#D97706` | `amber-600` |
| Danger / En retard / Hors service | Red | `#DC2626` | `red-600` |
| Loué | Purple | `#7C3AED` | `violet-600` |
| Background | Slate | `#F8FAFC` | `slate-50` |
| Sidebar | White ou Slate-900 (dark sidebar) | — | — |
| Text primary | Slate 900 | `#0F172A` | `slate-900` |
| Text secondary | Slate 500 | `#64748B` | `slate-500` |

### Status Badges

| Statut | Style |
|--------|-------|
| Disponible | Badge vert, dot vert |
| Loué | Badge violet, dot violet |
| En maintenance | Badge ambre, dot ambre |
| Hors service | Badge rouge, dot rouge |
| Actif (contrat) | Badge bleu |
| Terminé | Badge gris |
| En attente (paiement) | Badge ambre |
| Payé | Badge vert |

---

## Layout Global

```
┌─────────────────────────────────────────────────────────┐
│  Top Bar : Logo "LocaFleet" │ 🔍 Recherche (⌘K) │ 🌐 FR/EN │ 👤 User  │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│   Sidebar    │          Main Content                    │
│   (240px)    │                                          │
│              │  ┌────────────────────────────────────┐  │
│  🏠 Dashboard │  │  Breadcrumb                        │  │
│  🚗 Véhicules│  │  Page Title        [+ Action btn]  │  │
│  👥 Clients  │  │──────────────────────────────────  │  │
│  📋 Contrats │  │  Filters bar                       │  │
│  📅 Planning │  │──────────────────────────────────  │  │
│  💰 Dossiers │  │                                    │  │
│  🔧 Maintenance│ │  Content area                     │  │
│              │  │  (table / form / calendar)          │  │
│              │  │                                    │  │
│  ──────────  │  └────────────────────────────────────┘  │
│  ⚙️ Settings │                                          │
└──────────────┴──────────────────────────────────────────┘
```

- Sidebar collapsible (icônes seules en mode réduit)
- Badges de notification sur les items sidebar (ex : "3" retours en retard sur Planning)
- Le bouton d'action principal est toujours en haut à droite du contenu (ex : "+ Nouveau contrat")

---

## Écrans à maquetter — Flux complet

Génère chaque écran ci-dessous en respectant le design system. Pour chaque écran, inclus des **données réalistes** (noms suisses, plaques d'immatriculation VD/VS/GE, véhicules courants, montants en CHF).

---

### ÉCRAN 1 — Login

- Centré, fond `slate-50`
- Logo LocaFleet en haut
- Champs : Email, Mot de passe
- Bouton "Se connecter" (primary blue)
- Lien "Mot de passe oublié ?"
- Sélecteur de langue FR/EN discret en bas

---

### ÉCRAN 2 — Dashboard (page d'accueil)

**KPI Cards (haut, 1 ligne de 4-6 cards) :**
- Véhicules disponibles : 18/32 (icône voiture, vert)
- Contrats actifs : 14 (icône document, bleu)
- CA du mois : 24'850 CHF (icône trending-up)
- Paiements en attente : 3'200 CHF (icône clock, ambre)
- Retours aujourd'hui : 3 (icône calendar-check)
- Véhicules en maintenance : 2 (icône wrench, ambre)

**Section "Retours aujourd'hui" :**
- Liste compacte : Client | Véhicule | Heure prévue | Action "Faire le constat"

**Section "Retours en retard" (si applicable) :**
- Liste rouge/warning : Client | Véhicule | Date prévue | Jours de retard | Téléphone

**Section "Graphique CA" :**
- Bar chart simple : CA des 6 derniers mois

---

### ÉCRAN 3 — Liste des véhicules

**Barre de filtres :**
- Dropdown catégorie (Toutes, Citadine, SUV, Berline, Utilitaire...)
- Dropdown statut (Tous, Disponible, Loué, Maintenance, Hors service)
- Recherche texte (immatriculation, marque/modèle)

**KPI mini-cards au-dessus du tableau :**
- Total : 32 | Disponibles : 18 🟢 | Loués : 10 🟣 | Maintenance : 3 🟠 | Hors service : 1 🔴

**Tableau :**
| Photo (thumb) | Marque / Modèle | Immatriculation | Catégorie | Km | Statut (badge) | Actions (⋯) |

**Bouton :** "+ Nouveau véhicule" (top right)

Données exemple :
- VW Golf 8 | VD 345 678 | Citadine | 45'230 km | 🟢 Disponible
- BMW X3 | VD 112 233 | SUV | 62'100 km | 🟣 Loué
- Renault Master | GE 789 012 | Utilitaire | 98'400 km | 🟠 Maintenance

---

### ÉCRAN 4 — Fiche véhicule (détail)

**Header :** Photo principale + Marque Modèle + Immatriculation + Badge statut
**Tabs :** Informations | Photos | Locations | Maintenance

**Tab "Informations" :**
- Grid 2 colonnes : Marque, Modèle, Année, Couleur, VIN, Carburant, Transmission, Places, Catégorie, Km actuel
- Section "Notes internes" (textarea)
- Boutons : "Modifier" | "Changer statut"

**Tab "Photos" :** Galerie grid (4 colonnes) avec action upload

**Tab "Locations" :** Timeline / liste des contrats passés et en cours

**Tab "Maintenance" :**
- Liste des entrées : Date | Type | Description | Coût | Statut (Ouvert/Clôturé)
- Bouton "+ Nouvelle maintenance"
- Formulaire maintenance : Type (dropdown), Description, Coût estimé, Email mécanicien, Urgence
- Note : si un email mécanicien est renseigné → mention "📧 Un email sera envoyé au mécanicien"

---

### ÉCRAN 5 — Liste des clients

**Recherche** + **Tableau :**
| Nom Prénom | Téléphone | Email | Nb locations | Dernière location | Actions |

**Bouton :** "+ Nouveau client"

Données exemple :
- Marc Favre | +41 79 123 45 67 | marc.favre@gmail.com | 4 | 15.01.2026
- Sophie Rochat | +41 78 987 65 43 | s.rochat@bluewin.ch | 1 | 28.01.2026

---

### ÉCRAN 6 — Fiche client (détail)

**Header :** Nom Prénom + Email + Téléphone
**Tabs :** Informations | Documents | Historique

**Tab "Informations" :**
- Données personnelles (nom, prénom, adresse, date de naissance)
- Permis de conduire : numéro, catégorie, date d'expiration (⚠️ warning si < 30 jours)
- Notes internes

**Tab "Documents" :**
- Liste avec vignettes : Type (Permis, ID, Justificatif) | Fichier | Date upload | Actions (voir, télécharger, supprimer)
- Bouton "+ Ajouter un document"

**Tab "Historique" :**
- Tableau : Dates | Véhicule | Montant | Statut contrat

---

### ÉCRAN 7 — Création de contrat (Wizard 4 étapes)

**Stepper horizontal en haut :** ① Client → ② Véhicule → ③ Dates & Tarif → ④ Récapitulatif

**Étape 1 — Client :**
- Recherche client (autocomplete)
- Aperçu fiche client sélectionné (nom, permis, statut permis)
- ⚠️ Alerte si permis expiré

**Étape 2 — Véhicule :**
- Liste/grid des véhicules **disponibles uniquement** (photo, marque/modèle, immat, catégorie)
- Véhicules non disponibles grisés avec raison
- Sélection par clic

**Étape 3 — Dates & Tarification :**
- Date de départ (date + heure)
- Date de retour (date + heure)
- Tarif journalier (pré-rempli selon catégorie, modifiable)
- Km inclus/jour
- Options (checkboxes) : GPS (+10 CHF/j), Siège bébé (+5 CHF/j), Assurance complémentaire (+15 CHF/j), Conducteur additionnel (+20 CHF/j)
- Caution (montant)
- **Calcul en temps réel** affiché dans un encadré à droite :
  ```
  5 jours × 80 CHF          400.00 CHF
  GPS (5j × 10 CHF)          50.00 CHF
  Assurance (5j × 15 CHF)    75.00 CHF
  ─────────────────────────────────────
  Total                      525.00 CHF
  Caution                  1'500.00 CHF
  ```

**Étape 4 — Récapitulatif :**
- Résumé complet : client, véhicule, dates, prix, options
- Checkbox "Conditions générales acceptées"
- Boutons : "Créer le contrat" (primary) | "Générer PDF" (secondary)

---

### ÉCRAN 8 — Détail du contrat

**Header :** N° contrat + Badge statut (Actif / Terminé / Annulé)

**Infos principales (cards ou grid) :**
- Client (nom, tél, lien vers fiche)
- Véhicule (marque/modèle, immat, lien vers fiche)
- Dates (départ → retour, durée)
- Montant total + détail tarification

**Section "Constats" :**
- Constat départ : ✅ Fait le 01.02.2026 → [Voir]
- Constat retour : ⏳ En attente → [Faire le constat]

**Section "Facturation" :**
- Statut dossier : À facturer / Payé / Archivé
- Lien vers facture/dossier

**Actions :** Modifier | Prolonger | Terminer le contrat | Générer PDF | Annuler

---

### ÉCRAN 9 — État des lieux (constat départ OU retour)

**Header :** "Constat de départ" ou "Constat de retour" + Véhicule + Client

**Formulaire :**
- Kilométrage (number input)
- Niveau de carburant (gauge visuel cliquable : E, 1/4, 1/2, 3/4, F)
- Photos du véhicule (zone d'upload drag & drop, grid de thumbnails)

**Section "Dégâts" :**
- Bouton "+ Ajouter un dégât"
- Pour chaque dégât :
  - Zone (dropdown : Avant, Arrière, Côté gauche, Côté droit, Toit, Intérieur)
  - Type (dropdown : Rayure, Bosse, Cassé, Tache, Autre)
  - Gravité (radio : Léger 🟡, Moyen 🟠, Grave 🔴)
  - Photo (upload)
  - Commentaire (textarea)
- Liste des dégâts ajoutés avec possibilité de supprimer

**Si constat RETOUR :**
- Encadré "Constat de départ" affiché en comparaison (km départ, carburant départ, dégâts existants)
- Nouveaux dégâts clairement différenciés (bordure rouge, label "NOUVEAU")
- Différence km affichée automatiquement

**Signature client :**
- Pad de signature (canvas tactile)
- Bouton "Effacer" | "Valider la signature"

**Actions :** "Enregistrer le constat" (primary) | "Enregistrer en brouillon"

---

### ÉCRAN 10 — Planning (calendrier)

**Vue Gantt / Timeline horizontale :**
- Y-axis : véhicules (photo thumb + marque modèle + immat)
- X-axis : jours (scrollable)
- Barres colorées par statut de contrat (bleu = actif, gris = terminé, ambre = en attente)
- Au survol d'une barre : popover avec client, dates, lien contrat

**Filtres :** Catégorie | Statut véhicule | Période (semaine / mois)

**Indicateurs :**
- Retours aujourd'hui marqués avec un indicateur vertical
- Retards surlignés en rouge

**Toggle vue :** Timeline | Calendrier mensuel

---

### ÉCRAN 11 — Dossiers (facturation simplifiée)

**Tabs horizontaux :** À facturer | Facturé | Payé | Archivé

**Tableau par tab :**
| N° dossier | Client | Véhicule | Période | Montant | Statut | Actions |

**Actions par statut :**
- "À facturer" → Bouton "Marquer comme facturé" | "Générer facture PDF"
- "Facturé" → Bouton "Quittancer" (marquer comme payé)
- "Payé" → Bouton "Archiver"
- "Archivé" → Lecture seule, tous les documents liés (contrat PDF, constats PDF, facture PDF)

**Modal "Quittancer" :**
- Date du paiement
- Moyen de paiement (dropdown : Espèces, Carte, Virement)
- Référence (optionnel)
- Bouton "Confirmer le paiement"

---

### ÉCRAN 12 — Settings

**Sous-pages :**
- **Profil entreprise :** Nom, adresse, logo, email de contact
- **Utilisateurs :** Tableau avec rôle (Admin/Agent/Viewer), invitation par email
- **Catégories véhicules :** CRUD liste
- **Tarification :** Tarif par défaut par catégorie, options et leurs prix
- **Email mécanicien par défaut :** Email pré-rempli pour les maintenances

---

## Directives de design

1. **Densité** — Favoriser les tableaux denses plutôt que des cards espacées. L'utilisateur gère 30-100 véhicules, il a besoin de voir beaucoup d'infos d'un coup.
2. **Actions rapides** — Les changements de statut, la recherche, la création de contrat doivent être à 1-2 clics max.
3. **Couleurs sémantiques** — Les badges de statut doivent être immédiatement lisibles sans lire le texte (vert = OK, rouge = problème, ambre = attention).
4. **Données réalistes** — Utiliser des noms suisses (Favre, Rochat, Müller, Bonvin), des plaques VD/VS/GE, des véhicules courants en Suisse (VW, BMW, Skoda, Renault, Peugeot), des montants en CHF avec séparateur apostrophe (1'500.00 CHF).
5. **Cohérence** — Toutes les listes suivent le même pattern : filtres → KPI mini → tableau → pagination. Tous les détails suivent : header → tabs → contenu.
6. **Pas de chichi** — Pas d'illustrations décoratives, pas de gradients, pas d'animations complexes. Clean, professionnel, utilitaire.
