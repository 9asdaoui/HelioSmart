"""
Seed script to create default admin user
Run with: docker-compose exec backend python seed_admin.py
"""
import os
import sys

# Add the app directory to the path
sys.path.append('/app')

from app.core.database import SessionLocal
from app.models.user import User, UserRole, UserStatus
from app.services.auth_service import get_password_hash

def create_admin_user():
    """Create default admin user if it doesn't exist"""
    db = SessionLocal()
    
    try:
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.email == "Admin@mail.com").first()
        
        if existing_admin:
            print("Admin user already exists!")
            print(f"Email: {existing_admin.email}")
            print(f"Role: {existing_admin.role}")
            print(f"Status: {existing_admin.status}")
            return
        
        # Create admin user
        admin_user = User(
            email="Admin@mail.com",
            hashed_password=get_password_hash("Admin123"),
            full_name="System Administrator",
            phone=None,
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            is_verified=True,
            verification_token=None
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("✅ Admin user created successfully!")
        print(f"Email: {admin_user.email}")
        print(f"Password: Admin123")
        print(f"Role: {admin_user.role}")
        print(f"Status: {admin_user.status}")
        print("\nYou can now log in at http://localhost/login")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
