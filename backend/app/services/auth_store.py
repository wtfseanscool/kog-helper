from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import sqlite3
import threading


@dataclass
class AuthUser:
    id: int
    provider: str
    provider_user_id: str
    email: str | None
    display_name: str | None
    avatar_url: str | None
    kog_name: str | None
    created_at: str
    updated_at: str

    def as_dict(self) -> dict[str, object | None]:
        return {
            "id": self.id,
            "provider": self.provider,
            "email": self.email,
            "display_name": self.display_name,
            "avatar_url": self.avatar_url,
            "kog_name": self.kog_name,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class AuthStore:
    def __init__(self, db_path: str) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider TEXT NOT NULL,
                    provider_user_id TEXT NOT NULL,
                    email TEXT,
                    display_name TEXT,
                    avatar_url TEXT,
                    kog_name TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(provider, provider_user_id)
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_users_provider
                ON users(provider, provider_user_id)
                """
            )
            conn.commit()

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(tz=timezone.utc).isoformat()

    @staticmethod
    def _row_to_user(row: sqlite3.Row) -> AuthUser:
        return AuthUser(
            id=int(row["id"]),
            provider=str(row["provider"]),
            provider_user_id=str(row["provider_user_id"]),
            email=row["email"],
            display_name=row["display_name"],
            avatar_url=row["avatar_url"],
            kog_name=row["kog_name"],
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
        )

    def upsert_oauth_user(
        self,
        *,
        provider: str,
        provider_user_id: str,
        email: str | None,
        display_name: str | None,
        avatar_url: str | None,
    ) -> AuthUser:
        now = self._now_iso()

        with self._lock:
            with self._connect() as conn:
                existing = conn.execute(
                    """
                    SELECT *
                    FROM users
                    WHERE provider = ? AND provider_user_id = ?
                    """,
                    (provider, provider_user_id),
                ).fetchone()

                if existing is None:
                    cursor = conn.execute(
                        """
                        INSERT INTO users (
                            provider,
                            provider_user_id,
                            email,
                            display_name,
                            avatar_url,
                            kog_name,
                            created_at,
                            updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            provider,
                            provider_user_id,
                            email,
                            display_name,
                            avatar_url,
                            None,
                            now,
                            now,
                        ),
                    )
                    user_id = int(cursor.lastrowid)
                else:
                    user_id = int(existing["id"])
                    conn.execute(
                        """
                        UPDATE users
                        SET email = ?,
                            display_name = ?,
                            avatar_url = ?,
                            updated_at = ?
                        WHERE id = ?
                        """,
                        (
                            email if email is not None else existing["email"],
                            display_name
                            if display_name is not None
                            else existing["display_name"],
                            avatar_url
                            if avatar_url is not None
                            else existing["avatar_url"],
                            now,
                            user_id,
                        ),
                    )

                conn.commit()

                row = conn.execute(
                    """
                    SELECT *
                    FROM users
                    WHERE id = ?
                    """,
                    (user_id,),
                ).fetchone()

        if row is None:
            raise RuntimeError("Failed to persist OAuth user")

        return self._row_to_user(row)

    def get_user(self, user_id: int) -> AuthUser | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT *
                FROM users
                WHERE id = ?
                """,
                (user_id,),
            ).fetchone()

        if row is None:
            return None

        return self._row_to_user(row)

    def update_kog_name(self, user_id: int, kog_name: str) -> AuthUser | None:
        with self._lock:
            with self._connect() as conn:
                now = self._now_iso()
                conn.execute(
                    """
                    UPDATE users
                    SET kog_name = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (kog_name, now, user_id),
                )
                conn.commit()

                row = conn.execute(
                    """
                    SELECT *
                    FROM users
                    WHERE id = ?
                    """,
                    (user_id,),
                ).fetchone()

        if row is None:
            return None

        return self._row_to_user(row)
