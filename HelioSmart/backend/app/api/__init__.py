# API routes package
from fastapi import APIRouter
from .estimations import router as estimations_router
from .panels import router as panels_router
from .inverters import router as inverters_router
from .utilities import router as utilities_router
from .solar_configurations import router as solar_configurations_router
from .estimation_create import router as estimation_create_router
from .auth import router as auth_router
from .vendors import router as vendors_router
from .admin import router as admin_router
from .catalog_import import router as catalog_import_router

# Create main API router
api_router = APIRouter(prefix="/api/v1")

# Include all route modules
api_router.include_router(estimations_router)
api_router.include_router(estimation_create_router)
api_router.include_router(panels_router)
api_router.include_router(inverters_router)
api_router.include_router(utilities_router)
api_router.include_router(solar_configurations_router)
api_router.include_router(auth_router)
api_router.include_router(vendors_router)
api_router.include_router(admin_router)
api_router.include_router(catalog_import_router)

__all__ = ["api_router"]
