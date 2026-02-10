# 3. User Interface Design Goals

## 3.1 Design Philosophy

LocaFleet est un outil de travail quotidien. L'interface doit être **fonctionnelle avant tout** — chaque écran doit permettre à l'utilisateur d'accomplir sa tâche le plus rapidement possible, sans friction.

### Principes directeurs

1. **Efficiency first** — Les actions fréquentes (créer un contrat, changer un statut, chercher un véhicule) doivent être accessibles en 1-2 clics maximum.
2. **Information density** — Les tableaux et listes affichent les données essentielles sans navigation superflue. Pas de cards décoratives quand un tableau suffit.
3. **Progressive disclosure** — Les détails et options avancées sont cachés par défaut et accessibles via des panneaux latéraux ou modales.
4. **Consistent patterns** — Toutes les entités (véhicules, clients, contrats) suivent le même pattern : liste → fiche détaillée → actions.
5. **Visual status** — Les statuts (disponible, loué, maintenance) sont immédiatement reconnaissables par des badges colorés.

## 3.2 Navigation — Sidebar Only

> **RÈGLE** : La navigation se fait **exclusivement par sidebar**. Pas de navigation horizontale en top bar. Le top bar est réservé à la recherche globale, notifications et user menu.

```
┌─────────────────────────────────────────────────────────┐
│  Top Bar : 🔍 Rechercher... (⌘K)        🔔  👤 User   │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  ┌────────┐  │         Main Content Area                │
│  │🚐 Logo │  │                                          │
│  │LocaFleet│  │  ┌────────────────────────────────────┐  │
│  │Fleet Mgt│  │  │  Breadcrumb                        │  │
│  └────────┘  │  │  Page Title        [+ Action btn]  │  │
│              │  │──────────────────────────────────── │  │
│  🏠 Dashboard│  │  Filters bar                        │  │
│  🚗 Véhicules│  │──────────────────────────────────── │  │
│  👥 Clients  │  │                                    │  │
│  📋 Contrats │  │  Content area                       │  │
│  📅 Planning │  │  (table / form / calendar / detail)  │  │
│  📁 Dossiers │  │                                    │  │
│  🔧 Maintenance│ │                                    │  │
│              │  └────────────────────────────────────┘  │
│  ──────────  │                                          │
│  ⚙️ Settings │                                          │
│              │                                          │
│  ──────────  │                                          │
│  👤 User     │                                          │
│  Role        │                                          │
└──────────────┴──────────────────────────────────────────┘
```

### Sidebar — Spécifications dev

| Propriété | Valeur |
|-----------|--------|
| Largeur expanded | 240px |
| Largeur collapsed | 64px (icônes seules) |
| Background | `white` (border-r `slate-200`) |
| Active item | Background `blue-50`, text `blue-600`, left border 3px `blue-600` |
| Hover item | Background `slate-50` |
| Icon size | 20px (`w-5 h-5`) |
| Font | 14px medium (`text-sm font-medium`) |
| Spacing entre items | 4px (`gap-1`) |
| Section separator | `border-t slate-200` avec `py-2` |
| Collapse trigger | Bouton chevron en bas de la sidebar ou hamburger |
| Badges | Pill `bg-red-100 text-red-600` aligné à droite de l'item (ex: retards) |

**Implémentation :**
```
Composant: <AppSidebar /> (shadcn/ui Sidebar ou custom)
State: collapsed/expanded (persister dans localStorage)
Items: Array config avec { icon, label, href, badge? }
User section: En bas — avatar (initiales), nom, rôle. Click → dropdown (profil, déconnexion)
```

### Top Bar — Spécifications dev

| Propriété | Valeur |
|-----------|--------|
| Hauteur | 56px (`h-14`) |
| Background | `white` (border-b `slate-200`) |
| Contenu gauche | Vide (la sidebar prend le relai) |
| Contenu centre | Search input — placeholder "Rechercher..." avec badge `⌘K` |
| Contenu droite | Notification bell (avec badge count rouge) + User avatar |

**Implémentation search :**
```
Composant: <CommandSearch /> (shadcn/ui Command / cmdk)
Trigger: Click sur input OU ⌘K / Ctrl+K
Recherche: Véhicules (par immat/marque), Clients (par nom), Contrats (par numéro)
Résultats: Groupés par type avec icônes, navigation au clic
```

## 3.3 Design System & Component Library

### Stack UI

| Aspect | Choix | Justification |
|--------|-------|---------------|
| Component library | **shadcn/ui** | Composants accessibles, personnalisables, pas de dépendance lourde |
| Styling | **Tailwind CSS 3.x** | Utility-first, cohérent avec Next.js ecosystem |
| Icons | **Lucide React** | Inclus avec shadcn/ui, léger, complet |
| Charts | **Recharts** | Léger, React-native, suffisant pour les KPIs dashboard |
| Planning/Gantt | **planby** | Timeline horizontale par véhicule, léger, React-native |
| Date picker | shadcn/ui DatePicker (date-fns) | Cohérent avec le design system |
| PDF generation | **@react-pdf/renderer** | Contrats et factures |
| Signature | **react-signature-canvas** | États des lieux |
| File upload | **Supabase Storage** + composant custom dropzone | Photos véhicules et documents clients |
| Tables | **TanStack Table** + shadcn DataTable | Server-side pagination, tri, filtres |

### Color Palette

| Usage | Color | Hex | Tailwind class |
|-------|-------|-----|----------------|
| Primary (boutons, liens, active) | Blue | `#2563EB` | `blue-600` |
| Primary hover | Blue dark | `#1D4ED8` | `blue-700` |
| Primary light (backgrounds) | Blue light | `#EFF6FF` | `blue-50` |
| Success / Disponible | Green | `#16A34A` | `green-600` |
| Success background | Green light | `#F0FDF4` | `green-50` |
| Warning / Maintenance / En attente | Amber | `#D97706` | `amber-600` |
| Warning background | Amber light | `#FFFBEB` | `amber-50` |
| Danger / Retard / Hors service / Conflit | Red | `#DC2626` | `red-600` |
| Danger background | Red light | `#FEF2F2` | `red-50` |
| Loué / Actif | Purple | `#7C3AED` | `violet-600` |
| Loué background | Purple light | `#F5F3FF` | `violet-50` |
| Vérification | Yellow | `#CA8A04` | `yellow-600` |
| Neutral background | Slate | `#F8FAFC` | `slate-50` |
| Card background | White | `#FFFFFF` | `white` |
| Text primary | Slate dark | `#0F172A` | `slate-900` |
| Text secondary | Slate mid | `#64748B` | `slate-500` |
| Borders | Slate light | `#E2E8F0` | `slate-200` |

### Status Badges — Mapping complet

**Véhicules :**
| Statut | Badge style | Dot |
|--------|-----------|-----|
| Disponible | `bg-green-50 text-green-700 border-green-200` | 🟢 |
| Loué | `bg-violet-50 text-violet-700 border-violet-200` | 🟣 |
| En maintenance | `bg-amber-50 text-amber-700 border-amber-200` | 🟠 |
| Hors service | `bg-red-50 text-red-700 border-red-200` | 🔴 |

**Contrats :**
| Statut | Badge style |
|--------|-----------|
| Actif | `bg-green-50 text-green-700` avec dot vert |
| Brouillon | `bg-slate-100 text-slate-600` |
| Terminé | `bg-slate-100 text-slate-600` |
| Annulé | `bg-red-50 text-red-700` |

**Dossiers / Facturation :**
| Statut | Badge style |
|--------|-----------|
| À facturer | `bg-slate-100 text-slate-700` (outlined) |
| Facturé | `bg-blue-50 text-blue-700` |
| Vérification | `bg-yellow-50 text-yellow-700` (outlined, border) |
| Conflit | `bg-red-50 text-red-700` |
| Payé | `bg-green-50 text-green-700` |
| Archivé | `bg-slate-50 text-slate-400` |

**Maintenance :**
| Statut | Badge style |
|--------|-----------|
| In Progress | `bg-amber-50 text-amber-700` |
| Completed | `bg-green-50 text-green-700` |

### Avatars clients

Quand il n'y a pas de photo client, utiliser un **avatar initiales** :
```
Cercle 32px, background couleur calculée à partir des initiales (hash simple)
Couleurs possibles : blue-100, green-100, amber-100, violet-100, rose-100
Texte : initiales 2 lettres, font-medium, couleur assortie (blue-700, etc.)
Exemple : [MF] Marc Favre → cercle blue-100, texte "MF" blue-700
```

## 3.4 Patterns d'écrans — Guide dev

### Pattern A : Page liste (Véhicules, Clients, Contrats, Dossiers)

```
┌─────────────────────────────────────────────────────┐
│  Page Title                          [+ Action btn] │
│  Subtitle / description                  [Export]   │
├─────────────────────────────────────────────────────┤
│  [🔍 Rechercher...]  [Filtres]    [Période] [Date]  │
├─────────────────────────────────────────────────────┤
│  Tabs (si applicable) : Tab1 (count) | Tab2 | Tab3  │
├─────────────────────────────────────────────────────┤
│  ☐ │ COL1    │ COL2    │ COL3   │ STATUT  │ ⋯     │
│  ☐ │ data    │ data    │ data   │ [badge] │ ⋯     │
│  ☐ │ data    │ data    │ data   │ [badge] │ ⋯     │
├─────────────────────────────────────────────────────┤
│  Affichage 1 à X sur Y    │  < [1] 2 3 ... N >    │
└─────────────────────────────────────────────────────┘

// Si sélection multiple (checkbox) → Bottom action bar :
┌─────────────────────────────────────────────────────┐
│ ✅ X sélectionnés │ Total: CHF X │ Annuler │ PDF │ [Action] │
└─────────────────────────────────────────────────────┘
```

**Spécifications dev :**
- Title : `text-2xl font-bold text-slate-900`
- Subtitle : `text-sm text-slate-500`
- Action button principal : `bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2`
- Bouton secondaire : `border border-slate-200 bg-white hover:bg-slate-50 rounded-lg`
- Search input : `border border-slate-200 rounded-lg px-3 py-2` avec icône search à gauche
- Table header : `text-xs font-medium text-slate-500 uppercase tracking-wider`
- Table row hover : `hover:bg-slate-50`
- Table row selected : `bg-blue-50`
- Pagination : shadcn/ui Pagination
- Bottom action bar : `fixed bottom-0`, `bg-white border-t shadow-lg`, apparaît quand ≥1 item sélectionné, animation slide-up

### Pattern B : Page détail (Fiche véhicule, Client, Contrat)

```
┌─────────────────────────────────────────────────────┐
│  Breadcrumb : Section > Liste > Élément             │
│  Title + Badge statut              [Edit] [Actions] │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐  Actions   │
│  │ Card 1   │ │ Card 2   │ │ Card 3   │  rapides   │
│  │ (entity) │ │ (entity) │ │ (dates)  │  sidebar   │
│  └──────────┘ └──────────┘ └──────────┘  ┌───────┐ │
├─────────────────────────────────────────  │Modifier│ │
│  Tabs : Info │ Photos │ Historique │ ... │Prolonger│ │
├─────────────────────────────────────────  │PDF     │ │
│                                          │Terminer│ │
│  Tab content                             │Annuler │ │
│                                          └───────┘ │
└─────────────────────────────────────────────────────┘
```

**Contrat — layout spécifique (cf. maquette 7) :**
- Header : N° contrat + badge statut + date dernière modif
- 3 cards en ligne : Client (avatar + nom + tel + email) | Véhicule (photo + marque + immat + km) | Dates (départ/retour avec timeline verte/rouge)
- Chaque card a un lien externe ↗ vers la fiche complète
- Actions rapides : colonne droite, boutons empilés verticalement
- Section "État des lieux" : 2 cards côte à côte (Départ ✅/⏳ | Retour ✅/⏳) avec CTA "Faire le constat"
- Section "Facturation" : tableau inline (description, qté, prix unit, total) + total estimé
- Section "Activité récente" : timeline verticale dans la sidebar droite
- Caution : card dans la sidebar droite avec montant + statut

### Pattern C : Formulaire / Wizard (Nouveau contrat)

```
Stepper horizontal : ① Client → ② Véhicule → ③ Tarif → ④ Récap
─────────────────────────────────────────────────────────
Contenu de l'étape courante

[Précédent]                              [Suivant / Créer]
```

### Pattern D : Dashboard

```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│KPI 1 │ │KPI 2 │ │KPI 3 │ │KPI 4 │ │KPI 5 │ │KPI 6 │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
┌─────────────────────────┐ ┌─────────────────────────┐
│  ⚠️ Retours en retard   │ │  📊 Revenus (6 mois)    │
│  Liste alertes rouge    │ │  Bar chart              │
├─────────────────────────┤ ├─────────────────────────┤
│  📅 Retours aujourd'hui │ │  🚗 État de la flotte   │
│  Table: véhicule/client │ │  Progress bars          │
│  /heure/lieu/action     │ │  En location: 44% 🔵    │
└─────────────────────────┘ │  Disponible: 50% 🟢     │
                            │  Maintenance: 6% 🟠     │
                            └─────────────────────────┘
```

**KPI Cards (cf. maquette 5) :**
- Layout : 6 cards en ligne (`grid grid-cols-6 gap-4`)
- Chaque card : `bg-white rounded-xl border border-slate-200 p-4`
- Contenu : Label (text-sm slate-500) + Valeur (text-2xl font-bold) + Sous-info (text-xs) + Icône en haut à droite
- Card "En attente" avec texte rouge si montant > 0
- Card "Véhicules dispo" avec progress bar sous le chiffre (ratio dispo/total)

**Retours en retard :**
- Card avec header rouge `bg-red-50 border-red-200`
- Badge count "X Retards"
- Chaque ligne : icône véhicule + marque + immat (text-slate-400) + contrat # + client + "Dû [date/heure]" (rouge) + "+Xh de retard" + bouton téléphone

**Retours aujourd'hui :**
- Table simple : Véhicule/Client | Heure (badge outlined) | Lieu | Action
- Lien "Voir Planning" en haut à droite

**Revenus :**
- Bar chart Recharts, 6 derniers mois, bleu `#2563EB`
- Total affiché en header
- Mois courant highlighted

**État de la flotte :**
- 3 lignes : label + count + pourcentage + progress bar couleur
- En location: bleu, Disponible: vert, Maintenance: ambre

## 3.5 Planning — Gantt Timeline (planby)

> **Librairie : `planby`** — timeline horizontale React, légère, customisable.

```
┌─────────────────────────────────────────────────────────┐
│  Fleet Planning                    [Export] [+ New Booking] │
├─────────────────────────────────────────────────────────┤
│ [Timeline│Monthly]  < October 2023 >  Today             │
│                     [All Categories ▼] [All Statuses ▼] │
├─────────────────────────────────────────────────────────┤
│ VEHICLE FLEET(24)│ MON│TUE│WED│THU│FRI│SAT│SUN│MON│... │
│                  │ 01 │02 │03 │04 │05 │06 │07 │08 │... │
├──────────────────┼──────────────────────────────────────┤
│ 🖼 Tesla Model 3 │     ██████████ (Finished)            │
│ EL-923-XA  🟢    │                       ██████ (Active)│
├──────────────────┼──────────────────────────────────────┤
│ 🖼 Ford Transit  │          🔧                          │
│ VX-229-PP  🟠    │     (maintenance icon)               │
├──────────────────┼──────────────────────────────────────┤
│ 🖼 Toyota RAV4   │               █████████████████████  │
│ TR-881-ZZ  🟢    │               (Active - blue bar)    │
└──────────────────┴──────────────────────────────────────┘
```

**Couleurs des barres :**
| Type | Couleur | Tailwind |
|------|---------|----------|
| Contrat actif | Bleu | `bg-blue-500` |
| Contrat terminé | Gris | `bg-slate-300` |
| Pending confirmation | Jaune outline | `border-amber-400 bg-amber-50` |
| Inquiry | Violet outline | `border-violet-400 bg-violet-50` |
| Maintenance | Icône wrench sur fond `slate-100` |
| Conflit/alerte | Icône ❗ rouge |

**Interaction :**
- Hover sur une barre → Popover : client, dates, lien contrat
- Click → navigation vers le détail contrat
- Ligne "aujourd'hui" : trait vertical `border-blue-300` avec date highlight
- Weekends : colonnes `bg-slate-50`

**Sidebar véhicule (colonne gauche) :**
- Photo thumbnail 40x40 rounded
- Marque Modèle (text-sm font-medium)
- Immatriculation (text-xs text-slate-400)
- Dot statut (🟢🟣🟠🔴)

## 3.6 Facturation — Bulk Actions (cf. maquette 2)

**Structure page :**
- Tabs horizontaux avec count : `À facturer (12)` | `Facturé` | `Payé` | `Archivé`
- Tab active : `border-b-2 border-blue-600 text-blue-600 font-semibold`
- Checkboxes sur chaque ligne pour sélection multiple
- Bottom bar flottante quand sélection active :
  - `fixed bottom-4 left-1/2 transform -translate-x-1/2`
  - `bg-white rounded-2xl shadow-xl border px-6 py-3`
  - Contenu : `✅ X dossiers sélectionnés | Total: CHF X | Annuler | 📄 PDF | [Marquer comme facturé]`
  - Bouton action : `bg-blue-600 text-white`

## 3.7 État des lieux — Deux versions

### MVP (V1.0 — Sprint 6-8)
Formulaire simple, une seule page scrollable :
- Km + Carburant (gauge slider)
- Upload photos (dropzone grid)
- Dégâts : liste simple (zone dropdown + type dropdown + gravité + commentaire)
- Signature client
- Boutons : Save Draft | Enregistrer

### Version Finale (V1.1)
Structure enrichie en 4 sections numérotées (cf. maquette 6) :
```
┌─────────────────────────────────────────────┬──────────────┐
│  Vehicle Inspection (Return)                │ DEPARTURE    │
│  Peugeot 3008 • AA-123-BB    [In Progress] │ STATE        │
├─────────────────────────────────────────────┤ (sidebar)    │
│                                             │              │
│  1. Vehicle Vitals                          │ Departure km │
│  ┌─────────────────────────────────────┐    │ Departure    │
│  │ Current Mileage: [45230] km         │    │ fuel         │
│  │ DIFFERENCE: +350 km                 │    │ Pre-existing │
│  │ Fuel Level: [━━━━━━━●━━] 75%        │    │ damages list │
│  └─────────────────────────────────────┘    │              │
│                                             │ [View Full   │
│  2. General Condition                       │  Departure   │
│  ┌─────────────────────────────────────┐    │  Report]     │
│  │ Exterior: [Clean│Dirty]             │    │              │
│  │ Interior: [Clean│Dirty]             │    │ ℹ️ Reminder  │
│  │                                     │    │ notes        │
│  │ 📷 Upload photos (drag & drop)      │    │              │
│  │ [FRONT] [BACK] [Left] [Right]       │    │              │
│  └─────────────────────────────────────┘    │              │
│                                             │              │
│  3. Reported Damages                        │              │
│  ┌─────────────────────────────────────┐    │              │
│  │ ZONE     │ TYPE    │SEVERITY│EVIDENCE│    │              │
│  │ [Front ▼]│[Scratch]│ 🟢🟡🔴 │📷 [...]│    │              │
│  │ [+ Add Damage]                      │    │              │
│  └─────────────────────────────────────┘    │              │
│                                             │              │
│  4. Validation                              │              │
│  ┌──────────────┐ ┌─────────────────────┐   │              │
│  │ Customer     │ │ Agent Notes         │   │              │
│  │ Signature    │ │ [textarea]          │   │              │
│  │ [sign pad]   │ │                     │   │              │
│  │ ☐ I agree    │ │                     │   │              │
│  └──────────────┘ └─────────────────────┘   │              │
│                                             │              │
│  [Save Draft]          [Enregistrer le constat]             │
└─────────────────────────────────────────────┴──────────────┘
```

**Photos structurées par position (V1.1) :**
- 4 slots prédéfinis : FRONT, BACK, Left Side, Right Side
- Chaque slot : thumbnail si photo prise, icône camera si vide
- Label en overlay sur la photo (`absolute bottom-0 left-0 bg-black/60 text-white text-xs px-2 py-1`)

**Damages — Severity dots :**
- 3 cercles cliquables : 🟢 Léger (green) | 🟡 Moyen (amber) | 🔴 Grave (red)
- Sélectionné : `ring-2 ring-offset-2`

**Sidebar "Departure State" (constat retour uniquement) :**
- Card fixe à droite (`sticky top-4`)
- Affiche les données du constat de départ : km, carburant (progress bar), dégâts pré-existants
- Lien "View Full Departure Report"
- Note/reminder de l'agent de départ

## 3.8 Login Page (cf. maquette 8)

```
Centré vertical + horizontal, fond slate-50
┌──────────────────────────┐
│  🚐 LocaFleet            │
│  Gestion de flotte       │
│  simplifiée              │
│                          │
│  ┌────────────────────┐  │
│  │   Connexion        │  │
│  │                    │  │
│  │   Adresse e-mail   │  │
│  │   [____________]   │  │
│  │                    │  │
│  │   Mot de passe     │  │
│  │   [____________👁]  │  │
│  │                    │  │
│  │ ☐ Se souvenir  Mdp?│  │
│  │                    │  │
│  │ [Se connecter  →]  │  │
│  │                    │  │
│  │ Problème ? Support │  │
│  └────────────────────┘  │
│                          │
│       [FR] [EN]          │
│   © 2026 LocaFleet       │
└──────────────────────────┘
```

**Spécifications :**
- Container card : `max-w-md mx-auto bg-white rounded-2xl shadow-sm border p-8`
- Logo + tagline au-dessus de la card
- Input fields : shadcn/ui `Input` avec labels au-dessus
- Password : toggle visibility (eye icon)
- Bouton : `w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 text-base font-medium`
- Language switcher : pill toggle `[FR|EN]` en bas, discret
- Pas de formulaire d'inscription (comptes créés par admin)

## 3.9 Responsive Strategy

- **Desktop-first** (≥1280px) : l'outil est principalement utilisé sur poste de travail
- **Tablet** (768-1279px) : utilisable pour les états des lieux sur le terrain (iPad). Sidebar collapsée par défaut, formulaires pleine largeur
- **Mobile** (<768px) : consultation dashboard et alertes uniquement, pas de saisie complexe. Sidebar en drawer overlay

## 3.10 Conventions globales pour le dev

| Élément | Convention |
|---------|-----------|
| Espacement pages | `p-6` (24px) sur le content area |
| Espacement entre sections | `space-y-6` |
| Cards | `bg-white rounded-xl border border-slate-200 p-6` |
| Cards compactes | `bg-white rounded-lg border border-slate-200 p-4` |
| Modales | shadcn/ui `Dialog`, max-width `max-w-lg` sauf cas spécial |
| Toasts / Notifications | shadcn/ui `Sonner`, position bottom-right |
| Loading states | shadcn/ui `Skeleton` sur les zones de contenu |
| Empty states | Illustration minimaliste + texte + CTA |
| Montants | Format suisse : `1'250.00 CHF` (apostrophe comme séparateur milliers, CHF après) |
| Dates | Format : `15.01.2026` (DD.MM.YYYY) ou `15 Jan 2026` dans les contextes internationaux |
| Breadcrumb | `text-sm text-slate-500`, séparateur `>`, dernier élément `text-slate-900 font-medium` |
