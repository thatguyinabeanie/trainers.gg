-- =============================================================================
-- RBAC Tables (Roles, Permissions, Groups)
-- =============================================================================
-- Role-based access control system for organizations.

-- Groups (within organizations)
CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "organization_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."groups" OWNER TO "postgres";

-- Roles (global role definitions)
CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."roles" OWNER TO "postgres";

-- Group roles (roles assigned to groups)
CREATE TABLE IF NOT EXISTS "public"."group_roles" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "group_id" bigint NOT NULL,
    "role_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."group_roles" OWNER TO "postgres";

-- Permissions (individual permission definitions)
CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."permissions" OWNER TO "postgres";

-- Role permissions (permissions assigned to roles)
CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "role_id" bigint NOT NULL,
    "permission_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."role_permissions" OWNER TO "postgres";

-- Profile group roles (profiles assigned to group roles)
CREATE TABLE IF NOT EXISTS "public"."profile_group_roles" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "profile_id" bigint NOT NULL,
    "group_role_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."profile_group_roles" OWNER TO "postgres";

-- Primary keys
ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."group_roles"
    ADD CONSTRAINT "group_roles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profile_group_roles"
    ADD CONSTRAINT "profile_group_roles_pkey" PRIMARY KEY ("id");

-- Unique constraints
ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_organization_id_name_key" UNIQUE ("organization_id", "name");

ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");

ALTER TABLE ONLY "public"."group_roles"
    ADD CONSTRAINT "group_roles_group_id_role_id_key" UNIQUE ("group_id", "role_id");

ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_key_key" UNIQUE ("key");

ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_permission_id_key" UNIQUE ("role_id", "permission_id");

ALTER TABLE ONLY "public"."profile_group_roles"
    ADD CONSTRAINT "profile_group_roles_profile_id_group_role_id_key" UNIQUE ("profile_id", "group_role_id");

-- Foreign keys
ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."group_roles"
    ADD CONSTRAINT "group_roles_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."group_roles"
    ADD CONSTRAINT "group_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."profile_group_roles"
    ADD CONSTRAINT "profile_group_roles_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."profile_group_roles"
    ADD CONSTRAINT "profile_group_roles_group_role_id_fkey" FOREIGN KEY ("group_role_id") REFERENCES "public"."group_roles"("id") ON DELETE CASCADE;
