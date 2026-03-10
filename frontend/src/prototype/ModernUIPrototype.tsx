import { type ReactNode, useMemo, useState } from "react";
import {
  Copy,
  Dice5,
  Download,
  Filter,
  Link2,
  Loader2,
  Map,
  Search,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";

import "./shadcn.css";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { cn } from "./lib/utils";

type PrototypeTab = "player" | "team";

type PlayerSnapshot = {
  name: string;
  rank: number;
  totalPoints: number;
  pvpPoints: number;
  finishedCount: number;
  unfinishedCount: number;
};

type TeamMapEntry = {
  name: string;
  difficulty: string;
  stars: number;
  author: string;
};

const MOCK_PLAYER: PlayerSnapshot = {
  name: "White-King",
  rank: 42,
  totalPoints: 8687,
  pvpPoints: 1250,
  finishedCount: 924,
  unfinishedCount: 439,
};

const MOCK_TEAM_MAPS: TeamMapEntry[] = [
  { name: "Skyline Nightmare", difficulty: "Extreme", stars: 2, author: "KoG Team" },
  { name: "Crystal Caverns", difficulty: "Extreme", stars: 2, author: "MapMaster" },
  { name: "Frozen Peaks", difficulty: "Extreme", stars: 2, author: "IceKing" },
  { name: "Volcanic Rush", difficulty: "Extreme", stars: 2, author: "LavaLord" },
  { name: "Ravenclaw Ridge", difficulty: "Extreme", stars: 2, author: "NightOwl" },
  { name: "Oceanfall", difficulty: "Extreme", stars: 2, author: "BluePath" },
];

function MetricCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: "teal" | "amber" | "emerald" | "rose";
}) {
  const accentClass = {
    teal: "text-cyan-300",
    amber: "text-amber-300",
    emerald: "text-emerald-300",
    rose: "text-rose-300",
  }[accent ?? "teal"];

  return (
    <Card className="border-white/10 bg-white/[0.03] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.06]">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className={cn("inline-flex", accentClass)}>{icon}</span>
          <span>{label}</span>
        </div>
        <div className={cn("text-2xl font-semibold tracking-tight", accentClass)}>{value}</div>
      </CardContent>
    </Card>
  );
}

export default function ModernUIPrototype() {
  const [tab, setTab] = useState<PrototypeTab>("player");

  const [playerName, setPlayerName] = useState("White-King");
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const [playerData, setPlayerData] = useState<PlayerSnapshot | null>(null);

  const [teamNames, setTeamNames] = useState("White-King, Sanjar, Player3");
  const [difficulty, setDifficulty] = useState("Extreme");
  const [stars, setStars] = useState("2");
  const [showFilters, setShowFilters] = useState(true);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamMaps, setTeamMaps] = useState<TeamMapEntry[]>([]);

  const subtitle = useMemo(() => {
    if (tab === "player") {
      return "Prototype: shadcn-style dark experience with faster scanning and cleaner focus on player stats.";
    }
    return "Prototype: team-focused planning with shared unfinished maps and random run generation.";
  }, [tab]);

  const runPlayerLookup = () => {
    if (!playerName.trim()) {
      return;
    }
    setLoadingPlayer(true);
    window.setTimeout(() => {
      setPlayerData({ ...MOCK_PLAYER, name: playerName.trim() });
      setLoadingPlayer(false);
    }, 650);
  };

  const runTeamLookup = () => {
    if (!teamNames.trim()) {
      return;
    }
    setLoadingTeam(true);
    window.setTimeout(() => {
      setTeamMaps(MOCK_TEAM_MAPS);
      setLoadingTeam(false);
    }, 700);
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="relative min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(251,146,60,0.12),transparent_30%),linear-gradient(180deg,#070c17_0%,#0a1020_55%,#070c17_100%)]">
        <div className="sticky top-0 z-40 border-b border-white/10 bg-background/55 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 shadow-lg shadow-cyan-900/35">
                <Sparkles className="size-5" />
              </div>
              <div>
                <div className="text-sm font-medium text-cyan-200">KoG Team Planner</div>
                <div className="text-xs text-muted-foreground">Prototype / shadcn-style</div>
              </div>
            </div>
            <Badge variant="outline" className="border-cyan-400/35 bg-cyan-500/10 text-cyan-200">
              Dark UI Prototype
            </Badge>
          </div>
        </div>

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:px-6 md:py-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">KoG Progress Explorer</h1>
            <p className="mt-1 text-sm text-muted-foreground md:text-base">{subtitle}</p>
          </div>

          <Card className="overflow-hidden border-white/10 bg-white/[0.02] backdrop-blur-md">
            <CardContent className="p-0">
              <div className="border-b border-white/10 p-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={tab === "player" ? "default" : "ghost"}
                    className={cn(
                      "justify-start rounded-lg",
                      tab === "player"
                        ? "bg-cyan-600 text-white hover:bg-cyan-500"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setTab("player")}
                  >
                    <UserRound className="size-4" />
                    Player Lookup
                  </Button>
                  <Button
                    variant={tab === "team" ? "default" : "ghost"}
                    className={cn(
                      "justify-start rounded-lg",
                      tab === "team"
                        ? "bg-amber-600 text-white hover:bg-amber-500"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setTab("team")}
                  >
                    <Users className="size-4" />
                    Team Planner
                  </Button>
                </div>
              </div>

              <div className="p-4 md:p-6">
                {tab === "player" && (
                  <div className="space-y-5 animate-in fade-in-0 duration-300">
                    <Card className="border-white/10 bg-white/[0.03]">
                      <CardHeader>
                        <CardTitle className="text-xl">Lookup Player</CardTitle>
                        <CardDescription>
                          Search a player profile and quickly inspect progress stats.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-3 md:flex-row">
                          <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={playerName}
                              onChange={(event) => setPlayerName(event.target.value)}
                              className="pl-9"
                              placeholder="White-King"
                            />
                          </div>
                          <Button
                            onClick={runPlayerLookup}
                            className="bg-cyan-600 text-white hover:bg-cyan-500 md:px-6"
                            disabled={loadingPlayer}
                          >
                            {loadingPlayer ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Loading
                              </>
                            ) : (
                              <>
                                <Search className="size-4" />
                                Search
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {playerData && (
                      <div className="space-y-4 animate-in slide-in-from-bottom-1 fade-in-0 duration-300">
                        <Card className="border-white/10 bg-white/[0.03]">
                          <CardContent className="p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="text-xl font-semibold tracking-tight md:text-2xl">
                                  {playerData.name}
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                  <Trophy className="size-4 text-amber-300" />
                                  Rank #{playerData.rank}
                                </div>
                              </div>
                              <Badge className="bg-cyan-600/20 text-cyan-200">
                                {playerData.finishedCount}/{playerData.finishedCount + playerData.unfinishedCount} maps
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <MetricCard
                            label="Total Points"
                            value={playerData.totalPoints.toLocaleString()}
                            icon={<Trophy className="size-4" />}
                            accent="amber"
                          />
                          <MetricCard
                            label="PvP Points"
                            value={playerData.pvpPoints.toLocaleString()}
                            icon={<Sparkles className="size-4" />}
                            accent="teal"
                          />
                          <MetricCard
                            label="Finished"
                            value={playerData.finishedCount}
                            icon={<Map className="size-4" />}
                            accent="emerald"
                          />
                          <MetricCard
                            label="Unfinished"
                            value={playerData.unfinishedCount}
                            icon={<Map className="size-4" />}
                            accent="rose"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === "team" && (
                  <div className="space-y-5 animate-in fade-in-0 duration-300">
                    <Card className="border-white/10 bg-white/[0.03]">
                      <CardHeader>
                        <CardTitle className="text-xl">Team Input</CardTitle>
                        <CardDescription>
                          Enter names, then filter by difficulty and stars to find shared unfinished maps.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Textarea
                          value={teamNames}
                          onChange={(event) => setTeamNames(event.target.value)}
                          placeholder="White-King, Sanjar, Player3"
                          className="min-h-24"
                        />

                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => setShowFilters((value) => !value)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Filter className="size-4" />
                            {showFilters ? "Hide Filters" : "Show Filters"}
                          </Button>
                          <Badge variant="outline" className="border-amber-500/35 text-amber-300">
                            {difficulty}
                          </Badge>
                          <Badge variant="outline" className="border-amber-500/35 text-amber-300">
                            {stars} star
                          </Badge>
                        </div>

                        {showFilters && (
                          <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 sm:grid-cols-2 animate-in fade-in-0 duration-300">
                            <label className="space-y-1 text-sm">
                              <span className="text-muted-foreground">Difficulty</span>
                              <select
                                className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                value={difficulty}
                                onChange={(event) => setDifficulty(event.target.value)}
                              >
                                <option value="Easy">Easy</option>
                                <option value="Main">Main</option>
                                <option value="Hard">Hard</option>
                                <option value="Insane">Insane</option>
                                <option value="Extreme">Extreme</option>
                              </select>
                            </label>

                            <label className="space-y-1 text-sm">
                              <span className="text-muted-foreground">Stars</span>
                              <select
                                className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                value={stars}
                                onChange={(event) => setStars(event.target.value)}
                              >
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                                <option value="5">5</option>
                              </select>
                            </label>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <Button
                            className="bg-amber-600 text-white hover:bg-amber-500"
                            onClick={runTeamLookup}
                            disabled={loadingTeam}
                          >
                            {loadingTeam ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Finding
                              </>
                            ) : (
                              <>
                                <Search className="size-4" />
                                Find Common Maps
                              </>
                            )}
                          </Button>
                          <Button variant="outline" className="text-amber-200">
                            <Dice5 className="size-4" />
                            Random Pick
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {teamMaps.length > 0 && (
                      <Card className="border-white/10 bg-white/[0.03] animate-in slide-in-from-bottom-1 fade-in-0 duration-300">
                        <CardHeader>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <CardTitle className="text-xl">Shared Unfinished Maps</CardTitle>
                              <CardDescription>
                                {teamMaps.length} matches for {difficulty} {stars}-star filters
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="text-muted-foreground">
                                <Copy className="size-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-muted-foreground">
                                <Download className="size-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-muted-foreground">
                                <Link2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-hidden rounded-lg border border-white/10">
                            <div className="grid grid-cols-[1.4fr_0.7fr_0.5fr_1fr] gap-2 border-b border-white/10 bg-white/[0.02] px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              <span>Map</span>
                              <span>Difficulty</span>
                              <span>Stars</span>
                              <span>Author</span>
                            </div>
                            {teamMaps.map((entry, index) => (
                              <div
                                key={`${entry.name}-${index}`}
                                className="grid grid-cols-[1.4fr_0.7fr_0.5fr_1fr] gap-2 border-b border-white/6 px-3 py-2 text-sm last:border-b-0 hover:bg-white/[0.03]"
                              >
                                <span className="font-medium">{entry.name}</span>
                                <span className="text-amber-200">{entry.difficulty}</span>
                                <span className="inline-flex items-center gap-1 text-amber-300">
                                  <Star className="size-3" /> {entry.stars}
                                </span>
                                <span className="text-muted-foreground">{entry.author}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
