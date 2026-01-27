> [!WARNING]
> **ARCHIVED DOCUMENT** — This is a brainstorming/research document from early development. The tech stack has changed (now Supabase, Tamagui, self-hosted PDS) and the project was renamed from "Battle Stadium" to "trainers.gg". Ideas have been extracted for Linear tickets. Kept for historical reference only.

# Replay Analysis Engine - Deep Dive

## 🏗️ Overview

This document provides detailed technical specifications for Battle Stadium's comprehensive replay analysis system. This includes automatic replay parsing, manual game input, scenario branching for "what if" analysis, and integration with personal performance tracking.

---

## 🎮 Replay Data Architecture

### Universal Game State Model

```typescript
interface GameState {
  gameId: string;
  format: GameFormat;
  players: [PlayerInGame, PlayerInGame];
  turns: Turn[];
  metadata: GameMetadata;
  source: DataSource;
  analysisResults?: AnalysisResults;
}

interface GameFormat {
  generation: number; // 9 for Scarlet/Violet
  ruleset: string; // "VGC2024RegI", "OU", etc.
  battleFormat: "singles" | "doubles";
  teamSize: number; // 6 for team, 4 for battle in VGC
}

interface PlayerInGame {
  playerId?: string; // null for anonymous games
  playerName: string;
  team: PokemonTeam;
  rating?: number;
  isUser: boolean; // true if this is the analyzing user
}

interface Turn {
  turnNumber: number;
  phase: "team_preview" | "battle" | "switch" | "game_end";
  playerActions: PlayerAction[];
  resultingState: BattleState;
  rngEvents: RNGEvent[];
  timestamp: Date;
}

interface PlayerAction {
  playerId: string;
  actionType: "move" | "switch" | "tera" | "forfeit";
  target?: string; // Pokemon or position target
  moveUsed?: string;
  pokemonSwitched?: string;
  teraType?: string;
}

interface RNGEvent {
  type:
    | "critical_hit"
    | "damage_roll"
    | "accuracy_check"
    | "speed_tie"
    | "secondary_effect";
  result: boolean | number;
  probability: number; // 0-1, for analysis purposes
  affectedPokemon: string;
  context: string;
}
```

### Multi-Source Data Integration

```typescript
interface DataSource {
  type:
    | "showdown_replay"
    | "manual_input"
    | "video_analysis"
    | "tournament_recording";
  reliability: number; // 0-1 confidence in data accuracy
  completeness: number; // 0-1 how much data is available
  originalSource: string; // URL, file path, etc.
  importedAt: Date;
  importedBy: string;
}

class UniversalReplayParser {
  // Parse replay data from any supported source
  async parseReplay(
    source: DataSource,
    rawData: string | File | VideoFile
  ): Promise<GameState> {
    switch (source.type) {
      case "showdown_replay":
        return await this.parseShowdownReplay(rawData as string);
      case "manual_input":
        return await this.parseManualInput(rawData as ManualGameData);
      case "video_analysis":
        return await this.parseVideoAnalysis(rawData as VideoFile);
      case "tournament_recording":
        return await this.parseTournamentRecording(rawData as string);
      default:
        throw new Error(`Unsupported data source type: ${source.type}`);
    }
  }

  private async parseShowdownReplay(replayData: string): Promise<GameState> {
    const lines = replayData.split("\n");
    const gameState: Partial<GameState> = {
      turns: [],
      metadata: { importedAt: new Date() },
    };

    let currentTurn: Partial<Turn> = {
      turnNumber: 0,
      playerActions: [],
      rngEvents: [],
    };

    for (const line of lines) {
      const parts = line.split("|");
      const messageType = parts[1];

      switch (messageType) {
        case "player":
          this.parsePlayerInfo(parts, gameState);
          break;
        case "teamsize":
          this.parseTeamSize(parts, gameState);
          break;
        case "start":
          this.initializeBattle(gameState);
          break;
        case "turn":
          if (currentTurn.turnNumber > 0) {
            gameState.turns!.push(currentTurn as Turn);
          }
          currentTurn = this.startNewTurn(parseInt(parts[2]));
          break;
        case "move":
          this.parseMove(parts, currentTurn);
          break;
        case "switch":
          this.parseSwitch(parts, currentTurn);
          break;
        case "-crit":
          this.parseCriticalHit(parts, currentTurn);
          break;
        case "-damage":
          this.parseDamage(parts, currentTurn);
          break;
        // ... additional parsing logic
      }
    }

    // Add final turn
    if (currentTurn.turnNumber > 0) {
      gameState.turns!.push(currentTurn as Turn);
    }

    return this.validateAndNormalizeGameState(gameState as GameState);
  }

  private parseMove(parts: string[], currentTurn: Partial<Turn>): void {
    const pokemon = parts[2];
    const move = parts[3];
    const target = parts[4];

    currentTurn.playerActions!.push({
      playerId: this.extractPlayerId(pokemon),
      actionType: "move",
      moveUsed: move,
      target: target,
    });
  }

  private parseCriticalHit(parts: string[], currentTurn: Partial<Turn>): void {
    const affectedPokemon = parts[2];

    currentTurn.rngEvents!.push({
      type: "critical_hit",
      result: true,
      probability: 1 / 24, // Standard crit rate
      affectedPokemon,
      context: "Move resulted in critical hit",
    });
  }
}
```

---

## ✏️ Manual Input System

### Interactive Game Builder

```typescript
interface ManualInputSession {
  sessionId: string;
  gameState: GameState;
  currentTurn: number;
  inputMode: "turn_by_turn" | "key_moments" | "scenario_testing";
  validationResults: ValidationResult[];
  autoSuggestions: AutoSuggestion[];
}

interface AutoSuggestion {
  type: "move_option" | "damage_estimate" | "speed_calculation" | "common_play";
  suggestion: string;
  confidence: number;
  reasoning: string;
}

class ManualInputEngine {
  // Create new manual input session
  async startManualInput(
    userId: string,
    initialSetup: GameSetup
  ): Promise<ManualInputSession> {
    const sessionId = this.generateSessionId();

    const gameState: GameState = {
      gameId: `manual_${sessionId}`,
      format: initialSetup.format,
      players: [
        {
          playerName: initialSetup.userPlayer.name,
          team: initialSetup.userPlayer.team,
          isUser: true,
        },
        {
          playerName: initialSetup.opponent.name,
          team: initialSetup.opponent.team,
          isUser: false,
        },
      ],
      turns: [],
      metadata: {
        createdAt: new Date(),
        createdBy: userId,
        inputType: "manual",
      },
      source: {
        type: "manual_input",
        reliability: 1.0,
        completeness: 0.0,
        originalSource: `manual_input_${sessionId}`,
        importedAt: new Date(),
        importedBy: userId,
      },
    };

    return {
      sessionId,
      gameState,
      currentTurn: 1,
      inputMode: "turn_by_turn",
      validationResults: [],
      autoSuggestions: await this.generateInitialSuggestions(gameState),
    };
  }

  // Add turn to manual input session
  async addTurn(
    sessionId: string,
    turnData: TurnInput
  ): Promise<ManualInputSession> {
    const session = await this.getSession(sessionId);

    // Validate turn input
    const validation = await this.validateTurnInput(
      turnData,
      session.gameState
    );
    if (!validation.isValid) {
      throw new ValidationError("Invalid turn input", validation.errors);
    }

    // Convert input to standardized turn format
    const turn = await this.convertInputToTurn(turnData, session.gameState);

    // Add to game state
    session.gameState.turns.push(turn);
    session.currentTurn++;

    // Generate suggestions for next turn
    session.autoSuggestions = await this.generateNextTurnSuggestions(
      session.gameState,
      session.currentTurn
    );

    // Update session
    await this.saveSession(session);

    return session;
  }

  private async generateNextTurnSuggestions(
    gameState: GameState,
    nextTurnNumber: number
  ): Promise<AutoSuggestion[]> {
    const suggestions: AutoSuggestion[] = [];
    const currentState = this.getBattleStateAtTurn(
      gameState,
      nextTurnNumber - 1
    );

    // Suggest common moves for current active Pokemon
    const activePokemon = currentState.activePokemon;
    for (const pokemon of activePokemon) {
      const commonMoves = await this.getCommonMovesForPokemon(
        pokemon.species,
        currentState.situation
      );

      for (const move of commonMoves) {
        suggestions.push({
          type: "move_option",
          suggestion: `${pokemon.species} use ${move.name}`,
          confidence: move.usageRate,
          reasoning: `${move.name} is used ${(move.usageRate * 100).toFixed(0)}% of the time in this situation`,
        });
      }
    }

    // Suggest damage estimates
    const damageEstimates = await this.calculatePotentialDamage(currentState);
    for (const estimate of damageEstimates) {
      suggestions.push({
        type: "damage_estimate",
        suggestion: `${estimate.move} likely deals ${estimate.damageRange}%`,
        confidence: 0.8,
        reasoning: "Based on standard damage calculation",
      });
    }

    return suggestions;
  }
}
```

### Smart Input Validation

```typescript
interface ValidationRule {
  name: string;
  validate: (turnData: TurnInput, gameState: GameState) => ValidationResult;
  severity: "error" | "warning" | "info";
}

class InputValidator {
  private rules: ValidationRule[] = [
    {
      name: "legal_moves",
      validate: this.validateLegalMoves.bind(this),
      severity: "error",
    },
    {
      name: "speed_order",
      validate: this.validateSpeedOrder.bind(this),
      severity: "warning",
    },
    {
      name: "damage_realistic",
      validate: this.validateDamageRealistic.bind(this),
      severity: "warning",
    },
    {
      name: "tera_usage",
      validate: this.validateTeraUsage.bind(this),
      severity: "error",
    },
  ];

  async validateTurnInput(
    turnData: TurnInput,
    gameState: GameState
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const infos: ValidationInfo[] = [];

    for (const rule of this.rules) {
      try {
        const result = rule.validate(turnData, gameState);

        switch (rule.severity) {
          case "error":
            errors.push(...result.errors);
            break;
          case "warning":
            warnings.push(...result.warnings);
            break;
          case "info":
            infos.push(...result.infos);
            break;
        }
      } catch (error) {
        errors.push({
          rule: rule.name,
          message: `Validation rule failed: ${error.message}`,
          field: "system",
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      infos,
    };
  }

  private validateLegalMoves(
    turnData: TurnInput,
    gameState: GameState
  ): ValidationResult {
    const errors: ValidationError[] = [];

    for (const action of turnData.playerActions) {
      if (action.actionType === "move") {
        const pokemon = this.findPokemon(action.playerId, gameState);
        if (!pokemon) {
          errors.push({
            rule: "legal_moves",
            message: `Pokemon not found for player ${action.playerId}`,
            field: "pokemon",
          });
          continue;
        }

        const knowsMove = pokemon.moves.includes(action.moveUsed!);
        if (!knowsMove) {
          errors.push({
            rule: "legal_moves",
            message: `${pokemon.species} does not know ${action.moveUsed}`,
            field: "move",
          });
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings: [], infos: [] };
  }

  private validateDamageRealistic(
    turnData: TurnInput,
    gameState: GameState
  ): ValidationResult {
    const warnings: ValidationWarning[] = [];

    for (const damage of turnData.damageEvents || []) {
      const damagePercent =
        (damage.finalHP - damage.startingHP) / damage.startingHP;

      // Check if damage seems unrealistic
      if (Math.abs(damagePercent) > 1.2) {
        // More than 120% damage
        warnings.push({
          rule: "damage_realistic",
          message: `Damage of ${(damagePercent * 100).toFixed(0)}% seems unusually high`,
          field: "damage",
          suggestion:
            "Double-check damage calculation or consider if this was a critical hit",
        });
      }

      if (Math.abs(damagePercent) < 0.05 && damage.moveUsed) {
        // Less than 5% damage
        warnings.push({
          rule: "damage_realistic",
          message: `Very low damage from ${damage.moveUsed}`,
          field: "damage",
          suggestion: "Confirm this move choice and damage amount",
        });
      }
    }

    return { isValid: true, errors: [], warnings, infos: [] };
  }
}
```

---

## 🌿 Scenario Branching System

### Decision Point Analysis

```typescript
interface DecisionPoint {
  gameId: string;
  turnNumber: number;
  playerId: string;
  decisionType:
    | "move_choice"
    | "switch_choice"
    | "tera_choice"
    | "target_choice";
  availableOptions: DecisionOption[];
  actualChoice: DecisionOption;
  situationContext: SituationContext;
  alternativeOutcomes?: AlternativeOutcome[];
}

interface DecisionOption {
  optionId: string;
  type: "move" | "switch" | "tera";
  description: string;
  details: {
    moveName?: string;
    targetPokemon?: string;
    switchToPokemon?: string;
    teraType?: string;
  };
  estimatedOutcome: OutcomeEstimate;
}

interface AlternativeOutcome {
  option: DecisionOption;
  projectedResult: GameProjection;
  confidence: number;
  reasoningChain: string[];
}

class DecisionPointAnalyzer {
  // Identify critical decision points in a game
  async identifyDecisionPoints(gameState: GameState): Promise<DecisionPoint[]> {
    const decisionPoints: DecisionPoint[] = [];

    for (let i = 0; i < gameState.turns.length; i++) {
      const turn = gameState.turns[i];
      const situationContext = await this.analyzeSituation(gameState, i);

      // Analyze each player action for decision significance
      for (const action of turn.playerActions) {
        const significance = await this.calculateDecisionSignificance(
          action,
          situationContext,
          gameState,
          i
        );

        if (significance.isCritical) {
          const availableOptions = await this.reconstructAvailableOptions(
            action,
            situationContext,
            gameState
          );

          decisionPoints.push({
            gameId: gameState.gameId,
            turnNumber: turn.turnNumber,
            playerId: action.playerId,
            decisionType: this.categorizeDecision(action),
            availableOptions,
            actualChoice: this.convertActionToOption(action),
            situationContext,
          });
        }
      }
    }

    return decisionPoints.sort(
      (a, b) =>
        b.situationContext.criticalityScore -
        a.situationContext.criticalityScore
    );
  }

  // Generate alternative scenarios for a decision point
  async generateAlternativeScenarios(
    decisionPoint: DecisionPoint,
    gameState: GameState
  ): Promise<AlternativeOutcome[]> {
    const alternatives: AlternativeOutcome[] = [];

    for (const option of decisionPoint.availableOptions) {
      if (option.optionId === decisionPoint.actualChoice.optionId) {
        continue; // Skip the actual choice
      }

      try {
        const projectedResult = await this.projectAlternativeOutcome(
          option,
          decisionPoint,
          gameState
        );

        alternatives.push({
          option,
          projectedResult,
          confidence: this.calculateProjectionConfidence(option, decisionPoint),
          reasoningChain: await this.generateReasoningChain(
            option,
            projectedResult
          ),
        });
      } catch (error) {
        console.warn(
          `Failed to project outcome for option ${option.optionId}:`,
          error
        );
      }
    }

    return alternatives.sort((a, b) => b.confidence - a.confidence);
  }

  private async projectAlternativeOutcome(
    option: DecisionOption,
    decisionPoint: DecisionPoint,
    gameState: GameState
  ): Promise<GameProjection> {
    // Create modified game state with alternative decision
    const modifiedState = await this.createModifiedGameState(
      gameState,
      decisionPoint,
      option
    );

    // Project likely outcomes based on:
    // 1. Immediate consequences (damage, KOs, positioning)
    // 2. Follow-up turn implications
    // 3. Overall game trajectory changes

    const immediateConsequences = await this.calculateImmediateConsequences(
      option,
      decisionPoint.situationContext
    );

    const followUpImplications = await this.projectFollowUpTurns(
      modifiedState,
      decisionPoint.turnNumber,
      3 // Project 3 turns ahead
    );

    const gameTrajectoryChange = await this.assessTrajectoryChange(
      gameState,
      modifiedState,
      decisionPoint.turnNumber
    );

    return {
      immediateConsequences,
      followUpImplications,
      gameTrajectoryChange,
      winProbabilityChange: this.calculateWinProbabilityChange(
        gameState,
        modifiedState
      ),
      projectionConfidence: this.calculateProjectionConfidence(
        option,
        decisionPoint
      ),
    };
  }
}
```

### RNG Scenario Modification

```typescript
interface RNGModification {
  turnNumber: number;
  eventType: "critical_hit" | "damage_roll" | "accuracy_check" | "speed_tie";
  originalResult: boolean | number;
  modifiedResult: boolean | number;
  impactAssessment: ImpactAssessment;
}

interface ImpactAssessment {
  immediateImpact: "none" | "minor" | "moderate" | "major" | "game_changing";
  cascadingEffects: CascadingEffect[];
  winProbabilityShift: number; // -1 to 1
  learningValue: "low" | "medium" | "high";
}

class RNGScenarioEngine {
  // Modify RNG outcomes and analyze impact
  async modifyRNGOutcome(
    gameState: GameState,
    turnNumber: number,
    rngEvent: RNGEvent,
    newOutcome: boolean | number
  ): Promise<RNGModification> {
    const originalOutcome = rngEvent.result;

    // Create modified game state
    const modifiedGameState = await this.createRNGModifiedState(
      gameState,
      turnNumber,
      rngEvent,
      newOutcome
    );

    // Analyze impact of the change
    const impactAssessment = await this.assessRNGImpact(
      gameState,
      modifiedGameState,
      turnNumber,
      rngEvent
    );

    return {
      turnNumber,
      eventType: rngEvent.type,
      originalResult: originalOutcome,
      modifiedResult: newOutcome,
      impactAssessment,
    };
  }

  private async assessRNGImpact(
    originalState: GameState,
    modifiedState: GameState,
    turnNumber: number,
    rngEvent: RNGEvent
  ): Promise<ImpactAssessment> {
    // Compare game states to assess impact
    const immediateImpact = this.assessImmediateImpact(
      originalState,
      modifiedState,
      turnNumber
    );

    const cascadingEffects = await this.identifyCascadingEffects(
      originalState,
      modifiedState,
      turnNumber
    );

    const winProbabilityShift = await this.calculateWinProbabilityShift(
      originalState,
      modifiedState,
      turnNumber
    );

    const learningValue = this.assessLearningValue(
      immediateImpact,
      cascadingEffects,
      winProbabilityShift
    );

    return {
      immediateImpact,
      cascadingEffects,
      winProbabilityShift,
      learningValue,
    };
  }

  // Generate common RNG "what if" scenarios
  async generateCommonRNGScenarios(
    gameState: GameState
  ): Promise<RNGScenarioSuggestion[]> {
    const suggestions: RNGScenarioSuggestion[] = [];

    // Find all RNG events in the game
    const allRNGEvents = this.extractAllRNGEvents(gameState);

    for (const event of allRNGEvents) {
      // Suggest common modifications
      switch (event.type) {
        case "critical_hit":
          if (event.result === true) {
            suggestions.push({
              description: `What if ${event.affectedPokemon} didn't get a critical hit?`,
              modification: {
                turnNumber: event.turnNumber,
                eventType: "critical_hit",
                newResult: false,
              },
              expectedImpact: "moderate",
              learningValue: "high",
            });
          }
          break;

        case "damage_roll":
          const damageRoll = event.result as number;
          if (damageRoll < 0.9) {
            // Low roll
            suggestions.push({
              description: `What if ${event.affectedPokemon} took average damage instead of low roll?`,
              modification: {
                turnNumber: event.turnNumber,
                eventType: "damage_roll",
                newResult: 0.925, // Average damage
              },
              expectedImpact: "minor",
              learningValue: "medium",
            });
          }
          break;

        case "accuracy_check":
          if (event.result === false) {
            // Move missed
            suggestions.push({
              description: `What if that move had hit instead of missing?`,
              modification: {
                turnNumber: event.turnNumber,
                eventType: "accuracy_check",
                newResult: true,
              },
              expectedImpact: "major",
              learningValue: "high",
            });
          }
          break;
      }
    }

    return suggestions.sort((a, b) => {
      const impactWeight = {
        minor: 1,
        moderate: 2,
        major: 3,
        game_changing: 4,
      };
      const learningWeight = { low: 1, medium: 2, high: 3 };

      const scoreA =
        impactWeight[a.expectedImpact] * learningWeight[a.learningValue];
      const scoreB =
        impactWeight[b.expectedImpact] * learningWeight[b.learningValue];

      return scoreB - scoreA;
    });
  }
}
```

---

## 📈 Personal Performance Integration

### Replay-Based Learning Analytics

```typescript
interface ReplayLearningInsights {
  playerId: string;
  gameId: string;
  decisionPatterns: DecisionPattern[];
  improvementOpportunities: ImprovementOpportunity[];
  strengthAreas: StrengthArea[];
  practiceRecommendations: PracticeRecommendation[];
}

interface DecisionPattern {
  pattern: string;
  frequency: number;
  averageOutcome: number; // 0-1, where 1 is optimal
  situationContext: string[];
  improvementSuggestion?: string;
}

class ReplayLearningAnalyzer {
  // Analyze replay for personal learning insights
  async analyzeReplayForLearning(
    gameState: GameState,
    playerId: string
  ): Promise<ReplayLearningInsights> {
    const playerActions = this.extractPlayerActions(gameState, playerId);
    const decisionPoints = await this.identifyPlayerDecisionPoints(
      gameState,
      playerId
    );

    return {
      playerId,
      gameId: gameState.gameId,
      decisionPatterns: await this.identifyDecisionPatterns(
        playerActions,
        decisionPoints
      ),
      improvementOpportunities:
        await this.identifyImprovementOpportunities(decisionPoints),
      strengthAreas: await this.identifyStrengthAreas(decisionPoints),
      practiceRecommendations: await this.generatePracticeRecommendations(
        decisionPoints,
        gameState
      ),
    };
  }

  private async identifyDecisionPatterns(
    actions: PlayerAction[],
    decisionPoints: DecisionPoint[]
  ): Promise<DecisionPattern[]> {
    const patterns: Map<string, DecisionPatternData> = new Map();

    for (const decision of decisionPoints) {
      const patternKey = this.generatePatternKey(decision);

      if (!patterns.has(patternKey)) {
        patterns.set(patternKey, {
          pattern: patternKey,
          occurrences: [],
          contexts: new Set(),
        });
      }

      const patternData = patterns.get(patternKey)!;
      patternData.occurrences.push({
        decision,
        outcome: await this.evaluateDecisionOutcome(decision),
      });
      patternData.contexts.add(decision.situationContext.situationType);
    }

    // Convert to final pattern format
    const finalPatterns: DecisionPattern[] = [];

    for (const [patternKey, data] of patterns) {
      const averageOutcome =
        data.occurrences.reduce((sum, occ) => sum + occ.outcome, 0) /
        data.occurrences.length;

      finalPatterns.push({
        pattern: patternKey,
        frequency: data.occurrences.length,
        averageOutcome,
        situationContext: Array.from(data.contexts),
        improvementSuggestion:
          averageOutcome < 0.6
            ? await this.generateImprovementSuggestion(patternKey, data)
            : undefined,
      });
    }

    return finalPatterns.sort((a, b) => b.frequency - a.frequency);
  }

  private async identifyImprovementOpportunities(
    decisionPoints: DecisionPoint[]
  ): Promise<ImprovementOpportunity[]> {
    const opportunities: ImprovementOpportunity[] = [];

    // Group decisions by type and analyze performance
    const decisionsByType = this.groupDecisionsByType(decisionPoints);

    for (const [decisionType, decisions] of decisionsByType) {
      const suboptimalDecisions = decisions.filter((d) =>
        this.isSuboptimalDecision(d)
      );

      if (suboptimalDecisions.length > 0) {
        const frequency = suboptimalDecisions.length / decisions.length;

        if (frequency > 0.3) {
          // 30% or more suboptimal decisions
          opportunities.push({
            type: "decision_making",
            area: decisionType,
            frequency,
            description: `${(frequency * 100).toFixed(0)}% of ${decisionType} decisions were suboptimal`,
            specificExamples: suboptimalDecisions.slice(0, 3),
            practiceRecommendation: await this.generatePracticeRecommendation(
              decisionType,
              suboptimalDecisions
            ),
          });
        }
      }
    }

    return opportunities.sort((a, b) => b.frequency - a.frequency);
  }

  // Generate specific practice recommendations
  private async generatePracticeRecommendations(
    decisionPoints: DecisionPoint[],
    gameState: GameState
  ): Promise<PracticeRecommendation[]> {
    const recommendations: PracticeRecommendation[] = [];

    // Analyze recurring mistakes
    const mistakes = await this.identifyRecurringMistakes(decisionPoints);

    for (const mistake of mistakes) {
      switch (mistake.category) {
        case "speed_calculation":
          recommendations.push({
            type: "skill_practice",
            title: "Speed Calculation Practice",
            description: "Practice calculating speed tiers and turn order",
            difficulty: "medium",
            estimatedTime: "15-30 minutes",
            specificScenarios: await this.generateSpeedScenarios(
              mistake.examples
            ),
          });
          break;

        case "damage_calculation":
          recommendations.push({
            type: "knowledge_building",
            title: "Damage Range Familiarity",
            description: "Learn common damage ranges for key matchups",
            difficulty: "medium",
            estimatedTime: "20-40 minutes",
            specificScenarios: await this.generateDamageScenarios(
              mistake.examples
            ),
          });
          break;

        case "positioning":
          recommendations.push({
            type: "strategic_practice",
            title: "Positioning and Setup Practice",
            description: "Practice recognizing good positioning opportunities",
            difficulty: "hard",
            estimatedTime: "30-60 minutes",
            specificScenarios: await this.generatePositioningScenarios(
              mistake.examples
            ),
          });
          break;
      }
    }

    return recommendations;
  }
}
```

### Cross-Game Pattern Recognition

```typescript
interface CrossGameAnalysis {
  playerId: string;
  timeframe: TimeRange;
  consistentPatterns: ConsistentPattern[];
  improvingAreas: ImprovingArea[];
  regressingAreas: RegressingArea[];
  overallTrends: PerformanceTrend[];
}

class CrossGamePatternAnalyzer {
  // Analyze patterns across multiple games
  async analyzeCrossGamePatterns(
    playerId: string,
    gameStates: GameState[],
    timeframe: TimeRange
  ): Promise<CrossGameAnalysis> {
    const gameAnalyses = await Promise.all(
      gameStates.map((game) => this.analyzeGameForPatterns(game, playerId))
    );

    return {
      playerId,
      timeframe,
      consistentPatterns: await this.identifyConsistentPatterns(gameAnalyses),
      improvingAreas: await this.identifyImprovingAreas(
        gameAnalyses,
        timeframe
      ),
      regressingAreas: await this.identifyRegressingAreas(
        gameAnalyses,
        timeframe
      ),
      overallTrends: await this.calculateOverallTrends(gameAnalyses, timeframe),
    };
  }

  private async identifyConsistentPatterns(
    analyses: GameAnalysis[]
  ): Promise<ConsistentPattern[]> {
    const patternOccurrences: Map<string, PatternOccurrence[]> = new Map();

    // Collect all patterns across games
    for (const analysis of analyses) {
      for (const pattern of analysis.decisionPatterns) {
        if (!patternOccurrences.has(pattern.pattern)) {
          patternOccurrences.set(pattern.pattern, []);
        }

        patternOccurrences.get(pattern.pattern)!.push({
          gameId: analysis.gameId,
          frequency: pattern.frequency,
          outcome: pattern.averageOutcome,
          date: analysis.gameDate,
        });
      }
    }

    // Identify patterns that appear consistently
    const consistentPatterns: ConsistentPattern[] = [];

    for (const [pattern, occurrences] of patternOccurrences) {
      const appearanceRate = occurrences.length / analyses.length;

      if (appearanceRate >= 0.6) {
        // Appears in 60%+ of games
        const averageOutcome =
          occurrences.reduce((sum, occ) => sum + occ.outcome, 0) /
          occurrences.length;

        const outcomeStability = this.calculateStability(
          occurrences.map((occ) => occ.outcome)
        );

        consistentPatterns.push({
          pattern,
          appearanceRate,
          averageOutcome,
          stability: outcomeStability,
          isPositive: averageOutcome >= 0.7,
          recommendation: this.generatePatternRecommendation(
            pattern,
            averageOutcome,
            appearanceRate
          ),
        });
      }
    }

    return consistentPatterns.sort(
      (a, b) => b.appearanceRate - a.appearanceRate
    );
  }
}
```

---

## 🔧 Browser Extension Integration

### One-Click Replay Capture

```typescript
interface BrowserExtension {
  replayDetector: ReplayDetector;
  captureEngine: CaptureEngine;
  battleStadiumConnector: BattleStadiumConnector;
}

class ShowdownReplayCapture {
  // Detect when user is on a Showdown replay page
  detectReplayPage(): boolean {
    const url = window.location.href;
    const replayPattern =
      /^https?:\/\/replay\.pokemonshowdown\.com\/[^\/]+-\d+$/;
    return replayPattern.test(url);
  }

  // Add Battle Stadium capture button to replay page
  injectCaptureButton(): void {
    if (!this.detectReplayPage()) return;

    // Create Battle Stadium button
    const button = document.createElement("button");
    button.innerHTML = `
      <img src="chrome-extension://${chrome.runtime.id}/icons/battle-stadium-16.png" alt="Battle Stadium">
      Upload to Battle Stadium
    `;
    button.className = "battle-stadium-capture-btn";
    button.onclick = () => this.captureReplay();

    // Find appropriate location to inject button
    const controlsDiv =
      document.querySelector(".replay-controls") ||
      document.querySelector(".battle-controls");

    if (controlsDiv) {
      controlsDiv.appendChild(button);
    }
  }

  // Capture replay data and send to Battle Stadium
  async captureReplay(): Promise<void> {
    try {
      // Extract replay data from page
      const replayData = this.extractReplayData();

      // Get user authentication from Battle Stadium
      const authToken = await this.getBattleStadiumAuth();

      if (!authToken) {
        this.showLoginPrompt();
        return;
      }

      // Send to Battle Stadium
      const result = await this.sendToBattleStadium(replayData, authToken);

      if (result.success) {
        this.showSuccessNotification(result.replayId);
      } else {
        this.showErrorNotification(result.error);
      }
    } catch (error) {
      console.error("Replay capture failed:", error);
      this.showErrorNotification("Failed to capture replay");
    }
  }

  private extractReplayData(): string {
    // Get replay log from Showdown page
    const logElement = document.querySelector('script[type="text/plain"]');
    if (!logElement) {
      throw new Error("Could not find replay log on page");
    }

    return logElement.textContent || "";
  }

  private async sendToBattleStadium(
    replayData: string,
    authToken: string
  ): Promise<CaptureResult> {
    const response = await fetch(
      "https://battlestadium.com/api/replays/import",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          source: "showdown_replay",
          data: replayData,
          url: window.location.href,
        }),
      }
    );

    return await response.json();
  }

  private showSuccessNotification(replayId: string): void {
    // Create success notification
    const notification = document.createElement("div");
    notification.className = "battle-stadium-notification success";
    notification.innerHTML = `
      <div class="notification-content">
        <strong>✅ Replay uploaded successfully!</strong>
        <p>View analysis on <a href="https://battlestadium.com/replays/${replayId}" target="_blank">Battle Stadium</a></p>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => notification.remove(), 5000);
  }
}
```

---

## 📊 Implementation Roadmap

### Phase 1: Core Replay Processing (Month 1)

- Universal game state model
- Showdown replay parser
- Basic manual input system
- Data validation framework

### Phase 2: Decision Analysis (Month 2)

- Decision point identification
- Alternative scenario generation
- RNG modification system
- Browser extension for Showdown

### Phase 3: Learning Analytics (Month 3)

- Personal performance integration
- Pattern recognition across games
- Practice recommendation engine
- Advanced manual input UX

### Phase 4: Advanced Analysis (Month 4)

- Sophisticated scenario branching
- Cross-game trend analysis
- Integration with live tournament coaching
- Export capabilities for coaches

---

## 🎯 Success Metrics

### Technical Performance

- **Replay Processing Speed**: <5 seconds for Showdown replay analysis
- **Manual Input Efficiency**: Complete game input in <10 minutes
- **Data Accuracy**: >95% accuracy in replay parsing and validation
- **Browser Extension Adoption**: 40%+ of users install extension

### User Experience

- **Analysis Usefulness**: >4.5/5 user rating for replay insights
- **Manual Input Adoption**: 30%+ of users try manual input feature
- **Learning Value**: Users report 20%+ improvement from practice recommendations
- **Engagement**: 60%+ of users regularly upload replays for analysis

### Business Impact

- **Feature Differentiation**: Unique manual input capability vs all competitors
- **User Retention**: 75%+ retention for users who regularly use replay analysis
- **Premium Conversion**: 25%+ conversion driven by advanced replay features
- **Coach Adoption**: Integration into 50%+ of partnered coaching sessions

This replay analysis engine provides the technical foundation for Battle Stadium's revolutionary game analysis capabilities, including the unique ability to analyze any Pokemon game from any platform.
