import re
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, AuditEvent
from app.schemas.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    AuthResponse
)
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')
ALLOWED_REGISTRATION_ROLES = {"Investigator", "Fraud Analyst"}


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new user account with persistent database storage.
    Enforces password complexity, role security, and unique constraints.
    """
    email_clean = payload.email.lower().strip()
    username_clean = payload.username.lower().strip()
    full_name_clean = payload.full_name.strip()

    # 1. Email format validation
    if not EMAIL_REGEX.match(email_clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address format."
        )

    # 2. Username format validation (alphanumeric and underscores)
    if not re.match(r'^[a-zA-Z0-9_]{3,32}$', username_clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be 3-32 characters long and contain only letters, numbers, and underscores."
        )

    # 3. Password matching
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and confirm password do not match."
        )

    # 4. Password policy: min 8 chars, at least 1 digit or special char
    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters in length."
        )
    if not any(char.isdigit() for char in payload.password) and not any(not char.isalnum() for char in payload.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must include at least one number or special symbol for security."
        )

    # 5. Role Security: Prevent unauthorized escalation to Administrator
    role = payload.role.strip() if payload.role else "Investigator"
    if role not in ALLOWED_REGISTRATION_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Direct self-registration for role '{role}' is prohibited. Public registration is restricted to: {', '.join(sorted(ALLOWED_REGISTRATION_ROLES))}."
        )

    # 6. Check unique constraints (email and username)
    existing_email = db.query(User).filter(User.email == email_clean).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists. Please sign in instead."
        )

    existing_username = db.query(User).filter(User.username == username_clean).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this username already exists. Please choose a different username."
        )

    # 7. Secure password hashing
    pwd_hash = hash_password(payload.password)

    # 8. Persistent database record creation
    new_user = User(
        full_name=full_name_clean,
        email=email_clean,
        username=username_clean,
        password_hash=pwd_hash,
        role=role,
        is_active=True,
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_user)
    db.flush()

    # Log audit event
    audit = AuditEvent(
        actor=username_clean,
        action="USER_REGISTER",
        entity_type="USER",
        entity_id=str(new_user.id),
        details=f"User registered with role {role} ({email_clean})"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login", response_model=AuthResponse)
def login_user(payload: UserLoginRequest, response: Response, db: Session = Depends(get_db)):
    """
    Authenticates registered user credentials, establishes an authenticated session,
    and sets an HttpOnly session cookie alongside JWT token return.
    """
    identifier_clean = payload.username_or_email.lower().strip()

    # Look up by email or username
    user = db.query(User).filter(
        (User.email == identifier_clean) | (User.username == identifier_clean)
    ).first()

    # Generic error without revealing username/email presence (prevents account enumeration)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your username/email and password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is currently deactivated. Contact your system administrator."
        )

    # Issue signed access token
    token = create_access_token({
        "sub": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": user.role
    })

    # Set HttpOnly session cookie
    response.set_cookie(
        key="fraudscope_session",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False, # True in HTTPS production
        max_age=86400
    )

    # Log audit event
    db.add(AuditEvent(
        actor=user.username,
        action="USER_LOGIN",
        entity_type="USER",
        entity_id=str(user.id),
        details=f"Successful authentication for {user.username} ({user.role})"
    ))
    db.commit()

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        message="Authentication successful. Welcome to FraudScope AI."
    )


@router.post("/logout")
def logout_user(response: Response, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Invalidates current session and clears the HttpOnly cookie.
    """
    response.delete_cookie(key="fraudscope_session", httponly=True, samesite="lax")

    db.add(AuditEvent(
        actor=current_user.username,
        action="USER_LOGOUT",
        entity_type="USER",
        entity_id=str(current_user.id),
        details="Session terminated by user"
    ))
    db.commit()

    return {"message": "Logged out successfully from FraudScope AI."}


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the authenticated user's profile information without sensitive hashes.
    """
    return current_user
