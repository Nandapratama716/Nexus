"""
JWT Security — AI Service
Verifikasi JWT HS256 yang diterbitkan oleh Go Core Service.
Secret key yang sama (JWT_SECRET) dipakai untuk sign dan verify.
"""

import os
import logging
from typing import Optional

import jwt
from fastapi import Header, HTTPException, status

from app.core.config import JWT_SECRET

JWT_ALGORITHM = "HS256"


def _decode_token(token: str) -> dict:
    """
    Decode dan validasi JWT token.
    Raise HTTPException 401 jika token invalid/expired.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sudah kedaluwarsa",
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token tidak valid: {exc}",
        )


def verify_jwt(authorization: str = Header(default="")) -> dict:
    """
    FastAPI dependency — verifikasi Bearer JWT dari header Authorization.

    Usage:
        @router.post("/endpoint")
        async def handler(claims: dict = Depends(verify_jwt)):
            user_id = claims.get("user_id")

    Accepts:
        Authorization: Bearer <token>

    Returns:
        JWT payload dict (contains user_id, role, exp, iat)
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header wajib ada",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Format token tidak valid. Gunakan: Bearer <token>",
        )

    return _decode_token(parts[1])
