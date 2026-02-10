# 1. Goals & Background Context

## 1.1 Problem Statement

Les entreprises de location de véhicules en Suisse (et ailleurs) utilisent souvent des logiciels de gestion obsolètes, rigides, ou mal adaptés à leur workflow réel. Les solutions existantes présentent des lacunes récurrentes :

- **Workflows déconnectés** : la gestion des contrats, états des lieux, facturation et maintenance sont fragmentés entre plusieurs outils (Excel, email, papier).
- **Pas de vue unifiée** : absence de dashboard consolidé pour piloter l'activité (taux d'occupation, CA, alertes).
- **Processus manuels chronophages** : génération de contrats PDF, suivi des paiements, communication avec les mécaniciens — tout est fait à la main.
- **Pas d'évolutivité** : les outils actuels ne permettent pas de grandir (ajout de véhicules, multi-sites, SaaS).

## 1.2 Vision

**LocaFleet** est une application back-office moderne de gestion de flotte et de location de véhicules, conçue pour les loueurs indépendants et PME. Elle centralise l'ensemble du cycle de location — de la réservation à la clôture du dossier — dans une interface unique, rapide et intuitive.

> *"Un seul outil pour gérer toute ta flotte, tes clients, tes contrats et ta facturation."*

## 1.3 Target Users

| Persona | Description | Besoins clés |
|---------|-------------|--------------|
| **Gérant / Propriétaire** | Dirige l'entreprise de location (30-100 véhicules) | Dashboard, CA, taux d'occupation, vision globale |
| **Agent de location** | Gère les réservations, contrats et états des lieux au quotidien | Création rapide de contrats, planning, inspections |
| **Comptable / Admin** | Suit la facturation, les paiements et les cautions | Suivi paiements, quittancement, export dossiers |
| **Mécanicien** *(externe)* | Reçoit les demandes de maintenance par email | Notifications email avec détails du véhicule |

## 1.4 Success Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Temps de création d'un contrat | < 2 minutes | V1 Launch |
| Adoption par l'équipe | 100% des agents utilisent l'outil | 1 mois post-launch |
| Réduction du temps admin | -50% vs. workflow actuel | 3 mois post-launch |
| Taux d'occupation visible en temps réel | Oui | V1 Launch |
| Zéro contrat papier | 100% digital (PDF + signature) | V1 Launch |

## 1.5 Scope — What LocaFleet Is and Is Not

### LocaFleet IS:
- Un back-office de gestion de flotte et location
- Un outil de création de contrats avec génération PDF
- Un système de planning et disponibilité véhicules
- Un outil de facturation avec workflow manuel de quittancement
- Un système de notification email (maintenance, confirmations)

### LocaFleet IS NOT (V1):
- Un portail client en ligne (prévu V2)
- Une marketplace de location
- Un outil comptable complet (pas de TVA, bilan, etc.)
- Un GPS ou système de tracking véhicules
- Un outil de gestion RH
