> [!WARNING]
> **ARCHIVED DOCUMENT** — This is a brainstorming/research document from early development. The tech stack has changed (now Supabase, Tamagui, self-hosted PDS) and the project was renamed from "Battle Stadium" to "trainers.gg". Ideas have been extracted for Linear tickets. Kept for historical reference only.

# User Experience Flows - Deep Dive

## 🏗️ Overview

This document maps the complete user journey through Battle Stadium, from initial discovery to achieving competitive Pokemon goals. It covers onboarding flows, feature discovery, skill progression, and the path to tournament success.

---

## 🎯 User Personas & Journey Mapping

### Primary User Personas

```typescript
interface UserPersona {
  name: string;
  competitiveLevel: "beginner" | "intermediate" | "advanced" | "expert";
  primaryGoals: string[];
  painPoints: string[];
  currentTools: string[];
  timeInvestment: string;
}

const userPersonas: UserPersona[] = [
  {
    name: "Casey - Tournament Beginner",
    competitiveLevel: "beginner",
    primaryGoals: [
      "Learn competitive Pokemon basics",
      "Attend first local tournament",
      "Build a viable team",
      "Make friends in community",
    ],
    painPoints: [
      "Overwhelmed by complexity",
      "Doesn't know what to practice",
      "Afraid of being bad at tournaments",
      "Limited time for learning",
    ],
    currentTools: ["Pokemon Showdown occasionally", "YouTube guides"],
    timeInvestment: "3-5 hours per week",
  },
  {
    name: "Alex - Improvement Focused",
    competitiveLevel: "intermediate",
    primaryGoals: [
      "Make Day 2 at regionals",
      "Improve win rate vs specific archetypes",
      "Understand meta deeply",
      "Build consistent tournament results",
    ],
    painPoints: [
      "Knows they make mistakes but can't identify them",
      "Inconsistent tournament performance",
      "Struggles with advanced strategies",
      "Hard to get quality practice",
    ],
    currentTools: ["Pokemon Showdown", "PASRs", "Tournament Discord servers"],
    timeInvestment: "10-15 hours per week",
  },
  {
    name: "Morgan - Competitive Elite",
    competitiveLevel: "expert",
    primaryGoals: [
      "Qualify for World Championships",
      "Win regional tournaments",
      "Stay ahead of meta shifts",
      "Optimize every aspect of play",
    ],
    painPoints: [
      "Needs cutting-edge analysis tools",
      "Hard to find worthy practice opponents",
      "Meta shifts quickly",
      "Looking for any competitive edge",
    ],
    currentTools: [
      "Full competitive toolkit",
      "Coaching",
      "Team analysis software",
    ],
    timeInvestment: "20+ hours per week",
  },
];
```

### Journey Stage Mapping

```typescript
interface JourneyStage {
  stage: string;
  description: string;
  userNeeds: string[];
  keyActions: string[];
  successMetrics: string[];
  potentialFriction: string[];
}

const journeyStages: JourneyStage[] = [
  {
    stage: "Discovery",
    description: "User learns about Battle Stadium",
    userNeeds: [
      "Understand value proposition",
      "See if it's for their skill level",
    ],
    keyActions: ["Visit landing page", "Read about features", "See examples"],
    successMetrics: [
      "Time on page >2 minutes",
      "Feature page visits",
      "Sign-up conversion",
    ],
    potentialFriction: [
      "Unclear value prop",
      "Looks too advanced",
      "Too complex",
    ],
  },
  {
    stage: "Onboarding",
    description: "User creates account and sets up profile",
    userNeeds: ["Quick setup", "Personalized experience", "Clear next steps"],
    keyActions: [
      "Create account",
      "Set goals",
      "Complete profile",
      "First feature usage",
    ],
    successMetrics: [
      "Profile completion rate",
      "Goal setting rate",
      "First feature use",
    ],
    potentialFriction: [
      "Long setup process",
      "Unclear benefits",
      "Complex interface",
    ],
  },
  {
    stage: "First Value",
    description: "User experiences core value for the first time",
    userNeeds: ["Quick win", "Relevant insights", "Clear value demonstration"],
    keyActions: [
      "Upload first replay",
      "Get analysis",
      "See personal insights",
    ],
    successMetrics: [
      "First replay upload",
      "Analysis engagement",
      "Return visit",
    ],
    potentialFriction: [
      "No immediate value",
      "Confusing analysis",
      "Technical issues",
    ],
  },
  {
    stage: "Habit Formation",
    description: "User develops regular usage patterns",
    userNeeds: [
      "Regular value",
      "Progressive improvement",
      "Routine integration",
    ],
    keyActions: [
      "Weekly replay uploads",
      "Tournament participation",
      "Goal tracking",
    ],
    successMetrics: [
      "Weekly active usage",
      "Multiple feature adoption",
      "Goal progress",
    ],
    potentialFriction: [
      "Value diminishes",
      "Too time-consuming",
      "Feature confusion",
    ],
  },
  {
    stage: "Growth & Success",
    description: "User achieves competitive goals with Battle Stadium",
    userNeeds: [
      "Advanced features",
      "Community connection",
      "Continued challenges",
    ],
    keyActions: [
      "Premium upgrade",
      "Tournament success",
      "Community participation",
    ],
    successMetrics: [
      "Tournament wins",
      "Premium conversion",
      "Community engagement",
    ],
    potentialFriction: [
      "Feature limitations",
      "Cost concerns",
      "Plateau in improvement",
    ],
  },
];
```

---

## 🚀 Onboarding Experience

### Welcome Flow Design

```typescript
interface OnboardingStep {
  stepNumber: number;
  title: string;
  purpose: string;
  userActions: string[];
  personalization: PersonalizationOptions;
  exitCriteria: string[];
}

const onboardingSteps: OnboardingStep[] = [
  {
    stepNumber: 1,
    title: "Welcome to Battle Stadium",
    purpose: "Set expectations and capture excitement",
    userActions: [
      "See value proposition video",
      'Choose "Get Started" path',
      "Select primary interest area",
    ],
    personalization: {
      interestAreas: [
        "I want to get better at tournaments",
        "I want to analyze my games",
        "I want to host tournaments",
        "I want to track the meta",
      ],
    },
    exitCriteria: ["Interest area selected", "Engagement >30 seconds"],
  },
  {
    stepNumber: 2,
    title: "Tell Us About Your Journey",
    purpose: "Personalize experience based on skill level and goals",
    userActions: [
      "Select current skill level",
      "Choose primary competitive goal",
      "Indicate time investment",
      "Share current tools used",
    ],
    personalization: {
      skillLevels: [
        "Just getting started",
        "Play casually",
        "Attend tournaments",
        "Serious competitor",
      ],
      goals: [
        "Learn basics",
        "Win locally",
        "Make Day 2",
        "Qualify for Worlds",
      ],
      timeCommitment: [
        "1-3 hours/week",
        "4-8 hours/week",
        "9-15 hours/week",
        "16+ hours/week",
      ],
    },
    exitCriteria: ["Profile preferences set", "Goal selected"],
  },
  {
    stepNumber: 3,
    title: "Connect Your Competitive Identity",
    purpose: "Link existing competitive presence for personalization",
    userActions: [
      "Optionally claim IRL tournament results",
      "Connect Showdown account",
      "Set display preferences",
      "Create additional profiles if desired",
    ],
    personalization: {
      identityLinking: [
        "Link Showdown ladder",
        "Claim tournament results",
        "Create anonymous profiles",
      ],
      privacySettings: ["Public profile", "Friends only", "Private"],
    },
    exitCriteria: ["At least one identity connected OR explicitly skipped"],
  },
  {
    stepNumber: 4,
    title: "Your First Battle Stadium Experience",
    purpose: "Immediate value demonstration through guided first use",
    userActions: [
      "Upload first replay OR input manual game",
      "See personalized analysis",
      "Explore key insights",
      "Set up notification preferences",
    ],
    personalization: {
      firstExperience: [
        "Recent tournament game",
        "Practice game",
        "Hypothetical scenario",
      ],
      analysisDepth: [
        "Basic insights",
        "Detailed analysis",
        "Learning focused",
      ],
    },
    exitCriteria: ["First analysis completed", "Key insight reviewed"],
  },
];
```

### Skill-Level Adaptive Onboarding

```typescript
class AdaptiveOnboardingEngine {
  // Customize onboarding based on user's skill level and goals
  generatePersonalizedOnboarding(userProfile: UserProfile): OnboardingPlan {
    const plan: OnboardingPlan = {
      userId: userProfile.id,
      estimatedDuration: this.calculateDuration(userProfile),
      customizedSteps: [],
      featurePriority: this.determineFeaturePriority(userProfile),
      successMilestones: this.defineSuccessMilestones(userProfile),
    };

    // Adapt steps based on skill level
    switch (userProfile.skillLevel) {
      case "beginner":
        plan.customizedSteps = this.createBeginnerFlow(userProfile);
        break;
      case "intermediate":
        plan.customizedSteps = this.createIntermediateFlow(userProfile);
        break;
      case "advanced":
        plan.customizedSteps = this.createAdvancedFlow(userProfile);
        break;
      case "expert":
        plan.customizedSteps = this.createExpertFlow(userProfile);
        break;
    }

    return plan;
  }

  private createBeginnerFlow(profile: UserProfile): CustomOnboardingStep[] {
    return [
      {
        ...onboardingSteps[0],
        customContent: {
          headline: "Your Pokemon Journey Starts Here",
          description:
            "Battle Stadium helps new players learn competitive Pokemon step by step",
          videoContent: "beginner_welcome_video.mp4",
          emphasize: ["Learning focus", "Friendly community", "No judgment"],
        },
      },
      {
        ...onboardingSteps[1],
        customContent: {
          goalOptions: [
            "Learn competitive basics",
            "Build my first team",
            "Attend a local tournament",
            "Make friends in the community",
          ],
          encouragement:
            "Every expert was once a beginner. Let's start your journey!",
        },
      },
      {
        ...onboardingSteps[2],
        customContent: {
          simplified: true,
          optional: ["IRL tournament linking"], // Skip complex features
          focus: ["Basic profile setup", "Privacy settings"],
        },
      },
      {
        ...onboardingSteps[3],
        customContent: {
          firstExperience: "guided_demo_game",
          tutorialMode: true,
          explanationLevel: "detailed",
          encouragement:
            "Don't worry about making mistakes - we're here to help you learn!",
        },
      },
      {
        stepNumber: 5,
        title: "Your Learning Path",
        purpose: "Set up structured learning progression",
        userActions: [
          "Review learning modules",
          "Set practice schedule",
          "Join beginner community",
          "Schedule first practice session",
        ],
        customContent: {
          learningModules: [
            "Team Building 101",
            "Basic Strategy",
            "Tournament Etiquette",
          ],
          communityIntro: "Welcome to our beginner-friendly Discord!",
        },
      },
    ];
  }

  private createExpertFlow(profile: UserProfile): CustomOnboardingStep[] {
    return [
      {
        ...onboardingSteps[0],
        customContent: {
          headline: "Advanced Competitive Intelligence",
          description:
            "Battle Stadium provides cutting-edge analytics for serious competitors",
          videoContent: "expert_feature_overview.mp4",
          emphasize: [
            "Advanced analytics",
            "Competitive edge",
            "Professional tools",
          ],
        },
      },
      {
        ...onboardingSteps[1],
        customContent: {
          goalOptions: [
            "Qualify for World Championships",
            "Win regional tournaments",
            "Optimize team building process",
            "Stay ahead of meta shifts",
          ],
          timeCommitment: ["16+ hours/week assumed"],
          skipBasics: true,
        },
      },
      {
        ...onboardingSteps[2],
        customContent: {
          prioritize: [
            "IRL tournament linking",
            "Multiple profiles",
            "Privacy settings",
          ],
          importData: ["Existing tournament results", "Historical performance"],
          advancedFeatures: true,
        },
      },
      {
        ...onboardingSteps[3],
        customContent: {
          firstExperience: "advanced_analysis_demo",
          skipTutorial: true,
          showAdvancedFeatures: [
            "Skill-weighted meta",
            "Predictive modeling",
            "Live coaching",
          ],
          fastTrack: true,
        },
      },
      {
        stepNumber: 5,
        title: "Elite Feature Access",
        purpose: "Introduce advanced features and premium options",
        userActions: [
          "Explore live tournament analytics",
          "Set up advanced notifications",
          "Connect with coaching network",
          "Configure premium features",
        ],
        customContent: {
          premiumTrial: "14-day Champion tier trial",
          advancedTutorials: [
            "Live coaching setup",
            "Advanced analytics interpretation",
          ],
          networkingOpportunity: "Connect with other elite players",
        },
      },
    ];
  }
}
```

---

## 📱 Core User Flows

### Replay Analysis Flow

```typescript
interface ReplayAnalysisFlow {
  entryPoints: EntryPoint[];
  steps: FlowStep[];
  personalization: PersonalizationLayer;
  successOutcomes: SuccessOutcome[];
}

const replayAnalysisFlow: ReplayAnalysisFlow = {
  entryPoints: [
    {
      name: "Browser Extension",
      description: "One-click upload from Showdown replay page",
      userAction: 'Click "Upload to Battle Stadium" button',
      context: "Just finished a Showdown game",
    },
    {
      name: "Manual Upload",
      description: "User navigates to replay upload page",
      userAction: "Visit /replays/upload, paste URL or upload file",
      context: "Wants to analyze a specific game",
    },
    {
      name: "Manual Input",
      description: "User wants to input a game manually",
      userAction: 'Choose "Manual Input" option',
      context: "Game from Switch, tournament, or coaching session",
    },
  ],

  steps: [
    {
      stepName: "Upload/Input",
      userActions: [
        "Provide replay data",
        "Select analysis depth",
        "Add context notes",
      ],
      systemActions: [
        "Parse replay data",
        "Validate format",
        "Extract game state",
      ],
      timeEstimate: "30 seconds - 5 minutes",
      potentialIssues: [
        "Invalid replay format",
        "Parsing errors",
        "Missing data",
      ],
    },
    {
      stepName: "Processing",
      userActions: ["Wait for analysis", "Review processing status"],
      systemActions: [
        "Run AI analysis",
        "Generate insights",
        "Calculate patterns",
      ],
      timeEstimate: "10-30 seconds",
      potentialIssues: [
        "Analysis timeout",
        "AI service error",
        "Rate limiting",
      ],
    },
    {
      stepName: "Results Review",
      userActions: [
        "Read insights",
        "Explore decision points",
        'Try "what if" scenarios',
      ],
      systemActions: [
        "Display analysis",
        "Enable interactive features",
        "Track engagement",
      ],
      timeEstimate: "5-15 minutes",
      potentialIssues: [
        "Confusing insights",
        "Interface complexity",
        "Information overload",
      ],
    },
    {
      stepName: "Action Taking",
      userActions: [
        "Save insights",
        "Share with coach",
        "Schedule practice",
        "Apply learnings",
      ],
      systemActions: [
        "Save to profile",
        "Update learning path",
        "Generate recommendations",
      ],
      timeEstimate: "2-10 minutes",
      potentialIssues: [
        "Unclear next steps",
        "Missing integration",
        "Motivation drop",
      ],
    },
  ],

  personalization: {
    skillLevel: {
      beginner: {
        analysisDepth: "Basic insights with explanations",
        terminology: "Simplified language",
        guidance: "Step-by-step learning path",
        encouragement: "Positive reinforcement focus",
      },
      expert: {
        analysisDepth: "Deep technical analysis",
        terminology: "Advanced competitive terms",
        guidance: "Quick insights and data",
        encouragement: "Performance optimization focus",
      },
    },
    goals: {
      learning: "Focus on educational insights and improvement areas",
      tournament_prep: "Focus on practical tournament applications",
      team_building: "Focus on team composition and synergy insights",
    },
  },

  successOutcomes: [
    "User understands key insights from their game",
    "User identifies specific improvement areas",
    "User applies learnings to future games",
    "User develops consistent analysis habits",
  ],
};
```

### Tournament Participation Flow

```typescript
const tournamentFlow: UserFlow = {
  name: "Tournament Participation",
  description:
    "Complete flow from tournament discovery to post-tournament analysis",

  phases: [
    {
      phase: "Discovery & Registration",
      steps: [
        {
          stepName: "Browse Tournaments",
          userActions: [
            "Visit tournaments page",
            "Filter by location/format",
            "Read tournament details",
          ],
          keyDecisions: [
            "Which tournament to enter",
            "Check schedule availability",
          ],
          successCriteria: [
            "Found suitable tournament",
            "Confirmed availability",
          ],
        },
        {
          stepName: "Register for Tournament",
          userActions: [
            "Click register",
            "Submit team",
            "Pay entry fee",
            "Confirm participation",
          ],
          keyDecisions: ["Final team selection", "Payment method"],
          successCriteria: [
            "Registration confirmed",
            "Team submitted",
            "Payment processed",
          ],
        },
      ],
    },
    {
      phase: "Pre-Tournament Preparation",
      steps: [
        {
          stepName: "Preparation Phase",
          userActions: [
            "Review meta analysis",
            "Practice on Showdown",
            "Study opponent data",
          ],
          keyDecisions: ["Final team adjustments", "Practice focus areas"],
          successCriteria: [
            "Confident in team choice",
            "Practiced key matchups",
          ],
        },
        {
          stepName: "Live Analytics Setup",
          userActions: [
            "Subscribe to live coaching",
            "Set notification preferences",
            "Test mobile access",
          ],
          keyDecisions: ["Live coaching subscription", "Notification settings"],
          successCriteria: [
            "Live features configured",
            "Mobile access confirmed",
          ],
          premiumFeature: true,
        },
      ],
    },
    {
      phase: "Tournament Day",
      steps: [
        {
          stepName: "Check-in Process",
          userActions: [
            "Arrive at venue/online",
            "Complete check-in",
            "Verify team submission",
          ],
          keyDecisions: ["Last-minute team changes", "Mental preparation"],
          successCriteria: ["Successfully checked in", "Ready to compete"],
        },
        {
          stepName: "Live Competition",
          userActions: [
            "Play tournament rounds",
            "Receive live coaching",
            "Report results",
          ],
          keyDecisions: [
            "In-game strategic decisions",
            "Between-rounds adjustments",
          ],
          successCriteria: [
            "All rounds completed",
            "Results properly reported",
          ],
          liveFeatures: [
            "Real-time field analysis",
            "Between-rounds coaching",
            "Performance tracking",
          ],
        },
      ],
    },
    {
      phase: "Post-Tournament Analysis",
      steps: [
        {
          stepName: "Result Processing",
          userActions: [
            "Review final standing",
            "Upload tournament games",
            "Rate experience",
          ],
          keyDecisions: ["Which games to analyze first", "Feedback to provide"],
          successCriteria: [
            "Tournament data captured",
            "Experience feedback provided",
          ],
        },
        {
          stepName: "Learning & Improvement",
          userActions: [
            "Analyze tournament performance",
            "Identify improvement areas",
            "Plan next steps",
          ],
          keyDecisions: [
            "Priority improvement areas",
            "Next tournament to enter",
          ],
          successCriteria: ["Clear improvement plan", "Next goals set"],
        },
      ],
    },
  ],
};
```

### Team Building Journey

```typescript
const teamBuildingFlow: UserFlow = {
  name: "Team Building Journey",
  description: "From concept to competitive team through Battle Stadium tools",

  stages: [
    {
      stage: "Inspiration & Research",
      description: "User gets idea for new team or archetype",
      userNeeds: [
        "Meta understanding",
        "Archetype viability",
        "Starting point",
      ],
      battleStadiumValue: [
        "Current meta analysis at user's skill level",
        "Archetype performance data",
        "Regional meta variations",
      ],
      userActions: [
        "Explore meta analysis dashboard",
        "Research archetype performance",
        "Identify core Pokemon choices",
        "Review successful team examples",
      ],
      timeInvestment: "30 minutes - 2 hours",
      successMarkers: ["Clear archetype direction", "Core Pokemon identified"],
    },
    {
      stage: "Initial Team Construction",
      description: "Building first version of the team",
      userNeeds: ["Pokemon selection", "Role distribution", "Basic synergy"],
      battleStadiumValue: [
        "Pokemon performance by skill level",
        "Synergy analysis tools",
        "Common team patterns",
      ],
      userActions: [
        "Select core Pokemon",
        "Fill remaining team slots",
        "Set basic movesets and items",
        "Run initial synergy analysis",
      ],
      timeInvestment: "1-3 hours",
      successMarkers: ["Complete 6-Pokemon team", "Basic synergy confirmed"],
    },
    {
      stage: "Testing & Refinement",
      description: "Practice with team and identify issues",
      userNeeds: [
        "Practice opponents",
        "Performance feedback",
        "Weakness identification",
      ],
      battleStadiumValue: [
        "Replay analysis and pattern detection",
        "Matchup performance tracking",
        "Improvement recommendations",
      ],
      userActions: [
        "Practice games on Showdown",
        "Upload and analyze replays",
        "Track win rates vs archetypes",
        "Identify problematic matchups",
      ],
      timeInvestment: "5-15 hours",
      successMarkers: [
        "10+ practice games",
        "Clear performance patterns",
        "Identified weaknesses",
      ],
    },
    {
      stage: "Optimization",
      description: "Fine-tune team based on testing results",
      userNeeds: [
        "Specific improvements",
        "EV optimization",
        "Move adjustments",
      ],
      battleStadiumValue: [
        "EV spread optimization",
        "Move set recommendations",
        "Item choice analysis",
      ],
      userActions: [
        "Adjust EV spreads for key calculations",
        "Experiment with move alternatives",
        "Test item variations",
        "Validate improvements through testing",
      ],
      timeInvestment: "3-8 hours",
      successMarkers: [
        "Optimized EV spreads",
        "Refined movesets",
        "Improved win rates",
      ],
    },
    {
      stage: "Tournament Preparation",
      description: "Final preparation for competitive use",
      userNeeds: ["Meta positioning", "Tournament readiness", "Confidence"],
      battleStadiumValue: [
        "Tournament meta analysis",
        "Expected field breakdown",
        "Final validation",
      ],
      userActions: [
        "Analyze tournament meta prediction",
        "Practice vs expected field",
        "Final team validation",
        "Mental preparation",
      ],
      timeInvestment: "2-5 hours",
      successMarkers: [
        "Tournament registration",
        "Meta-appropriate team",
        "Confident execution",
      ],
    },
  ],

  supportingFeatures: [
    "Team builder with real-time suggestions",
    "Damage calculator integration",
    "Meta analysis dashboard",
    "Replay analysis system",
    "Performance tracking",
    "Tournament meta predictions",
  ],
};
```

---

## 🎯 Goal-Oriented Experience Design

### Competitive Goal Setting & Tracking

```typescript
interface GoalTrackingSystem {
  goalCategories: GoalCategory[];
  progressTracking: ProgressTracker[];
  milestoneRewards: MilestoneReward[];
  adaptiveGuidance: AdaptiveGuidance;
}

const goalCategories: GoalCategory[] = [
  {
    category: "Skill Development",
    description: "Improve fundamental competitive skills",
    goals: [
      {
        id: "team_building_mastery",
        title: "Master Team Building",
        description: "Build 5 different viable team archetypes",
        difficulty: "intermediate",
        estimatedTime: "2-3 months",
        milestones: [
          "Build first complete team",
          "Achieve 60%+ win rate with team",
          "Build team in different archetype",
          "Win local tournament with self-built team",
          "Build 5 different archetypes",
        ],
        battleStadiumSupport: [
          "Team building tools and suggestions",
          "Archetype performance analysis",
          "Win rate tracking by team",
          "Meta positioning guidance",
        ],
      },
      {
        id: "decision_making",
        title: "Improve In-Game Decisions",
        description: "Consistently make optimal plays in critical moments",
        difficulty: "advanced",
        estimatedTime: "4-6 months",
        milestones: [
          "Upload 10 replays for analysis",
          "Identify personal decision patterns",
          "Improve decision quality by 20%",
          "Demonstrate improvement in tournament",
          "Mentor another player on decision-making",
        ],
        battleStadiumSupport: [
          "Replay analysis with decision point identification",
          "Pattern recognition across games",
          "Practice scenario recommendations",
          "Progress tracking and validation",
        ],
      },
    ],
  },
  {
    category: "Tournament Performance",
    description: "Achieve specific tournament results",
    goals: [
      {
        id: "first_day_2",
        title: "Make Day 2 at Regional",
        description: "Advance to Day 2 of a regional championship",
        difficulty: "advanced",
        estimatedTime: "6-12 months",
        prerequisites: ["Consistent local tournament attendance"],
        milestones: [
          "Attend first regional tournament",
          "Achieve 4-4 or better at regional",
          "Achieve 5-3 or better at regional",
          "Make Day 2 at regional",
          "Maintain Day 2 consistency",
        ],
        battleStadiumSupport: [
          "Regional meta analysis and preparation",
          "Live tournament coaching during event",
          "Performance tracking across tournaments",
          "Skill-level appropriate meta insights",
        ],
      },
    ],
  },
];

class GoalGuidanceEngine {
  // Generate personalized guidance based on user's current goal progress
  generateGuidance(userId: string, goalId: string): PersonalizedGuidance {
    const user = this.getUserProfile(userId);
    const goal = this.getGoal(goalId);
    const progress = this.getGoalProgress(userId, goalId);

    const guidance: PersonalizedGuidance = {
      currentStatus: this.assessCurrentStatus(progress),
      nextSteps: this.generateNextSteps(goal, progress, user),
      timelineAdjustment: this.assessTimeline(goal, progress, user),
      resourceRecommendations: this.recommendResources(goal, progress, user),
      motivationalSupport: this.generateMotivation(progress, user),
    };

    return guidance;
  }

  private generateNextSteps(
    goal: Goal,
    progress: GoalProgress,
    user: UserProfile
  ): NextStep[] {
    const currentMilestone = progress.currentMilestone;
    const nextMilestone = goal.milestones[currentMilestone + 1];

    if (!nextMilestone) {
      return [
        { action: "Goal completed! Set new challenge.", priority: "high" },
      ];
    }

    // Generate specific, actionable next steps
    const steps: NextStep[] = [];

    switch (nextMilestone.type) {
      case "tournament_attendance":
        steps.push({
          action: "Register for upcoming regional tournament",
          priority: "high",
          timeframe: "within 2 weeks",
          battleStadiumTool: "Tournament browser and registration",
        });
        break;

      case "skill_demonstration":
        steps.push({
          action: "Upload 3 recent games for decision analysis",
          priority: "medium",
          timeframe: "this week",
          battleStadiumTool: "Replay analysis system",
        });
        break;

      case "win_rate_improvement":
        steps.push({
          action: "Practice vs your identified weak matchups",
          priority: "high",
          timeframe: "daily practice sessions",
          battleStadiumTool:
            "Personal matchup analysis + practice recommendations",
        });
        break;
    }

    return steps;
  }
}
```

### Progressive Feature Discovery

```typescript
interface FeatureDiscoverySystem {
  userReadiness: ReadinessAssessment;
  featureIntroduction: FeatureIntroduction[];
  contextualTutorials: ContextualTutorial[];
  masteryTracking: MasteryTracking;
}

class FeatureDiscoveryEngine {
  // Introduce features when user is ready and context is appropriate
  assessFeatureReadiness(
    userId: string,
    featureId: string
  ): ReadinessAssessment {
    const user = this.getUserProfile(userId);
    const usage = this.getUserUsagePatterns(userId);
    const feature = this.getFeature(featureId);

    return {
      isReady: this.calculateReadiness(user, usage, feature),
      readinessScore: this.scoreReadiness(user, usage, feature),
      blockers: this.identifyBlockers(user, usage, feature),
      optimalTrigger: this.findOptimalIntroductionMoment(user, usage, feature),
      successPrediction: this.predictFeatureSuccess(user, usage, feature),
    };
  }

  private calculateReadiness(
    user: UserProfile,
    usage: UsagePatterns,
    feature: Feature
  ): boolean {
    // Check prerequisites
    for (const prerequisite of feature.prerequisites) {
      if (!this.hasCompletedPrerequisite(user, usage, prerequisite)) {
        return false;
      }
    }

    // Check usage patterns indicate readiness
    if (feature.requiredUsagePatterns) {
      for (const pattern of feature.requiredUsagePatterns) {
        if (!this.hasUsagePattern(usage, pattern)) {
          return false;
        }
      }
    }

    // Check skill level appropriateness
    if (feature.minimumSkillLevel > user.skillLevel) {
      return false;
    }

    return true;
  }

  // Contextual feature introduction examples
  getContextualIntroductions(): ContextualTutorial[] {
    return [
      {
        featureId: "manual_replay_input",
        trigger: {
          condition: "user_uploads_5_showdown_replays",
          contextualMessage:
            "Want to analyze games from tournaments or Switch? Try manual input!",
        },
        introduction: {
          headline: "Analyze Any Pokemon Game",
          description:
            "Input games from tournaments, Switch, or coaching sessions",
          demoFlow: "Quick 2-minute demo of manual input",
          valueProposition: "Get insights from your most important games",
        },
      },
      {
        featureId: "live_tournament_coaching",
        trigger: {
          condition: "user_registers_for_tournament",
          contextualMessage: "Get live coaching during your tournament!",
        },
        introduction: {
          headline: "Live Tournament Intelligence",
          description: "Real-time coaching between rounds",
          demoFlow: "Show example of between-rounds coaching",
          valueProposition: "Never play a crucial round blind again",
        },
      },
      {
        featureId: "advanced_meta_analysis",
        trigger: {
          condition: "user_demonstrates_intermediate_skill",
          contextualMessage: "Ready for deeper meta insights?",
        },
        introduction: {
          headline: "Meta at Your Skill Level",
          description: "See what you'll actually face in tournaments",
          demoFlow: "Compare skill-level meta differences",
          valueProposition: "Stop preparing for meta you'll never face",
        },
      },
    ];
  }
}
```

---

## 📱 Mobile Experience Design

### Mobile-First Critical Flows

```typescript
interface MobileExperience {
  criticalFlows: MobileCriticalFlow[];
  adaptiveDesign: AdaptiveDesignPrinciples;
  offlineCapabilities: OfflineCapability[];
  performanceTargets: PerformanceTarget[];
}

const mobileCriticalFlows: MobileCriticalFlow[] = [
  {
    flowName: "Live Tournament Coaching",
    priority: "essential",
    description: "Between-rounds coaching during tournaments",
    userContext: "At tournament venue, limited time between rounds",
    designPrinciples: [
      "Information hierarchy: most critical insights first",
      "One-handed operation capability",
      "Offline resilience for poor venue connectivity",
      "Quick scan readability",
    ],
    keyScreens: [
      {
        screen: "Tournament Status",
        elements: [
          "Current record",
          "Next opponent info",
          "Time to next round",
        ],
        priority: "glanceable information",
      },
      {
        screen: "Round Coaching",
        elements: [
          "Key threats",
          "Strategy recommendations",
          "Mental coaching",
        ],
        priority: "actionable insights",
      },
      {
        screen: "Quick Actions",
        elements: ["Report result", "Request help", "Access resources"],
        priority: "immediate actions",
      },
    ],
  },
  {
    flowName: "Quick Replay Upload",
    priority: "high",
    description: "Fast replay analysis on mobile",
    userContext: "On the go, wants quick insights",
    designPrinciples: [
      "Minimal input required",
      "Progressive enhancement",
      "Thumbnail/preview oriented",
      "Voice note capability",
    ],
    keyScreens: [
      {
        screen: "Upload Interface",
        elements: [
          "Drag/drop or paste",
          "Quick context tags",
          "Analysis depth selector",
        ],
        priority: "frictionless input",
      },
      {
        screen: "Mobile Analysis",
        elements: ["Key insights cards", "Swipeable details", "Quick actions"],
        priority: "scannable insights",
      },
    ],
  },
];

class MobileExperienceOptimizer {
  // Optimize interface based on mobile context
  adaptForMobileContext(context: MobileContext): AdaptedInterface {
    const adaptations: InterfaceAdaptation[] = [];

    // Tournament venue context
    if (context.location === "tournament_venue") {
      adaptations.push({
        change: "increase_font_size",
        reasoning: "Venue lighting may be poor",
      });
      adaptations.push({
        change: "simplify_navigation",
        reasoning: "User attention is divided",
      });
      adaptations.push({
        change: "enable_offline_mode",
        reasoning: "Venue WiFi may be unreliable",
      });
    }

    // Limited time context
    if (context.timeConstraint === "between_rounds") {
      adaptations.push({
        change: "prioritize_critical_info",
        reasoning: "Only 5-10 minutes available",
      });
      adaptations.push({
        change: "minimize_interactions",
        reasoning: "Reduce cognitive load",
      });
    }

    return {
      adaptations,
      estimatedUsageTime: this.estimateUsageTime(context),
      successProbability: this.calculateSuccessProbability(adaptations),
    };
  }
}
```

---

## 🎯 Success Metrics & Optimization

### User Journey Analytics

```typescript
interface JourneyAnalytics {
  funnelMetrics: FunnelMetric[];
  engagementMetrics: EngagementMetric[];
  valueRealizationMetrics: ValueMetric[];
  retentionAnalytics: RetentionAnalytic[];
}

const journeySuccessMetrics: JourneyAnalytics = {
  funnelMetrics: [
    {
      stage: "Discovery to Sign-up",
      target: "15% conversion rate",
      measurement: "Unique visitors to account creation",
      optimizationLever: "Landing page value proposition clarity",
    },
    {
      stage: "Sign-up to First Value",
      target: "60% completion rate",
      measurement: "Account creation to first replay analysis",
      optimizationLever: "Onboarding flow efficiency",
    },
    {
      stage: "First Value to Habit Formation",
      target: "40% retention at 30 days",
      measurement: "First use to regular weekly usage",
      optimizationLever: "Feature stickiness and value demonstration",
    },
  ],

  engagementMetrics: [
    {
      metric: "Feature Adoption Rate",
      target: "70% of users try 3+ core features within 60 days",
      measurement: "Unique feature usage per user cohort",
      indicatesSuccess: "Users exploring platform capabilities",
    },
    {
      metric: "Session Depth",
      target: "Average session includes 2+ meaningful actions",
      measurement: "Actions per session that drive value",
      indicatesSuccess: "Users finding value in each visit",
    },
  ],

  valueRealizationMetrics: [
    {
      metric: "Goal Achievement Rate",
      target: "50% of users make progress on stated goals within 90 days",
      measurement: "Goal milestone completion tracking",
      indicatesSuccess: "Platform driving real competitive improvement",
    },
    {
      metric: "Tournament Performance Improvement",
      target: "25% improvement in tournament results for active users",
      measurement: "Before/after tournament performance comparison",
      indicatesSuccess: "Battle Stadium creating competitive advantage",
    },
  ],
};

class JourneyOptimizationEngine {
  // Continuously optimize user journey based on data
  identifyOptimizationOpportunities(
    analytics: JourneyAnalytics
  ): OptimizationPlan {
    const opportunities: OptimizationOpportunity[] = [];

    // Analyze funnel drop-offs
    for (const funnel of analytics.funnelMetrics) {
      if (funnel.actualRate < funnel.targetRate * 0.8) {
        // 20% below target
        opportunities.push({
          type: "funnel_optimization",
          priority: this.calculatePriority(funnel.impact, funnel.effort),
          area: funnel.stage,
          potentialImpact: this.estimateImpact(funnel),
          recommendedActions: this.generateFunnelActions(funnel),
        });
      }
    }

    // Analyze engagement patterns
    const engagementIssues = this.identifyEngagementIssues(
      analytics.engagementMetrics
    );
    opportunities.push(...engagementIssues);

    return {
      opportunities: opportunities.sort((a, b) => b.priority - a.priority),
      implementationRoadmap: this.createImplementationRoadmap(opportunities),
      expectedImpact: this.calculateExpectedImpact(opportunities),
    };
  }
}
```

---

## 🎯 Implementation Roadmap

### Phase 1: Core Journey Foundation (Month 1)

- **Onboarding System**: Adaptive onboarding based on user skill level
- **First Value Experience**: Replay analysis with immediate insights
- **Goal Setting Framework**: Basic goal tracking and progress measurement
- **Mobile Optimization**: Core flows optimized for mobile usage

### Phase 2: Feature Discovery & Engagement (Month 2)

- **Progressive Feature Introduction**: Contextual feature discovery system
- **Habit Formation Tools**: Engagement mechanisms and routine building
- **Community Integration**: Social features and peer connections
- **Advanced Mobile Flows**: Tournament coaching and advanced mobile features

### Phase 3: Journey Optimization (Month 3)

- **Journey Analytics**: Comprehensive tracking and optimization system
- **Personalization Engine**: Advanced personalization based on behavior
- **Retention Optimization**: Targeted retention and re-engagement flows
- **Success Celebration**: Milestone recognition and achievement systems

### Phase 4: Advanced Experience (Month 4)

- **Predictive Guidance**: AI-powered journey optimization
- **Community Integration**: Advanced social and mentorship features
- **Cross-Platform Sync**: Seamless experience across all devices
- **Advanced Analytics**: Deep journey analytics and optimization

---

## 🎯 Success Metrics

### User Journey Health

- **Onboarding Completion**: 70% complete adaptive onboarding flow
- **Time to First Value**: <10 minutes from signup to first insights
- **Feature Discovery Rate**: 60% discover 3+ features within 30 days
- **Goal Progress Rate**: 40% make measurable progress on stated goals

### Engagement & Retention

- **30-Day Retention**: 45% of users return after 30 days
- **Weekly Active Usage**: 25% of users active weekly after 60 days
- **Session Quality**: Average session includes 2+ valuable actions
- **Feature Stickiness**: 80% of users who try a feature return to it

### Business Impact

- **Premium Conversion**: 15% convert to paid within 90 days
- **Tournament Participation**: 30% participate in tournaments within 6 months
- **Word of Mouth**: 50% recommend Battle Stadium to other players
- **Competitive Improvement**: 25% measurable improvement in tournament results

This user experience design creates a personalized journey that adapts to each user's competitive Pokemon goals and guides them to success through Battle Stadium's features.
