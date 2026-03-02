# API routes package
from fastapi import APIRouter
from .auth import router as auth_router
from .vendor import router as vendor_router
from .marketplace import router as marketplace_router
from .estimations import router as estimations_router
from .panels import router as panels_router
from .inverters import router as inverters_router
from .utilities import router as utilities_router
from .solar_configurations import router as solar_configurations_router
from .estimation_create import router as estimation_create_router
from .chatbot import router as chatbot_router

# Create main API router
api_router = APIRouter(prefix="/api/v1")

# Include all route modules
api_router.include_router(auth_router)
api_router.include_router(vendor_router)
api_router.include_router(marketplace_router)
api_router.include_router(estimations_router)
api_router.include_router(estimation_create_router)
api_router.include_router(panels_router)
api_router.include_router(inverters_router)
api_router.include_router(utilities_router)
api_router.include_router(solar_configurations_router)
api_router.include_router(chatbot_router, prefix="/chatbot", tags=["chatbot"])

__all__ = ["api_router"]
