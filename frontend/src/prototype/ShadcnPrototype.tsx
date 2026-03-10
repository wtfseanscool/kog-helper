import { useState, useEffect } from "react";
import {
  Copy,
  Dice5,
  Download,
  Filter,
  Link2,
  Loader2,
  Search,
  Trophy,
  User,
  Users,
  Star,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Palette,
} from "lucide-react";
import "./shadcn.css";
import { cn } from "./lib/utils";

const THEME_STORAGE_KEY = "kog-shadcn-theme";

const THEME_OPTIONS = [
  { id: "zinc", name: "Zinc", color: "#a1a1aa" },
  { id: "vercel", name: "Vercel", color: "#6366f1" },
  { id: "discord", name: "Discord", color: "#5865f2" },
  { id: "github", name: "GitHub", color: "#58a6ff" },
  { id: "premium", name: "Premium", color: "#f59e0b" },
  { id: "ocean", name: "Ocean", color: "#06b6d4" },
] as const;

type ThemeId = (typeof THEME_OPTIONS)[number]["id"];

// Button component with Tailwind v4 classes
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        "disabled:pointer-events-none disabled:opacity-50",
        // Variants
        variant === "default" && [
          "bg-[var(--primary)] text-[var(--primary-foreground)]",
          "hover:brightness-110 active:brightness-95",
          "shadow-sm",
        ],
        variant === "secondary" && [
          "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
          "hover:brightness-110 active:brightness-95",
        ],
        variant === "outline" && [
          "border border-[var(--border)] bg-transparent",
          "text-[var(--foreground)]",
          "hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
        ],
        variant === "ghost" && [
          "text-[var(--muted-foreground)]",
          "hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
        ],
        // Sizes
        size === "default" && "h-9 px-4 py-2",
        size === "sm" && "h-8 rounded-md px-3 text-xs",
        size === "lg" && "h-10 rounded-md px-8",
        size === "icon" && "h-9 w-9",
        className
      )}
      {...props}
    />
  );
}

// Card component
function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-sm",
        "backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  );
}

function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

// Input component
function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-1 text-sm",
        "text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]",
        "shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

// Textarea component
function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm",
        "text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]",
        "shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

// Badge component
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "destructive";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variant === "default" && [
          "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]",
          "hover:brightness-110",
        ],
        variant === "secondary" && [
          "border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)]",
          "hover:brightness-110",
        ],
        variant === "outline" && [
          "border-[var(--border)] bg-transparent text-[var(--muted-foreground)]",
          "hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
        ],
        variant === "destructive" && [
          "border-transparent bg-[var(--destructive)] text-white",
          "hover:brightness-110",
        ],
        className
      )}
      {...props}
    />
  );
}

// Separator component
function Separator({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-[1px] w-full shrink-0 bg-[var(--border)]", className)}
      role="separator"
    />
  );
}

// Mock data
const MOCK_PLAYER = {
  name: "White-King",
  rank: 42,
  totalPoints: 8687,
  pvpPoints: 1250,
  finishedCount: 924,
  unfinishedCount: 439,
};

const MOCK_TEAM_MAPS = [
  { name: "Skyline Nightmare", difficulty: "Extreme", stars: 2, author: "KoG Team" },
  { name: "Crystal Caverns", difficulty: "Extreme", stars: 2, author: "MapMaster" },
  { name: "Frozen Peaks", difficulty: "Extreme", stars: 2, author: "IceKing" },
  { name: "Volcanic Rush", difficulty: "Extreme", stars: 2, author: "LavaLord" },
  { name: "Ravenclaw Ridge", difficulty: "Extreme", stars: 2, author: "NightOwl" },
  { name: "Oceanfall", difficulty: "Extreme", stars: 2, author: "BluePath" },
];

export default function ShadcnPrototype() {
  const [activeTab, setActiveTab] = useState<"player" | "team">("player");
  const [playerName, setPlayerName] = useState("");
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerResult, setPlayerResult] = useState<typeof MOCK_PLAYER | null>(null);
  const [teamInput, setTeamInput] = useState("");
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamResults, setTeamResults] = useState<typeof MOCK_TEAM_MAPS>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [difficulty, setDifficulty] = useState("Extreme");
  const [stars, setStars] = useState("2");
  const [theme, setTheme] = useState<ThemeId>(() => {
    if (typeof window === "undefined") {
      return "zinc";
    }

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_OPTIONS.some((option) => option.id === savedTheme)
      ? (savedTheme as ThemeId)
      : "zinc";
  });
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const selectedTheme =
    THEME_OPTIONS.find((option) => option.id === theme) ?? THEME_OPTIONS[0];

  const handleThemeChange = (newTheme: ThemeId) => {
    setTheme(newTheme);
    setShowThemeSelector(false);
  };

  const handlePlayerSearch = () => {
    if (!playerName.trim()) return;
    setPlayerLoading(true);
    setTimeout(() => {
      setPlayerResult(MOCK_PLAYER);
      setPlayerLoading(false);
    }, 1200);
  };

  const handleTeamSearch = () => {
    if (!teamInput.trim()) return;
    setTeamLoading(true);
    setTimeout(() => {
      setTeamResults(MOCK_TEAM_MAPS);
      setTeamLoading(false);
    }, 1200);
  };

  return (
    <div
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300"
      style={{
        backgroundImage:
          "radial-gradient(circle at 12% -18%, color-mix(in oklab, var(--ring) 24%, transparent), transparent 48%), radial-gradient(circle at 88% -22%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 44%)",
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--background)] backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold text-[var(--foreground)]">KoG Explorer</span>
            <Badge variant="outline" className="ml-2 text-xs">
              shadcn prototype
            </Badge>
          </div>

          {/* Theme Selector */}
          <div className="relative">
            <button
              onClick={() => setShowThemeSelector(!showThemeSelector)}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
            >
              <Palette className="h-4 w-4" />
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: selectedTheme.color }}
              />
              <span className="hidden sm:inline">{selectedTheme.name}</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {showThemeSelector && (
              <div className="absolute right-0 top-full mt-2 w-40 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-200">
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleThemeChange(option.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      theme === option.id
                        ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                        : "text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                    )}
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                    <span>{option.name}</span>
                    {theme === option.id && (
                      <span className="ml-auto text-[var(--primary)]">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Title Section */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
              KoG Progress Explorer
            </h1>
            <p className="text-[var(--muted-foreground)]">
              Search player stats or find shared unfinished maps for your team.
            </p>
          </div>

          {/* Main Card with Tabs */}
          <Card>
            <CardHeader className="pb-3">
              {/* Tabs */}
              <div className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] p-1">
                <button
                  onClick={() => setActiveTab("player")}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                    activeTab === "player"
                      ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  <User className="h-4 w-4" />
                  Player Lookup
                </button>
                <button
                  onClick={() => setActiveTab("team")}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                    activeTab === "team"
                      ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  <Users className="h-4 w-4" />
                  Team Planner
                </button>
              </div>
            </CardHeader>

            <CardContent>
              {activeTab === "player" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                      <Input
                        placeholder="Enter player name (e.g., White-King)"
                        className="pl-9"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handlePlayerSearch()}
                      />
                    </div>
                    <Button
                      onClick={handlePlayerSearch}
                      disabled={playerLoading || !playerName.trim()}
                    >
                      {playerLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="mr-2 h-4 w-4" />
                      )}
                      Search
                    </Button>
                  </div>

                  {playerResult && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
                      <Separator />
                      
                      {/* Player Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                            {playerResult.name}
                          </h3>
                          <div className="mt-1 flex items-center gap-2 text-[var(--muted-foreground)]">
                            <Trophy className="h-4 w-4 text-amber-400" />
                            <span>Rank #{playerResult.rank}</span>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {playerResult.finishedCount} /{" "}
                          {playerResult.finishedCount + playerResult.unfinishedCount}{" "}
                          maps
                        </Badge>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          {
                            label: "Total Points",
                            value: playerResult.totalPoints.toLocaleString(),
                            color: "text-amber-400",
                          },
                          {
                            label: "PvP Points",
                            value: playerResult.pvpPoints.toLocaleString(),
                            color: "text-cyan-400",
                          },
                          {
                            label: "Finished",
                            value: playerResult.finishedCount,
                            color: "text-emerald-400",
                          },
                          {
                            label: "Unfinished",
                            value: playerResult.unfinishedCount,
                            color: "text-rose-400",
                          },
                        ].map((stat) => (
                          <Card key={stat.label} className="bg-[var(--secondary)]">
                            <CardContent className="p-4">
                              <div className="text-xs font-medium uppercase text-[var(--muted-foreground)]">
                                {stat.label}
                              </div>
                              <div className={cn("mt-2 text-2xl font-bold", stat.color)}>
                                {stat.value}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "team" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Team Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--muted-foreground)]">
                      Team Players
                    </label>
                    <Textarea
                      placeholder="Enter player names separated by commas or new lines&#10;White-King, Sanjar, Player3"
                      value={teamInput}
                      onChange={(e) => setTeamInput(e.target.value)}
                    />
                  </div>

                  {/* Filters Toggle */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="mr-2 h-4 w-4" />
                      Filters
                      {showFilters ? (
                        <ChevronUp className="ml-1 h-3 w-3" />
                      ) : (
                        <ChevronDown className="ml-1 h-3 w-3" />
                      )}
                    </Button>
                    <Badge variant="outline">{difficulty}</Badge>
                    <Badge variant="outline">{stars} ★</Badge>
                  </div>

                  {/* Filters Panel */}
                  {showFilters && (
                    <div className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-4 sm:grid-cols-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--muted-foreground)]">
                          Difficulty
                        </label>
                        <select
                          className="flex h-9 w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-1 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]"
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value)}
                        >
                          <option value="Easy">Easy</option>
                          <option value="Main">Main</option>
                          <option value="Hard">Hard</option>
                          <option value="Insane">Insane</option>
                          <option value="Extreme">Extreme</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--muted-foreground)]">
                          Stars
                        </label>
                        <select
                          className="flex h-9 w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-1 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]"
                          value={stars}
                          onChange={(e) => setStars(e.target.value)}
                        >
                          {[1, 2, 3, 4, 5].map((s) => (
                            <option key={s} value={s}>
                              {s} ★
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleTeamSearch}
                      disabled={teamLoading || !teamInput.trim()}
                    >
                      {teamLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="mr-2 h-4 w-4" />
                      )}
                      Find Common Maps
                    </Button>
                    <Button variant="outline" disabled={teamResults.length === 0}>
                      <Dice5 className="mr-2 h-4 w-4" />
                      Random
                    </Button>
                  </div>

                  {/* Results */}
                  {teamResults.length > 0 && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-[var(--foreground)]">
                            Shared Unfinished Maps
                          </h3>
                          <p className="text-sm text-[var(--muted-foreground)]">
                            {teamResults.length} maps match your filters
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Link2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Results Table */}
                      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-[var(--border)] bg-[var(--secondary)] p-3 text-xs font-medium uppercase text-[var(--muted-foreground)]">
                          <span>Map</span>
                          <span>Difficulty</span>
                          <span>Stars</span>
                          <span>Author</span>
                        </div>
                        {teamResults.map((map, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-[var(--border)] p-3 text-sm transition-colors last:border-0 hover:bg-[var(--accent)]"
                          >
                            <span className="font-medium text-[var(--foreground)]">{map.name}</span>
                            <Badge variant="secondary">{map.difficulty}</Badge>
                            <span className="flex items-center gap-1 text-amber-400">
                              <Star className="h-3 w-3 fill-current" />
                              {map.stars}
                            </span>
                            <span className="text-[var(--muted-foreground)]">{map.author}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
