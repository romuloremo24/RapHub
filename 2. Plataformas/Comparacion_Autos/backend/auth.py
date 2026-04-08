"""JWT auth utilities."""
from __future__ import annotations
import os
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

_DEFAULT_SECRET = "radarauto-dev-secret-change-in-production"
SECRET_KEY = os.getenv("SECRET_KEY", _DEFAULT_SECRET)
if SECRET_KEY == _DEFAULT_SECRET:
    import logging as _log
    _log.getLogger(__name__).critical(
        "ADVERTENCIA DE SEGURIDAD: SECRET_KEY no configurada. "
        "Define SECRET_KEY en .env antes de usar en producción."
    )
ALGORITHM  = "HS256"
TOKEN_DAYS = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer      = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user_id: int, email: str) -> str:
    expire = datetime.utcnow() + timedelta(days=TOKEN_DAYS)
    return jwt.encode(
        {"sub": str(user_id), "email": email, "exp": expire},
        SECRET_KEY, algorithm=ALGORITHM,
    )


def _decode(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def get_current_user_id(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
) -> int:
    if not creds:
        raise HTTPException(status_code=401, detail="No autenticado")
    payload = _decode(creds.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido")
    return int(payload["sub"])


def get_optional_user_id(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
) -> Optional[int]:
    if not creds:
        return None
    payload = _decode(creds.credentials)
    return int(payload["sub"]) if payload else None
