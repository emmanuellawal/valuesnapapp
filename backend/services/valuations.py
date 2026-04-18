"""
Valuation Repository — CRUD operations on the valuations table.
Story 3.1: Create Valuations Database Schema
"""
import logging
from typing import Optional

from supabase import Client

from ..cache import get_supabase
from ..models import ValuationRecord

logger = logging.getLogger(__name__)


class ValuationRepository:
    """Persistence layer for valuation records using Supabase."""

    TABLE = "valuations"

    def __init__(self, supabase_client: Optional[Client] = None):
        self._supabase = supabase_client

    def _client(self) -> Client:
        return self._supabase or get_supabase()

    def save(self, record: ValuationRecord) -> str:
        """
        Insert a valuation record.

        Returns:
            UUID string of the created record.
        Raises:
            ValueError on database errors.
        """
        data = {
            "user_id": record.user_id,
            "guest_session_id": record.guest_session_id,
            "image_thumbnail_url": record.image_thumbnail_url,
            "item_name": record.item_name,
            "item_type": record.item_type,
            "brand": record.brand,
            "price_min": float(record.price_min) if record.price_min is not None else None,
            "price_max": float(record.price_max) if record.price_max is not None else None,
            "fair_market_value": float(record.fair_market_value) if record.fair_market_value is not None else None,
            "confidence": record.confidence,
            "sample_size": record.sample_size,
            "ai_response": record.ai_response,
            "ebay_data": record.ebay_data,
            "confidence_data": record.confidence_data,
        }

        try:
            supabase = self._client()
            result = supabase.table(self.TABLE).insert(data).execute()

            if not result.data or len(result.data) == 0:
                raise ValueError("Insert returned no data")

            return result.data[0]["id"]

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to save valuation: {e}")
            raise ValueError(f"Failed to save valuation: {e}") from e

    def get_by_user(self, user_id: str, limit: int = 50) -> list[ValuationRecord]:
        """
        Fetch valuations for a user, newest first.

        Returns:
            List of ValuationRecord (empty list if none found).
        Raises:
            ValueError on database errors.
        """
        try:
            supabase = self._client()
            result = (
                supabase.table(self.TABLE)
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )

            return [self._row_to_record(row) for row in (result.data or [])]

        except Exception as e:
            logger.error(f"Failed to get valuations for user {user_id}: {e}")
            raise ValueError(f"Failed to get valuations: {e}") from e

    def get_by_id(
        self, valuation_id: str, user_id: Optional[str] = None
    ) -> Optional[ValuationRecord]:
        """
        Fetch a single valuation by ID, optionally scoped to a user.

        Returns:
            ValuationRecord or None if not found.
        Raises:
            ValueError on database errors.
        """
        try:
            supabase = self._client()
            query = supabase.table(self.TABLE).select("*").eq("id", valuation_id)

            if user_id is not None:
                query = query.eq("user_id", user_id)

            result = query.execute()

            if not result.data or len(result.data) == 0:
                return None

            return self._row_to_record(result.data[0])

        except Exception as e:
            logger.error(f"Failed to get valuation {valuation_id}: {e}")
            raise ValueError(f"Failed to get valuation: {e}") from e

    def delete_by_id(
        self, valuation_id: str, user_id: Optional[str] = None
    ) -> bool:
        """
        Delete a valuation by ID, optionally scoped to a user.

        Returns:
            True if deleted, False if not found.
        Raises:
            ValueError on database errors.
        """
        try:
            supabase = self._client()
            query = supabase.table(self.TABLE).delete().eq("id", valuation_id)

            if user_id is not None:
                query = query.eq("user_id", user_id)

            result = query.execute()

            return bool(result.data and len(result.data) > 0)

        except Exception as e:
            logger.error(f"Failed to delete valuation {valuation_id}: {e}")
            raise ValueError(f"Failed to delete valuation: {e}") from e

    @staticmethod
    def _row_to_record(row: dict) -> ValuationRecord:
        """Convert a Supabase row dict to a ValuationRecord."""
        return ValuationRecord(
            id=row["id"],
            user_id=row.get("user_id"),
            guest_session_id=row.get("guest_session_id"),
            image_thumbnail_url=row.get("image_thumbnail_url"),
            item_name=row["item_name"],
            item_type=row["item_type"],
            brand=row["brand"],
            price_min=row.get("price_min"),
            price_max=row.get("price_max"),
            fair_market_value=row.get("fair_market_value"),
            confidence=row["confidence"],
            sample_size=row.get("sample_size"),
            ai_response=row.get("ai_response"),
            ebay_data=row.get("ebay_data"),
            confidence_data=row.get("confidence_data"),
            created_at=row.get("created_at"),
        )
