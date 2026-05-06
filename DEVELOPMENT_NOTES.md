# HelioSmart Development Notes

**Last Updated**: May 6, 2026  
**Status**: Active Development

---

## 📋 Priority System

| Level | Description | Timeline |
|-------|-------------|----------|
| **P0** | Critical - Blocking basic functionality | Immediate |
| **P1** | High - Required for production | This week |
| **P2** | Medium - Improves experience | Next sprint |
| **P3** | Low - Future enhancements | Backlog |

---

## 🔧 Infrastructure & Configuration

| Done | Priority | Task | File(s) to Modify | Notes |
|------|----------|------|-------------------|-------|
| ⬜ | P0 | Configure NREL PVWatts API key | `HelioSmart/backend/.env` | Get free key from https://developer.nrel.gov/signup/ |
| ⬜ | P0 | Configure Google Maps API key | `HelioSmart/frontend/.env` | Required for satellite imagery |
| ⬜ | P0 | Test database connection | `HelioSmart/backend/.env` | Verify PostgreSQL connection string |
| ⬜ | P1 | Set up proper secret key | `HelioSmart/backend/.env` | Generate secure SECRET_KEY for JWT |
| ⬜ | P2 | Configure CORS origins for production | `HelioSmart/backend/.env` | Update CORS_ORIGINS |
| ⬜ | P3 | Add environment validation | `HelioSmart/backend/app/core/config.py` | Validate all required env vars on startup |

---

## 🤖 AI Services (py_service)

| Done | Priority | Task | File(s) to Modify | Notes |
|------|----------|------|-------------------|-------|
| ⬜ | P0 | Download SAM model (2.4GB) | N/A - Download to `py_service/` | `wget https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth` or use ViT-B (375MB) |
| ⬜ | P1 | Integrate py_service with main backend | `HelioSmart/backend/app/services/placeholder_apis.py` | Replace placeholder with actual py_service calls |
| ⬜ | P1 | Add py_service to docker-compose | `HelioSmart/docker-compose.dev.yml`, `HelioSmart/docker-compose.yml` | Add as separate service |
| ⬜ | P2 | Add health check endpoint monitoring | `HelioSmart/backend/app/api/estimation_create.py` | Check py_service health before calling |
| ⬜ | P2 | Implement fallback logic | `HelioSmart/backend/app/services/placeholder_apis.py` | Graceful degradation if py_service unavailable |
| ⬜ | P3 | Support multiple SAM model sizes | `py_service/api_service.py` | Allow ViT-B/ViT-L/ViT-H selection |

---

## 💬 Chatbot Features

| Done | Priority | Task | File(s) to Modify | Notes |
|------|----------|------|-------------------|-------|
| ⬜ | P2 | Install and configure Ollama | N/A - System-level | Download from https://ollama.com/ |
| ⬜ | P2 | Pull llama3.2:1b model | N/A - Terminal | Run `ollama pull llama3.2:1b` |
| ⬜ | P2 | Test speech-to-text | `HelioSmart/frontend/src/pages/Chatbot.jsx` | Verify Whisper integration |
| ⬜ | P2 | Test text-to-speech | `HelioSmart/frontend/src/pages/Chatbot.jsx` | Verify gTTS integration |
| ⬜ | P3 | Add document upload for RAG | `HelioSmart/backend/app/api/chatbot.py` | Allow PDF/DOCX uploads |
| ⬜ | P3 | Implement conversation history | `HelioSmart/backend/app/models/` | Add ChatHistory model |

---

## 🎨 Frontend Improvements

| Done | Priority | Task | File(s) to Modify | Notes |
|------|----------|------|-------------------|-------|
| ⬜ | P1 | Implement proper satellite image capture | `HelioSmart/frontend/src/pages/CreateEstimation.jsx` | Use html2canvas or Google Maps Static API |
| ⬜ | P1 | Add loading states during estimation | `HelioSmart/frontend/src/pages/CreateEstimation.jsx` | Show progress indicator |
| ⬜ | P1 | Update EstimationDetails to show new data | `HelioSmart/frontend/src/pages/EstimationDetails.jsx` | Display inverter stringing, wiring specs, BOM |
| ⬜ | P1 | Add monthly production chart | `HelioSmart/frontend/src/pages/EstimationDetails.jsx` | Use existing Chart.js setup |
| ⬜ | P1 | Show placeholder indicators | `HelioSmart/frontend/src/pages/EstimationDetails.jsx` | Badge for `_placeholder: true` data |
| ⬜ | P2 | Improve form validation | `HelioSmart/frontend/src/pages/CreateEstimation.jsx` | Field-specific error messages |
| ⬜ | P2 | Add field-level validation feedback | `HelioSmart/frontend/src/pages/CreateEstimation.jsx` | Real-time validation hints |
| ⬜ | P2 | Implement undo/redo for roof points | `HelioSmart/frontend/src/pages/CreateEstimation.jsx` | Step 5 - Panel placement |
| ⬜ | P3 | Add estimation comparison view | `HelioSmart/frontend/src/pages/Estimations.jsx` | Compare multiple estimations side-by-side |
| ⬜ | P3 | Export estimation to Excel | `HelioSmart/frontend/src/pages/EstimationDetails.jsx` | Use xlsx library |

---

## 🔌 Backend Enhancements

| Done | Priority | Task | File(s) to Modify | Notes |
|------|----------|------|-------------------|-------|
| ⬜ | P0 | Test end-to-end estimation flow | N/A - Integration test | Complete 6-step wizard to backend |
| ⬜ | P1 | Add request validation errors | `HelioSmart/backend/app/api/estimation_create.py` | Better error messages |
| ⬜ | P1 | Implement estimation update endpoint | `HelioSmart/backend/app/api/estimations.py` | Allow recalculation with new params |
| ⬜ | P1 | Add vendor material pricing | `HelioSmart/backend/app/api/vendor.py` | Vendor-specific BOM costs |
| ⬜ | P2 | Add estimation versioning | `HelioSmart/backend/app/models/estimation.py` | Track changes over time |
| ⬜ | P2 | Implement soft delete for all models | Various model files | Consistent soft delete pattern |
| ⬜ | P2 | Add audit logging | `HelioSmart/backend/app/models/` | Track who changed what |
| ⬜ | P3 | Add estimation templates | `HelioSmart/backend/app/models/` | Reusable estimation configurations |
| ⬜ | P3 | Batch estimation creation | `HelioSmart/backend/app/api/estimation_create.py` | Process multiple addresses |

---

## 📊 Data & Calculations

| Done | Priority | Task | File(s) to Modify | Notes |
|------|----------|------|-------------------|-------|
| ⬜ | P1 | Add more Moroccan utilities | Database seeding | Use `seed_moroccan_data.py` |
| ⬜ | P1 | Verify Morocco wind/snow zones | `HelioSmart/backend/app/services/calculation_service.py` | Check complexity factor thresholds |
| ⬜ | P1 | Add panel database with real specs | Database seeding | Import actual panel models |
| ⬜ | P1 | Add inverter database with real specs | Database seeding | Import actual inverter models |
| ⬜ | P2 | Add seasonal electricity rate variations | `HelioSmart/backend/app/models/utility.py` | Time-of-use pricing |
| ⬜ | P2 | Implement battery storage calculations | `HelioSmart/backend/app/services/calculation_service.py` | Include battery sizing |
| ⬜ | P3 | Add historical weather data caching | `HelioSmart/backend/app/services/calculation_service.py` | Cache NASA POWER responses |

---

## 🧪 Testing

| Done | Priority | Task | File(s) to Modify | Notes |
|------|----------|------|-------------------|-------|
| ⬜ | P1 | Write estimation creation tests | `HelioSmart/backend/tests/test_api/test_estimation_create.py` | Test all 15 steps |
| ⬜ | P1 | Test PVWatts integration | `HelioSmart/backend/tests/test_services/test_pvwatts.py` | Mock API responses |
| ⬜ | P1 | Test inverter selection logic | `HelioSmart/backend/tests/test_services/test_inverter_service.py` | Various scenarios |
| ⬜ | P2 | Add frontend E2E tests | `HelioSmart/frontend/` | Cypress or Playwright |
| ⬜ | P2 | Test error handling | Various files | API failures, network issues |
| ⬜ | P3 | Load testing | N/A - Use locust/k6 | Concurrent estimation requests |

---

## 🚀 Deployment & DevOps

| Done | Priority | Task | File(s) to Modify | Notes |
|------|----------|------|-------------------|-------|
| ⬜ | P1 | Set up production environment vars | Server .env files | Never commit secrets |
| ⬜ | P1 | Configure production database | Server | PostgreSQL with backups |
| ⬜ | P1 | Set up SSL certificates | `HelioSmart/frontend/nginx.conf` | Use Let's Encrypt |
| ⬜ | P1 | Configure domain and DNS | Server | Point to hosted instance |
| ⬜ | P2 | Set up CI/CD pipeline | `.github/workflows/` | Automated testing & deployment |
| ⬜ | P2 | Add database backup strategy | Server | Automated daily backups |
| ⬜ | P2 | Configure monitoring | Server | Use Prometheus/Grafana |
| ⬜ | P3 | Set up CDN for static assets | N/A | CloudFlare or similar |

---

## 📱 Marketplace & Vendor Features

| Done | Priority | Task | File(s) to Modify | Notes |
|------|----------|------|-------------------|-------|
| ⬜ | P2 | Implement vendor registration flow | `HelioSmart/frontend/src/pages/Register.jsx` | Separate vendor signup |
| ⬜ | P2 | Add vendor product catalog | `HelioSmart/backend/app/api/vendor.py` | Vendors manage their panels/inverters |
| ⬜ | P2 | Implement quote system | `HelioSmart/backend/app/models/` | Vendors submit quotes for estimations |
| ⬜ | P2 | Add vendor reviews/ratings | `HelioSmart/backend/app/models/` | Customer feedback |
| ⬜ | P3 | Vendor analytics dashboard | `HelioSmart/frontend/src/pages/VendorDashboard.jsx` | Quote conversion metrics |
| ⬜ | P3 | Multi-vendor comparison | `HelioSmart/frontend/src/pages/Marketplace.jsx` | Compare quotes side-by-side |

---

## 🐛 Known Issues

| Done | Priority | Issue | Location | Description |
|------|----------|-------|----------|-------------|
| ⬜ | P1 | SAM model file missing | `py_service/` | Service won't work without 2.4GB model file |
| ⬜ | P1 | Placeholder data in estimations | Backend services | Using mock data until py_service integrated |
| ⬜ | P2 | Chatbot requires Ollama running | `HelioSmart/backend/app/services/chatbot_service.py` | Falls back if unavailable |
| ⬜ | P2 | Root requirements.txt conflicts | Root directory | Duplicates dependencies from py_service |

---

## 📚 Documentation Tasks

| Done | Priority | Task | File(s) to Create/Modify | Notes |
|------|----------|------|---------------------------|-------|
| ⬜ | P1 | Create API documentation | `HelioSmart/API.md` | Document all endpoints |
| ⬜ | P2 | Write deployment guide | `HelioSmart/DEPLOYMENT.md` | Production setup steps |
| ⬜ | P2 | Document calculation formulas | `HelioSmart/CALCULATIONS.md` | Solar math reference |
| ⬜ | P2 | Create user guide | `HelioSmart/USER_GUIDE.md` | End-user documentation |
| ⬜ | P3 | Add inline code comments | Various | Improve maintainability |
| ⬜ | P3 | Create architecture diagrams | `HelioSmart/docs/` | System overview visuals |

---

## ✅ Completed Features

| Priority | Feature | Completion Date | Notes |
|----------|---------|-----------------|-------|
| P0 | FastAPI backend setup | ✓ Complete | All CRUD endpoints working |
| P0 | React frontend setup | ✓ Complete | 6-step wizard implemented |
| P0 | Database models & migrations | ✓ Complete | All 6 models with relationships |
| P0 | Docker infrastructure | ✓ Complete | Dev & prod configurations |
| P1 | Estimation creation logic | ✓ Complete | Full 15-step calculation flow |
| P1 | PVWatts integration | ✓ Complete | With error handling |
| P1 | NASA POWER API integration | ✓ Complete | Solar irradiance data |
| P1 | Inverter selection algorithm | ✓ Complete | Auto-stringing with validation |
| P1 | Wiring calculations | ✓ Complete | Voltage drop analysis |
| P1 | BOM generation | ✓ Complete | Moroccan pricing in MAD |
| P2 | Chatbot foundation | ✓ Complete | Ollama + RAG + STT/TTS support |
| P2 | Authentication system | ✓ Complete | JWT-based |
| P2 | Vendor dashboard skeleton | ✓ Complete | Basic structure |

---

## 🎯 Immediate Next Steps (This Week)

### Day 1-2: Core Functionality
1. ⬜ Configure NREL PVWatts API key
2. ⬜ Configure Google Maps API key
3. ⬜ Test end-to-end estimation flow
4. ⬜ Fix any blocking bugs

### Day 3-4: Data Population
1. ⬜ Seed database with real panel data
2. ⬜ Seed database with real inverter data
3. ⬜ Add Moroccan utility providers

### Day 5: Frontend Polish
1. ⬜ Update EstimationDetails to show new backend data
2. ⬜ Add loading states during estimation creation
3. ⬜ Improve satellite image capture

---

## 📝 Notes & Decisions

### Architecture Decisions
- **Service Separation**: py_service is separate to allow GPU scaling independent of main app
- **Placeholder Pattern**: Allows progressive enhancement as AI services are deployed
- **Vendor System**: Multi-tenant design for marketplace functionality
- **Morocco Focus**: All calculations tuned for Moroccan solar market

### Technology Choices
- **FastAPI over Flask**: Better async support, automatic API docs
- **React + Vite over CRA**: Faster dev experience, optimized builds
- **PostgreSQL over SQLite**: Production-ready relational DB
- **Docker Compose**: Easy local development, production-ready
- **Ollama over OpenAI**: Free, local LLM deployment

### Future Considerations
- **Scalability**: Consider Kubernetes for production at scale
- **Multi-region**: Support for other countries (different pricing, regulations)
- **Mobile App**: React Native version of estimation wizard
- **Offline Mode**: PWA with service workers for remote areas

---

## 🔗 Quick References

### Documentation Files
- [README.md](HelioSmart/README.md) - Project overview
- [QUICKSTART.md](HelioSmart/QUICKSTART.md) - Setup guide
- [DOCKER.md](HelioSmart/DOCKER.md) - Docker instructions
- [IMPLEMENTATION_SUMMARY.md](HelioSmart/IMPLEMENTATION_SUMMARY.md) - Backend logic details
- [FRONTEND_CHANGES.md](HelioSmart/FRONTEND_CHANGES.md) - Frontend integration
- [PRODUCTION_STATUS.md](HelioSmart/PRODUCTION_STATUS.md) - Feature status
- [py_service/README.md](py_service/README.md) - AI service documentation
- [py_service/API_README.md](py_service/API_README.md) - AI API docs

### Key Files to Know
| File | Purpose |
|------|---------|
| `HelioSmart/backend/app/api/estimation_create.py` | Main estimation creation endpoint (15 steps) |
| `HelioSmart/backend/app/services/calculation_service.py` | Solar calculations (NASA, wind, snow) |
| `HelioSmart/backend/app/services/inverter_service.py` | Inverter selection & stringing |
| `HelioSmart/backend/app/services/wiring_service.py` | DC/AC wiring & BOM |
| `HelioSmart/backend/app/services/pvwatts_service.py` | NREL PVWatts integration |
| `HelioSmart/frontend/src/pages/CreateEstimation.jsx` | 6-step estimation wizard |
| `HelioSmart/frontend/src/pages/EstimationDetails.jsx` | Results display with charts |
| `py_service/api_service.py` | SAM-based roof segmentation |
| `py_service/panel_placement_service.py` | Solar panel placement optimization |

### External API Documentation
- NREL PVWatts v6: https://developer.nrel.gov/docs/solar/pvwatts/v6/
- NASA POWER: https://power.larc.nasa.gov/docs/services/api/
- Google Maps JavaScript API: https://developers.google.com/maps/documentation/javascript
- SAM Model: https://segment-anything.com/
- Ollama: https://ollama.com/

---

**Legend**: ⬜ = Not Started | ⏳ = In Progress | ✅ = Complete | ❌ = Blocked
