-- =============================================================================
-- Subscriptions and Feature Usage Tables (IDEMPOTENT)
-- =============================================================================
-- Billing and usage tracking for profiles and organizations.
-- Uses CREATE TABLE IF NOT EXISTS and DO blocks for constraints.

-- Feature usage tracking (polymorphic: profile or organization)
CREATE TABLE IF NOT EXISTS "public"."feature_usage" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "entity_id" bigint NOT NULL,
    "entity_type" "public"."entity_type" NOT NULL,
    "feature_key" "text" NOT NULL,
    "period_start" timestamp with time zone NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "usage" integer DEFAULT 0,
    "usage_limit" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."feature_usage" OWNER TO "postgres";

-- Subscriptions (polymorphic: profile or organization)
CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "entity_id" bigint NOT NULL,
    "entity_type" "public"."entity_type" NOT NULL,
    "tier" "text" NOT NULL,
    "status" "public"."subscription_status" DEFAULT 'active'::"public"."subscription_status",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "stripe_subscription_id" "text",
    "billing_interval" "public"."billing_interval" DEFAULT 'monthly'::"public"."billing_interval",
    "amount" integer,
    "currency" "text" DEFAULT 'usd'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."subscriptions" OWNER TO "postgres";

-- Primary keys (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feature_usage_pkey') THEN
        ALTER TABLE ONLY "public"."feature_usage" ADD CONSTRAINT "feature_usage_pkey" PRIMARY KEY ("id");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_pkey') THEN
        ALTER TABLE ONLY "public"."subscriptions" ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");
    END IF;
END $$;

-- Unique constraints (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feature_usage_entity_id_entity_type_feature_key_period_star_key') THEN
        ALTER TABLE ONLY "public"."feature_usage"
            ADD CONSTRAINT "feature_usage_entity_id_entity_type_feature_key_period_star_key" UNIQUE ("entity_id", "entity_type", "feature_key", "period_start");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_stripe_subscription_id_key') THEN
        ALTER TABLE ONLY "public"."subscriptions"
            ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");
    END IF;
END $$;
