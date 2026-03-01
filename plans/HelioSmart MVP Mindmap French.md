# HelioSmart MVP - Carte Mentale et Schéma

## Vue d'Ensemble

Ce document visualise le Produit Minimum Viable (MVP) pour HelioSmart, en se concentrant sur les fonctionnalités principales nécessaires pour la sortie initiale.

---

## Carte Mentale des Fonctionnalités MVP

```mermaid
mindmap
  root((HelioSmart MVP))
    Interface Utilisateur
      Sélection de Localisation sur Carte
      Dessin des Limites de Propriété
      Tableau de Bord Basique
      Vue des Résultats d'Estimation
    Fonctionnalités Principales
      Saisie de Localisation
        Recherche d'Adresse
        Placement de Point sur Carte
        Saisie de Coordonnées
      Analyse Solaire
        Intégration API NASA POWER
        Récupération des Données d'Irradiance
        Estimation de Production Annuelle
      Calcul Financier
        Estimation du Coût Système
        Calculateur d'Économies
        Période de Retour Simple
      Rapports Basiques
        Génération de Rapport PDF
        Partage par Email
    Gestion des Données
      Stockage des Estimations
      Gestion des Sessions Utilisateur
      Vue Historique Basique
    Intégrations Externes
      API NASA POWER
      API NREL PVWatts
      API Google Maps
```

---

## Schéma d'Architecture MVP

```mermaid
flowchart TB
    subgraph Utilisateur["👤 Utilisateur"]
        U1["Navigateur Web"]
    end

    subgraph Frontend["🎨 Couche Frontend"]
        F1["Application React + Vite"]
        F2["Composant Carte<br>Google Maps"]
        F3["Formulaires d'Estimation"]
        F4["Tableau de Bord Résultats"]
    end

    subgraph Backend["⚙️ Couche Backend"]
        B1["Serveur FastAPI"]
        B2["API d'Estimation"]
        B3["Service de Calcul"]
    end

    subgraph Externe["🌐 APIs Externes"]
        E1["NASA POWER<br>Données Solaires"]
        E2["PVWatts<br>Calcul Production"]
        E3["Google Maps<br>Imagerie"]
    end

    subgraph Stockage["💾 Stockage de Données"]
        S1["Base de Données Estimations"]
        S2["Couche Cache"]
    end

    U1 --> F1
    F1 --> F2
    F1 --> F3
    F1 --> F4
    F3 --> B1
    B1 --> B2
    B2 --> B3
    B3 --> E1
    B3 --> E2
    F2 --> E3
    B2 --> S1
    B2 --> S2
```

---

## Flux Utilisateur MVP

```mermaid
flowchart LR
    A["🏠 Page d'Accueil"] --> B["📍 Sélection de Localisation"]
    B --> C{"Localisation Valide ?"}
    C -->|Non| B
    C -->|Oui| D["☀️ Récupération Données Solaires"]
    D --> E["💰 Calcul Basique"]
    E --> F["📊 Tableau de Bord Résultats"]
    F --> G{"Action Utilisateur"}
    G -->|Sauvegarder| H["💾 Stockage Estimation"]
    G -->|Partager| I["📧 Rapport Email"]
    G -->|Nouveau| B
    H --> J["📜 Historique des Estimations"]
```

---

## Détail des Composants Principaux MVP

### 1. Composants Frontend

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND MVP                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   Vue Carte     │  │ Formulaire      │                   │
│  │  ┌───────────┐  │  │  ┌───────────┐  │                   │
│  │  │  Google   │  │  │  │ Recherche │  │                   │
│  │  │  Maps     │  │  │  │ Adresse   │  │                   │
│  │  │  Widget   │  │  │  └───────────┘  │                   │
│  │  └───────────┘  │  │  ┌───────────┐  │                   │
│  │  • Placement    │  │  │ Facture   │  │                   │
│  │    de Point     │  │  │ Mensuelle$│  │                   │
│  │  • Zoom/Pan     │  │  └───────────┘  │                   │
│  │  • Vue          │  │  ┌───────────┐  │                   │
│  │    Satellite    │  │  │ Surface   │  │                   │
│  │                 │  │  │ Toit (opt)│  │                   │
│  │                 │  │  └───────────┘  │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                             │
│  ┌─────────────────────────────────────┐                    │
│  │         Tableau de Bord Résultats   │                    │
│  │  ┌─────────┐ ┌─────────┐ ┌────────┐ │                    │
│  │  │ kWh     │ │ Coût    │ │Économies│ │                    │
│  │  │ Annuel  │ │ Système │ │Mensuelles│                    │
│  │  └─────────┘ └─────────┘ └────────┘ │                    │
│  │  ┌─────────┐ ┌─────────┐            │                    │
│  │  │ Période │ │Économies│            │                    │
│  │  │ Retour  │ │ 25 Ans  │            │                    │
│  │  └─────────┘ └─────────┘            │                    │
│  └─────────────────────────────────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Services Backend

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND MVP                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Couche API (FastAPI)                   │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  POST /api/estimations/create                       │    │
│  │  GET  /api/estimations/{id}                         │    │
│  │  GET  /api/estimations/                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Service de Calcul                         │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  ┌──────────────┐    ┌──────────────┐               │    │
│  │  │ Intégration  │    │ Intégration  │               │    │
│  │  │ NASA POWER   │───▶│ PVWatts      │               │    │
│  │  │              │    │              │               │    │
│  │  │ • Irradiance │    │ • Estimation │               │    │
│  │  │   Solaire    │    │   Production │               │    │
│  │  │ • Données    │    │ • Calcul     │               │    │
│  │  │   Météo      │    │   Efficacité │               │    │
│  │  └──────────────┘    └──────────────┘               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Calculateur Financier                     │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  • Coût Système = $/Watt × Taille Système           │    │
│  │  • Économies Annuelles = kWh × Tarif Électricité    │    │
│  │  • Retour = Coût Total ÷ Économies Annuelles        │    │
│  │  • ROI = (Économies Vie - Coût) ÷ Coût              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Flux de Données MVP

```mermaid
sequenceDiagram
    actor Utilisateur
    participant Frontend as Application React
    participant API as Backend FastAPI
    participant NASA as API NASA POWER
    participant PVWatts as NREL PVWatts
    participant DB as Base de Données

    Utilisateur->>Frontend: Entrer adresse et facture mensuelle
    Frontend->>API: POST /estimations/create
    API->>NASA: Récupérer données d'irradiance solaire
    NASA-->>API: Retourner données solaires localisation
    API->>PVWatts: Calculer estimation production
    PVWatts-->>API: Retourner estimation kWh annuelle
    API->>API: Calculer coûts et économies
    API->>DB: Sauvegarder estimation
    API-->>Frontend: Retourner résultats
    Frontend-->>Utilisateur: Afficher tableau de bord
```

---

## Périmètre MVP : Inclus vs Exclus

in the @/HelioSmart  i want you to step by step analyze each file the code base , undertand our project , and than  cerate a system of authentification , that will have 4 users , guest , user, vendor , and enginner , and a service and a  fornt end dahsboard for vendors, that will have a palce where the vedor uploads a documants  , that document will be ijected into an llm which will return a json file that will list the products in that documants , and once the vendor approve it , it will inserted in our databse, and add a page that list the vendors that we have , and show their porduct from the databse, and don't touch the mltistep form functionalities bc its important , dont change in them just add to the fornt end , and the routes  

### ✅ Dans le Périmètre (MVP)

| Fonctionnalité | Priorité | Description |
|----------------|----------|-------------|
| Sélection de Localisation | P0 | Recherche d'adresse + placement de point |
| Récupération Données Solaires | P0 | Intégration API NASA POWER |
| Estimation de Production | P0 | Calcul basique PVWatts |
| Calculateur de Coût | P0 | Tarification simple basée $/Watt |
| Projection d'Économies | P0 | Économies mensuelles/annuelles |
| Tableau de Bord Résultats | P0 | Vue résultats claire et simple |
| Stockage des Estimations | P1 | Sauvegarde en base de données |
| Vue Historique | P1 | Liste des estimations passées |
| Rapport PDF | P1 | Génération de rapport basique |

### ❌ Hors Périmètre (Post-MVP)

| Fonctionnalité | Future Version |
|----------------|----------------|
| Segmentation AI de Toit | v2.0 |
| Dessin de Polygones | v2.0 |
| Optimisation Placement Panneaux | v2.0 |
| Sélection d'Onduleur | v2.0 |
| Schémas de Câblage | v2.0 |
| Visualisation 3D | v2.5 |
| Comptes Utilisateurs/Auth | v2.0 |
| Support Multi-langue | v2.0 |
| Application Mobile | v3.0 |
| Réseau d'Installateurs | v2.5 |

---

## Stack Technique MVP

```
┌─────────────────────────────────────────────────────────────┐
│                   STACK TECHNIQUE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend                    Backend                        │
│  ├─ React 18                 ├─ FastAPI                     │
│  ├─ Vite                     ├─ Python 3.11                 │
│  ├─ React Router             ├─ SQLAlchemy                  │
│  ├─ Axios                    ├─ Pydantic                    │
│  └─ Google Maps JS API       └─ SQLite (MVP) / PostgreSQL   │
│                                                             │
│  APIs Externes                                              │
│  ├─ API NASA POWER                                          │
│  ├─ API NREL PVWatts                                        │
│  └─ Google Maps Platform                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Critères de Succès MVP

```mermaid
flowchart TB
    A[Succès MVP] --> B[L'utilisateur peut compléter<br>l'estimation en < 2 min]
    A --> C[Les résultats s'affichent en<br>< 10 secondes]
    A --> D[Les estimations de production sont<br>à 15% de précision]
    A --> E[Les estimations de coût sont à<br>20% de précision]
    A --> F[99% de disponibilité pour les<br>fonctionnalités principales]
    A --> G[Fonctionne sur les navigateurs<br>modernes]
```

---

*Version du Document : 1.0*  
*Dernière Mise à Jour : Février 2026*  
*Pour la planification de développement et le cadrage des sprints*
