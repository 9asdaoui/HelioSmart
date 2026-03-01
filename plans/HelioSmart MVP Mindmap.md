# HelioSmart MVP - Mindmap & Schema

## Overview

This document visualizes the Minimum Viable Product for HelioSmart, focusing on the core features needed for the initial release.

---

## MVP Feature Mindmap

```mermaid
mindmap
  root((HelioSmart MVP))
    User Interface
      Map-based Location Selection
      Property Boundary Drawing
      Basic Dashboard
      Estimation Results View
    Core Features
      Location Input
        Address Search
        Map Pin Drop
        Coordinates Input
      Solar Analysis
        NASA POWER API Integration
        Irradiance Data Fetch
        Annual Production Estimate
      Financial Calculation
        System Cost Estimation
        Savings Calculator
        Simple Payback Period
      Basic Reporting
        PDF Report Generation
        Email Sharing
    Data Management
      Estimation Storage
      User Session Management
      Basic History View
    External Integrations
      NASA POWER API
      NREL PVWatts API
      Google Maps API
```

---

## MVP Architecture Schema

```mermaid
flowchart TB
    subgraph User["👤 User"]
        U1["Web Browser"]
    end

    subgraph Frontend["🎨 Frontend Layer"]
        F1["React + Vite App"]
        F2["Map Component<br>Google Maps"]
        F3["Estimation Forms"]
        F4["Results Dashboard"]
    end

    subgraph Backend["⚙️ Backend Layer"]
        B1["FastAPI Server"]
        B2["Estimation API"]
        B3["Calculation Service"]
    end

    subgraph External["🌐 External APIs"]
        E1["NASA POWER<br>Solar Data"]
        E2["PVWatts<br>Production Calc"]
        E3["Google Maps<br>Imagery"]
    end

    subgraph Storage["💾 Data Storage"]
        S1["Estimation DB"]
        S2["Cache Layer"]
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

## MVP User Flow

```mermaid
flowchart LR
    A["🏠 Landing Page"] --> B["📍 Location Selection"]
    B --> C{"Location Valid?"}
    C -->|No| B
    C -->|Yes| D["☀️ Solar Data Fetch"]
    D --> E["💰 Basic Calculation"]
    E --> F["📊 Results Dashboard"]
    F --> G{"User Action"}
    G -->|Save| H["💾 Store Estimation"]
    G -->|Share| I["📧 Email Report"]
    G -->|New| B
    H --> J["📜 Estimation History"]
```

---

## MVP Core Components Breakdown

### 1. Frontend Components

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND MVP                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   Map View      │  │  Input Form     │                   │
│  │  ┌───────────┐  │  │  ┌───────────┐  │                   │
│  │  │  Google   │  │  │  │ Address   │  │                   │
│  │  │  Maps     │  │  │  │ Search    │  │                   │
│  │  │  Widget   │  │  │  └───────────┘  │                   │
│  │  └───────────┘  │  │  ┌───────────┐  │                   │
│  │  • Pin Drop     │  │  │ Monthly   │  │                   │
│  │  • Zoom/Pan     │  │  │ Bill $    │  │                   │
│  │  • Satellite    │  │  └───────────┘  │                   │
│  │    View         │  │  ┌───────────┐  │                   │
│  │                 │  │  │ Roof Area │  │                   │
│  │                 │  │  │ (optional)│  │                   │
│  │                 │  │  └───────────┘  │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                             │
│  ┌─────────────────────────────────────┐                    │
│  │         Results Dashboard           │                    │
│  │  ┌─────────┐ ┌─────────┐ ┌────────┐ │                    │
│  │  │ Annual  │ │ System  │ │ Monthly│ │                    │
│  │  │ kWh     │ │ Cost    │ │ Savings│ │                    │
│  │  └─────────┘ └─────────┘ └────────┘ │                    │
│  │  ┌─────────┐ ┌─────────┐            │                    │
│  │  │ Payback │ │ 25-Year │            │                    │
│  │  │ Period  │ │ Savings │            │                    │
│  │  └─────────┘ └─────────┘            │                    │
│  └─────────────────────────────────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Backend Services

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND MVP                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              API Layer (FastAPI)                    │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  POST /api/estimations/create                       │    │
│  │  GET  /api/estimations/{id}                         │    │
│  │  GET  /api/estimations/                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Calculation Service                       │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  ┌──────────────┐    ┌──────────────┐               │    │
│  │  │ NASA POWER   │    │ PVWatts      │               │    │
│  │  │ Integration  │───▶│ Integration  │               │    │
│  │  │              │    │              │               │    │
│  │  │ • Solar      │    │ • Production │               │    │
│  │  │   Irradiance │    │   Estimate   │               │    │
│  │  │ • Weather    │    │ • Efficiency │               │    │
│  │  │   Data       │    │   Calc       │               │    │
│  │  └──────────────┘    └──────────────┘               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Financial Calculator                      │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  • System Cost = $/Watt × System Size               │    │
│  │  • Annual Savings = kWh × Electricity Rate          │    │
│  │  • Payback = Total Cost ÷ Annual Savings            │    │
│  │  • ROI = (Lifetime Savings - Cost) ÷ Cost           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## MVP Data Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend as React App
    participant API as FastAPI Backend
    participant NASA as NASA POWER API
    participant PVWatts as NREL PVWatts
    participant DB as Database

    User->>Frontend: Enter address & monthly bill
    Frontend->>API: POST /estimations/create
    API->>NASA: Fetch solar irradiance data
    NASA-->>API: Return location solar data
    API->>PVWatts: Calculate production estimate
    PVWatts-->>API: Return annual kWh estimate
    API->>API: Calculate costs & savings
    API->>DB: Save estimation
    API-->>Frontend: Return results
    Frontend-->>User: Display dashboard
```

---

## MVP Scope: In vs Out

### ✅ IN Scope (MVP)

| Feature | Priority | Description |
|---------|----------|-------------|
| Location Selection | P0 | Address search + map pin drop |
| Solar Data Fetch | P0 | NASA POWER API integration |
| Production Estimate | P0 | Basic PVWatts calculation |
| Cost Calculator | P0 | Simple $/Watt-based pricing |
| Savings Projection | P0 | Monthly/annual savings |
| Results Dashboard | P0 | Clean, simple results view |
| Estimation Storage | P1 | Save to database |
| History View | P1 | List past estimations |
| PDF Report | P1 | Basic report generation |

### ❌ OUT of Scope (Post-MVP)

| Feature | Future Release |
|---------|----------------|
| AI Roof Segmentation | v2.0 |
| Polygon Drawing | v2.0 |
| Panel Placement Optimization | v2.0 |
| Inverter Selection | v2.0 |
| Wiring Diagrams | v2.0 |
| 3D Visualization | v2.5 |
| User Accounts/Auth | v2.0 |
| Multi-language Support | v2.0 |
| Mobile App | v3.0 |
| Installer Network | v2.5 |

---

## MVP Technical Stack

```
┌─────────────────────────────────────────────────────────────┐
│                   TECH STACK                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend                    Backend                        │
│  ├─ React 18                 ├─ FastAPI                     │
│  ├─ Vite                     ├─ Python 3.11                 │
│  ├─ React Router             ├─ SQLAlchemy                  │
│  ├─ Axios                    ├─ Pydantic                    │
│  └─ Google Maps JS API       └─ SQLite (MVP) / PostgreSQL   │
│                                                             │
│  External APIs                                              │
│  ├─ NASA POWER API                                          │
│  ├─ NREL PVWatts API                                        │
│  └─ Google Maps Platform                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## MVP Success Criteria

```mermaid
flowchart TB
    A[MVP Success] --> B[User can complete<br>estimation in < 2 min]
    A --> C[Results display within<br>< 10 seconds]
    A --> D[Production estimates<br>within 15% accuracy]
    A --> E[Cost estimates within<br>20% accuracy]
    A --> F[99% uptime for<br>core features]
    A --> G[Works on modern<br>browsers]
```

---

*Document Version: 1.0*  
*Last Updated: February 2026*  
*For development planning and sprint scoping*
