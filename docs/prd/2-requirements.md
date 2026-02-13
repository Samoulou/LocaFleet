# 2. Requirements

## 2.1 Functional Requirements

### FR-01: Gestion de flotte
| ID | Requirement | Priority |
|----|------------|----------|
| FR-01.1 | CRUD véhicules (marque, modèle, immatriculation, kilométrage, photos) | Must |
| FR-01.2 | Catégorisation des véhicules (citadine, SUV, utilitaire, berline, etc.) | Must |
| FR-01.3 | Gestion des statuts : disponible, loué, en maintenance, hors service | Must |
| FR-01.4 | Historique d'entretien par véhicule avec dates, descriptions et coûts | Must |
| FR-01.5 | Upload multiple de photos par véhicule | Must |
| FR-01.6 | Fiche véhicule détaillée avec toutes les informations consolidées | Must |

### FR-02: Gestion clients
| ID | Requirement | Priority |
|----|------------|----------|
| FR-02.1 | Fiche client (nom, prénom, adresse, téléphone, email) | Must |
| FR-02.2 | Informations permis de conduire (numéro, date d'expiration, catégorie) | Must |
| FR-02.3 | Upload de documents (permis, pièce d'identité, justificatif domicile) | Must |
| FR-02.4 | Historique complet des locations par client | Must |
| FR-02.5 | Recherche et filtrage clients | Must |
| FR-02.6 | Notes internes sur un client | Should |

### FR-03: Contrats de location
| ID | Requirement | Priority |
|----|------------|----------|
| FR-03.1 | Création de contrat avec sélection véhicule + client + dates | Must |
| FR-03.2 | Tarification configurable (jour, semaine, forfait km, options) | Must |
| FR-03.3 | Gestion des options (siège bébé, GPS, assurance complémentaire, etc.) | Must |
| FR-03.4 | Conditions générales et assurance intégrées au contrat | Must |
| FR-03.5 | Génération automatique de contrat en PDF | Must |
| FR-03.6 | Statuts de contrat : brouillon, actif, terminé, annulé | Must |
| FR-03.7 | Modification d'un contrat en cours (extension, changement véhicule) | Should |

### FR-04: Etats des lieux
| ID | Requirement | Priority | MVP ? |
|----|------------|----------|-------|
| FR-04.1 | Constat de depart avec photos et commentaires | Must | ✅ MVP |
| FR-04.2 | Constat de retour avec photos et commentaires | Must | ✅ MVP |
| FR-04.3 | Documentation des degats par photos + commentaires texte | Must | ✅ MVP |
| FR-04.4 | Prise de photos en direct depuis la camera de la tablette (capture native navigateur) | Must | ✅ MVP |
| FR-04.5 | Signature electronique du client sur l'etat des lieux | Must | ✅ MVP |
| FR-04.6 | Comparatif visuel avant/apres (constat retour vs depart) | Must | ✅ MVP |
| FR-04.7 | Stockage photos dans Supabase Storage (compression WebP) | Must | ✅ MVP |
| FR-04.8 | Generation PDF de l'etat des lieux | Should | Post-MVP |

### FR-05: Planning *(Post-MVP)*
| ID | Requirement | Priority | MVP ? |
|----|------------|----------|-------|
| FR-05.1 | Vue calendrier des reservations par vehicule | Should | Post-MVP |
| FR-05.2 | Detection automatique des conflits de disponibilite | Should | Post-MVP |
| FR-05.3 | Alertes pour les retours prevus (aujourd'hui, en retard) | Should | Post-MVP |
| FR-05.4 | Vue Gantt ou timeline par vehicule (planby) | Should | Post-MVP |
| FR-05.5 | Filtrage par categorie de vehicule, statut, periode | Should | Post-MVP |

### FR-06: Facturation & Paiements
| ID | Requirement | Priority |
|----|------------|----------|
| FR-06.1 | Calcul automatique du montant (durée × tarif + options + franchise) | Must |
| FR-06.2 | Gestion des cautions (montant, statut, restitution) | Must |
| FR-06.3 | Suivi des paiements (payé, en attente, facturé) | Must |
| FR-06.4 | Quittancement manuel d'une facture | Must |
| FR-06.5 | Archivage automatique du dossier une fois quittancé | Must |
| FR-06.6 | Génération de facture PDF | Must |
| FR-06.7 | Génération de lien ou référence pour suivi de paiement externe | Could |

### FR-07: Dashboard *(Post-MVP)*
| ID | Requirement | Priority | MVP ? |
|----|------------|----------|-------|
| FR-07.1 | Taux d'occupation de la flotte (global et par categorie) | Should | Post-MVP |
| FR-07.2 | Chiffre d'affaires par periode (jour, semaine, mois, annee) | Should | Post-MVP |
| FR-07.3 | Top vehicules les plus / moins loues | Should | Post-MVP |
| FR-07.4 | Alertes en cours (retours, maintenance, paiements en attente) | Should | Post-MVP |
| FR-07.5 | Indicateurs cles en temps reel (KPIs cards) | Should | Post-MVP |

### FR-08: Notifications
| ID | Requirement | Priority | MVP ? |
|----|------------|----------|-------|
| FR-08.1 | Email CG au client trusted avec lien approbation | Must | ✅ MVP |
| FR-08.2 | Email digicode au client apres approbation CG | Must | ✅ MVP |
| FR-08.3 | Email au mecanicien si remarques au constat de retour | Must | ✅ MVP |
| FR-08.4 | Templates email configurables | Should | Post-MVP |
| FR-08.5 | Historique des emails envoyes | Should | Post-MVP |

## 2.2 Non-Functional Requirements

| ID | Requirement | Category | Priority |
|----|------------|----------|----------|
| NFR-01 | Temps de chargement des pages < 2s | Performance | Must |
| NFR-02 | Support 30-100 véhicules sans dégradation | Scalability | Must |
| NFR-03 | Architecture tenant-ready (tenant_id sur toutes les tables) | Scalability | Must |
| NFR-04 | Interface responsive (desktop-first, mobile-friendly) | UX | Must |
| NFR-05 | Internationalisation FR/EN avec next-intl | i18n | Must |
| NFR-06 | Authentification sécurisée avec rôles (admin, agent, viewer) | Security | Must |
| NFR-07 | Données chiffrées en transit (HTTPS) et au repos | Security | Must |
| NFR-08 | Backup automatique de la base de données | Reliability | Must |
| NFR-09 | Conformité RGPD (données clients, droit à l'effacement) | Compliance | Must |
| NFR-10 | Logs d'audit sur les actions critiques (contrats, paiements) | Security | Should |
