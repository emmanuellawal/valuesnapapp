"""
Idempotency persistence for POST /api/appraise.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import logging
from typing import Literal, Optional

from supabase import Client

from ..cache import get_supabase

logger = logging.getLogger(__name__)

IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60


@dataclass
class IdempotencyReplay:
    """Previously recorded response for an idempotency key."""

    status_code: int
    response_body: dict


@dataclass
class IdempotencyClaim:
    """Result of attempting to claim an idempotency key."""

    status: Literal["started", "replay", "in_progress"]
    replay: Optional[IdempotencyReplay] = None


class IdempotencyUnavailableError(RuntimeError):
    """Raised when the idempotency store cannot be trusted for a keyed request."""


class AppraiseIdempotencyRepository:
    """Read/write idempotency records for /api/appraise."""

    TABLE = "idempotency_keys"
    ENDPOINT = "/api/appraise"

    def __init__(
        self,
        supabase_client: Optional[Client] = None,
        ttl_seconds: int = IDEMPOTENCY_TTL_SECONDS,
    ):
        self._supabase = supabase_client
        self._ttl_seconds = ttl_seconds

    def _client(self) -> Client:
        return self._supabase or get_supabase()

    @staticmethod
    def _is_expired(expires_at: Optional[str], now: datetime) -> bool:
        if not expires_at:
            return False
        normalized = expires_at.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(normalized) <= now
        except ValueError:
            return False

    @staticmethod
    def _row_to_claim(row: dict, now: datetime) -> IdempotencyClaim:
        if AppraiseIdempotencyRepository._is_expired(row.get("expires_at"), now):
            return IdempotencyClaim(status="started")

        if row.get("state") == "completed":
            return IdempotencyClaim(
                status="replay",
                replay=IdempotencyReplay(
                    status_code=int(row.get("status_code", 200)),
                    response_body=row.get("response_body", {}),
                ),
            )

        return IdempotencyClaim(status="in_progress")

    def _fetch_existing(
        self,
        *,
        principal_type: str,
        principal_id: str,
        idempotency_key: str,
    ) -> Optional[dict]:
        result = (
            self._client()
            .table(self.TABLE)
            .select("state,status_code,response_body,expires_at")
            .eq("endpoint", self.ENDPOINT)
            .eq("principal_type", principal_type)
            .eq("principal_id", principal_id)
            .eq("idempotency_key", idempotency_key)
            .limit(1)
            .execute()
        )

        if not result.data:
            return None
        return result.data[0]

    def start_request(
        self,
        *,
        principal_type: str,
        principal_id: str,
        idempotency_key: str,
    ) -> IdempotencyClaim:
        """Reserve an idempotency key before appraise processing starts."""
        now = datetime.now(timezone.utc)
        payload = {
            "endpoint": self.ENDPOINT,
            "principal_type": principal_type,
            "principal_id": principal_id,
            "idempotency_key": idempotency_key,
            "state": "processing",
            "status_code": 202,
            "response_body": {},
            "valuation_id": None,
            "created_at": now.isoformat(),
            "expires_at": (now + timedelta(seconds=self._ttl_seconds)).isoformat(),
        }

        try:
            self._client().table(self.TABLE).insert(payload).execute()
            return IdempotencyClaim(status="started")
        except Exception as insert_error:
            try:
                existing = self._fetch_existing(
                    principal_type=principal_type,
                    principal_id=principal_id,
                    idempotency_key=idempotency_key,
                )
                if not existing:
                    raise insert_error

                claim = self._row_to_claim(existing, now)
                if claim.status != "started":
                    return claim

                # Expired key: reuse the existing unique slot for a fresh request.
                self._client().table(self.TABLE).update(payload).eq(
                    "endpoint", self.ENDPOINT
                ).eq("principal_type", principal_type).eq("principal_id", principal_id).eq(
                    "idempotency_key", idempotency_key
                ).execute()
                return IdempotencyClaim(status="started")
            except Exception as e:
                logger.error(f"Idempotency reservation failed: {e}")
                raise IdempotencyUnavailableError("Unable to reserve idempotency key") from e

    def complete_request(
        self,
        *,
        principal_type: str,
        principal_id: str,
        idempotency_key: str,
        response_body: dict,
        status_code: int = 200,
        valuation_id: Optional[str] = None,
    ) -> bool:
        """Mark a reserved idempotency key complete and store replay payload."""
        now = datetime.now(timezone.utc)
        payload = {
            "state": "completed",
            "status_code": status_code,
            "response_body": response_body,
            "valuation_id": valuation_id,
            "expires_at": (now + timedelta(seconds=self._ttl_seconds)).isoformat(),
        }

        try:
            self._client().table(self.TABLE).update(payload).eq(
                "endpoint", self.ENDPOINT
            ).eq("principal_type", principal_type).eq("principal_id", principal_id).eq(
                "idempotency_key", idempotency_key
            ).execute()
            return True
        except Exception as e:
            logger.warning(f"Idempotency completion failed: {e}")
            return False
