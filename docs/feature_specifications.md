> [!WARNING]
> **ARCHIVED DOCUMENT** — This is a brainstorming/research document from early development. The tech stack has changed (now Supabase, Tamagui, self-hosted PDS) and the project was renamed from "Battle Stadium" to "trainers.gg". Ideas have been extracted for Linear tickets. Kept for historical reference only.

# Feature Specifications - Deep Dive

## 🏗️ Overview

This document provides detailed UI/UX specifications for all major Battle Stadium features, including interface designs, interaction patterns, responsive behavior, and technical implementation requirements.

---

## 📊 Meta Analysis Dashboard

### Overview & Purpose

The Meta Analysis Dashboard is the central hub for competitive intelligence, providing skill-stratified meta insights that show users what they'll actually face at their competitive level.

### Interface Specifications

```typescript
interface MetaDashboardLayout {
  header: DashboardHeader;
  sidebar: MetaNavigationSidebar;
  mainContent: MetaContentArea;
  widgets: MetaWidget[];
  footer: DashboardFooter;
}

interface DashboardHeader {
  skillBracketSelector: SkillBracketSelector;
  timeRangeSelector: TimeRangeSelector;
  formatSelector: FormatSelector;
  regionFilter: RegionFilter;
  searchBar: GlobalSearchBar;
}

interface MetaContentArea {
  layout: "grid" | "list" | "detailed";
  sections: MetaSection[];
  interactionState: InteractionState;
}
```

### Key Components

#### 1. Skill-Level Meta Selector

```typescript
interface SkillBracketSelector {
  // Visual Design
  layout: "horizontal_tabs" | "dropdown";
  position: "top_left" | "center_header";

  // Interaction
  options: [
    {
      value: "your_level";
      label: "Your Level (1520 Rating)";
      description: "Meta at your competitive skill level";
      highlight: true;
    },
    {
      value: "developing";
      label: "Developing (800-1350)";
      description: "Learning fundamentals";
      color: "#green";
    },
    {
      value: "competitive";
      label: "Competitive (1350-1650)";
      description: "Solid fundamentals";
      color: "#blue";
    },
    {
      value: "expert";
      label: "Expert (1650-1900)";
      description: "Advanced strategies";
      color: "#purple";
    },
    {
      value: "elite";
      label: "Elite (1900+)";
      description: "Cutting-edge play";
      color: "#gold";
    },
  ];

  // State Management
  defaultValue: "your_level";
  onChange: (bracket: SkillBracket) => void;
  persistSelection: boolean;
}
```

#### 2. Interactive Usage Chart

```typescript
interface UsageChart {
  // Chart Configuration
  chartType: "line" | "area" | "combined";
  timeAxis: "days" | "weeks" | "tournaments";
  pokemonAxis: "usage_percentage" | "absolute_count";

  // Interactive Features
  interactions: {
    hover: {
      showTooltip: true;
      tooltipContent: PokemonTooltipData;
      highlightRelated: boolean;
    };
    click: {
      action: "drill_down" | "pokemon_detail" | "filter_by_pokemon";
      preserveContext: boolean;
    };
    multiSelect: {
      enabled: boolean;
      maxSelections: number;
      comparisonMode: "overlay" | "side_by_side";
    };
  };

  // Data Display
  displayOptions: {
    maxPokemonShown: number;
    metaRelevanceThreshold: number;
    showTrendLines: boolean;
    showConfidenceIntervals: boolean;
  };

  // Visual Design
  styling: {
    colorScheme: "pokemon_types" | "usage_intensity" | "custom";
    lineWidth: number;
    pointSize: number;
    gridLines: boolean;
  };
}

interface PokemonTooltipData {
  pokemonName: string;
  currentUsage: number;
  usageTrend: "rising" | "stable" | "falling";
  winRate: number;
  sampleSize: number;
  keyInsights: string[];
  relatedPokemon: string[];
}
```

#### 3. Meta Insights Panel

```typescript
interface MetaInsightsPanel {
  layout: "cards" | "list" | "accordion";

  insights: MetaInsight[];

  filters: {
    insightType: "trending" | "threats" | "opportunities" | "predictions";
    relevanceLevel: "high" | "medium" | "low";
    timeframe: "this_week" | "this_month" | "format_lifetime";
  };

  interactions: {
    expandable: boolean;
    shareable: boolean;
    saveable: boolean;
  };
}

interface MetaInsight {
  id: string;
  title: string;
  summary: string;
  details: string;
  confidence: number; // 0-1
  relevanceScore: number; // 0-1
  type: "usage_shift" | "new_threat" | "archetype_change" | "prediction";
  impact: "low" | "medium" | "high";
  actionable: boolean;
  relatedData: {
    pokemon: string[];
    tournaments: string[];
    timeframe: DateRange;
  };
  visualizations: ChartConfig[];
}
```

### Responsive Design Specifications

#### Desktop Layout (1024px+)

```css
.meta-dashboard {
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  grid-template-rows: 80px 1fr 60px;
  grid-template-areas:
    "sidebar header header"
    "sidebar main-content insights-panel"
    "sidebar footer footer";
  gap: 20px;
  padding: 20px;
}

.skill-bracket-selector {
  display: flex;
  background: var(--surface-elevated);
  border-radius: 12px;
  padding: 4px;
  box-shadow: var(--shadow-medium);
}

.usage-chart-container {
  background: var(--surface-primary);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-small);
}
```

#### Mobile Layout (768px and below)

```css
.meta-dashboard-mobile {
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 16px;
}

.skill-bracket-selector-mobile {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  gap: 8px;
  padding: 8px 0;
}

.usage-chart-mobile {
  height: 300px; /* Reduced from desktop 500px */
  touch-action: pan-x pan-y;
}

.meta-insights-mobile {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meta-insight-card-mobile {
  padding: 16px;
  border-radius: 12px;
  background: var(--surface-elevated);
  box-shadow: var(--shadow-small);
}
```

### State Management

```typescript
interface MetaDashboardState {
  // Selection State
  selectedSkillBracket: SkillBracket;
  selectedTimeRange: TimeRange;
  selectedFormat: GameFormat;
  selectedRegion: Region[];

  // Data State
  metaData: MetaData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // UI State
  chartType: ChartType;
  selectedPokemon: string[];
  insightsPanelOpen: boolean;
  filterState: FilterState;

  // Personalization
  userPreferences: MetaDashboardPreferences;
  savedViews: SavedView[];
}

interface MetaDashboardActions {
  // Data Actions
  loadMetaData: (params: MetaQueryParams) => Promise<void>;
  refreshData: () => Promise<void>;

  // Selection Actions
  updateSkillBracket: (bracket: SkillBracket) => void;
  updateTimeRange: (range: TimeRange) => void;
  updateFilters: (filters: Partial<FilterState>) => void;

  // Interaction Actions
  selectPokemon: (pokemon: string[]) => void;
  toggleInsightsPanel: () => void;
  saveCurrentView: (name: string) => void;

  // Personalization Actions
  updatePreferences: (preferences: Partial<MetaDashboardPreferences>) => void;
}
```

---

## 🎥 Replay Analysis Interface

### Overview & Purpose

The Replay Analysis Interface allows users to upload, analyze, and learn from Pokemon battles with AI-powered insights and scenario branching capabilities.

### Interface Specifications

#### 1. Replay Upload Component

```typescript
interface ReplayUploadInterface {
  // Upload Methods
  uploadMethods: {
    dragDrop: DragDropZone;
    urlPaste: URLInputField;
    fileUpload: FileInputField;
    manualInput: ManualInputButton;
    browserExtension: ExtensionIntegration;
  };

  // Upload Configuration
  configuration: {
    analysisDepth: "quick" | "standard" | "deep";
    privacyLevel: "private" | "friends" | "public";
    tags: string[];
    notes: string;
  };

  // Progress Tracking
  uploadProgress: {
    stage: "uploading" | "parsing" | "analyzing" | "complete";
    percentage: number;
    estimatedTime: number;
    statusMessage: string;
  };
}

interface DragDropZone {
  // Visual Design
  dimensions: { width: "100%"; height: "200px" };
  styling: {
    border: "2px dashed var(--border-interactive)";
    borderRadius: "12px";
    background: "var(--surface-elevated)";
    transition: "all 0.2s ease";
  };

  // States
  states: {
    idle: {
      text: "Drag & drop replay files here or click to browse";
      icon: "upload-cloud";
      borderColor: "var(--border-neutral)";
    };
    dragOver: {
      text: "Drop files to upload";
      icon: "download";
      borderColor: "var(--accent-primary)";
      background: "var(--accent-surface)";
    };
    uploading: {
      text: "Uploading... {percentage}%";
      icon: "loading";
      showProgress: true;
    };
    error: {
      text: "Upload failed. Please try again.";
      icon: "alert-circle";
      borderColor: "var(--semantic-error)";
    };
  };

  // Accepted File Types
  acceptedTypes: [".html", ".txt", ".json", ".pbr"];
  maxFileSize: "10MB";
  multiple: false;
}
```

#### 2. Replay Viewer Component

```typescript
interface ReplayViewerInterface {
  // Layout Structure
  layout: {
    toolbar: ReplayToolbar;
    gameView: GameVisualization;
    timeline: TurnTimeline;
    sidePanel: AnalysisSidePanel;
  };

  // Navigation Controls
  navigation: {
    playButton: PlayPauseButton;
    speedControl: SpeedSelector;
    turnSlider: TurnSlider;
    jumpToTurn: TurnJumpInput;
    bookmarks: BookmarkSystem;
  };

  // Interaction Features
  interactions: {
    turnNavigation: "click" | "keyboard" | "swipe";
    decisionHighlighting: boolean;
    alternativeScenarios: boolean;
    tooltips: boolean;
  };
}

interface TurnTimeline {
  // Visual Design
  styling: {
    height: "60px";
    background: "var(--surface-primary)";
    borderRadius: "8px";
    padding: "12px";
  };

  // Turn Indicators
  turnIndicators: {
    normalTurn: {
      color: "var(--text-secondary)";
      size: "8px";
      shape: "circle";
    };
    criticalTurn: {
      color: "var(--semantic-warning)";
      size: "12px";
      shape: "diamond";
      pulse: true;
    };
    currentTurn: {
      color: "var(--accent-primary)";
      size: "14px";
      shape: "circle";
      glow: true;
    };
  };

  // Interactions
  interactions: {
    clickToJump: boolean;
    hoverPreview: boolean;
    dragToSeek: boolean;
    keyboardNavigation: true;
  };
}
```

#### 3. Decision Point Analysis

```typescript
interface DecisionPointInterface {
  // Decision Visualization
  decisionCard: {
    layout: "card" | "inline" | "modal";
    information: {
      turnNumber: number;
      gameState: GameStateSnapshot;
      availableOptions: DecisionOption[];
      actualChoice: DecisionOption;
      optimalChoice: DecisionOption;
    };

    visualElements: {
      gameStatePreview: MiniGameView;
      optionComparison: OptionComparisonTable;
      outcomeProjection: OutcomeVisualization;
      confidenceIndicator: ConfidenceBar;
    };
  };

  // "What If" Scenario Builder
  scenarioBuilder: {
    interface: {
      optionSelector: RadioButtonGroup;
      rngModifier: RNGModificationControls;
      projectionView: ScenarioProjectionView;
      comparisonToggle: ComparisonToggle;
    };

    rngControls: {
      criticalHits: ToggleSwitch;
      damageRolls: RangeSlider;
      accuracyChecks: BooleanToggle;
      speedTies: OptionSelector;
    };
  };
}

interface OptionComparisonTable {
  columns: [
    { key: "option"; label: "Decision Option"; width: "30%" },
    { key: "immediate_outcome"; label: "Immediate Result"; width: "25%" },
    { key: "win_probability"; label: "Win %"; width: "15%" },
    { key: "risk_level"; label: "Risk"; width: "15%" },
    { key: "learning_value"; label: "Learning Value"; width: "15%" },
  ];

  styling: {
    headerBackground: "var(--surface-elevated)";
    rowHover: "var(--surface-hover)";
    selectedRow: "var(--accent-surface)";
    borderRadius: "8px";
  };

  interactions: {
    sortable: boolean;
    selectable: "single" | "multiple";
    expandable: boolean;
  };
}
```

### Mobile Optimizations

#### Mobile Replay Viewer

```typescript
interface MobileReplayViewer {
  // Optimized Layout
  layout: "single_column" | "tabbed" | "overlay";

  // Touch Interactions
  touchControls: {
    swipeNavigation: {
      leftSwipe: "next_turn";
      rightSwipe: "previous_turn";
      upSwipe: "show_analysis";
      downSwipe: "hide_analysis";
    };

    tapInteractions: {
      singleTap: "play_pause";
      doubleTap: "toggle_decision_highlight";
      longPress: "show_context_menu";
    };

    pinchZoom: {
      enabled: boolean;
      minZoom: 0.5;
      maxZoom: 2.0;
      target: "game_view" | "entire_interface";
    };
  };

  // Mobile-Specific Features
  mobileFeatures: {
    quickInsights: TldrInsightCards;
    voiceNotes: VoiceNoteRecording;
    offlineViewing: OfflineCapability;
    shareTo: ShareIntegration;
  };
}

interface TldrInsightCards {
  cardLayout: {
    width: "calc(100vw - 32px)";
    height: "120px";
    scrollDirection: "horizontal";
    snapScroll: true;
  };

  cardTypes: [
    {
      type: "key_mistake";
      icon: "alert-triangle";
      color: "var(--semantic-error)";
      maxLength: 60; // characters
    },
    {
      type: "good_play";
      icon: "check-circle";
      color: "var(--semantic-success)";
      maxLength: 60;
    },
    {
      type: "learning_opportunity";
      icon: "lightbulb";
      color: "var(--semantic-info)";
      maxLength: 60;
    },
  ];
}
```

---

## 🏆 Tournament Dashboard

### Overview & Purpose

Central hub for tournament management, participation, and live analytics during events.

### Interface Specifications

#### 1. Tournament List & Discovery

```typescript
interface TournamentListInterface {
  // View Options
  viewModes: {
    grid: TournamentCardGrid;
    list: TournamentListView;
    calendar: TournamentCalendarView;
    map: TournamentMapView;
  };

  // Filtering & Search
  filters: {
    dateRange: DateRangePicker;
    format: FormatMultiSelect;
    location: LocationFilter;
    skillLevel: SkillLevelFilter;
    entryFee: PriceRangeSlider;
    status: StatusFilter;
  };

  // Tournament Card Design
  tournamentCard: {
    layout: "vertical" | "horizontal";
    elements: {
      header: TournamentHeader;
      details: TournamentDetails;
      actions: TournamentActions;
      status: TournamentStatus;
    };
  };
}

interface TournamentCard {
  // Visual Hierarchy
  header: {
    title: string; // Max 50 characters
    subtitle: string; // Format + date
    organizerLogo: ImageElement;
    featuredBadge?: "major" | "new" | "popular";
  };

  // Key Information
  quickInfo: {
    participants: { current: number; max: number };
    entryFee: PriceDisplay;
    prizePool: PriceDisplay;
    timeUntilStart: TimeDisplay;
  };

  // Action Buttons
  actions: {
    primary: "register" | "view_details" | "join_waitlist";
    secondary: "share" | "save" | "get_notifications";
  };

  // Status Indicators
  statusIndicators: {
    registration: "open" | "closing_soon" | "full" | "closed";
    tournament: "upcoming" | "live" | "completed";
    userStatus:
      | "not_registered"
      | "registered"
      | "waitlisted"
      | "participating";
  };
}
```

#### 2. Live Tournament Interface

```typescript
interface LiveTournamentInterface {
  // Layout for Tournament Participants
  participantView: {
    header: LiveTournamentHeader;
    mainContent: ParticipantMainView;
    sidebar: ParticipantSidebar;
    bottomSheet: MobileBottomSheet;
  };

  // Real-Time Data Updates
  realTimeUpdates: {
    updateInterval: 30; // seconds
    updateTypes: ["pairings", "standings", "results", "announcements"];
    notificationTypes: [
      "round_start",
      "pairing_ready",
      "result_needed",
      "coaching_available",
    ];
  };

  // Participant Dashboard Elements
  participantElements: {
    currentStatus: CurrentStatusCard;
    nextRound: NextRoundInfo;
    liveCoaching: LiveCoachingPanel;
    quickActions: QuickActionButtons;
    tournamentProgress: ProgressVisualization;
  };
}

interface CurrentStatusCard {
  design: {
    prominent: true;
    colorCoded: boolean;
    iconSupport: boolean;
  };

  information: {
    currentRecord: RecordDisplay; // "5-2" with visual representation
    currentStanding: StandingDisplay; // "#12 of 156"
    currentRound: RoundDisplay; // "Round 8 of 9"
    timeStatus: TimeStatusDisplay; // "15 minutes remaining"
  };

  visualElements: {
    recordVisualization: WinLossVisualization;
    standingChart: MiniStandingsChart;
    progressBar: RoundProgressBar;
  };
}

interface LiveCoachingPanel {
  // Expandable Panel Design
  layout: {
    collapsed: CoachingCollapsedView;
    expanded: CoachingExpandedView;
    modal: CoachingModalView;
  };

  // Content Types
  coachingContent: {
    fieldAnalysis: FieldAnalysisCard;
    personalInsights: PersonalInsightCards;
    threatWarnings: ThreatWarningCards;
    recommendations: RecommendationCards;
  };

  // Interaction Features
  interactions: {
    expandOnNew: boolean;
    markAsRead: boolean;
    saveForLater: boolean;
    shareWithCoach: boolean;
  };
}
```

#### 3. Tournament Organizer Interface

```typescript
interface OrganizerInterface {
  // Tournament Management Dashboard
  dashboard: {
    overview: TournamentOverviewPanel;
    realTimeMonitoring: LiveMonitoringPanel;
    participantManagement: ParticipantManagementPanel;
    controlPanel: TournamentControlPanel;
  };

  // Live Tournament Controls
  liveControls: {
    roundManagement: RoundControlInterface;
    resultEntry: ResultEntryInterface;
    announcementSystem: AnnouncementInterface;
    issueResolution: IssueResolutionInterface;
  };

  // Participant Management
  participantManagement: {
    registrationQueue: RegistrationQueueInterface;
    checkInSystem: CheckInInterface;
    dropManagement: DropManagementInterface;
    communicationTools: CommunicationInterface;
  };
}

interface RoundControlInterface {
  // Round State Management
  roundControls: {
    startRound: {
      button: "Start Round {number}";
      confirmationDialog: boolean;
      prerequisites: PrerequisiteChecklist;
    };
    generatePairings: {
      automatic: boolean;
      manualOverrides: boolean;
      preview: boolean;
    };
    endRound: {
      button: "End Round {number}";
      resultValidation: boolean;
      incompleteResults: IncompleteResultsHandler;
    };
  };

  // Live Monitoring
  liveMonitoring: {
    matchProgress: MatchProgressTracker;
    resultEntry: ResultEntryTracker;
    timeManagement: TimeManagementInterface;
    issueTracking: IssueTrackingInterface;
  };
}
```

### Mobile Tournament Experience

#### Mobile Live Tournament

```typescript
interface MobileLiveTournament {
  // Mobile-First Design
  layout: {
    stickyHeader: StickyTournamentHeader;
    swipeableCards: SwipeableContentCards;
    bottomNavigation: TournamentBottomNav;
    quickActions: FloatingActionButton;
  };

  // Gesture Controls
  gestureControls: {
    pullToRefresh: boolean;
    swipeForDetails: boolean;
    longPressActions: boolean;
  };

  // Notification Integration
  mobileNotifications: {
    pushNotifications: boolean;
    inAppNotifications: boolean;
    vibrationPatterns: boolean;
    soundAlerts: boolean;
  };
}

interface TournamentBottomNav {
  tabs: [
    {
      id: "status";
      label: "Status";
      icon: "activity";
      badge: boolean; // Show notification count
    },
    {
      id: "coaching";
      label: "Coaching";
      icon: "brain";
      premium: boolean;
    },
    {
      id: "standings";
      label: "Standings";
      icon: "trending-up";
      badge: false;
    },
    {
      id: "bracket";
      label: "Bracket";
      icon: "git-branch";
      badge: false;
    },
  ];

  styling: {
    position: "fixed";
    bottom: 0;
    safeAreaSupport: true;
    background: "var(--surface-elevated)";
    borderTop: "1px solid var(--border-neutral)";
  };
}
```

---

## 📱 Mobile-First Component Library

### Design System Specifications

#### 1. Typography Scale

```css
:root {
  /* Mobile-optimized typography */
  --text-xs: 0.75rem; /* 12px - Captions, labels */
  --text-sm: 0.875rem; /* 14px - Body text, descriptions */
  --text-base: 1rem; /* 16px - Default body text */
  --text-lg: 1.125rem; /* 18px - Subheadings */
  --text-xl: 1.25rem; /* 20px - Card titles */
  --text-2xl: 1.5rem; /* 24px - Section headers */
  --text-3xl: 1.875rem; /* 30px - Page titles */

  /* Line heights optimized for mobile reading */
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
}
```

#### 2. Touch Target Specifications

```css
/* Minimum touch targets for accessibility */
.touch-target {
  min-height: 44px; /* iOS recommendation */
  min-width: 44px;
  padding: 12px 16px;
  border-radius: 8px;

  /* Touch feedback */
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.touch-target:active {
  transform: scale(0.98);
  background-color: var(--surface-pressed);
}

/* Button sizing for different contexts */
.button-primary {
  height: 48px;
  padding: 0 24px;
  font-size: var(--text-base);
  font-weight: 600;
}

.button-secondary {
  height: 40px;
  padding: 0 16px;
  font-size: var(--text-sm);
  font-weight: 500;
}

.button-tertiary {
  height: 36px;
  padding: 0 12px;
  font-size: var(--text-sm);
  font-weight: 500;
}
```

#### 3. Spacing System

```css
:root {
  /* Spacing scale optimized for mobile */
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem; /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem; /* 16px */
  --space-5: 1.25rem; /* 20px */
  --space-6: 1.5rem; /* 24px */
  --space-8: 2rem; /* 32px */
  --space-10: 2.5rem; /* 40px */
  --space-12: 3rem; /* 48px */

  /* Container spacing */
  --container-padding: var(--space-4);
  --section-spacing: var(--space-8);
  --component-spacing: var(--space-6);
}

/* Responsive container */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--container-padding);
}

@media (min-width: 768px) {
  .container {
    padding: 0 var(--space-6);
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 0 var(--space-8);
  }
}
```

### Reusable Components

#### 1. Interactive Data Card

```typescript
interface DataCard {
  // Layout Configuration
  layout: {
    orientation: 'horizontal' | 'vertical';
    size: 'compact' | 'standard' | 'expanded';
    spacing: 'tight' | 'normal' | 'relaxed';
  };

  // Content Structure
  content: {
    header: CardHeader;
    body: CardBody;
    footer: CardFooter;
    actions: CardActions;
  };

  // Interaction States
  states: {
    default: CardDefaultState;
    hover: CardHoverState;
    active: CardActiveState;
    selected: CardSelectedState;
    disabled: CardDisabledState;
  };

  // Visual Properties
  styling: {
    background: string;
    border: string;
    borderRadius: string;
    shadow: string;
    transition: string;
  };
}

// Example Implementation
const PokemonUsageCard: React.FC<PokemonUsageCardProps> = ({
  pokemon,
  usageData,
  interactive = true,
  size = 'standard'
}) => {
  return (
    <div className={`data-card data-card--${size} ${interactive ? 'data-card--interactive' : ''}`}>
      <div className="data-card__header">
        <img src={pokemon.sprite} alt={pokemon.name} className="pokemon-sprite" />
        <div className="pokemon-info">
          <h3 className="pokemon-name">{pokemon.name}</h3>
          <span className="pokemon-types">
            {pokemon.types.map(type => (
              <TypeBadge key={type} type={type} />
            ))}
          </span>
        </div>
      </div>

      <div className="data-card__body">
        <div className="usage-metrics">
          <MetricDisplay
            label="Usage Rate"
            value={`${usageData.usage}%`}
            trend={usageData.trend}
            size="large"
          />
          <MetricDisplay
            label="Win Rate"
            value={`${usageData.winRate}%`}
            trend={usageData.winRateTrend}
            size="small"
          />
        </div>

        <UsageTrendChart data={usageData.history} compact />
      </div>

      {interactive && (
        <div className="data-card__actions">
          <Button variant="secondary" size="small">
            View Details
          </Button>
          <Button variant="ghost" size="small">
            Add to Compare
          </Button>
        </div>
      )}
    </div>
  );
};
```

#### 2. Interactive Chart Component

```typescript
interface InteractiveChart {
  // Chart Configuration
  config: {
    type: 'line' | 'area' | 'bar' | 'scatter';
    responsive: boolean;
    maintainAspectRatio: boolean;
    animation: ChartAnimation;
  };

  // Interaction Features
  interactions: {
    hover: HoverInteraction;
    click: ClickInteraction;
    selection: SelectionInteraction;
    zoom: ZoomInteraction;
    pan: PanInteraction;
  };

  // Mobile Optimizations
  mobileOptimizations: {
    touchThreshold: number;
    gestureSupport: boolean;
    responsiveElements: boolean;
    accessibilityLabels: boolean;
  };

  // Data Management
  dataHandling: {
    lazy: boolean;
    virtualization: boolean;
    updateStrategy: 'replace' | 'merge' | 'append';
    caching: boolean;
  };
}

// Example Implementation
const UsageTrendChart: React.FC<UsageTrendChartProps> = ({
  data,
  interactive = true,
  height = 300,
  onPointClick,
  onRangeSelect
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const [selectedRange, setSelectedRange] = useState<DateRange | null>(null);

  const chartConfig = useMemo(() => ({
    type: 'line' as const,
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        label: 'Usage Rate',
        data: data.map(d => d.usage),
        borderColor: 'var(--accent-primary)',
        backgroundColor: 'var(--accent-surface)',
        tension: 0.4,
        pointRadius: interactive ? 6 : 3,
        pointHoverRadius: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
      plugins: {
        tooltip: {
          enabled: interactive,
          backgroundColor: 'var(--surface-elevated)',
          titleColor: 'var(--text-primary)',
          bodyColor: 'var(--text-secondary)',
          borderColor: 'var(--border-neutral)',
          borderWidth: 1,
        },
        legend: {
          display: false, // Hide legend for mobile space efficiency
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            color: 'var(--border-subtle)',
          },
          ticks: {
            color: 'var(--text-secondary)',
            maxTicksLimit: 6, // Limit for mobile readability
          }
        },
        y: {
          display: true,
          grid: {
            color: 'var(--border-subtle)',
          },
          ticks: {
            color: 'var(--text-secondary)',
            callback: (value) => `${value}%`,
          }
        }
      },
      onClick: interactive ? handleChartClick : undefined,
    }
  }), [data, interactive]);

  const handleChartClick = useCallback((event: any, elements: any[]) => {
    if (elements.length > 0 && onPointClick) {
      const pointIndex = elements[0].index;
      onPointClick(data[pointIndex]);
    }
  }, [data, onPointClick]);

  return (
    <div className="interactive-chart" style={{ height }}>
      <Line ref={chartRef} data={chartConfig.data} options={chartConfig.options} />
      {selectedRange && (
        <div className="chart-selection-overlay">
          {/* Range selection visualization */}
        </div>
      )}
    </div>
  );
};
```

---

## 🎯 Implementation Guidelines

### Development Specifications

#### 1. Component Architecture

```typescript
// Base component interface
interface BaseComponent {
  className?: string;
  testId?: string;
  accessible?: boolean;
  responsive?: boolean;
}

// Interactive component interface
interface InteractiveComponent extends BaseComponent {
  disabled?: boolean;
  loading?: boolean;
  onInteraction?: (event: InteractionEvent) => void;
}

// Data component interface
interface DataComponent<T> extends BaseComponent {
  data: T;
  loading?: boolean;
  error?: Error | null;
  onDataChange?: (data: T) => void;
}
```

#### 2. State Management Patterns

```typescript
// Feature-level state management
interface FeatureState {
  // Data state
  data: FeatureData | null;
  loading: boolean;
  error: string | null;

  // UI state
  selectedItems: string[];
  filters: FilterState;
  viewMode: ViewMode;

  // User preferences
  preferences: UserPreferences;

  // Interaction state
  interactions: InteractionState;
}

// State update patterns
interface FeatureActions {
  // Data actions
  loadData: (params: LoadParams) => Promise<void>;
  refreshData: () => Promise<void>;
  updateData: (updates: Partial<FeatureData>) => void;

  // UI actions
  updateSelection: (items: string[]) => void;
  updateFilters: (filters: Partial<FilterState>) => void;
  changeViewMode: (mode: ViewMode) => void;

  // User actions
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  resetToDefaults: () => void;
}
```

#### 3. Performance Optimization

```typescript
// Component optimization strategies
const OptimizedComponent = memo(({ data, ...props }) => {
  // Memoize expensive calculations
  const processedData = useMemo(() =>
    processLargeDataset(data), [data]
  );

  // Debounce user interactions
  const debouncedSearch = useDebouncedCallback(
    (query: string) => onSearch(query),
    300
  );

  // Virtualize large lists
  const virtualizedItems = useVirtualization({
    items: processedData,
    itemHeight: 60,
    containerHeight: 400,
  });

  // Lazy load heavy components
  const HeavyComponent = lazy(() => import('./HeavyComponent'));

  return (
    <div className="optimized-component">
      {/* Optimized rendering */}
    </div>
  );
});

// Data fetching optimization
const useOptimizedData = (params: QueryParams) => {
  // Cache queries with React Query
  return useQuery({
    queryKey: ['feature-data', params],
    queryFn: () => fetchFeatureData(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};
```

### Accessibility Specifications

#### 1. Keyboard Navigation

```typescript
interface KeyboardNavigation {
  // Navigation patterns
  tabOrder: "sequential" | "logical" | "custom";
  focusManagement: "automatic" | "manual";
  skipLinks: boolean;

  // Keyboard shortcuts
  shortcuts: {
    [key: string]: KeyboardShortcut;
  };

  // Focus indicators
  focusIndicators: {
    visible: boolean;
    style: "outline" | "ring" | "custom";
    color: string;
  };
}

// Example keyboard navigation implementation
const useKeyboardNavigation = (items: NavigableItem[]) => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, items.length - 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          items[focusedIndex]?.onActivate();
          break;
        case "Escape":
          event.preventDefault();
          onEscape?.();
          break;
      }
    },
    [items, focusedIndex, onEscape]
  );

  return { focusedIndex, handleKeyDown };
};
```

#### 2. Screen Reader Support

```typescript
interface ScreenReaderSupport {
  // ARIA attributes
  ariaLabels: {
    [elementId: string]: string;
  };
  ariaDescriptions: {
    [elementId: string]: string;
  };
  ariaRoles: {
    [elementId: string]: string;
  };

  // Live regions
  liveRegions: {
    announcements: 'polite' | 'assertive';
    status: 'polite' | 'assertive';
    errors: 'polite' | 'assertive';
  };

  // Content structure
  headingHierarchy: boolean;
  landmarkRoles: boolean;
  semanticMarkup: boolean;
}

// Example screen reader implementation
const AccessibleDataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  caption,
  ...props
}) => {
  return (
    <table role="table" aria-label={caption}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr role="row">
          {columns.map((column, index) => (
            <th
              key={column.key}
              role="columnheader"
              aria-sort={column.sortable ? 'none' : undefined}
              tabIndex={column.sortable ? 0 : -1}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={row.id} role="row">
            {columns.map((column, colIndex) => (
              <td
                key={`${row.id}-${column.key}`}
                role="cell"
                aria-describedby={
                  colIndex === 0 ? `row-${rowIndex}-description` : undefined
                }
              >
                {renderCellContent(row[column.key], column)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

---

## 🎯 Success Metrics

### User Interface Metrics

- **Task Completion Rate**: 90%+ for core user flows
- **Time to Complete Tasks**: <3 minutes for common actions
- **Error Rate**: <5% user errors in critical flows
- **Accessibility Score**: WCAG 2.1 AA compliance (95%+)

### Performance Metrics

- **Page Load Time**: <2 seconds for initial load
- **Time to Interactive**: <3 seconds on mobile
- **Core Web Vitals**: All metrics in "Good" range
- **Offline Functionality**: Core features work offline

### User Experience Metrics

- **User Satisfaction**: 4.5+ stars for interface usability
- **Feature Discovery**: 70%+ discover key features within 30 days
- **Mobile Usage**: 60%+ of usage on mobile devices
- **Cross-Platform Consistency**: 95%+ feature parity across platforms

This comprehensive feature specification provides the detailed UI/UX guidelines needed to build Battle Stadium's revolutionary competitive Pokemon platform with consistent, accessible, and high-performance interfaces across all devices.
