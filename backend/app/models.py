from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class TeamCommonRequest(BaseModel):
    players: list[str] = Field(default_factory=list)
    players_text: str | None = None
    delimiter: str = ","
    difficulty: str | None = None
    stars: int | None = Field(default=None, ge=1, le=5)
    include_unknown_metadata: bool = True


class TeamRandomRequest(TeamCommonRequest):
    count: int = Field(default=1, ge=1, le=100)
    seed: int | None = None


class ProfileUpdateRequest(BaseModel):
    kog_name: str = Field(min_length=2, max_length=64)


class MapCatalogEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    stars: int | None = None
    difficulty: str | None = None
    points: int | None = None
    author: str | None = None
    released_at: str | None = None
