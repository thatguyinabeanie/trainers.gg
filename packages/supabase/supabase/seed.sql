-- Seed data for local development
-- Creates test users in auth.users (the handle_new_user trigger creates public.users and profiles)

-- Test Users
-- Password for all test users: "password123"
-- bcrypt hash of "password123" for Supabase Auth

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change_token_new,
  recovery_token
) VALUES
-- Admin user
(
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@trainers.local',
  '$2a$10$PznXpYVHL5TtIzfXhKoLaeY2Xlpc4oF1iYWZXvF3PxPFbfGzsMSWO',
  NOW(),
  jsonb_build_object(
    'username', 'admin_trainer',
    'first_name', 'Admin',
    'last_name', 'Trainer',
    'country', 'US'
  ),
  NOW(),
  NOW(),
  '',
  '',
  ''
),
-- Regular player - Ash
(
  'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'player@trainers.local',
  '$2a$10$PznXpYVHL5TtIzfXhKoLaeY2Xlpc4oF1iYWZXvF3PxPFbfGzsMSWO',
  NOW(),
  jsonb_build_object(
    'username', 'ash_ketchum',
    'first_name', 'Ash',
    'last_name', 'Ketchum',
    'country', 'JP'
  ),
  NOW(),
  NOW(),
  '',
  '',
  ''
),
-- Champion - Cynthia
(
  'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'champion@trainers.local',
  '$2a$10$PznXpYVHL5TtIzfXhKoLaeY2Xlpc4oF1iYWZXvF3PxPFbfGzsMSWO',
  NOW(),
  jsonb_build_object(
    'username', 'cynthia',
    'first_name', 'Cynthia',
    'last_name', 'Shirona',
    'country', 'JP'
  ),
  NOW(),
  NOW(),
  '',
  '',
  ''
),
-- Gym Leader - Brock
(
  'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'gymleader@trainers.local',
  '$2a$10$PznXpYVHL5TtIzfXhKoLaeY2Xlpc4oF1iYWZXvF3PxPFbfGzsMSWO',
  NOW(),
  jsonb_build_object(
    'username', 'brock',
    'first_name', 'Brock',
    'last_name', 'Takeshi',
    'country', 'JP'
  ),
  NOW(),
  NOW(),
  '',
  '',
  ''
),
-- Elite Four - Karen
(
  'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'elite@trainers.local',
  '$2a$10$PznXpYVHL5TtIzfXhKoLaeY2Xlpc4oF1iYWZXvF3PxPFbfGzsMSWO',
  NOW(),
  jsonb_build_object(
    'username', 'karen',
    'first_name', 'Karen',
    'last_name', 'Karin',
    'country', 'JP'
  ),
  NOW(),
  NOW(),
  '',
  '',
  ''
),
-- Casual player - Red
(
  'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'casual@trainers.local',
  '$2a$10$PznXpYVHL5TtIzfXhKoLaeY2Xlpc4oF1iYWZXvF3PxPFbfGzsMSWO',
  NOW(),
  jsonb_build_object(
    'username', 'red',
    'first_name', 'Red',
    'last_name', '',
    'country', 'JP'
  ),
  NOW(),
  NOW(),
  '',
  '',
  ''
);

-- Create identity records for email provider
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
(
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'admin@trainers.local',
  jsonb_build_object('sub', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'email', 'admin@trainers.local'),
  'email',
  NOW(),
  NOW(),
  NOW()
),
(
  'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
  'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
  'player@trainers.local',
  jsonb_build_object('sub', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'email', 'player@trainers.local'),
  'email',
  NOW(),
  NOW(),
  NOW()
),
(
  'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
  'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
  'champion@trainers.local',
  jsonb_build_object('sub', 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'email', 'champion@trainers.local'),
  'email',
  NOW(),
  NOW(),
  NOW()
),
(
  'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a',
  'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a',
  'gymleader@trainers.local',
  jsonb_build_object('sub', 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'email', 'gymleader@trainers.local'),
  'email',
  NOW(),
  NOW(),
  NOW()
),
(
  'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b',
  'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b',
  'elite@trainers.local',
  jsonb_build_object('sub', 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'email', 'elite@trainers.local'),
  'email',
  NOW(),
  NOW(),
  NOW()
),
(
  'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c',
  'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c',
  'casual@trainers.local',
  jsonb_build_object('sub', 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'email', 'casual@trainers.local'),
  'email',
  NOW(),
  NOW(),
  NOW()
);
