"""Authentication Service - handles JWT tokens, password hashing, and auth logic"""
from datetime import datetime, timedelta
from typing import Optional, Tuple
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserRole, UserStatus, Vendor
from app.schemas.auth import TokenPayload, UserInToken, UserResponse

# Password hashing context - using argon2 (more secure, no 72-byte limit)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# JWT configuration
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Security scheme
security = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[TokenPayload]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Validate required fields
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        
        exp: int = payload.get("exp")
        if exp is None:
            return None
        
        token_type: str = payload.get("type", "access")
        role: Optional[str] = payload.get("role")
        
        return TokenPayload(
            sub=user_id,
            exp=exp,
            type=token_type,
            role=role
        )
    except JWTError:
        return None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Check if credentials were provided
    if credentials is None:
        raise credentials_exception
    
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None:
        raise credentials_exception
    
    # Check if token is expired
    if datetime.utcnow().timestamp() > payload.exp:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    try:
        user_id = int(payload.sub)
    except ValueError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if user is None:
        raise credentials_exception
    
    # Check if user is active
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active"
        )
    
    return user


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Dependency to get current user if authenticated, None otherwise (for guest access)"""
    if credentials is None:
        return None
    
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None


def require_role(*allowed_roles: UserRole):
    """Dependency factory to require specific role(s)"""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


def require_vendor(current_user: User = Depends(get_current_user)) -> Tuple[User, Vendor]:
    """Dependency to require vendor role and return user with vendor profile"""
    if current_user.role != UserRole.VENDOR and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Vendor role required"
        )
    
    vendor = current_user.vendor_profile
    if vendor is None and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vendor profile not found"
        )
    
    return current_user, vendor


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require admin role"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate a user with email and password"""
    # Use case-insensitive comparison for email lookup
    user = db.query(User).filter(func.lower(User.email) == email.lower()).first()
    
    if not user:
        return None
    
    if not verify_password(password, user.hashed_password):
        return None
    
    return user


def generate_user_token(user: User) -> str:
    """Generate access token for a user"""
    token_data = {
        "sub": str(user.id),
        "role": user.role.value,
        "email": user.email
    }
    return create_access_token(token_data)


def user_to_response(user: User) -> UserResponse:
    """Convert User model to UserResponse schema"""
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        company_name=user.company_name,
        address=user.address,
        city=user.city,
        country=user.country,
        role=user.role,
        status=user.status,
        is_verified=user.is_verified,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login=user.last_login
    )


class AuthService:
    """Authentication service class"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def register_user(
        self,
        email: str,
        password: str,
        full_name: str,
        phone: Optional[str] = None,
        role: UserRole = UserRole.GUEST
    ) -> User:
        """Register a new user"""
        # Check if email already exists (case-insensitive)
        existing = self.db.query(User).filter(func.lower(User.email) == email.lower()).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user
        user = User(
            email=email.lower(),
            hashed_password=get_password_hash(password),
            full_name=full_name,
            phone=phone,
            role=role,
            status=UserStatus.ACTIVE,  # Auto-activate for now
            is_verified=True  # Auto-verify for now
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def login(self, email: str, password: str) -> Tuple[User, str]:
        """Login a user and return user + token"""
        user = authenticate_user(self.db, email, password)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Update last login
        user.last_login = datetime.utcnow()
        self.db.commit()
        
        # Generate token
        token = generate_user_token(user)
        
        return user, token
    
    def create_vendor_profile(
        self,
        user_id: int,
        business_name: str,
        business_registration_number: Optional[str] = None,
        tax_id: Optional[str] = None,
        vendor_type: Optional[str] = None,
        specializations: Optional[list] = None
    ) -> Vendor:
        """Create a vendor profile for a user"""
        user = self.db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update user role to vendor
        user.role = UserRole.VENDOR
        
        # Create vendor profile
        vendor = Vendor(
            user_id=user_id,
            business_name=business_name,
            business_registration_number=business_registration_number,
            tax_id=tax_id,
            vendor_type=vendor_type,
            specializations=specializations or [],
            is_approved=False  # Requires admin approval
        )
        
        self.db.add(vendor)
        self.db.commit()
        self.db.refresh(vendor)
        
        return vendor
    
    def get_or_create_guest_user(self, session_id: str) -> User:
        """Get or create a guest user for unauthenticated sessions"""
        # For guest users, we'll use a session-based approach
        # In a real app, you might want to store session info
        guest_email = f"guest_{session_id}@heliosmart.local"
        
        user = self.db.query(User).filter(User.email == guest_email).first()
        
        if user:
            return user
        
        # Create new guest user
        user = User(
            email=guest_email,
            hashed_password=get_password_hash(session_id),  # Use session as temp password
            full_name="Guest User",
            role=UserRole.GUEST,
            status=UserStatus.ACTIVE,
            is_verified=True
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        return user
