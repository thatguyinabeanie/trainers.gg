-- =============================================================================
-- Organizations Tables
-- =============================================================================
-- Organization management including members, invitations, and requests.

-- Organizations table
CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "logo_url" "text",
    "status" "public"."organization_status" DEFAULT 'pending'::"public"."organization_status",
    "owner_profile_id" bigint NOT NULL,
    "discord_url" "text",
    "twitter_url" "text",
    "website_url" "text",
    "tier" "public"."organization_tier" DEFAULT 'regular'::"public"."organization_tier",
    "subscription_tier" "public"."organization_subscription_tier" DEFAULT 'free'::"public"."organization_subscription_tier",
    "subscription_expires_at" timestamp with time zone,
    "subscription_started_at" timestamp with time zone,
    "platform_fee_percentage" numeric(5,4) DEFAULT 0.05,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."organizations" OWNER TO "postgres";

-- Organization members
CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "organization_id" bigint NOT NULL,
    "profile_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."organization_members" OWNER TO "postgres";

-- Organization invitations
CREATE TABLE IF NOT EXISTS "public"."organization_invitations" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "organization_id" bigint NOT NULL,
    "invited_profile_id" bigint NOT NULL,
    "invited_by_profile_id" bigint NOT NULL,
    "status" "public"."invitation_status" DEFAULT 'pending'::"public"."invitation_status",
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "responded_at" timestamp with time zone
);
ALTER TABLE "public"."organization_invitations" OWNER TO "postgres";

-- Organization requests (to create new orgs)
CREATE TABLE IF NOT EXISTS "public"."organization_requests" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "requested_by_profile_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "status" "public"."org_request_status" DEFAULT 'pending'::"public"."org_request_status",
    "reviewed_by_profile_id" bigint,
    "reviewed_at" timestamp with time zone,
    "rejection_reason" "text",
    "created_organization_id" bigint,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."organization_requests" OWNER TO "postgres";

-- Primary keys
ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."organization_requests"
    ADD CONSTRAINT "organization_requests_pkey" PRIMARY KEY ("id");

-- Unique constraints
ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");

ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_profile_id_key" UNIQUE ("organization_id", "profile_id");

-- Foreign keys
ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_owner_profile_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_invited_profile_id_fkey" FOREIGN KEY ("invited_profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_invited_by_profile_id_fkey" FOREIGN KEY ("invited_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."organization_requests"
    ADD CONSTRAINT "organization_requests_requested_by_profile_id_fkey" FOREIGN KEY ("requested_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."organization_requests"
    ADD CONSTRAINT "organization_requests_reviewed_by_profile_id_fkey" FOREIGN KEY ("reviewed_by_profile_id") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."organization_requests"
    ADD CONSTRAINT "organization_requests_created_organization_id_fkey" FOREIGN KEY ("created_organization_id") REFERENCES "public"."organizations"("id");

-- Add the deferred FK from users to profiles (now that profiles and organizations exist)
ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_main_profile_fk" FOREIGN KEY ("main_profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
