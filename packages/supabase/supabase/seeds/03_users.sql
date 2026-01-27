-- =============================================================================
-- 03_users.sql - Create Test Users
-- =============================================================================
-- GENERATED FILE - DO NOT EDIT MANUALLY
-- Generated at: 2026-01-27T03:56:04.310Z
-- IDEMPOTENT: Uses ON CONFLICT and existence checks
-- =============================================================================

-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING for inserts, UPDATE for profile data
--
-- TEST CREDENTIALS:
--   Password: Password123!
--   Emails: See users below
-- =============================================================================


-- -----------------------------------------------------------------------------
-- auth.users
-- -----------------------------------------------------------------------------

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  aud, role, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '00000000-0000-0000-0000-000000000000',
   'admin@trainers.local', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"admin_trainer","first_name":"Admin","last_name":"Trainer"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', '00000000-0000-0000-0000-000000000000',
   'player@trainers.local', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"ash_ketchum","first_name":"Ash","last_name":"Ketchum"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', '00000000-0000-0000-0000-000000000000',
   'champion@trainers.local', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"cynthia","first_name":"Cynthia","last_name":"Shirona"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', '00000000-0000-0000-0000-000000000000',
   'gymleader@trainers.local', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"brock","first_name":"Brock","last_name":"Harrison"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', '00000000-0000-0000-0000-000000000000',
   'elite@trainers.local', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"karen","first_name":"Karen","last_name":"Dark"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', '00000000-0000-0000-0000-000000000000',
   'casual@trainers.local', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"red","first_name":"Red","last_name":"Champion"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d', '00000000-0000-0000-0000-000000000000',
   'lance@trainers.local', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"lance","first_name":"Lance","last_name":"Dragon"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('711a6f7d-fc44-46b9-6d36-8ab4bd1d31ef', '00000000-0000-0000-0000-000000000000',
   'valentinemiller24@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"valentinemiller24","first_name":"Anderson","last_name":"Mills"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('711a6f7c-c4fb-edde-1407-85c76b3b1fa4', '00000000-0000-0000-0000-000000000000',
   'ellis_paucek@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"ellis_paucek","first_name":"Sylvia","last_name":"Olson"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('711a6f7b-d716-7aed-a2fa-caab9020e6bd', '00000000-0000-0000-0000-000000000000',
   'submissive_trainer_7@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"submissive_trainer_7","first_name":"Olen","last_name":"Herzog"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('711a6f7a-b4db-bd62-59bc-0b9427e7bf7f', '00000000-0000-0000-0000-000000000000',
   'halliefay16@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"halliefay16","first_name":"Caroline","last_name":"Schowalter"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('711a6f79-af5e-a5a8-ddb1-c740ce0b4e3f', '00000000-0000-0000-0000-000000000000',
   'demetrius_gutkowski@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"demetrius_gutkowski","first_name":"Amelie","last_name":"Upton"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('711a6f78-b52d-dd77-fddb-e13dd02e03cf', '00000000-0000-0000-0000-000000000000',
   'trentheaney20@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"trentheaney20","first_name":"Serenity","last_name":"Okuneva"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('711a6f77-c285-5f8d-dbbc-a4f60e3eee80', '00000000-0000-0000-0000-000000000000',
   'eminent_ranger@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"eminent_ranger","first_name":"Eriberto","last_name":"O''Hara"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('711a6f76-2df3-bdaf-f76b-bdebbbefbd78', '00000000-0000-0000-0000-000000000000',
   'hilbert38@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"hilbert38","first_name":"Ceasar","last_name":"Weber"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('711a6f75-c72b-a4d1-1bbe-ffb7b5910fcf', '00000000-0000-0000-0000-000000000000',
   'ordinary_trainer_36@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"ordinary_trainer_36","first_name":"Kari","last_name":"McLaughlin"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('711a6f74-57a0-210c-fa2a-a398dd08dbce', '00000000-0000-0000-0000-000000000000',
   'chad_friesen@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"chad_friesen","first_name":"Verda","last_name":"Luettgen"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('4dcc802c-ace8-fd41-202f-17c0b62fddab', '00000000-0000-0000-0000-000000000000',
   'blank_trainer_642@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"blank_trainer_642","first_name":"Kylee","last_name":"Mayer"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('4dcc802d-9aa2-dbc7-d80d-27eecd967eab', '00000000-0000-0000-0000-000000000000',
   'charlotteschoen99@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"charlotteschoen99","first_name":"Gabrielle","last_name":"Heaney"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('4dcc802e-3ad2-1f1c-f11f-88befa81bc9d', '00000000-0000-0000-0000-000000000000',
   'brown_gym@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"brown_gym","first_name":"Katheryn","last_name":"Torphy"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('4dcc802f-cf86-d4f0-f0db-f1cfbdf9dcd0', '00000000-0000-0000-0000-000000000000',
   'made_up_trainer_12@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"made_up_trainer_12","first_name":"Anabelle","last_name":"Carroll"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('4dcc8030-fffb-6bf3-ecef-d9ed008bf3d8', '00000000-0000-0000-0000-000000000000',
   'valentinaklocko65@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"valentinaklocko65","first_name":"Cindy","last_name":"Hermann"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('4dcc8031-c592-ed5e-d72e-babcccd820ad', '00000000-0000-0000-0000-000000000000',
   'ronny_koss27@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"ronny_koss27","first_name":"Raoul","last_name":"Zieme-Luettgen"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('4dcc8032-7bb8-dce3-ea5a-fa7d512233e4', '00000000-0000-0000-0000-000000000000',
   'early_master@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"early_master","first_name":"Felicia","last_name":"Huel"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('4dcc8033-2a48-bf0b-d1de-16ba448ad8aa', '00000000-0000-0000-0000-000000000000',
   'sophieorn25@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"sophieorn25","first_name":"Alize","last_name":"Gottlieb"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('4dcc8034-5580-7472-ddeb-a1bca9267ec7', '00000000-0000-0000-0000-000000000000',
   'faint_trainer_713@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"faint_trainer_713","first_name":"Johnson","last_name":"Breitenberg"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('4dcc8035-9f28-fdb5-3eec-c6a479b52d6c', '00000000-0000-0000-0000-000000000000',
   'lempi_brakus24@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"lempi_brakus24","first_name":"Eddie","last_name":"Treutel"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('4dcc804b-b5ea-da97-ecf2-ae31acc3b433', '00000000-0000-0000-0000-000000000000',
   'long_trainer_533@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"long_trainer_533","first_name":"Ethelyn","last_name":"Berge"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('4dcc804c-5d8b-dd2e-d73b-dbdb365a0cad', '00000000-0000-0000-0000-000000000000',
   'mallory39@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"mallory39","first_name":"Garth","last_name":"Gutkowski"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('4dcc804d-efb5-73dc-8ae3-cbd0decfef3c', '00000000-0000-0000-0000-000000000000',
   'reidstamm21@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"reidstamm21","first_name":"Phoebe","last_name":"Fay"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('4dcc804e-2edb-d817-b078-be77a94933a9', '00000000-0000-0000-0000-000000000000',
   'insistent_ranger@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"insistent_ranger","first_name":"Tianna","last_name":"Bruen"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('4dcc804f-d1a4-d440-ac1b-9b98c34ce85e', '00000000-0000-0000-0000-000000000000',
   'francesco_nader66@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"francesco_nader66","first_name":"Cali","last_name":"Bogan"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('70036c44-e525-fcc8-e46d-01403c9db758', '00000000-0000-0000-0000-000000000000',
   'alda_rau2@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"alda_rau2","first_name":"Margarett","last_name":"Braun"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('70036c45-b905-bd53-cfb3-50e2c6cec403', '00000000-0000-0000-0000-000000000000',
   'domenic_jast43@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"domenic_jast43","first_name":"Norene","last_name":"Stroman"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('70036c46-1d58-67f6-caee-a405d1ad7a21', '00000000-0000-0000-0000-000000000000',
   'scottie17@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"scottie17","first_name":"Gerald","last_name":"Beahan"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('70036c47-c72e-3e94-bdab-efc5a4fe0fe3', '00000000-0000-0000-0000-000000000000',
   'major_breeder@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"major_breeder","first_name":"Delbert","last_name":"Schmidt"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('70036c48-0d52-1f7f-16bb-7ddd50d0dbeb', '00000000-0000-0000-0000-000000000000',
   'teagan92@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"teagan92","first_name":"Jaron","last_name":"Sporer"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('70036c49-2766-500f-98e4-eb19dead3f5e', '00000000-0000-0000-0000-000000000000',
   'felicia62@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"felicia62","first_name":"Oda","last_name":"Jones"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('70036c4a-1fde-f38a-f3b4-4bdc2d52dfcb', '00000000-0000-0000-0000-000000000000',
   'phony_leader@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"phony_leader","first_name":"Charles","last_name":"Dibbert"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('70036c4b-4f1c-aadc-7ec5-dbecdfcfeda3', '00000000-0000-0000-0000-000000000000',
   'nervous_trainer@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"nervous_trainer","first_name":"Gage","last_name":"Reilly"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('70036c4c-dfd5-dbb2-abf7-de2ef16f1c7d', '00000000-0000-0000-0000-000000000000',
   'savanah33@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"savanah33","first_name":"Rebeca","last_name":"Lang"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('70036c4d-7aaf-96f9-93bf-41ee6e39e9e8', '00000000-0000-0000-0000-000000000000',
   'trusting_trainer_973@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"trusting_trainer_973","first_name":"Nels","last_name":"Rosenbaum"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e375-f4db-acad-20ed-ba22f94a1c5b', '00000000-0000-0000-0000-000000000000',
   'wilsontrantow30@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"wilsontrantow30","first_name":"Alexandre","last_name":"Hills"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e374-0a25-f3ad-fc07-b170182cfb43', '00000000-0000-0000-0000-000000000000',
   'jackiebins45@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"jackiebins45","first_name":"Layla","last_name":"Powlowski"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e373-fb7b-1dcb-9eba-1153d4f74bea', '00000000-0000-0000-0000-000000000000',
   'prime_trainer_706@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"prime_trainer_706","first_name":"Tremayne","last_name":"Littel"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e372-fa97-8f0d-c9fa-dd96de4dda2f', '00000000-0000-0000-0000-000000000000',
   'millie_zieme65@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"millie_zieme65","first_name":"Antonietta","last_name":"Gerhold"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e371-38f5-e7b2-f951-3b7c95df330a', '00000000-0000-0000-0000-000000000000',
   'chelsea_witting@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"chelsea_witting","first_name":"Sarina","last_name":"Larkin"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e370-1be0-29e6-b03f-f0eedabae306', '00000000-0000-0000-0000-000000000000',
   'liquid_ace@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"liquid_ace","first_name":"Kyla","last_name":"DuBuque"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e36f-fcef-addc-0efe-4e8e2ef1f8db', '00000000-0000-0000-0000-000000000000',
   'distinct_breeder@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"distinct_breeder","first_name":"Aurelia","last_name":"Kihn"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e36e-0788-f895-841d-eda8cba0788c', '00000000-0000-0000-0000-000000000000',
   'myrtice66@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"myrtice66","first_name":"Pierce","last_name":"Schumm"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e36d-1e72-a566-bb6d-f5923e3bf2c5', '00000000-0000-0000-0000-000000000000',
   'lenore_schulist95@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"lenore_schulist95","first_name":"Adam","last_name":"Treutel"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e36c-9cd7-5b6c-9e2d-9c3ac420edc5', '00000000-0000-0000-0000-000000000000',
   'jayson63@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"jayson63","first_name":"Reece","last_name":"Farrell"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e356-22fc-611d-4747-1b1b5bdeb77e', '00000000-0000-0000-0000-000000000000',
   'laurettayundt22@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"laurettayundt22","first_name":"Guiseppe","last_name":"Raynor"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e355-9a7e-be58-3feb-cbd1a2cbf065', '00000000-0000-0000-0000-000000000000',
   'maiya_renner@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"maiya_renner","first_name":"Chanel","last_name":"Douglas"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e354-fc4e-2b8d-dbb6-183f7fec2cea', '00000000-0000-0000-0000-000000000000',
   'ashleylueilwitz37@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"ashleylueilwitz37","first_name":"Isadore","last_name":"Larkin"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e353-2fcf-96b9-2e4d-e31ba1f1ff53', '00000000-0000-0000-0000-000000000000',
   'sneaky_master@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"sneaky_master","first_name":"Grayce","last_name":"Hilll"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e352-6db9-2d94-89ca-a09a05a3b405', '00000000-0000-0000-0000-000000000000',
   'frozen_trainer_101@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"frozen_trainer_101","first_name":"Angelo","last_name":"Zieme"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e351-88ab-dfb6-f95c-0daeeded1b3a', '00000000-0000-0000-0000-000000000000',
   'price45@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"price45","first_name":"Jeffery","last_name":"Hane"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e350-be43-2ea5-01f6-ad842dbeb0fb', '00000000-0000-0000-0000-000000000000',
   'marilyne_bogan7@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"marilyne_bogan7","first_name":"Vern","last_name":"Hermann"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e34f-899d-e524-de6b-cce5aacabe3b', '00000000-0000-0000-0000-000000000000',
   'wilhelmmccullough77@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"wilhelmmccullough77","first_name":"Madison","last_name":"Hayes"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e34e-b6cf-dda3-a05f-f28b4cad47bc', '00000000-0000-0000-0000-000000000000',
   'tressa72@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"tressa72","first_name":"Jodie","last_name":"Reynolds"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e34d-df89-fdd8-9f0d-7b2cae1cccde', '00000000-0000-0000-0000-000000000000',
   'smooth_trainer_36@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"smooth_trainer_36","first_name":"Colten","last_name":"Hills-Hansen"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e337-7914-dafe-e9db-29c8cc47700c', '00000000-0000-0000-0000-000000000000',
   'dominic_kuphal@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"dominic_kuphal","first_name":"Melisa","last_name":"Larson"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e336-a21a-a9aa-3d2a-ef11655d55a9', '00000000-0000-0000-0000-000000000000',
   'joshweimann33@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"joshweimann33","first_name":"Savion","last_name":"Dibbert"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e335-7d0e-fce1-95af-5e4cafd72345', '00000000-0000-0000-0000-000000000000',
   'big_gym@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"big_gym","first_name":"Angie","last_name":"Conn"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e334-ecea-9eb1-bba1-b4537ab4ddd5', '00000000-0000-0000-0000-000000000000',
   'kelli_buckridge72@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"kelli_buckridge72","first_name":"Karina","last_name":"Koch"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e333-bf4b-6bcd-b8eb-3fb6cd6f344d', '00000000-0000-0000-0000-000000000000',
   'winifred46@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"winifred46","first_name":"Jesse","last_name":"O''Reilly"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e332-9fed-3d93-0cbf-d1a4ccbf6aca', '00000000-0000-0000-0000-000000000000',
   'crooked_gym@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"crooked_gym","first_name":"Arnulfo","last_name":"Schneider"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e331-9aed-7caf-d2e7-f13c4c6efb64', '00000000-0000-0000-0000-000000000000',
   'jermaineharvey25@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"jermaineharvey25","first_name":"Reyes","last_name":"Fisher"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e330-dec2-9adc-8f29-0ae6c6eab0ff', '00000000-0000-0000-0000-000000000000',
   'frozen_trainer_653@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"frozen_trainer_653","first_name":"Sasha","last_name":"Schaefer"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e32f-6d66-a1dc-edd4-15b0cfcb1cd2', '00000000-0000-0000-0000-000000000000',
   'richardswaniawski20@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"richardswaniawski20","first_name":"Kamryn","last_name":"Flatley"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e32e-9bdd-9ddd-f5b2-8aeedabd157a', '00000000-0000-0000-0000-000000000000',
   'unused_trainer_669@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"unused_trainer_669","first_name":"Shana","last_name":"Larson"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e318-4b00-4027-bcb6-e81d27bdaff2', '00000000-0000-0000-0000-000000000000',
   'cooperative_trainer_@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"cooperative_trainer_","first_name":"Eryn","last_name":"Dietrich"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e317-0e15-1df2-8a82-9a117eee7d0d', '00000000-0000-0000-0000-000000000000',
   'godfreyjenkins91@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"godfreyjenkins91","first_name":"Lenore","last_name":"Senger"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e316-c02c-7aec-f9e6-6b9bcce97c8d', '00000000-0000-0000-0000-000000000000',
   'lera_reilly90@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"lera_reilly90","first_name":"Bryce","last_name":"Jones"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e315-0ee7-196e-d84f-9f3a0bf80083', '00000000-0000-0000-0000-000000000000',
   'robust_elite@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"robust_elite","first_name":"Hipolito","last_name":"Toy"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e314-dcf6-f887-b3cb-ac9654175fc7', '00000000-0000-0000-0000-000000000000',
   'slushy_trainer_459@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"slushy_trainer_459","first_name":"Stella","last_name":"Will"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e313-0ab5-fefb-d2b2-b6de3afacc86', '00000000-0000-0000-0000-000000000000',
   'broderick40@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"broderick40","first_name":"Linda","last_name":"Mraz"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e312-f42c-9cd1-d9bd-e0afff267b64', '00000000-0000-0000-0000-000000000000',
   'nolanlangosh54@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"nolanlangosh54","first_name":"Samir","last_name":"Jaskolski-Shields"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e311-acd1-a188-172b-e1fb61bbf118', '00000000-0000-0000-0000-000000000000',
   'adela1@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"adela1","first_name":"Name","last_name":"Romaguera"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e310-fd7e-2db9-cd1f-5fcbcb3b5a62', '00000000-0000-0000-0000-000000000000',
   'dariusschneider93@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"dariusschneider93","first_name":"Susie","last_name":"Kreiger"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e30f-1c05-a627-5c6b-d9e8f1fa8df0', '00000000-0000-0000-0000-000000000000',
   'awful_ranger@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"awful_ranger","first_name":"Aaliyah","last_name":"Beahan"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2f9-e17f-b9a4-881a-9cc4ead4ed63', '00000000-0000-0000-0000-000000000000',
   'scornful_trainer_666@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"scornful_trainer_666","first_name":"Noemie","last_name":"Prosacco-Gulgowski"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2f8-812b-5c08-7029-a8bd0afbe6bb', '00000000-0000-0000-0000-000000000000',
   'short_term_elite@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"short_term_elite","first_name":"Golden","last_name":"Dooley"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2f7-806e-fc0d-bba8-6155aaa1febf', '00000000-0000-0000-0000-000000000000',
   'werner_auer80@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"werner_auer80","first_name":"Ahmad","last_name":"Rutherford"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2f6-8e57-e6ad-f130-d92fb5be16ba', '00000000-0000-0000-0000-000000000000',
   'vincent_hickle19@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"vincent_hickle19","first_name":"Osvaldo","last_name":"Corkery"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2f5-4eff-fc59-d1df-4bdefbfa3af5', '00000000-0000-0000-0000-000000000000',
   'hope_cummerata20@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"hope_cummerata20","first_name":"Willard","last_name":"Stehr"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2f4-e5d4-7ca2-90ae-268ef0a88aee', '00000000-0000-0000-0000-000000000000',
   'rare_master@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"rare_master","first_name":"Oleta","last_name":"Anderson"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2f3-003d-6ec9-cba6-7ded9baa4d47', '00000000-0000-0000-0000-000000000000',
   'flo_friesen@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"flo_friesen","first_name":"Claude","last_name":"Brakus"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2f2-3db6-902a-09b1-f46650af4eac', '00000000-0000-0000-0000-000000000000',
   'coralie_bernhard@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"coralie_bernhard","first_name":"Rocio","last_name":"Powlowski"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2f1-1bf3-bce0-5d6f-a2bb8ecffaef', '00000000-0000-0000-0000-000000000000',
   'ella_ratke@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"ella_ratke","first_name":"Rae","last_name":"Romaguera-Huel"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2f0-ffce-a83b-a80c-0ff95fbcf1bf', '00000000-0000-0000-0000-000000000000',
   'total_champion@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"total_champion","first_name":"Cleora","last_name":"Harvey"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2da-5dcc-d0e1-c667-d7a81b69f718', '00000000-0000-0000-0000-000000000000',
   'chaz13@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"chaz13","first_name":"Else","last_name":"Swaniawski"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2d9-b3f2-8af9-7854-a56efd11e62d', '00000000-0000-0000-0000-000000000000',
   'lucius41@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"lucius41","first_name":"Drew","last_name":"Kemmer"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2d8-65dd-e23e-ad4c-fe80c59f8c4e', '00000000-0000-0000-0000-000000000000',
   'purple_champion@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"purple_champion","first_name":"Violette","last_name":"Padberg"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2d7-de5f-24da-0545-51aade1ecbce', '00000000-0000-0000-0000-000000000000',
   'bart74@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"bart74","first_name":"Destinee","last_name":"Reilly"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2d6-deb9-d5f9-9ee1-c6906b1ae2a9', '00000000-0000-0000-0000-000000000000',
   'colby_roberts52@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"colby_roberts52","first_name":"Thalia","last_name":"Lind"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2d5-f266-5bb7-7cb6-ee77bed28cb4', '00000000-0000-0000-0000-000000000000',
   'faraway_master@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"faraway_master","first_name":"Antoinette","last_name":"Ondricka"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2d4-30fa-b310-3d57-24bd51854fdc', '00000000-0000-0000-0000-000000000000',
   'marianna_stokes@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"marianna_stokes","first_name":"Margie","last_name":"Powlowski"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2d3-273f-48d4-b90b-1acdf50fbccc', '00000000-0000-0000-0000-000000000000',
   'hildegard_predovic@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"hildegard_predovic","first_name":"Sarai","last_name":"Lemke"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2d2-1d8b-f1e1-8b9f-c747818afef0', '00000000-0000-0000-0000-000000000000',
   'estell85@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"estell85","first_name":"Archibald","last_name":"Schneider"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2d1-abb3-eda3-4dad-adedcd3af546', '00000000-0000-0000-0000-000000000000',
   'maiyaabshire82@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"maiyaabshire82","first_name":"Katelyn","last_name":"Runolfsson"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2bb-b5f5-ee75-4f4d-5ebba41f8905', '00000000-0000-0000-0000-000000000000',
   'cristobalupton55@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"cristobalupton55","first_name":"Arely","last_name":"Hoppe"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2ba-7dfc-c5c1-2f7a-bcf509207bc6', '00000000-0000-0000-0000-000000000000',
   'uncomfortable_traine@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"uncomfortable_traine","first_name":"Alison","last_name":"Hand"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2b9-cddc-cfa9-f85d-ee7b4ffebfd1', '00000000-0000-0000-0000-000000000000',
   'entire_trainer@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"entire_trainer","first_name":"Lindsay","last_name":"Batz"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2b8-d3fa-ec30-bdfc-bfba83c6ecd7', '00000000-0000-0000-0000-000000000000',
   'marguerite_hintz@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"marguerite_hintz","first_name":"Mavis","last_name":"Gorczany"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2b7-cd4a-6bf0-ddfa-c171fbce1814', '00000000-0000-0000-0000-000000000000',
   'angelic_trainer_423@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"angelic_trainer_423","first_name":"Lennie","last_name":"Tillman"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2b6-b765-257e-14b3-7d31a6cb3cb3', '00000000-0000-0000-0000-000000000000',
   'janellebradtke25@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"janellebradtke25","first_name":"Wava","last_name":"Wisoky"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2b5-afce-bc6b-cfd8-4aaaac7c879a', '00000000-0000-0000-0000-000000000000',
   'firsthand_gym@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"firsthand_gym","first_name":"Jaida","last_name":"Schuster"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2b4-c8e3-c464-4c6e-fc38b81ccb3e', '00000000-0000-0000-0000-000000000000',
   'dirty_trainer_951@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"dirty_trainer_951","first_name":"Kenyon","last_name":"Kuhn"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2b3-a72a-e064-5daa-a3a9dfa8c304', '00000000-0000-0000-0000-000000000000',
   'cyrilfriesen33@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"cyrilfriesen33","first_name":"Sarina","last_name":"Murazik"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e2b2-3095-1f2d-638b-8a2b5ece810c', '00000000-0000-0000-0000-000000000000',
   'johnnievandervort55@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"johnnievandervort55","first_name":"Amaya","last_name":"Lubowitz"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e29c-eda6-6f0f-fdf6-71957ce48e12', '00000000-0000-0000-0000-000000000000',
   'ophelia96@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"ophelia96","first_name":"Dimitri","last_name":"Pagac"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e29b-aacd-ba10-4e98-dde6f54479c2', '00000000-0000-0000-0000-000000000000',
   'parched_trainer_151@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"parched_trainer_151","first_name":"Isac","last_name":"Franecki"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e29a-cd7a-eecc-ed87-0cb2ca2f41da', '00000000-0000-0000-0000-000000000000',
   'multicolored_champio@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"multicolored_champio","first_name":"Elinore","last_name":"Kerluke"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e299-f5f9-711f-a4d5-c7cca77b741a', '00000000-0000-0000-0000-000000000000',
   'quick_trainer_532@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"quick_trainer_532","first_name":"Celine","last_name":"Gulgowski"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e298-b0a8-3efc-f192-dee17c8cbd85', '00000000-0000-0000-0000-000000000000',
   'romaine_homenick@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"romaine_homenick","first_name":"Ellen","last_name":"Carter"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e297-c093-dc5b-af4d-eedd8abe9ac3', '00000000-0000-0000-0000-000000000000',
   'happy_trainer_413@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"happy_trainer_413","first_name":"Maegan","last_name":"Huels"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e296-050f-f8a7-ebe8-b5f0def2e3d4', '00000000-0000-0000-0000-000000000000',
   'kamron_kemmer91@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"kamron_kemmer91","first_name":"Jazlyn","last_name":"Hackett"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e295-0ed3-50cf-25de-910c80c0b60c', '00000000-0000-0000-0000-000000000000',
   'kasandracronin25@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"kasandracronin25","first_name":"Nikko","last_name":"Boehm"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e294-cb44-be29-7d14-a1a978b3cba3', '00000000-0000-0000-0000-000000000000',
   'waynegorczany73@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"waynegorczany73","first_name":"Summer","last_name":"Lubowitz"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e293-4e5d-d659-5ece-c83a7e51f3ff', '00000000-0000-0000-0000-000000000000',
   'filthy_trainer_361@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"filthy_trainer_361","first_name":"Marilie","last_name":"Barton"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e27d-7cc4-efcc-b0c0-df64a5d22fec', '00000000-0000-0000-0000-000000000000',
   'quick_witted_leader@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"quick_witted_leader","first_name":"Edyth","last_name":"Mosciski"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e27c-5da4-12dc-0a7a-e7a0150d9c36', '00000000-0000-0000-0000-000000000000',
   'marianamitchell71@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"marianamitchell71","first_name":"Hillard","last_name":"Runte"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e27b-d7e8-3f6b-fdbe-ee6054edd0a7', '00000000-0000-0000-0000-000000000000',
   'wicked_trainer@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"wicked_trainer","first_name":"Kirstin","last_name":"Kutch"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e27a-8ab2-0f75-0bcf-cb1c8d852623', '00000000-0000-0000-0000-000000000000',
   'nippy_elite@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"nippy_elite","first_name":"Aurelie","last_name":"VonRueden"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e279-2d2c-ffad-aad4-069dc42f2acb', '00000000-0000-0000-0000-000000000000',
   'irma58@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"irma58","first_name":"Elmira","last_name":"Pacocha"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e278-af56-ddbc-a8ea-4fc7e061af7e', '00000000-0000-0000-0000-000000000000',
   'bad_trainer_106@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"bad_trainer_106","first_name":"Karl","last_name":"Nienow"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e277-7b3e-f978-2d98-e9e1beef3adc', '00000000-0000-0000-0000-000000000000',
   'nigeljerde94@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"nigeljerde94","first_name":"Blanche","last_name":"Wisozk"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e276-bb1c-d863-39d1-eacc1adcb6e2', '00000000-0000-0000-0000-000000000000',
   'eugene_huel73@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"eugene_huel73","first_name":"Katrine","last_name":"Swaniawski"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e275-0f1b-629e-81dd-8491ccc7bccd', '00000000-0000-0000-0000-000000000000',
   'wallace_reichert@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"wallace_reichert","first_name":"Tremaine","last_name":"Kshlerin"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('6f95e274-41da-b4e1-9344-818ba8c3b11c', '00000000-0000-0000-0000-000000000000',
   'pastel_gym@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"pastel_gym","first_name":"Kara","last_name":"Ernser"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97505-6132-2b57-ffe3-8c10ee9a9073', '00000000-0000-0000-0000-000000000000',
   'shad_williamson9@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"shad_williamson9","first_name":"Kara","last_name":"Bayer"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97506-beca-e167-bf5d-c489f3b7a9cc', '00000000-0000-0000-0000-000000000000',
   'well_to_do_trainer_5@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"well_to_do_trainer_5","first_name":"Emerald","last_name":"Ferry"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97507-3edd-f47e-a97d-c3acc4a07bc5', '00000000-0000-0000-0000-000000000000',
   'sammy_pouros@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"sammy_pouros","first_name":"Josianne","last_name":"Collier-Padberg"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97508-db60-a6a0-ce3a-2dc8bd40ccdd', '00000000-0000-0000-0000-000000000000',
   'odd_ranger@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"odd_ranger","first_name":"Leonel","last_name":"Cole"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97509-d113-b468-b0ee-be03daceeeff', '00000000-0000-0000-0000-000000000000',
   'hilma_veum18@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"hilma_veum18","first_name":"Delfina","last_name":"Luettgen"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9750a-5aa6-94fe-e6ba-ff82eac4b69e', '00000000-0000-0000-0000-000000000000',
   'shanelfeeney90@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"shanelfeeney90","first_name":"Dakota","last_name":"Stokes"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9750b-dc4f-871a-256b-d6cca3fef7be', '00000000-0000-0000-0000-000000000000',
   'entire_gym@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"entire_gym","first_name":"Clovis","last_name":"Vandervort"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9750c-c2fa-e5d3-1fac-83cc4fbdaccf', '00000000-0000-0000-0000-000000000000',
   'blanca13@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"blanca13","first_name":"Makayla","last_name":"Schulist"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9750d-d1fe-d55e-6b83-0bf877b9dbb3', '00000000-0000-0000-0000-000000000000',
   'taut_trainer_671@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"taut_trainer_671","first_name":"Francisca","last_name":"Reinger"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9750e-5ab7-df9e-7149-40eca321fe92', '00000000-0000-0000-0000-000000000000',
   'delta_olson@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"delta_olson","first_name":"Cletus","last_name":"O''Conner"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97524-b79e-bcd0-bafa-fa5bfc2f7085', '00000000-0000-0000-0000-000000000000',
   'fausto_mraz11@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"fausto_mraz11","first_name":"Darlene","last_name":"Dickens"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97525-dda7-2e16-673b-2d21e4cb1f5c', '00000000-0000-0000-0000-000000000000',
   'ettie_abbott24@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"ettie_abbott24","first_name":"Cicero","last_name":"Greenfelder"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97526-4668-8b3f-36bb-ae3c18906fe7', '00000000-0000-0000-0000-000000000000',
   'thrifty_trainer_14@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"thrifty_trainer_14","first_name":"Ofelia","last_name":"Vandervort"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97527-b7d4-3eed-db17-6d73db82456e', '00000000-0000-0000-0000-000000000000',
   'delectable_trainer_3@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"delectable_trainer_3","first_name":"Brown","last_name":"Brekke"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97528-d7f0-f61d-5813-61e0a26e3f4a', '00000000-0000-0000-0000-000000000000',
   'rubbery_elite@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"rubbery_elite","first_name":"Connie","last_name":"Schmidt"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97529-dd15-a4ae-97f9-a7ecab79c7be', '00000000-0000-0000-0000-000000000000',
   'shaylee16@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"shaylee16","first_name":"Gaetano","last_name":"Hayes"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9752a-a7d4-ac46-aa4f-ff9adbf59240', '00000000-0000-0000-0000-000000000000',
   'shy_ace@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"shy_ace","first_name":"Golden","last_name":"Jacobson"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9752b-aafc-7e1d-27bd-8ac7d1bc393f', '00000000-0000-0000-0000-000000000000',
   'woeful_trainer_243@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"woeful_trainer_243","first_name":"Roger","last_name":"Cremin"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9752c-b51f-26bc-d38d-faead4eddab7', '00000000-0000-0000-0000-000000000000',
   'lorna_effertz@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"lorna_effertz","first_name":"Mara","last_name":"Wilderman"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9752d-b7a0-a7e0-caa1-fbd5a912c54b', '00000000-0000-0000-0000-000000000000',
   'clint_denesik@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"clint_denesik","first_name":"Dovie","last_name":"Heidenreich"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97543-9c59-09cc-7628-2affddf6daaa', '00000000-0000-0000-0000-000000000000',
   'beloved_leader@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"beloved_leader","first_name":"Alfreda","last_name":"Skiles"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97544-cb20-f8d1-fec2-ca8dedd264da', '00000000-0000-0000-0000-000000000000',
   'emiliebednar53@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"emiliebednar53","first_name":"Leonie","last_name":"Friesen"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97545-a3f4-24a9-c009-bd1be8c2eaee', '00000000-0000-0000-0000-000000000000',
   'frivolous_master@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"frivolous_master","first_name":"Jarod","last_name":"Morissette"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97546-866f-eff8-b9d3-e47a8d9a516a', '00000000-0000-0000-0000-000000000000',
   'treverhartmann73@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"treverhartmann73","first_name":"Tobin","last_name":"Schmeler"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97547-9f9b-0fe0-8f9b-efcbdaa8ff1c', '00000000-0000-0000-0000-000000000000',
   'happy_trainer_400@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"happy_trainer_400","first_name":"Kristy","last_name":"Corwin"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97548-6426-ba53-7e7f-a3daff12f640', '00000000-0000-0000-0000-000000000000',
   'annette20@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"annette20","first_name":"Amparo","last_name":"Langworth-Greenfelder"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97549-ad9b-a8dd-7def-b96f3c668f1c', '00000000-0000-0000-0000-000000000000',
   'sorrowful_trainer_13@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"sorrowful_trainer_13","first_name":"Lempi","last_name":"Balistreri"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9754a-e7ce-0be2-3fb0-59faf6bb83fc', '00000000-0000-0000-0000-000000000000',
   'cruel_trainer_440@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"cruel_trainer_440","first_name":"Destinee","last_name":"Bogisich"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9754b-9bab-c7b5-4b50-eb9fcc3cdcf8', '00000000-0000-0000-0000-000000000000',
   'lee51@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"lee51","first_name":"Gabe","last_name":"D''Amore"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9754c-f97b-f6a1-1876-a746f99cf5ef', '00000000-0000-0000-0000-000000000000',
   'late_trainer_395@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"late_trainer_395","first_name":"Dee","last_name":"Williamson-Franey"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97562-ca42-e147-db26-549f488ffb51', '00000000-0000-0000-0000-000000000000',
   'brilliant_breeder@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"brilliant_breeder","first_name":"Laury","last_name":"Ebert"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97563-097f-a6b6-9fff-4ede3ac6a7cd', '00000000-0000-0000-0000-000000000000',
   'dixiesanford87@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"dixiesanford87","first_name":"Floy","last_name":"Hahn"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97564-edf2-bba2-ecce-ab0e196b2fb3', '00000000-0000-0000-0000-000000000000',
   'lonny_bechtelar49@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"lonny_bechtelar49","first_name":"Joanne","last_name":"Gerlach"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97565-d121-5258-edcf-2a6e7f56e0ff', '00000000-0000-0000-0000-000000000000',
   'courteous_trainer_87@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"courteous_trainer_87","first_name":"Jammie","last_name":"O''Hara"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97566-cfa1-9aee-6b1f-7a7fef562e0d', '00000000-0000-0000-0000-000000000000',
   'weldon_bergnaum_schu@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"weldon_bergnaum_schu","first_name":"Willow","last_name":"Kessler"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97567-42ec-a1c9-7c2a-c4441cc01cc7', '00000000-0000-0000-0000-000000000000',
   'sigrid67@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"sigrid67","first_name":"Helga","last_name":"Terry"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97568-22ec-fd42-bcdb-fc1ac6e6f0c3', '00000000-0000-0000-0000-000000000000',
   'laurynbalistreri76@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"laurynbalistreri76","first_name":"Krista","last_name":"Padberg"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97569-e3e5-3fda-698f-667c5e5d2ed3', '00000000-0000-0000-0000-000000000000',
   'defensive_champion@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"defensive_champion","first_name":"Taya","last_name":"Considine"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9756a-2e42-3ec7-ebef-d50adccf3fef', '00000000-0000-0000-0000-000000000000',
   'jabari_pagac18@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"jabari_pagac18","first_name":"Buddy","last_name":"Kassulke"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9756b-ee3d-a515-edf5-f08d3c5e8d20', '00000000-0000-0000-0000-000000000000',
   'marquis78@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"marquis78","first_name":"London","last_name":"Kessler"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97581-f362-5b81-7fd9-3fc6112ceac9', '00000000-0000-0000-0000-000000000000',
   'dominic_zulauf@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"dominic_zulauf","first_name":"Ted","last_name":"Schinner"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97582-ab9b-dd9d-d932-0d54a7b3fcd8', '00000000-0000-0000-0000-000000000000',
   'shameful_master@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"shameful_master","first_name":"Louvenia","last_name":"Hettinger"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97583-f9a5-bc45-dc95-de9a4d7faace', '00000000-0000-0000-0000-000000000000',
   'corrupt_trainer@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"corrupt_trainer","first_name":"Kyler","last_name":"Leannon"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97584-b282-d9b4-38ef-9b1fe6c2f3e5', '00000000-0000-0000-0000-000000000000',
   'ivah_mcglynn@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"ivah_mcglynn","first_name":"Taya","last_name":"Wilderman"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97585-8af4-5695-0df7-70ec33bd0d68', '00000000-0000-0000-0000-000000000000',
   'soupy_breeder@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"soupy_breeder","first_name":"Simone","last_name":"Harris"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97586-1ecb-4bc6-e13b-ce0f030ceec0', '00000000-0000-0000-0000-000000000000',
   'stunning_gym@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"stunning_gym","first_name":"Guy","last_name":"Kub"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97587-3fb1-d5bb-fbaa-2cc19cc215d2', '00000000-0000-0000-0000-000000000000',
   'jaeden50@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"jaeden50","first_name":"Callie","last_name":"Dach"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97588-d2dd-293f-a2bb-ebeb8caaacc8', '00000000-0000-0000-0000-000000000000',
   'candid_breeder@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"candid_breeder","first_name":"Pat","last_name":"Nikolaus"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97589-3a60-7bc7-9f85-5aa4f09b7c4a', '00000000-0000-0000-0000-000000000000',
   'jeraldferry81@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"jeraldferry81","first_name":"Estella","last_name":"Ferry"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9758a-3a14-ef8e-b5fe-f5e120fbbb63', '00000000-0000-0000-0000-000000000000',
   'those_trainer_198@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"those_trainer_198","first_name":"Felton","last_name":"Hamill"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975a0-a72d-b3ba-decb-1140af2c3658', '00000000-0000-0000-0000-000000000000',
   'garricklindgren16@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"garricklindgren16","first_name":"Bartholome","last_name":"Watsica"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975a1-bc34-7d42-f0bb-623febef35c4', '00000000-0000-0000-0000-000000000000',
   'jeffryyost15@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"jeffryyost15","first_name":"Amie","last_name":"Becker"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975a2-81a2-87bb-3883-bf482d2fb8ce', '00000000-0000-0000-0000-000000000000',
   'salty_trainer_403@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"salty_trainer_403","first_name":"Mable","last_name":"White"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975a3-d3bf-1a37-08cd-ec42c3fcbf26', '00000000-0000-0000-0000-000000000000',
   'chance65@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"chance65","first_name":"Tevin","last_name":"Little"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975a4-c4cc-af4c-d9f9-38e7dd71f6b9', '00000000-0000-0000-0000-000000000000',
   'gummy_pro@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"gummy_pro","first_name":"Katherine","last_name":"O''Keefe"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975a5-efce-0dbc-714e-8a10fbb5a34a', '00000000-0000-0000-0000-000000000000',
   'orland_kihn@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"orland_kihn","first_name":"Francesca","last_name":"Osinski"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975a6-0b0c-efba-ee1a-5aac73bce7ee', '00000000-0000-0000-0000-000000000000',
   'delilaho_hara84@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"delilaho_hara84","first_name":"Antwan","last_name":"Wuckert"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975a7-dca6-c19a-ff6a-79cfd4d1d76b', '00000000-0000-0000-0000-000000000000',
   'aliviashields97@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"aliviashields97","first_name":"Layne","last_name":"Barrows"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975a8-1593-ea5c-fedb-bcc22b50f0db', '00000000-0000-0000-0000-000000000000',
   'alyson_stiedemann@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"alyson_stiedemann","first_name":"Taylor","last_name":"Labadie"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975a9-75fe-5b1b-1eae-ceffeb2b2dad', '00000000-0000-0000-0000-000000000000',
   'jazmin_lubowitz@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"jazmin_lubowitz","first_name":"Sven","last_name":"Morissette"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975bf-94f2-804b-41a0-1baecf1bcbb5', '00000000-0000-0000-0000-000000000000',
   'dim_trainer_491@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"dim_trainer_491","first_name":"Geraldine","last_name":"Rau"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975c0-cde0-15ed-ad4b-f5a1cb397bc0', '00000000-0000-0000-0000-000000000000',
   'monica_crist_fahey79@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"monica_crist_fahey79","first_name":"Zoie","last_name":"Smith"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975c1-37fc-89c0-1d1f-e58cdea1e9a1', '00000000-0000-0000-0000-000000000000',
   'scornful_elite@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"scornful_elite","first_name":"Nicola","last_name":"Fisher-Hane"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975c2-5ecb-d8bb-22be-6da502a48bf2', '00000000-0000-0000-0000-000000000000',
   'squeaky_trainer_454@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"squeaky_trainer_454","first_name":"Gerard","last_name":"Rohan"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975c3-e7dc-19ab-ad59-ddfc1d735957', '00000000-0000-0000-0000-000000000000',
   'jazmyne80@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"jazmyne80","first_name":"Maximus","last_name":"Conn"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975c4-a327-b512-cd5c-be5d6f087b1b', '00000000-0000-0000-0000-000000000000',
   'frequent_trainer_572@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"frequent_trainer_572","first_name":"Fabian","last_name":"Trantow"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975c5-86ab-ebed-25fc-c91956a1c9d1', '00000000-0000-0000-0000-000000000000',
   'mariannamacejkovic76@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"mariannamacejkovic76","first_name":"Fiona","last_name":"Grimes"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975c6-5e32-ccaf-e1f8-6c6109ccf663', '00000000-0000-0000-0000-000000000000',
   'assuntaschoen_koelpi@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"assuntaschoen_koelpi","first_name":"Evie","last_name":"Maggio"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975c7-dd39-6a9f-17ab-6adebccc686a', '00000000-0000-0000-0000-000000000000',
   'foolhardy_trainer_79@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"foolhardy_trainer_79","first_name":"Wendell","last_name":"Thompson"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975c8-a976-b10b-a25e-cfabff4b44e8', '00000000-0000-0000-0000-000000000000',
   'vidaboyle57@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"vidaboyle57","first_name":"Berniece","last_name":"Kohler"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975de-e499-d14e-db07-d6ed1df1b683', '00000000-0000-0000-0000-000000000000',
   'ashtyn_vonrueden@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"ashtyn_vonrueden","first_name":"Carmen","last_name":"Volkman-Cummerata"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975df-47ae-e473-bade-8adb079540e5', '00000000-0000-0000-0000-000000000000',
   'vernie34@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"vernie34","first_name":"Clay","last_name":"Runte"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975e0-638e-d9e1-4cd0-8efe7292ea6a', '00000000-0000-0000-0000-000000000000',
   'enlightened_trainer_@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"enlightened_trainer_","first_name":"Jayme","last_name":"Wolff"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975e1-a90c-7bef-fb8e-e62c7ea4d19c', '00000000-0000-0000-0000-000000000000',
   'elsie_stroman@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"elsie_stroman","first_name":"Bridie","last_name":"Tillman"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975e2-30e5-51ec-ee7d-04ca78b0545b', '00000000-0000-0000-0000-000000000000',
   'nella_russel@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"nella_russel","first_name":"Robin","last_name":"Gutmann"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975e3-bda0-f83e-6cc9-c59beb8e3e8a', '00000000-0000-0000-0000-000000000000',
   'claudestreich31@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"claudestreich31","first_name":"Flavio","last_name":"Lubowitz"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975e4-b5de-ebeb-2d0a-3489d1b4ceca', '00000000-0000-0000-0000-000000000000',
   'drab_trainer_487@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"drab_trainer_487","first_name":"Julien","last_name":"Kub"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975e5-ef27-dc05-d04f-d5105d9fe84b', '00000000-0000-0000-0000-000000000000',
   'novakuhic68@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"novakuhic68","first_name":"Madeline","last_name":"Hagenes"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975e6-7e6a-e3aa-dde2-e2b5efa49da2', '00000000-0000-0000-0000-000000000000',
   'quincy_pouros90@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"quincy_pouros90","first_name":"Shane","last_name":"Kshlerin"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975e7-1ca5-5ad8-a2af-a4b59ba5ed8b', '00000000-0000-0000-0000-000000000000',
   'sigmund_senger46@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"sigmund_senger46","first_name":"Morgan","last_name":"Murphy"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975fd-ee82-b2e4-588b-a35b3dcfeee5', '00000000-0000-0000-0000-000000000000',
   'noted_gym@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"noted_gym","first_name":"Charles","last_name":"Littel"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975fe-91b7-adde-9cd2-b61ec3bce5d7', '00000000-0000-0000-0000-000000000000',
   'front_trainer_895@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"front_trainer_895","first_name":"Rylee","last_name":"White"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd975ff-a77f-e09d-62ad-c13d4bb6ecf1', '00000000-0000-0000-0000-000000000000',
   'amber_reichel25@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"amber_reichel25","first_name":"Aaron","last_name":"Block"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97600-96d0-ec6b-0fb6-71f0e9e5baf1', '00000000-0000-0000-0000-000000000000',
   'made_up_trainer_161@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"made_up_trainer_161","first_name":"Carmella","last_name":"Hickle"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97601-7515-ebe8-fab5-aafe70ab3afe', '00000000-0000-0000-0000-000000000000',
   'easy_trainer_738@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"easy_trainer_738","first_name":"Kiera","last_name":"Stoltenberg"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97602-c4de-d2d2-1b8c-193fcf72f69e', '00000000-0000-0000-0000-000000000000',
   'twin_trainer_704@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"twin_trainer_704","first_name":"Kamryn","last_name":"Kshlerin"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97603-1fc8-74ef-3d99-5cab631f4f89', '00000000-0000-0000-0000-000000000000',
   'stunning_trainer_537@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"stunning_trainer_537","first_name":"Angeline","last_name":"Tremblay"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97604-562e-12e7-fc5e-2b95ddfd845a', '00000000-0000-0000-0000-000000000000',
   'fredrick_hagenes66@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"fredrick_hagenes66","first_name":"Clement","last_name":"Bahringer"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97605-db8a-e0d9-739a-8e9fdb287cc1', '00000000-0000-0000-0000-000000000000',
   'tatyanahintz44@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"tatyanahintz44","first_name":"Mac","last_name":"Harvey"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97606-e97d-ecf0-2dc6-5b18bca7dcce', '00000000-0000-0000-0000-000000000000',
   'thorny_trainer_213@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"thorny_trainer_213","first_name":"Kariane","last_name":"Cassin"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9761c-41df-31b5-cfe8-ead94bbbae2f', '00000000-0000-0000-0000-000000000000',
   'arturofahey55@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"arturofahey55","first_name":"Maybell","last_name":"Herman"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9761d-fefe-802b-e9ab-14cfd2f40f6e', '00000000-0000-0000-0000-000000000000',
   'skylar_bednar@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"skylar_bednar","first_name":"Caleigh","last_name":"Adams"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9761e-63d8-597a-f9cc-3fbed9daad7f', '00000000-0000-0000-0000-000000000000',
   'ornery_trainer_904@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"ornery_trainer_904","first_name":"Marco","last_name":"Muller"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9761f-53fb-47d1-31ba-afeae0dbb76e', '00000000-0000-0000-0000-000000000000',
   'ashamed_elite@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"ashamed_elite","first_name":"Anabelle","last_name":"Kirlin"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97620-af11-ebda-2aa6-6c1d5dee9f76', '00000000-0000-0000-0000-000000000000',
   'true_elite@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"true_elite","first_name":"Kelli","last_name":"Legros"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97621-91e4-e9fc-e0ad-329ebb30b1de', '00000000-0000-0000-0000-000000000000',
   'nettie_hermiston@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"nettie_hermiston","first_name":"Kale","last_name":"Bartoletti"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97622-6e3f-295a-5dd4-d18fed682fbf', '00000000-0000-0000-0000-000000000000',
   'malvinamitchell24@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"malvinamitchell24","first_name":"Eliseo","last_name":"Miller"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97623-0ea7-e0cc-49ef-0e35502f622f', '00000000-0000-0000-0000-000000000000',
   'enriquebalistreri40@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"enriquebalistreri40","first_name":"Stacey","last_name":"Klocko"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97624-789a-9ce7-c249-4d3adf8dc91a', '00000000-0000-0000-0000-000000000000',
   'desiree_fadel@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"desiree_fadel","first_name":"Jorge","last_name":"Weimann"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97625-5341-40d6-f477-0c0edbbe8e01', '00000000-0000-0000-0000-000000000000',
   'leta_kunde1@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"leta_kunde1","first_name":"Patsy","last_name":"Kunze"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978c6-acfa-5dc4-5b0f-2b8ad9b105e2', '00000000-0000-0000-0000-000000000000',
   'katheryn_braun@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"katheryn_braun","first_name":"Gregoria","last_name":"Labadie"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978c7-ca3c-ad75-2bc7-a7ed383dae6e', '00000000-0000-0000-0000-000000000000',
   'incomplete_trainer_6@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"incomplete_trainer_6","first_name":"Chauncey","last_name":"Weimann"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978c8-d62a-d060-9dfe-3db3eaaf44f4', '00000000-0000-0000-0000-000000000000',
   'personal_trainer_58@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"personal_trainer_58","first_name":"Justice","last_name":"Sipes"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978c9-ad2f-f2ec-8a5f-0c9e4eaadada', '00000000-0000-0000-0000-000000000000',
   'oswaldo_kling@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"oswaldo_kling","first_name":"Doris","last_name":"Carroll"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978ca-b25c-7ff5-0f92-f0d323ffb875', '00000000-0000-0000-0000-000000000000',
   'price_fay82@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"price_fay82","first_name":"Rachel","last_name":"Nitzsche"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978cb-9afc-5dc8-a634-2feea1dc9cfb', '00000000-0000-0000-0000-000000000000',
   'katrina16@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"katrina16","first_name":"Jayden","last_name":"Kirlin"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978cc-aaa6-fe86-a53b-6d2e602ed5bd', '00000000-0000-0000-0000-000000000000',
   'arnoldo81@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"arnoldo81","first_name":"Alysha","last_name":"Mitchell"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978cd-06e7-5bc2-eb3f-88bf29a871f9', '00000000-0000-0000-0000-000000000000',
   'garett_bergnaum@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"garett_bergnaum","first_name":"Blanche","last_name":"O''Connell"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978ce-0203-1f63-5eb8-d87486e6c148', '00000000-0000-0000-0000-000000000000',
   'substantial_trainer_@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"substantial_trainer_","first_name":"Eliane","last_name":"Green"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978cf-bc66-ad42-d7c7-2cb49bc2cfbd', '00000000-0000-0000-0000-000000000000',
   'gaston_funk5@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"gaston_funk5","first_name":"Chadrick","last_name":"Armstrong"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978e5-ebef-0d9c-5fdb-14a0b0e8df72', '00000000-0000-0000-0000-000000000000',
   'scary_trainer_677@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"scary_trainer_677","first_name":"Hans","last_name":"Ortiz"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978e6-fd7c-c901-bff1-4acde0cb5f40', '00000000-0000-0000-0000-000000000000',
   'oval_trainer_521@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"oval_trainer_521","first_name":"John","last_name":"Jacobi"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978e7-daca-2f49-1c2d-daadb9baeaab', '00000000-0000-0000-0000-000000000000',
   'chaunceyjohnson55@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"chaunceyjohnson55","first_name":"Donald","last_name":"Moen"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978e8-c466-b13b-259b-a9bd2398ac83', '00000000-0000-0000-0000-000000000000',
   'kayla75@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"kayla75","first_name":"Jan","last_name":"Simonis"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978e9-d1d1-ffbf-c9cf-aecb9405b89f', '00000000-0000-0000-0000-000000000000',
   'kiplarkin25@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"kiplarkin25","first_name":"Royal","last_name":"Kulas"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978ea-0262-f624-c1cf-590e954e93fc', '00000000-0000-0000-0000-000000000000',
   'izabellabeahan79@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"izabellabeahan79","first_name":"Noemi","last_name":"Marquardt"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978eb-fd5b-f59b-6046-93df1eef05ee', '00000000-0000-0000-0000-000000000000',
   'bill_pacocha@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"bill_pacocha","first_name":"Bruce","last_name":"Homenick"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978ec-e4ff-c369-66f3-a0de64eff75f', '00000000-0000-0000-0000-000000000000',
   'sniveling_trainer@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"sniveling_trainer","first_name":"Darien","last_name":"Schroeder"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978ed-e0cb-b72d-adce-be8bb882e2e9', '00000000-0000-0000-0000-000000000000',
   'jacynthe_klein@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"jacynthe_klein","first_name":"Alanna","last_name":"Sauer"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd978ee-d968-865c-1e37-15ad4aadabec', '00000000-0000-0000-0000-000000000000',
   'marilie_medhurst82@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"marilie_medhurst82","first_name":"Madisen","last_name":"Kuhic"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97904-9fc3-98f5-ed9e-f25ef203f3bc', '00000000-0000-0000-0000-000000000000',
   'impossible_trainer_9@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"impossible_trainer_9","first_name":"Kariane","last_name":"Heidenreich"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97905-96bb-addc-965b-992f4495c89b', '00000000-0000-0000-0000-000000000000',
   'pertinent_trainer_27@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"pertinent_trainer_27","first_name":"Ebba","last_name":"Pacocha"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97906-5be2-a417-3fb3-0b3d7c61449e', '00000000-0000-0000-0000-000000000000',
   'carleykerluke47@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"carleykerluke47","first_name":"Jessica","last_name":"MacGyver"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97907-55ba-b1fb-6e9d-cbfda6a48df8', '00000000-0000-0000-0000-000000000000',
   'adolfomoen96@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"adolfomoen96","first_name":"Janis","last_name":"Walter"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97908-1cd9-91bb-3222-d453fc574a0e', '00000000-0000-0000-0000-000000000000',
   'flaviedare76@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"flaviedare76","first_name":"Jacinto","last_name":"Wunsch"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97909-2f5b-73c6-ecaa-a1ed13f983b2', '00000000-0000-0000-0000-000000000000',
   'stanley_schneider@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"stanley_schneider","first_name":"Dereck","last_name":"Lynch"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9790a-c7ef-c7c7-1f21-d6e78579fbe0', '00000000-0000-0000-0000-000000000000',
   'norene68@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"norene68","first_name":"Octavia","last_name":"Casper"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9790b-0ea0-fa24-1cdb-bcd0f9ce7e2e', '00000000-0000-0000-0000-000000000000',
   'krystina_beatty85@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"krystina_beatty85","first_name":"Aileen","last_name":"Watsica"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9790c-07bf-ff62-5cfa-037c1e8ebadd', '00000000-0000-0000-0000-000000000000',
   'vain_trainer_113@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"vain_trainer_113","first_name":"Estefania","last_name":"Emard"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9790d-abc9-cb0d-c3dd-32f853ede1d8', '00000000-0000-0000-0000-000000000000',
   'practical_leader@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"practical_leader","first_name":"Moshe","last_name":"Swaniawski"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97923-6c0c-77ec-dc5b-90cedac12d61', '00000000-0000-0000-0000-000000000000',
   'jaleelstracke93@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"jaleelstracke93","first_name":"Salvatore","last_name":"Waters"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97924-ebc5-47a6-b3f2-eebf9d76cac6', '00000000-0000-0000-0000-000000000000',
   'kayden33@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"kayden33","first_name":"Louvenia","last_name":"Anderson"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97925-a6b8-c2f9-7f8c-9f2ca436f5a0', '00000000-0000-0000-0000-000000000000',
   'artfritsch16@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"artfritsch16","first_name":"Raoul","last_name":"Oberbrunner"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97926-44ec-b8ba-5b02-da9b8abaf47a', '00000000-0000-0000-0000-000000000000',
   'khalillarson_schuppe@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"khalillarson_schuppe","first_name":"Emely","last_name":"Wiegand"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97927-fbd6-1e8c-b7f2-63b4febba7ad', '00000000-0000-0000-0000-000000000000',
   'nicolaconn45@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"nicolaconn45","first_name":"Dangelo","last_name":"Kemmer"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97928-5ab5-bce7-ad84-fba9789bba2a', '00000000-0000-0000-0000-000000000000',
   'tressie65@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"tressie65","first_name":"Vidal","last_name":"Mills"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97929-8fcc-3565-c016-45bc0982effa', '00000000-0000-0000-0000-000000000000',
   'colorless_trainer_93@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"colorless_trainer_93","first_name":"Magdalen","last_name":"Upton"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9792a-afec-e9da-e1bf-bcde1807bec2', '00000000-0000-0000-0000-000000000000',
   'well_lit_trainer_814@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"well_lit_trainer_814","first_name":"Afton","last_name":"Schroeder"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9792b-aa2e-9a80-2af7-fffaea9460d5', '00000000-0000-0000-0000-000000000000',
   'overcooked_trainer_5@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"overcooked_trainer_5","first_name":"Stefan","last_name":"Jacobson"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9792c-b066-366b-e8f7-6b019ef1cadc', '00000000-0000-0000-0000-000000000000',
   'oleflatley25@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"oleflatley25","first_name":"Brayan","last_name":"Lakin"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97942-acba-35a3-757f-8c2b8ef4dd94', '00000000-0000-0000-0000-000000000000',
   'dallas56@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"dallas56","first_name":"Sedrick","last_name":"Welch"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97943-6aeb-ca1f-adec-27d41bc3cfbc', '00000000-0000-0000-0000-000000000000',
   'nicola69@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"nicola69","first_name":"Miguel","last_name":"Ebert"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97944-5f9d-606c-8bde-5acef5f800aa', '00000000-0000-0000-0000-000000000000',
   'clementina80@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"clementina80","first_name":"Oscar","last_name":"Beatty"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97945-4b3e-a2a1-d5bb-ecc8eb6c9cc4', '00000000-0000-0000-0000-000000000000',
   'ripe_trainer_294@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"ripe_trainer_294","first_name":"Elise","last_name":"Jaskolski"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97946-258a-0ff7-79d3-4c58de7f0aab', '00000000-0000-0000-0000-000000000000',
   'fortunate_champion@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"fortunate_champion","first_name":"Mohammed","last_name":"Abbott"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97947-6226-dbdd-0427-b073eaa9f4ba', '00000000-0000-0000-0000-000000000000',
   'tianna46@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"tianna46","first_name":"Cora","last_name":"Schultz"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97948-4afb-87de-e1ad-2fe1e7c99db0', '00000000-0000-0000-0000-000000000000',
   'titus_kohler60@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"titus_kohler60","first_name":"Karlee","last_name":"Blanda"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97949-aeec-2bfc-c1fb-87ddac821187', '00000000-0000-0000-0000-000000000000',
   'ciara_heidenreich33@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"ciara_heidenreich33","first_name":"Alexie","last_name":"Wilkinson"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9794a-b387-bb2a-858a-7580a30ebba4', '00000000-0000-0000-0000-000000000000',
   'sick_trainer@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"sick_trainer","first_name":"Dorothea","last_name":"Considine"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9794b-4918-a87d-d183-f2e64e090ab7', '00000000-0000-0000-0000-000000000000',
   'runny_champion@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"runny_champion","first_name":"Bell","last_name":"Stokes-Pfeffer"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97961-54bc-e4eb-c550-6a14fbaf838c', '00000000-0000-0000-0000-000000000000',
   'huge_trainer_672@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"huge_trainer_672","first_name":"Justine","last_name":"Dooley"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97962-cf98-c9c5-abbb-4fb73097c4c5', '00000000-0000-0000-0000-000000000000',
   'annette_harber2@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"annette_harber2","first_name":"Kaycee","last_name":"Grant"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97963-3fc4-423a-abad-f06e00cf5fb6', '00000000-0000-0000-0000-000000000000',
   'jaydeemard34@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"jaydeemard34","first_name":"Miles","last_name":"Koepp"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97964-f4ce-3fed-4daf-3a739babf8d8', '00000000-0000-0000-0000-000000000000',
   'violent_trainer_345@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"violent_trainer_345","first_name":"Jerald","last_name":"Ernser"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97965-05bc-ee9e-b42e-cbadfb2c5bff', '00000000-0000-0000-0000-000000000000',
   'mauricelittel79@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"mauricelittel79","first_name":"Cortney","last_name":"Aufderhar"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97966-e9d3-f20d-5abc-f6f28c8dbef1', '00000000-0000-0000-0000-000000000000',
   'jailyn75@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"jailyn75","first_name":"Jermain","last_name":"Kreiger"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97967-94e3-6b54-d118-fc9c8e1edb46', '00000000-0000-0000-0000-000000000000',
   'sally_block33@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"sally_block33","first_name":"Jovany","last_name":"Schoen"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97968-0083-ce8c-0307-d2d9e24096dd', '00000000-0000-0000-0000-000000000000',
   'bowed_ace@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"bowed_ace","first_name":"Monty","last_name":"Raynor"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97969-5062-aeda-e10e-6575b9be8537', '00000000-0000-0000-0000-000000000000',
   'multicolored_trainer@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"multicolored_trainer","first_name":"Zora","last_name":"Trantow"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9796a-cf2a-21ff-194a-ced7d6edc760', '00000000-0000-0000-0000-000000000000',
   'slushy_breeder@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"slushy_breeder","first_name":"Ladarius","last_name":"Kuhic"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97980-3dad-0eaa-dae7-b0052530e0a3', '00000000-0000-0000-0000-000000000000',
   'itzel12@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"itzel12","first_name":"Ubaldo","last_name":"Emmerich"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97981-2e34-cad5-0afb-ad9ba9bb650c', '00000000-0000-0000-0000-000000000000',
   'sincere98@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"sincere98","first_name":"Magdalen","last_name":"Trantow"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97982-f649-1fcc-ea0d-f9a4438cc8cf', '00000000-0000-0000-0000-000000000000',
   'caleighparker77@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"caleighparker77","first_name":"Skylar","last_name":"Schoen"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97983-50fa-232d-2a05-df1cacdff5da', '00000000-0000-0000-0000-000000000000',
   'cathrinemosciski_wun@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"cathrinemosciski_wun","first_name":"Damaris","last_name":"Langworth"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97984-8dbb-bc8d-561b-955dccda8e29', '00000000-0000-0000-0000-000000000000',
   'aged_trainer_120@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"aged_trainer_120","first_name":"Kenya","last_name":"Bartoletti"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97985-daea-88ea-cd32-d60d4efa45b3', '00000000-0000-0000-0000-000000000000',
   'jessicaleannon22@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"jessicaleannon22","first_name":"Deanna","last_name":"Bergnaum"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97986-cdbd-6b2e-ff50-cfb45b7cabcb', '00000000-0000-0000-0000-000000000000',
   'emmittdubuque80@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"emmittdubuque80","first_name":"Alessandra","last_name":"Wolf"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97987-f0f5-08e0-cbd1-eeeec0a86989', '00000000-0000-0000-0000-000000000000',
   'rickylockman29@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"rickylockman29","first_name":"Emilio","last_name":"Wisoky"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97988-292d-3b06-eafd-71cec2f5fd5d', '00000000-0000-0000-0000-000000000000',
   'ashton_kshlerin@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"ashton_kshlerin","first_name":"Haley","last_name":"Walsh"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97989-c5f0-4595-adfc-1f3b597c2c3f', '00000000-0000-0000-0000-000000000000',
   'westonwilderman14@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"westonwilderman14","first_name":"Juvenal","last_name":"Fadel"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd9799f-82dd-dfd0-8c8d-d8dbafa3bbbb', '00000000-0000-0000-0000-000000000000',
   'houston_walter@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"houston_walter","first_name":"Benny","last_name":"Kerluke"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979a0-dbeb-1abe-ba36-34f35cd3bb56', '00000000-0000-0000-0000-000000000000',
   'fake_ace@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"fake_ace","first_name":"Clementine","last_name":"Wolf"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979a1-c2c3-1ead-76ba-7facf5f8eafa', '00000000-0000-0000-0000-000000000000',
   'rey_bode55@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"rey_bode55","first_name":"Lea","last_name":"Sauer"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979a2-3897-bbcc-b2f9-61a75fa51c0e', '00000000-0000-0000-0000-000000000000',
   'robin_schultz@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"robin_schultz","first_name":"Jude","last_name":"Leffler"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979a3-c600-0a6b-99bf-62c79eadbafb', '00000000-0000-0000-0000-000000000000',
   'gloomy_champion@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"gloomy_champion","first_name":"Darron","last_name":"Moore"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979a4-aae1-d971-ca2d-aad9ed6398cc', '00000000-0000-0000-0000-000000000000',
   'trusty_gym@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"trusty_gym","first_name":"Norris","last_name":"Bernier"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979a5-1fc9-ecdc-67dd-fd2c9facb71d', '00000000-0000-0000-0000-000000000000',
   'memorable_master@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"memorable_master","first_name":"Else","last_name":"Carroll-Williamson"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979a6-4ee8-4eda-dba3-78bed2376ddf', '00000000-0000-0000-0000-000000000000',
   'brody25@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"brody25","first_name":"Katarina","last_name":"Bosco"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979a7-8f9a-a5cd-ae41-dcfeeccc8e9b', '00000000-0000-0000-0000-000000000000',
   'taut_leader@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"taut_leader","first_name":"Judson","last_name":"Roberts"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979a8-4430-add4-6ae5-a96a1b5f1f4d', '00000000-0000-0000-0000-000000000000',
   'kenna_beahan@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"kenna_beahan","first_name":"Abe","last_name":"Purdy"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979be-e2c6-eaf0-6405-e5bdf88a3d8c', '00000000-0000-0000-0000-000000000000',
   'viviane_rempel@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"viviane_rempel","first_name":"Willis","last_name":"McKenzie"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979bf-b5b9-cdd9-09dc-e3e4a7f18f4b', '00000000-0000-0000-0000-000000000000',
   'pitiful_elite@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"pitiful_elite","first_name":"Oran","last_name":"Fahey"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979c0-406a-b4fb-eff1-40f7b7c23787', '00000000-0000-0000-0000-000000000000',
   'outstanding_elite@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"outstanding_elite","first_name":"Laverna","last_name":"Price"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979c1-8bde-a2cf-cdf4-9a1f2fb0ecb5', '00000000-0000-0000-0000-000000000000',
   'bustling_elite@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"bustling_elite","first_name":"Annabelle","last_name":"Yost"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979c2-cad6-2ccd-e1b8-db6cf2bde72b', '00000000-0000-0000-0000-000000000000',
   'heavy_trainer_256@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"heavy_trainer_256","first_name":"Vita","last_name":"Towne"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979c3-6e69-b2e8-18db-f16c1c2c7d31', '00000000-0000-0000-0000-000000000000',
   'willing_trainer_39@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"willing_trainer_39","first_name":"Judy","last_name":"Bergstrom"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979c4-c50e-4dc1-2ad6-fd70a4c9cdc8', '00000000-0000-0000-0000-000000000000',
   'brannonlarkin62@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"brannonlarkin62","first_name":"Madison","last_name":"Jenkins"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979c5-77e1-e4f3-a41d-c8fcc6ba7d33', '00000000-0000-0000-0000-000000000000',
   'opheliadicki91@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"opheliadicki91","first_name":"Alden","last_name":"Mueller"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979c6-fdd7-6400-deed-cad7ef5cb3d6', '00000000-0000-0000-0000-000000000000',
   'madyson24@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"madyson24","first_name":"Isaias","last_name":"Rippin"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979c7-5dee-e8ef-0daa-c3ac0609abed', '00000000-0000-0000-0000-000000000000',
   'weekly_trainer_641@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"weekly_trainer_641","first_name":"Marian","last_name":"Langworth"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979dd-8302-ebf7-de3f-a1cb0217bb5e', '00000000-0000-0000-0000-000000000000',
   'thoramarvin72@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"thoramarvin72","first_name":"Mertie","last_name":"Ratke"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979de-df8d-c9ee-b07a-6fcaf5da7a2b', '00000000-0000-0000-0000-000000000000',
   'alvertalemke46@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"alvertalemke46","first_name":"Brendan","last_name":"Zieme"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979df-a48d-0fc8-9cb6-7ec36dffae4a', '00000000-0000-0000-0000-000000000000',
   'elaina_nitzsche@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"elaina_nitzsche","first_name":"Selmer","last_name":"Lehner"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979e0-9c6e-3ee5-7ca7-b14a1cfefecd', '00000000-0000-0000-0000-000000000000',
   'recent_trainer_469@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"recent_trainer_469","first_name":"Saige","last_name":"Bahringer"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979e1-d34d-25c7-ae48-dadeb5083fe0', '00000000-0000-0000-0000-000000000000',
   'lucy_reilly@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"lucy_reilly","first_name":"Yessenia","last_name":"Orn"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979e2-e59b-d2d4-bbda-65d394ba77cc', '00000000-0000-0000-0000-000000000000',
   'delores_orn44@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"delores_orn44","first_name":"Norwood","last_name":"Jerde"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979e3-66d9-fde4-e531-c2366dba55f0', '00000000-0000-0000-0000-000000000000',
   'unpleasant_pro@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"unpleasant_pro","first_name":"Vaughn","last_name":"Hodkiewicz"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979e4-2e49-4c20-1e3f-12baeebda7ed', '00000000-0000-0000-0000-000000000000',
   'cody_heaney@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"cody_heaney","first_name":"Kaycee","last_name":"Baumbach"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979e5-3c63-c883-8d7e-e33c806db22e', '00000000-0000-0000-0000-000000000000',
   'dario_west44@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"dario_west44","first_name":"Alena","last_name":"Connelly"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd979e6-f7ee-5b9e-9aa5-49adf6a0bf80', '00000000-0000-0000-0000-000000000000',
   'overcooked_ranger@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"overcooked_ranger","first_name":"Nina","last_name":"Frami"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97c87-39d9-cc4c-b829-1296e8abf5eb', '00000000-0000-0000-0000-000000000000',
   'qualified_trainer_61@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"qualified_trainer_61","first_name":"Deondre","last_name":"Pfeffer"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97c88-edb6-b49a-cd90-c3d08f296dd5', '00000000-0000-0000-0000-000000000000',
   'fred_pacocha47@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"fred_pacocha47","first_name":"Wilfrid","last_name":"Schumm"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97c89-14f9-f4df-6cd8-cc3878aae69b', '00000000-0000-0000-0000-000000000000',
   'powerless_trainer_33@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"powerless_trainer_33","first_name":"Alexandrine","last_name":"Pfannerstill"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97c8a-3770-dc8a-d83f-cf041ca2ccff', '00000000-0000-0000-0000-000000000000',
   'kasey_jacobi99@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"kasey_jacobi99","first_name":"Mariana","last_name":"Little"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97c8b-c2ba-99be-ce3f-bedccc2c95d9', '00000000-0000-0000-0000-000000000000',
   'unselfish_trainer_12@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"unselfish_trainer_12","first_name":"Roxane","last_name":"Lakin"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97c8c-eeb2-5dfe-e90b-ead76dbb24e8', '00000000-0000-0000-0000-000000000000',
   'diamond_kunze75@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"diamond_kunze75","first_name":"Ashlee","last_name":"Sauer"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97c8d-0b70-e3c6-1121-aa79eefd78dd', '00000000-0000-0000-0000-000000000000',
   'valentin_hodkiewicz3@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"valentin_hodkiewicz3","first_name":"Gerry","last_name":"Fisher"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97c8e-13dd-ef86-cfdb-b7ccf0735d04', '00000000-0000-0000-0000-000000000000',
   'gregorio_schuster_ke@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"gregorio_schuster_ke","first_name":"Guadalupe","last_name":"Schultz"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97c8f-a7e6-cae5-7aed-12a273def8dc', '00000000-0000-0000-0000-000000000000',
   'lexieerdman24@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"lexieerdman24","first_name":"Jo","last_name":"White"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97c90-2dac-c94a-22f4-6a9fdef6796f', '00000000-0000-0000-0000-000000000000',
   'rosy_trainer_409@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"rosy_trainer_409","first_name":"Guadalupe","last_name":"Powlowski"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97ca6-cebf-2c59-d510-00254f62cce6', '00000000-0000-0000-0000-000000000000',
   'casimer_baumbach@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"casimer_baumbach","first_name":"Myles","last_name":"Jacobi"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97ca7-ad4a-2837-8ff2-f102fe435bc4', '00000000-0000-0000-0000-000000000000',
   'michale_orn@outlook.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"michale_orn","first_name":"Lucious","last_name":"Abshire"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97ca8-e309-baeb-2cb2-30ddef1db6f6', '00000000-0000-0000-0000-000000000000',
   'fuzzy_pro@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"fuzzy_pro","first_name":"Hugh","last_name":"Schumm"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97ca9-b210-ddf8-7dce-b9dca430f256', '00000000-0000-0000-0000-000000000000',
   'shanie_maggio@proton.me', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"shanie_maggio","first_name":"Nils","last_name":"Armstrong"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97caa-fe9f-aba9-0ed4-eefdf5cc52f6', '00000000-0000-0000-0000-000000000000',
   'grant_bednar@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"grant_bednar","first_name":"Annalise","last_name":"Pouros"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97cab-2a12-5cec-75cf-f21fcceebefc', '00000000-0000-0000-0000-000000000000',
   'abelardo_konopelski@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"abelardo_konopelski","first_name":"Carroll","last_name":"Denesik"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97cac-d3c9-ea63-0b28-c63be23f0f0d', '00000000-0000-0000-0000-000000000000',
   'clevekling88@gmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"clevekling88","first_name":"Dessie","last_name":"Botsford"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97cad-9ff7-dc4d-1c31-8ccf91ac96b7', '00000000-0000-0000-0000-000000000000',
   'treviono_kon17@yahoo.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"treviono_kon17","first_name":"Omari","last_name":"Walter"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97cae-7c9f-28fb-367e-aabb92cebcee', '00000000-0000-0000-0000-000000000000',
   'neat_ace@hotmail.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"neat_ace","first_name":"Davin","last_name":"Lynch"}'::jsonb,
   NOW(), NOW(), '', '', '', ''),
  ('7cd97caf-acd1-416d-cdc6-53cd43dae85f', '00000000-0000-0000-0000-000000000000',
   'eryn_stracke_hand41@icloud.com', extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '{"username":"eryn_stracke_hand41","first_name":"Guiseppe","last_name":"Dickens"}'::jsonb,
   NOW(), NOW(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- auth.identities
-- -----------------------------------------------------------------------------

INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES
  (gen_random_uuid(), 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'email',
   '{"sub":"a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d","email":"admin@trainers.local","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'email',
   '{"sub":"b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e","email":"player@trainers.local","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'email',
   '{"sub":"c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f","email":"champion@trainers.local","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'email',
   '{"sub":"d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a","email":"gymleader@trainers.local","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'email',
   '{"sub":"e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b","email":"elite@trainers.local","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'email',
   '{"sub":"f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c","email":"casual@trainers.local","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d', 'a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d', 'email',
   '{"sub":"a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d","email":"lance@trainers.local","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '711a6f7d-fc44-46b9-6d36-8ab4bd1d31ef', '711a6f7d-fc44-46b9-6d36-8ab4bd1d31ef', 'email',
   '{"sub":"711a6f7d-fc44-46b9-6d36-8ab4bd1d31ef","email":"valentinemiller24@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '711a6f7c-c4fb-edde-1407-85c76b3b1fa4', '711a6f7c-c4fb-edde-1407-85c76b3b1fa4', 'email',
   '{"sub":"711a6f7c-c4fb-edde-1407-85c76b3b1fa4","email":"ellis_paucek@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '711a6f7b-d716-7aed-a2fa-caab9020e6bd', '711a6f7b-d716-7aed-a2fa-caab9020e6bd', 'email',
   '{"sub":"711a6f7b-d716-7aed-a2fa-caab9020e6bd","email":"submissive_trainer_7@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '711a6f7a-b4db-bd62-59bc-0b9427e7bf7f', '711a6f7a-b4db-bd62-59bc-0b9427e7bf7f', 'email',
   '{"sub":"711a6f7a-b4db-bd62-59bc-0b9427e7bf7f","email":"halliefay16@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '711a6f79-af5e-a5a8-ddb1-c740ce0b4e3f', '711a6f79-af5e-a5a8-ddb1-c740ce0b4e3f', 'email',
   '{"sub":"711a6f79-af5e-a5a8-ddb1-c740ce0b4e3f","email":"demetrius_gutkowski@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '711a6f78-b52d-dd77-fddb-e13dd02e03cf', '711a6f78-b52d-dd77-fddb-e13dd02e03cf', 'email',
   '{"sub":"711a6f78-b52d-dd77-fddb-e13dd02e03cf","email":"trentheaney20@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '711a6f77-c285-5f8d-dbbc-a4f60e3eee80', '711a6f77-c285-5f8d-dbbc-a4f60e3eee80', 'email',
   '{"sub":"711a6f77-c285-5f8d-dbbc-a4f60e3eee80","email":"eminent_ranger@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '711a6f76-2df3-bdaf-f76b-bdebbbefbd78', '711a6f76-2df3-bdaf-f76b-bdebbbefbd78', 'email',
   '{"sub":"711a6f76-2df3-bdaf-f76b-bdebbbefbd78","email":"hilbert38@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '711a6f75-c72b-a4d1-1bbe-ffb7b5910fcf', '711a6f75-c72b-a4d1-1bbe-ffb7b5910fcf', 'email',
   '{"sub":"711a6f75-c72b-a4d1-1bbe-ffb7b5910fcf","email":"ordinary_trainer_36@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '711a6f74-57a0-210c-fa2a-a398dd08dbce', '711a6f74-57a0-210c-fa2a-a398dd08dbce', 'email',
   '{"sub":"711a6f74-57a0-210c-fa2a-a398dd08dbce","email":"chad_friesen@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '4dcc802c-ace8-fd41-202f-17c0b62fddab', '4dcc802c-ace8-fd41-202f-17c0b62fddab', 'email',
   '{"sub":"4dcc802c-ace8-fd41-202f-17c0b62fddab","email":"blank_trainer_642@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '4dcc802d-9aa2-dbc7-d80d-27eecd967eab', '4dcc802d-9aa2-dbc7-d80d-27eecd967eab', 'email',
   '{"sub":"4dcc802d-9aa2-dbc7-d80d-27eecd967eab","email":"charlotteschoen99@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '4dcc802e-3ad2-1f1c-f11f-88befa81bc9d', '4dcc802e-3ad2-1f1c-f11f-88befa81bc9d', 'email',
   '{"sub":"4dcc802e-3ad2-1f1c-f11f-88befa81bc9d","email":"brown_gym@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '4dcc802f-cf86-d4f0-f0db-f1cfbdf9dcd0', '4dcc802f-cf86-d4f0-f0db-f1cfbdf9dcd0', 'email',
   '{"sub":"4dcc802f-cf86-d4f0-f0db-f1cfbdf9dcd0","email":"made_up_trainer_12@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '4dcc8030-fffb-6bf3-ecef-d9ed008bf3d8', '4dcc8030-fffb-6bf3-ecef-d9ed008bf3d8', 'email',
   '{"sub":"4dcc8030-fffb-6bf3-ecef-d9ed008bf3d8","email":"valentinaklocko65@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '4dcc8031-c592-ed5e-d72e-babcccd820ad', '4dcc8031-c592-ed5e-d72e-babcccd820ad', 'email',
   '{"sub":"4dcc8031-c592-ed5e-d72e-babcccd820ad","email":"ronny_koss27@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '4dcc8032-7bb8-dce3-ea5a-fa7d512233e4', '4dcc8032-7bb8-dce3-ea5a-fa7d512233e4', 'email',
   '{"sub":"4dcc8032-7bb8-dce3-ea5a-fa7d512233e4","email":"early_master@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '4dcc8033-2a48-bf0b-d1de-16ba448ad8aa', '4dcc8033-2a48-bf0b-d1de-16ba448ad8aa', 'email',
   '{"sub":"4dcc8033-2a48-bf0b-d1de-16ba448ad8aa","email":"sophieorn25@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '4dcc8034-5580-7472-ddeb-a1bca9267ec7', '4dcc8034-5580-7472-ddeb-a1bca9267ec7', 'email',
   '{"sub":"4dcc8034-5580-7472-ddeb-a1bca9267ec7","email":"faint_trainer_713@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '4dcc8035-9f28-fdb5-3eec-c6a479b52d6c', '4dcc8035-9f28-fdb5-3eec-c6a479b52d6c', 'email',
   '{"sub":"4dcc8035-9f28-fdb5-3eec-c6a479b52d6c","email":"lempi_brakus24@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '4dcc804b-b5ea-da97-ecf2-ae31acc3b433', '4dcc804b-b5ea-da97-ecf2-ae31acc3b433', 'email',
   '{"sub":"4dcc804b-b5ea-da97-ecf2-ae31acc3b433","email":"long_trainer_533@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '4dcc804c-5d8b-dd2e-d73b-dbdb365a0cad', '4dcc804c-5d8b-dd2e-d73b-dbdb365a0cad', 'email',
   '{"sub":"4dcc804c-5d8b-dd2e-d73b-dbdb365a0cad","email":"mallory39@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '4dcc804d-efb5-73dc-8ae3-cbd0decfef3c', '4dcc804d-efb5-73dc-8ae3-cbd0decfef3c', 'email',
   '{"sub":"4dcc804d-efb5-73dc-8ae3-cbd0decfef3c","email":"reidstamm21@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '4dcc804e-2edb-d817-b078-be77a94933a9', '4dcc804e-2edb-d817-b078-be77a94933a9', 'email',
   '{"sub":"4dcc804e-2edb-d817-b078-be77a94933a9","email":"insistent_ranger@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '4dcc804f-d1a4-d440-ac1b-9b98c34ce85e', '4dcc804f-d1a4-d440-ac1b-9b98c34ce85e', 'email',
   '{"sub":"4dcc804f-d1a4-d440-ac1b-9b98c34ce85e","email":"francesco_nader66@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '70036c44-e525-fcc8-e46d-01403c9db758', '70036c44-e525-fcc8-e46d-01403c9db758', 'email',
   '{"sub":"70036c44-e525-fcc8-e46d-01403c9db758","email":"alda_rau2@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '70036c45-b905-bd53-cfb3-50e2c6cec403', '70036c45-b905-bd53-cfb3-50e2c6cec403', 'email',
   '{"sub":"70036c45-b905-bd53-cfb3-50e2c6cec403","email":"domenic_jast43@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '70036c46-1d58-67f6-caee-a405d1ad7a21', '70036c46-1d58-67f6-caee-a405d1ad7a21', 'email',
   '{"sub":"70036c46-1d58-67f6-caee-a405d1ad7a21","email":"scottie17@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '70036c47-c72e-3e94-bdab-efc5a4fe0fe3', '70036c47-c72e-3e94-bdab-efc5a4fe0fe3', 'email',
   '{"sub":"70036c47-c72e-3e94-bdab-efc5a4fe0fe3","email":"major_breeder@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '70036c48-0d52-1f7f-16bb-7ddd50d0dbeb', '70036c48-0d52-1f7f-16bb-7ddd50d0dbeb', 'email',
   '{"sub":"70036c48-0d52-1f7f-16bb-7ddd50d0dbeb","email":"teagan92@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '70036c49-2766-500f-98e4-eb19dead3f5e', '70036c49-2766-500f-98e4-eb19dead3f5e', 'email',
   '{"sub":"70036c49-2766-500f-98e4-eb19dead3f5e","email":"felicia62@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '70036c4a-1fde-f38a-f3b4-4bdc2d52dfcb', '70036c4a-1fde-f38a-f3b4-4bdc2d52dfcb', 'email',
   '{"sub":"70036c4a-1fde-f38a-f3b4-4bdc2d52dfcb","email":"phony_leader@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '70036c4b-4f1c-aadc-7ec5-dbecdfcfeda3', '70036c4b-4f1c-aadc-7ec5-dbecdfcfeda3', 'email',
   '{"sub":"70036c4b-4f1c-aadc-7ec5-dbecdfcfeda3","email":"nervous_trainer@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '70036c4c-dfd5-dbb2-abf7-de2ef16f1c7d', '70036c4c-dfd5-dbb2-abf7-de2ef16f1c7d', 'email',
   '{"sub":"70036c4c-dfd5-dbb2-abf7-de2ef16f1c7d","email":"savanah33@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '70036c4d-7aaf-96f9-93bf-41ee6e39e9e8', '70036c4d-7aaf-96f9-93bf-41ee6e39e9e8', 'email',
   '{"sub":"70036c4d-7aaf-96f9-93bf-41ee6e39e9e8","email":"trusting_trainer_973@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e375-f4db-acad-20ed-ba22f94a1c5b', '6f95e375-f4db-acad-20ed-ba22f94a1c5b', 'email',
   '{"sub":"6f95e375-f4db-acad-20ed-ba22f94a1c5b","email":"wilsontrantow30@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e374-0a25-f3ad-fc07-b170182cfb43', '6f95e374-0a25-f3ad-fc07-b170182cfb43', 'email',
   '{"sub":"6f95e374-0a25-f3ad-fc07-b170182cfb43","email":"jackiebins45@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e373-fb7b-1dcb-9eba-1153d4f74bea', '6f95e373-fb7b-1dcb-9eba-1153d4f74bea', 'email',
   '{"sub":"6f95e373-fb7b-1dcb-9eba-1153d4f74bea","email":"prime_trainer_706@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e372-fa97-8f0d-c9fa-dd96de4dda2f', '6f95e372-fa97-8f0d-c9fa-dd96de4dda2f', 'email',
   '{"sub":"6f95e372-fa97-8f0d-c9fa-dd96de4dda2f","email":"millie_zieme65@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e371-38f5-e7b2-f951-3b7c95df330a', '6f95e371-38f5-e7b2-f951-3b7c95df330a', 'email',
   '{"sub":"6f95e371-38f5-e7b2-f951-3b7c95df330a","email":"chelsea_witting@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e370-1be0-29e6-b03f-f0eedabae306', '6f95e370-1be0-29e6-b03f-f0eedabae306', 'email',
   '{"sub":"6f95e370-1be0-29e6-b03f-f0eedabae306","email":"liquid_ace@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e36f-fcef-addc-0efe-4e8e2ef1f8db', '6f95e36f-fcef-addc-0efe-4e8e2ef1f8db', 'email',
   '{"sub":"6f95e36f-fcef-addc-0efe-4e8e2ef1f8db","email":"distinct_breeder@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e36e-0788-f895-841d-eda8cba0788c', '6f95e36e-0788-f895-841d-eda8cba0788c', 'email',
   '{"sub":"6f95e36e-0788-f895-841d-eda8cba0788c","email":"myrtice66@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e36d-1e72-a566-bb6d-f5923e3bf2c5', '6f95e36d-1e72-a566-bb6d-f5923e3bf2c5', 'email',
   '{"sub":"6f95e36d-1e72-a566-bb6d-f5923e3bf2c5","email":"lenore_schulist95@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e36c-9cd7-5b6c-9e2d-9c3ac420edc5', '6f95e36c-9cd7-5b6c-9e2d-9c3ac420edc5', 'email',
   '{"sub":"6f95e36c-9cd7-5b6c-9e2d-9c3ac420edc5","email":"jayson63@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e356-22fc-611d-4747-1b1b5bdeb77e', '6f95e356-22fc-611d-4747-1b1b5bdeb77e', 'email',
   '{"sub":"6f95e356-22fc-611d-4747-1b1b5bdeb77e","email":"laurettayundt22@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e355-9a7e-be58-3feb-cbd1a2cbf065', '6f95e355-9a7e-be58-3feb-cbd1a2cbf065', 'email',
   '{"sub":"6f95e355-9a7e-be58-3feb-cbd1a2cbf065","email":"maiya_renner@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e354-fc4e-2b8d-dbb6-183f7fec2cea', '6f95e354-fc4e-2b8d-dbb6-183f7fec2cea', 'email',
   '{"sub":"6f95e354-fc4e-2b8d-dbb6-183f7fec2cea","email":"ashleylueilwitz37@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e353-2fcf-96b9-2e4d-e31ba1f1ff53', '6f95e353-2fcf-96b9-2e4d-e31ba1f1ff53', 'email',
   '{"sub":"6f95e353-2fcf-96b9-2e4d-e31ba1f1ff53","email":"sneaky_master@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e352-6db9-2d94-89ca-a09a05a3b405', '6f95e352-6db9-2d94-89ca-a09a05a3b405', 'email',
   '{"sub":"6f95e352-6db9-2d94-89ca-a09a05a3b405","email":"frozen_trainer_101@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e351-88ab-dfb6-f95c-0daeeded1b3a', '6f95e351-88ab-dfb6-f95c-0daeeded1b3a', 'email',
   '{"sub":"6f95e351-88ab-dfb6-f95c-0daeeded1b3a","email":"price45@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e350-be43-2ea5-01f6-ad842dbeb0fb', '6f95e350-be43-2ea5-01f6-ad842dbeb0fb', 'email',
   '{"sub":"6f95e350-be43-2ea5-01f6-ad842dbeb0fb","email":"marilyne_bogan7@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e34f-899d-e524-de6b-cce5aacabe3b', '6f95e34f-899d-e524-de6b-cce5aacabe3b', 'email',
   '{"sub":"6f95e34f-899d-e524-de6b-cce5aacabe3b","email":"wilhelmmccullough77@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e34e-b6cf-dda3-a05f-f28b4cad47bc', '6f95e34e-b6cf-dda3-a05f-f28b4cad47bc', 'email',
   '{"sub":"6f95e34e-b6cf-dda3-a05f-f28b4cad47bc","email":"tressa72@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e34d-df89-fdd8-9f0d-7b2cae1cccde', '6f95e34d-df89-fdd8-9f0d-7b2cae1cccde', 'email',
   '{"sub":"6f95e34d-df89-fdd8-9f0d-7b2cae1cccde","email":"smooth_trainer_36@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e337-7914-dafe-e9db-29c8cc47700c', '6f95e337-7914-dafe-e9db-29c8cc47700c', 'email',
   '{"sub":"6f95e337-7914-dafe-e9db-29c8cc47700c","email":"dominic_kuphal@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e336-a21a-a9aa-3d2a-ef11655d55a9', '6f95e336-a21a-a9aa-3d2a-ef11655d55a9', 'email',
   '{"sub":"6f95e336-a21a-a9aa-3d2a-ef11655d55a9","email":"joshweimann33@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e335-7d0e-fce1-95af-5e4cafd72345', '6f95e335-7d0e-fce1-95af-5e4cafd72345', 'email',
   '{"sub":"6f95e335-7d0e-fce1-95af-5e4cafd72345","email":"big_gym@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e334-ecea-9eb1-bba1-b4537ab4ddd5', '6f95e334-ecea-9eb1-bba1-b4537ab4ddd5', 'email',
   '{"sub":"6f95e334-ecea-9eb1-bba1-b4537ab4ddd5","email":"kelli_buckridge72@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e333-bf4b-6bcd-b8eb-3fb6cd6f344d', '6f95e333-bf4b-6bcd-b8eb-3fb6cd6f344d', 'email',
   '{"sub":"6f95e333-bf4b-6bcd-b8eb-3fb6cd6f344d","email":"winifred46@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e332-9fed-3d93-0cbf-d1a4ccbf6aca', '6f95e332-9fed-3d93-0cbf-d1a4ccbf6aca', 'email',
   '{"sub":"6f95e332-9fed-3d93-0cbf-d1a4ccbf6aca","email":"crooked_gym@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e331-9aed-7caf-d2e7-f13c4c6efb64', '6f95e331-9aed-7caf-d2e7-f13c4c6efb64', 'email',
   '{"sub":"6f95e331-9aed-7caf-d2e7-f13c4c6efb64","email":"jermaineharvey25@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e330-dec2-9adc-8f29-0ae6c6eab0ff', '6f95e330-dec2-9adc-8f29-0ae6c6eab0ff', 'email',
   '{"sub":"6f95e330-dec2-9adc-8f29-0ae6c6eab0ff","email":"frozen_trainer_653@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e32f-6d66-a1dc-edd4-15b0cfcb1cd2', '6f95e32f-6d66-a1dc-edd4-15b0cfcb1cd2', 'email',
   '{"sub":"6f95e32f-6d66-a1dc-edd4-15b0cfcb1cd2","email":"richardswaniawski20@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e32e-9bdd-9ddd-f5b2-8aeedabd157a', '6f95e32e-9bdd-9ddd-f5b2-8aeedabd157a', 'email',
   '{"sub":"6f95e32e-9bdd-9ddd-f5b2-8aeedabd157a","email":"unused_trainer_669@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e318-4b00-4027-bcb6-e81d27bdaff2', '6f95e318-4b00-4027-bcb6-e81d27bdaff2', 'email',
   '{"sub":"6f95e318-4b00-4027-bcb6-e81d27bdaff2","email":"cooperative_trainer_@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e317-0e15-1df2-8a82-9a117eee7d0d', '6f95e317-0e15-1df2-8a82-9a117eee7d0d', 'email',
   '{"sub":"6f95e317-0e15-1df2-8a82-9a117eee7d0d","email":"godfreyjenkins91@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e316-c02c-7aec-f9e6-6b9bcce97c8d', '6f95e316-c02c-7aec-f9e6-6b9bcce97c8d', 'email',
   '{"sub":"6f95e316-c02c-7aec-f9e6-6b9bcce97c8d","email":"lera_reilly90@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e315-0ee7-196e-d84f-9f3a0bf80083', '6f95e315-0ee7-196e-d84f-9f3a0bf80083', 'email',
   '{"sub":"6f95e315-0ee7-196e-d84f-9f3a0bf80083","email":"robust_elite@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e314-dcf6-f887-b3cb-ac9654175fc7', '6f95e314-dcf6-f887-b3cb-ac9654175fc7', 'email',
   '{"sub":"6f95e314-dcf6-f887-b3cb-ac9654175fc7","email":"slushy_trainer_459@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e313-0ab5-fefb-d2b2-b6de3afacc86', '6f95e313-0ab5-fefb-d2b2-b6de3afacc86', 'email',
   '{"sub":"6f95e313-0ab5-fefb-d2b2-b6de3afacc86","email":"broderick40@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e312-f42c-9cd1-d9bd-e0afff267b64', '6f95e312-f42c-9cd1-d9bd-e0afff267b64', 'email',
   '{"sub":"6f95e312-f42c-9cd1-d9bd-e0afff267b64","email":"nolanlangosh54@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e311-acd1-a188-172b-e1fb61bbf118', '6f95e311-acd1-a188-172b-e1fb61bbf118', 'email',
   '{"sub":"6f95e311-acd1-a188-172b-e1fb61bbf118","email":"adela1@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e310-fd7e-2db9-cd1f-5fcbcb3b5a62', '6f95e310-fd7e-2db9-cd1f-5fcbcb3b5a62', 'email',
   '{"sub":"6f95e310-fd7e-2db9-cd1f-5fcbcb3b5a62","email":"dariusschneider93@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e30f-1c05-a627-5c6b-d9e8f1fa8df0', '6f95e30f-1c05-a627-5c6b-d9e8f1fa8df0', 'email',
   '{"sub":"6f95e30f-1c05-a627-5c6b-d9e8f1fa8df0","email":"awful_ranger@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2f9-e17f-b9a4-881a-9cc4ead4ed63', '6f95e2f9-e17f-b9a4-881a-9cc4ead4ed63', 'email',
   '{"sub":"6f95e2f9-e17f-b9a4-881a-9cc4ead4ed63","email":"scornful_trainer_666@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2f8-812b-5c08-7029-a8bd0afbe6bb', '6f95e2f8-812b-5c08-7029-a8bd0afbe6bb', 'email',
   '{"sub":"6f95e2f8-812b-5c08-7029-a8bd0afbe6bb","email":"short_term_elite@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2f7-806e-fc0d-bba8-6155aaa1febf', '6f95e2f7-806e-fc0d-bba8-6155aaa1febf', 'email',
   '{"sub":"6f95e2f7-806e-fc0d-bba8-6155aaa1febf","email":"werner_auer80@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2f6-8e57-e6ad-f130-d92fb5be16ba', '6f95e2f6-8e57-e6ad-f130-d92fb5be16ba', 'email',
   '{"sub":"6f95e2f6-8e57-e6ad-f130-d92fb5be16ba","email":"vincent_hickle19@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2f5-4eff-fc59-d1df-4bdefbfa3af5', '6f95e2f5-4eff-fc59-d1df-4bdefbfa3af5', 'email',
   '{"sub":"6f95e2f5-4eff-fc59-d1df-4bdefbfa3af5","email":"hope_cummerata20@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2f4-e5d4-7ca2-90ae-268ef0a88aee', '6f95e2f4-e5d4-7ca2-90ae-268ef0a88aee', 'email',
   '{"sub":"6f95e2f4-e5d4-7ca2-90ae-268ef0a88aee","email":"rare_master@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2f3-003d-6ec9-cba6-7ded9baa4d47', '6f95e2f3-003d-6ec9-cba6-7ded9baa4d47', 'email',
   '{"sub":"6f95e2f3-003d-6ec9-cba6-7ded9baa4d47","email":"flo_friesen@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2f2-3db6-902a-09b1-f46650af4eac', '6f95e2f2-3db6-902a-09b1-f46650af4eac', 'email',
   '{"sub":"6f95e2f2-3db6-902a-09b1-f46650af4eac","email":"coralie_bernhard@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2f1-1bf3-bce0-5d6f-a2bb8ecffaef', '6f95e2f1-1bf3-bce0-5d6f-a2bb8ecffaef', 'email',
   '{"sub":"6f95e2f1-1bf3-bce0-5d6f-a2bb8ecffaef","email":"ella_ratke@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2f0-ffce-a83b-a80c-0ff95fbcf1bf', '6f95e2f0-ffce-a83b-a80c-0ff95fbcf1bf', 'email',
   '{"sub":"6f95e2f0-ffce-a83b-a80c-0ff95fbcf1bf","email":"total_champion@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2da-5dcc-d0e1-c667-d7a81b69f718', '6f95e2da-5dcc-d0e1-c667-d7a81b69f718', 'email',
   '{"sub":"6f95e2da-5dcc-d0e1-c667-d7a81b69f718","email":"chaz13@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2d9-b3f2-8af9-7854-a56efd11e62d', '6f95e2d9-b3f2-8af9-7854-a56efd11e62d', 'email',
   '{"sub":"6f95e2d9-b3f2-8af9-7854-a56efd11e62d","email":"lucius41@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2d8-65dd-e23e-ad4c-fe80c59f8c4e', '6f95e2d8-65dd-e23e-ad4c-fe80c59f8c4e', 'email',
   '{"sub":"6f95e2d8-65dd-e23e-ad4c-fe80c59f8c4e","email":"purple_champion@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2d7-de5f-24da-0545-51aade1ecbce', '6f95e2d7-de5f-24da-0545-51aade1ecbce', 'email',
   '{"sub":"6f95e2d7-de5f-24da-0545-51aade1ecbce","email":"bart74@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2d6-deb9-d5f9-9ee1-c6906b1ae2a9', '6f95e2d6-deb9-d5f9-9ee1-c6906b1ae2a9', 'email',
   '{"sub":"6f95e2d6-deb9-d5f9-9ee1-c6906b1ae2a9","email":"colby_roberts52@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2d5-f266-5bb7-7cb6-ee77bed28cb4', '6f95e2d5-f266-5bb7-7cb6-ee77bed28cb4', 'email',
   '{"sub":"6f95e2d5-f266-5bb7-7cb6-ee77bed28cb4","email":"faraway_master@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2d4-30fa-b310-3d57-24bd51854fdc', '6f95e2d4-30fa-b310-3d57-24bd51854fdc', 'email',
   '{"sub":"6f95e2d4-30fa-b310-3d57-24bd51854fdc","email":"marianna_stokes@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2d3-273f-48d4-b90b-1acdf50fbccc', '6f95e2d3-273f-48d4-b90b-1acdf50fbccc', 'email',
   '{"sub":"6f95e2d3-273f-48d4-b90b-1acdf50fbccc","email":"hildegard_predovic@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2d2-1d8b-f1e1-8b9f-c747818afef0', '6f95e2d2-1d8b-f1e1-8b9f-c747818afef0', 'email',
   '{"sub":"6f95e2d2-1d8b-f1e1-8b9f-c747818afef0","email":"estell85@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2d1-abb3-eda3-4dad-adedcd3af546', '6f95e2d1-abb3-eda3-4dad-adedcd3af546', 'email',
   '{"sub":"6f95e2d1-abb3-eda3-4dad-adedcd3af546","email":"maiyaabshire82@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2bb-b5f5-ee75-4f4d-5ebba41f8905', '6f95e2bb-b5f5-ee75-4f4d-5ebba41f8905', 'email',
   '{"sub":"6f95e2bb-b5f5-ee75-4f4d-5ebba41f8905","email":"cristobalupton55@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2ba-7dfc-c5c1-2f7a-bcf509207bc6', '6f95e2ba-7dfc-c5c1-2f7a-bcf509207bc6', 'email',
   '{"sub":"6f95e2ba-7dfc-c5c1-2f7a-bcf509207bc6","email":"uncomfortable_traine@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2b9-cddc-cfa9-f85d-ee7b4ffebfd1', '6f95e2b9-cddc-cfa9-f85d-ee7b4ffebfd1', 'email',
   '{"sub":"6f95e2b9-cddc-cfa9-f85d-ee7b4ffebfd1","email":"entire_trainer@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2b8-d3fa-ec30-bdfc-bfba83c6ecd7', '6f95e2b8-d3fa-ec30-bdfc-bfba83c6ecd7', 'email',
   '{"sub":"6f95e2b8-d3fa-ec30-bdfc-bfba83c6ecd7","email":"marguerite_hintz@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2b7-cd4a-6bf0-ddfa-c171fbce1814', '6f95e2b7-cd4a-6bf0-ddfa-c171fbce1814', 'email',
   '{"sub":"6f95e2b7-cd4a-6bf0-ddfa-c171fbce1814","email":"angelic_trainer_423@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2b6-b765-257e-14b3-7d31a6cb3cb3', '6f95e2b6-b765-257e-14b3-7d31a6cb3cb3', 'email',
   '{"sub":"6f95e2b6-b765-257e-14b3-7d31a6cb3cb3","email":"janellebradtke25@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2b5-afce-bc6b-cfd8-4aaaac7c879a', '6f95e2b5-afce-bc6b-cfd8-4aaaac7c879a', 'email',
   '{"sub":"6f95e2b5-afce-bc6b-cfd8-4aaaac7c879a","email":"firsthand_gym@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2b4-c8e3-c464-4c6e-fc38b81ccb3e', '6f95e2b4-c8e3-c464-4c6e-fc38b81ccb3e', 'email',
   '{"sub":"6f95e2b4-c8e3-c464-4c6e-fc38b81ccb3e","email":"dirty_trainer_951@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2b3-a72a-e064-5daa-a3a9dfa8c304', '6f95e2b3-a72a-e064-5daa-a3a9dfa8c304', 'email',
   '{"sub":"6f95e2b3-a72a-e064-5daa-a3a9dfa8c304","email":"cyrilfriesen33@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e2b2-3095-1f2d-638b-8a2b5ece810c', '6f95e2b2-3095-1f2d-638b-8a2b5ece810c', 'email',
   '{"sub":"6f95e2b2-3095-1f2d-638b-8a2b5ece810c","email":"johnnievandervort55@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e29c-eda6-6f0f-fdf6-71957ce48e12', '6f95e29c-eda6-6f0f-fdf6-71957ce48e12', 'email',
   '{"sub":"6f95e29c-eda6-6f0f-fdf6-71957ce48e12","email":"ophelia96@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e29b-aacd-ba10-4e98-dde6f54479c2', '6f95e29b-aacd-ba10-4e98-dde6f54479c2', 'email',
   '{"sub":"6f95e29b-aacd-ba10-4e98-dde6f54479c2","email":"parched_trainer_151@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e29a-cd7a-eecc-ed87-0cb2ca2f41da', '6f95e29a-cd7a-eecc-ed87-0cb2ca2f41da', 'email',
   '{"sub":"6f95e29a-cd7a-eecc-ed87-0cb2ca2f41da","email":"multicolored_champio@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e299-f5f9-711f-a4d5-c7cca77b741a', '6f95e299-f5f9-711f-a4d5-c7cca77b741a', 'email',
   '{"sub":"6f95e299-f5f9-711f-a4d5-c7cca77b741a","email":"quick_trainer_532@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e298-b0a8-3efc-f192-dee17c8cbd85', '6f95e298-b0a8-3efc-f192-dee17c8cbd85', 'email',
   '{"sub":"6f95e298-b0a8-3efc-f192-dee17c8cbd85","email":"romaine_homenick@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e297-c093-dc5b-af4d-eedd8abe9ac3', '6f95e297-c093-dc5b-af4d-eedd8abe9ac3', 'email',
   '{"sub":"6f95e297-c093-dc5b-af4d-eedd8abe9ac3","email":"happy_trainer_413@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e296-050f-f8a7-ebe8-b5f0def2e3d4', '6f95e296-050f-f8a7-ebe8-b5f0def2e3d4', 'email',
   '{"sub":"6f95e296-050f-f8a7-ebe8-b5f0def2e3d4","email":"kamron_kemmer91@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e295-0ed3-50cf-25de-910c80c0b60c', '6f95e295-0ed3-50cf-25de-910c80c0b60c', 'email',
   '{"sub":"6f95e295-0ed3-50cf-25de-910c80c0b60c","email":"kasandracronin25@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e294-cb44-be29-7d14-a1a978b3cba3', '6f95e294-cb44-be29-7d14-a1a978b3cba3', 'email',
   '{"sub":"6f95e294-cb44-be29-7d14-a1a978b3cba3","email":"waynegorczany73@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e293-4e5d-d659-5ece-c83a7e51f3ff', '6f95e293-4e5d-d659-5ece-c83a7e51f3ff', 'email',
   '{"sub":"6f95e293-4e5d-d659-5ece-c83a7e51f3ff","email":"filthy_trainer_361@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e27d-7cc4-efcc-b0c0-df64a5d22fec', '6f95e27d-7cc4-efcc-b0c0-df64a5d22fec', 'email',
   '{"sub":"6f95e27d-7cc4-efcc-b0c0-df64a5d22fec","email":"quick_witted_leader@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e27c-5da4-12dc-0a7a-e7a0150d9c36', '6f95e27c-5da4-12dc-0a7a-e7a0150d9c36', 'email',
   '{"sub":"6f95e27c-5da4-12dc-0a7a-e7a0150d9c36","email":"marianamitchell71@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e27b-d7e8-3f6b-fdbe-ee6054edd0a7', '6f95e27b-d7e8-3f6b-fdbe-ee6054edd0a7', 'email',
   '{"sub":"6f95e27b-d7e8-3f6b-fdbe-ee6054edd0a7","email":"wicked_trainer@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e27a-8ab2-0f75-0bcf-cb1c8d852623', '6f95e27a-8ab2-0f75-0bcf-cb1c8d852623', 'email',
   '{"sub":"6f95e27a-8ab2-0f75-0bcf-cb1c8d852623","email":"nippy_elite@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e279-2d2c-ffad-aad4-069dc42f2acb', '6f95e279-2d2c-ffad-aad4-069dc42f2acb', 'email',
   '{"sub":"6f95e279-2d2c-ffad-aad4-069dc42f2acb","email":"irma58@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e278-af56-ddbc-a8ea-4fc7e061af7e', '6f95e278-af56-ddbc-a8ea-4fc7e061af7e', 'email',
   '{"sub":"6f95e278-af56-ddbc-a8ea-4fc7e061af7e","email":"bad_trainer_106@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e277-7b3e-f978-2d98-e9e1beef3adc', '6f95e277-7b3e-f978-2d98-e9e1beef3adc', 'email',
   '{"sub":"6f95e277-7b3e-f978-2d98-e9e1beef3adc","email":"nigeljerde94@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e276-bb1c-d863-39d1-eacc1adcb6e2', '6f95e276-bb1c-d863-39d1-eacc1adcb6e2', 'email',
   '{"sub":"6f95e276-bb1c-d863-39d1-eacc1adcb6e2","email":"eugene_huel73@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e275-0f1b-629e-81dd-8491ccc7bccd', '6f95e275-0f1b-629e-81dd-8491ccc7bccd', 'email',
   '{"sub":"6f95e275-0f1b-629e-81dd-8491ccc7bccd","email":"wallace_reichert@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '6f95e274-41da-b4e1-9344-818ba8c3b11c', '6f95e274-41da-b4e1-9344-818ba8c3b11c', 'email',
   '{"sub":"6f95e274-41da-b4e1-9344-818ba8c3b11c","email":"pastel_gym@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97505-6132-2b57-ffe3-8c10ee9a9073', '7cd97505-6132-2b57-ffe3-8c10ee9a9073', 'email',
   '{"sub":"7cd97505-6132-2b57-ffe3-8c10ee9a9073","email":"shad_williamson9@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97506-beca-e167-bf5d-c489f3b7a9cc', '7cd97506-beca-e167-bf5d-c489f3b7a9cc', 'email',
   '{"sub":"7cd97506-beca-e167-bf5d-c489f3b7a9cc","email":"well_to_do_trainer_5@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97507-3edd-f47e-a97d-c3acc4a07bc5', '7cd97507-3edd-f47e-a97d-c3acc4a07bc5', 'email',
   '{"sub":"7cd97507-3edd-f47e-a97d-c3acc4a07bc5","email":"sammy_pouros@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97508-db60-a6a0-ce3a-2dc8bd40ccdd', '7cd97508-db60-a6a0-ce3a-2dc8bd40ccdd', 'email',
   '{"sub":"7cd97508-db60-a6a0-ce3a-2dc8bd40ccdd","email":"odd_ranger@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97509-d113-b468-b0ee-be03daceeeff', '7cd97509-d113-b468-b0ee-be03daceeeff', 'email',
   '{"sub":"7cd97509-d113-b468-b0ee-be03daceeeff","email":"hilma_veum18@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9750a-5aa6-94fe-e6ba-ff82eac4b69e', '7cd9750a-5aa6-94fe-e6ba-ff82eac4b69e', 'email',
   '{"sub":"7cd9750a-5aa6-94fe-e6ba-ff82eac4b69e","email":"shanelfeeney90@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9750b-dc4f-871a-256b-d6cca3fef7be', '7cd9750b-dc4f-871a-256b-d6cca3fef7be', 'email',
   '{"sub":"7cd9750b-dc4f-871a-256b-d6cca3fef7be","email":"entire_gym@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9750c-c2fa-e5d3-1fac-83cc4fbdaccf', '7cd9750c-c2fa-e5d3-1fac-83cc4fbdaccf', 'email',
   '{"sub":"7cd9750c-c2fa-e5d3-1fac-83cc4fbdaccf","email":"blanca13@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9750d-d1fe-d55e-6b83-0bf877b9dbb3', '7cd9750d-d1fe-d55e-6b83-0bf877b9dbb3', 'email',
   '{"sub":"7cd9750d-d1fe-d55e-6b83-0bf877b9dbb3","email":"taut_trainer_671@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9750e-5ab7-df9e-7149-40eca321fe92', '7cd9750e-5ab7-df9e-7149-40eca321fe92', 'email',
   '{"sub":"7cd9750e-5ab7-df9e-7149-40eca321fe92","email":"delta_olson@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97524-b79e-bcd0-bafa-fa5bfc2f7085', '7cd97524-b79e-bcd0-bafa-fa5bfc2f7085', 'email',
   '{"sub":"7cd97524-b79e-bcd0-bafa-fa5bfc2f7085","email":"fausto_mraz11@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97525-dda7-2e16-673b-2d21e4cb1f5c', '7cd97525-dda7-2e16-673b-2d21e4cb1f5c', 'email',
   '{"sub":"7cd97525-dda7-2e16-673b-2d21e4cb1f5c","email":"ettie_abbott24@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97526-4668-8b3f-36bb-ae3c18906fe7', '7cd97526-4668-8b3f-36bb-ae3c18906fe7', 'email',
   '{"sub":"7cd97526-4668-8b3f-36bb-ae3c18906fe7","email":"thrifty_trainer_14@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97527-b7d4-3eed-db17-6d73db82456e', '7cd97527-b7d4-3eed-db17-6d73db82456e', 'email',
   '{"sub":"7cd97527-b7d4-3eed-db17-6d73db82456e","email":"delectable_trainer_3@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97528-d7f0-f61d-5813-61e0a26e3f4a', '7cd97528-d7f0-f61d-5813-61e0a26e3f4a', 'email',
   '{"sub":"7cd97528-d7f0-f61d-5813-61e0a26e3f4a","email":"rubbery_elite@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97529-dd15-a4ae-97f9-a7ecab79c7be', '7cd97529-dd15-a4ae-97f9-a7ecab79c7be', 'email',
   '{"sub":"7cd97529-dd15-a4ae-97f9-a7ecab79c7be","email":"shaylee16@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9752a-a7d4-ac46-aa4f-ff9adbf59240', '7cd9752a-a7d4-ac46-aa4f-ff9adbf59240', 'email',
   '{"sub":"7cd9752a-a7d4-ac46-aa4f-ff9adbf59240","email":"shy_ace@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9752b-aafc-7e1d-27bd-8ac7d1bc393f', '7cd9752b-aafc-7e1d-27bd-8ac7d1bc393f', 'email',
   '{"sub":"7cd9752b-aafc-7e1d-27bd-8ac7d1bc393f","email":"woeful_trainer_243@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9752c-b51f-26bc-d38d-faead4eddab7', '7cd9752c-b51f-26bc-d38d-faead4eddab7', 'email',
   '{"sub":"7cd9752c-b51f-26bc-d38d-faead4eddab7","email":"lorna_effertz@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9752d-b7a0-a7e0-caa1-fbd5a912c54b', '7cd9752d-b7a0-a7e0-caa1-fbd5a912c54b', 'email',
   '{"sub":"7cd9752d-b7a0-a7e0-caa1-fbd5a912c54b","email":"clint_denesik@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97543-9c59-09cc-7628-2affddf6daaa', '7cd97543-9c59-09cc-7628-2affddf6daaa', 'email',
   '{"sub":"7cd97543-9c59-09cc-7628-2affddf6daaa","email":"beloved_leader@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97544-cb20-f8d1-fec2-ca8dedd264da', '7cd97544-cb20-f8d1-fec2-ca8dedd264da', 'email',
   '{"sub":"7cd97544-cb20-f8d1-fec2-ca8dedd264da","email":"emiliebednar53@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97545-a3f4-24a9-c009-bd1be8c2eaee', '7cd97545-a3f4-24a9-c009-bd1be8c2eaee', 'email',
   '{"sub":"7cd97545-a3f4-24a9-c009-bd1be8c2eaee","email":"frivolous_master@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97546-866f-eff8-b9d3-e47a8d9a516a', '7cd97546-866f-eff8-b9d3-e47a8d9a516a', 'email',
   '{"sub":"7cd97546-866f-eff8-b9d3-e47a8d9a516a","email":"treverhartmann73@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97547-9f9b-0fe0-8f9b-efcbdaa8ff1c', '7cd97547-9f9b-0fe0-8f9b-efcbdaa8ff1c', 'email',
   '{"sub":"7cd97547-9f9b-0fe0-8f9b-efcbdaa8ff1c","email":"happy_trainer_400@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97548-6426-ba53-7e7f-a3daff12f640', '7cd97548-6426-ba53-7e7f-a3daff12f640', 'email',
   '{"sub":"7cd97548-6426-ba53-7e7f-a3daff12f640","email":"annette20@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97549-ad9b-a8dd-7def-b96f3c668f1c', '7cd97549-ad9b-a8dd-7def-b96f3c668f1c', 'email',
   '{"sub":"7cd97549-ad9b-a8dd-7def-b96f3c668f1c","email":"sorrowful_trainer_13@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9754a-e7ce-0be2-3fb0-59faf6bb83fc', '7cd9754a-e7ce-0be2-3fb0-59faf6bb83fc', 'email',
   '{"sub":"7cd9754a-e7ce-0be2-3fb0-59faf6bb83fc","email":"cruel_trainer_440@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9754b-9bab-c7b5-4b50-eb9fcc3cdcf8', '7cd9754b-9bab-c7b5-4b50-eb9fcc3cdcf8', 'email',
   '{"sub":"7cd9754b-9bab-c7b5-4b50-eb9fcc3cdcf8","email":"lee51@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9754c-f97b-f6a1-1876-a746f99cf5ef', '7cd9754c-f97b-f6a1-1876-a746f99cf5ef', 'email',
   '{"sub":"7cd9754c-f97b-f6a1-1876-a746f99cf5ef","email":"late_trainer_395@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97562-ca42-e147-db26-549f488ffb51', '7cd97562-ca42-e147-db26-549f488ffb51', 'email',
   '{"sub":"7cd97562-ca42-e147-db26-549f488ffb51","email":"brilliant_breeder@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97563-097f-a6b6-9fff-4ede3ac6a7cd', '7cd97563-097f-a6b6-9fff-4ede3ac6a7cd', 'email',
   '{"sub":"7cd97563-097f-a6b6-9fff-4ede3ac6a7cd","email":"dixiesanford87@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97564-edf2-bba2-ecce-ab0e196b2fb3', '7cd97564-edf2-bba2-ecce-ab0e196b2fb3', 'email',
   '{"sub":"7cd97564-edf2-bba2-ecce-ab0e196b2fb3","email":"lonny_bechtelar49@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97565-d121-5258-edcf-2a6e7f56e0ff', '7cd97565-d121-5258-edcf-2a6e7f56e0ff', 'email',
   '{"sub":"7cd97565-d121-5258-edcf-2a6e7f56e0ff","email":"courteous_trainer_87@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97566-cfa1-9aee-6b1f-7a7fef562e0d', '7cd97566-cfa1-9aee-6b1f-7a7fef562e0d', 'email',
   '{"sub":"7cd97566-cfa1-9aee-6b1f-7a7fef562e0d","email":"weldon_bergnaum_schu@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97567-42ec-a1c9-7c2a-c4441cc01cc7', '7cd97567-42ec-a1c9-7c2a-c4441cc01cc7', 'email',
   '{"sub":"7cd97567-42ec-a1c9-7c2a-c4441cc01cc7","email":"sigrid67@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97568-22ec-fd42-bcdb-fc1ac6e6f0c3', '7cd97568-22ec-fd42-bcdb-fc1ac6e6f0c3', 'email',
   '{"sub":"7cd97568-22ec-fd42-bcdb-fc1ac6e6f0c3","email":"laurynbalistreri76@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97569-e3e5-3fda-698f-667c5e5d2ed3', '7cd97569-e3e5-3fda-698f-667c5e5d2ed3', 'email',
   '{"sub":"7cd97569-e3e5-3fda-698f-667c5e5d2ed3","email":"defensive_champion@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9756a-2e42-3ec7-ebef-d50adccf3fef', '7cd9756a-2e42-3ec7-ebef-d50adccf3fef', 'email',
   '{"sub":"7cd9756a-2e42-3ec7-ebef-d50adccf3fef","email":"jabari_pagac18@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9756b-ee3d-a515-edf5-f08d3c5e8d20', '7cd9756b-ee3d-a515-edf5-f08d3c5e8d20', 'email',
   '{"sub":"7cd9756b-ee3d-a515-edf5-f08d3c5e8d20","email":"marquis78@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97581-f362-5b81-7fd9-3fc6112ceac9', '7cd97581-f362-5b81-7fd9-3fc6112ceac9', 'email',
   '{"sub":"7cd97581-f362-5b81-7fd9-3fc6112ceac9","email":"dominic_zulauf@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97582-ab9b-dd9d-d932-0d54a7b3fcd8', '7cd97582-ab9b-dd9d-d932-0d54a7b3fcd8', 'email',
   '{"sub":"7cd97582-ab9b-dd9d-d932-0d54a7b3fcd8","email":"shameful_master@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97583-f9a5-bc45-dc95-de9a4d7faace', '7cd97583-f9a5-bc45-dc95-de9a4d7faace', 'email',
   '{"sub":"7cd97583-f9a5-bc45-dc95-de9a4d7faace","email":"corrupt_trainer@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97584-b282-d9b4-38ef-9b1fe6c2f3e5', '7cd97584-b282-d9b4-38ef-9b1fe6c2f3e5', 'email',
   '{"sub":"7cd97584-b282-d9b4-38ef-9b1fe6c2f3e5","email":"ivah_mcglynn@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97585-8af4-5695-0df7-70ec33bd0d68', '7cd97585-8af4-5695-0df7-70ec33bd0d68', 'email',
   '{"sub":"7cd97585-8af4-5695-0df7-70ec33bd0d68","email":"soupy_breeder@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97586-1ecb-4bc6-e13b-ce0f030ceec0', '7cd97586-1ecb-4bc6-e13b-ce0f030ceec0', 'email',
   '{"sub":"7cd97586-1ecb-4bc6-e13b-ce0f030ceec0","email":"stunning_gym@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97587-3fb1-d5bb-fbaa-2cc19cc215d2', '7cd97587-3fb1-d5bb-fbaa-2cc19cc215d2', 'email',
   '{"sub":"7cd97587-3fb1-d5bb-fbaa-2cc19cc215d2","email":"jaeden50@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97588-d2dd-293f-a2bb-ebeb8caaacc8', '7cd97588-d2dd-293f-a2bb-ebeb8caaacc8', 'email',
   '{"sub":"7cd97588-d2dd-293f-a2bb-ebeb8caaacc8","email":"candid_breeder@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97589-3a60-7bc7-9f85-5aa4f09b7c4a', '7cd97589-3a60-7bc7-9f85-5aa4f09b7c4a', 'email',
   '{"sub":"7cd97589-3a60-7bc7-9f85-5aa4f09b7c4a","email":"jeraldferry81@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9758a-3a14-ef8e-b5fe-f5e120fbbb63', '7cd9758a-3a14-ef8e-b5fe-f5e120fbbb63', 'email',
   '{"sub":"7cd9758a-3a14-ef8e-b5fe-f5e120fbbb63","email":"those_trainer_198@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975a0-a72d-b3ba-decb-1140af2c3658', '7cd975a0-a72d-b3ba-decb-1140af2c3658', 'email',
   '{"sub":"7cd975a0-a72d-b3ba-decb-1140af2c3658","email":"garricklindgren16@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975a1-bc34-7d42-f0bb-623febef35c4', '7cd975a1-bc34-7d42-f0bb-623febef35c4', 'email',
   '{"sub":"7cd975a1-bc34-7d42-f0bb-623febef35c4","email":"jeffryyost15@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975a2-81a2-87bb-3883-bf482d2fb8ce', '7cd975a2-81a2-87bb-3883-bf482d2fb8ce', 'email',
   '{"sub":"7cd975a2-81a2-87bb-3883-bf482d2fb8ce","email":"salty_trainer_403@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975a3-d3bf-1a37-08cd-ec42c3fcbf26', '7cd975a3-d3bf-1a37-08cd-ec42c3fcbf26', 'email',
   '{"sub":"7cd975a3-d3bf-1a37-08cd-ec42c3fcbf26","email":"chance65@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975a4-c4cc-af4c-d9f9-38e7dd71f6b9', '7cd975a4-c4cc-af4c-d9f9-38e7dd71f6b9', 'email',
   '{"sub":"7cd975a4-c4cc-af4c-d9f9-38e7dd71f6b9","email":"gummy_pro@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975a5-efce-0dbc-714e-8a10fbb5a34a', '7cd975a5-efce-0dbc-714e-8a10fbb5a34a', 'email',
   '{"sub":"7cd975a5-efce-0dbc-714e-8a10fbb5a34a","email":"orland_kihn@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975a6-0b0c-efba-ee1a-5aac73bce7ee', '7cd975a6-0b0c-efba-ee1a-5aac73bce7ee', 'email',
   '{"sub":"7cd975a6-0b0c-efba-ee1a-5aac73bce7ee","email":"delilaho_hara84@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975a7-dca6-c19a-ff6a-79cfd4d1d76b', '7cd975a7-dca6-c19a-ff6a-79cfd4d1d76b', 'email',
   '{"sub":"7cd975a7-dca6-c19a-ff6a-79cfd4d1d76b","email":"aliviashields97@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975a8-1593-ea5c-fedb-bcc22b50f0db', '7cd975a8-1593-ea5c-fedb-bcc22b50f0db', 'email',
   '{"sub":"7cd975a8-1593-ea5c-fedb-bcc22b50f0db","email":"alyson_stiedemann@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975a9-75fe-5b1b-1eae-ceffeb2b2dad', '7cd975a9-75fe-5b1b-1eae-ceffeb2b2dad', 'email',
   '{"sub":"7cd975a9-75fe-5b1b-1eae-ceffeb2b2dad","email":"jazmin_lubowitz@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975bf-94f2-804b-41a0-1baecf1bcbb5', '7cd975bf-94f2-804b-41a0-1baecf1bcbb5', 'email',
   '{"sub":"7cd975bf-94f2-804b-41a0-1baecf1bcbb5","email":"dim_trainer_491@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975c0-cde0-15ed-ad4b-f5a1cb397bc0', '7cd975c0-cde0-15ed-ad4b-f5a1cb397bc0', 'email',
   '{"sub":"7cd975c0-cde0-15ed-ad4b-f5a1cb397bc0","email":"monica_crist_fahey79@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975c1-37fc-89c0-1d1f-e58cdea1e9a1', '7cd975c1-37fc-89c0-1d1f-e58cdea1e9a1', 'email',
   '{"sub":"7cd975c1-37fc-89c0-1d1f-e58cdea1e9a1","email":"scornful_elite@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975c2-5ecb-d8bb-22be-6da502a48bf2', '7cd975c2-5ecb-d8bb-22be-6da502a48bf2', 'email',
   '{"sub":"7cd975c2-5ecb-d8bb-22be-6da502a48bf2","email":"squeaky_trainer_454@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975c3-e7dc-19ab-ad59-ddfc1d735957', '7cd975c3-e7dc-19ab-ad59-ddfc1d735957', 'email',
   '{"sub":"7cd975c3-e7dc-19ab-ad59-ddfc1d735957","email":"jazmyne80@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975c4-a327-b512-cd5c-be5d6f087b1b', '7cd975c4-a327-b512-cd5c-be5d6f087b1b', 'email',
   '{"sub":"7cd975c4-a327-b512-cd5c-be5d6f087b1b","email":"frequent_trainer_572@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975c5-86ab-ebed-25fc-c91956a1c9d1', '7cd975c5-86ab-ebed-25fc-c91956a1c9d1', 'email',
   '{"sub":"7cd975c5-86ab-ebed-25fc-c91956a1c9d1","email":"mariannamacejkovic76@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975c6-5e32-ccaf-e1f8-6c6109ccf663', '7cd975c6-5e32-ccaf-e1f8-6c6109ccf663', 'email',
   '{"sub":"7cd975c6-5e32-ccaf-e1f8-6c6109ccf663","email":"assuntaschoen_koelpi@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975c7-dd39-6a9f-17ab-6adebccc686a', '7cd975c7-dd39-6a9f-17ab-6adebccc686a', 'email',
   '{"sub":"7cd975c7-dd39-6a9f-17ab-6adebccc686a","email":"foolhardy_trainer_79@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975c8-a976-b10b-a25e-cfabff4b44e8', '7cd975c8-a976-b10b-a25e-cfabff4b44e8', 'email',
   '{"sub":"7cd975c8-a976-b10b-a25e-cfabff4b44e8","email":"vidaboyle57@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975de-e499-d14e-db07-d6ed1df1b683', '7cd975de-e499-d14e-db07-d6ed1df1b683', 'email',
   '{"sub":"7cd975de-e499-d14e-db07-d6ed1df1b683","email":"ashtyn_vonrueden@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975df-47ae-e473-bade-8adb079540e5', '7cd975df-47ae-e473-bade-8adb079540e5', 'email',
   '{"sub":"7cd975df-47ae-e473-bade-8adb079540e5","email":"vernie34@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975e0-638e-d9e1-4cd0-8efe7292ea6a', '7cd975e0-638e-d9e1-4cd0-8efe7292ea6a', 'email',
   '{"sub":"7cd975e0-638e-d9e1-4cd0-8efe7292ea6a","email":"enlightened_trainer_@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975e1-a90c-7bef-fb8e-e62c7ea4d19c', '7cd975e1-a90c-7bef-fb8e-e62c7ea4d19c', 'email',
   '{"sub":"7cd975e1-a90c-7bef-fb8e-e62c7ea4d19c","email":"elsie_stroman@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975e2-30e5-51ec-ee7d-04ca78b0545b', '7cd975e2-30e5-51ec-ee7d-04ca78b0545b', 'email',
   '{"sub":"7cd975e2-30e5-51ec-ee7d-04ca78b0545b","email":"nella_russel@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975e3-bda0-f83e-6cc9-c59beb8e3e8a', '7cd975e3-bda0-f83e-6cc9-c59beb8e3e8a', 'email',
   '{"sub":"7cd975e3-bda0-f83e-6cc9-c59beb8e3e8a","email":"claudestreich31@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975e4-b5de-ebeb-2d0a-3489d1b4ceca', '7cd975e4-b5de-ebeb-2d0a-3489d1b4ceca', 'email',
   '{"sub":"7cd975e4-b5de-ebeb-2d0a-3489d1b4ceca","email":"drab_trainer_487@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975e5-ef27-dc05-d04f-d5105d9fe84b', '7cd975e5-ef27-dc05-d04f-d5105d9fe84b', 'email',
   '{"sub":"7cd975e5-ef27-dc05-d04f-d5105d9fe84b","email":"novakuhic68@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975e6-7e6a-e3aa-dde2-e2b5efa49da2', '7cd975e6-7e6a-e3aa-dde2-e2b5efa49da2', 'email',
   '{"sub":"7cd975e6-7e6a-e3aa-dde2-e2b5efa49da2","email":"quincy_pouros90@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975e7-1ca5-5ad8-a2af-a4b59ba5ed8b', '7cd975e7-1ca5-5ad8-a2af-a4b59ba5ed8b', 'email',
   '{"sub":"7cd975e7-1ca5-5ad8-a2af-a4b59ba5ed8b","email":"sigmund_senger46@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975fd-ee82-b2e4-588b-a35b3dcfeee5', '7cd975fd-ee82-b2e4-588b-a35b3dcfeee5', 'email',
   '{"sub":"7cd975fd-ee82-b2e4-588b-a35b3dcfeee5","email":"noted_gym@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975fe-91b7-adde-9cd2-b61ec3bce5d7', '7cd975fe-91b7-adde-9cd2-b61ec3bce5d7', 'email',
   '{"sub":"7cd975fe-91b7-adde-9cd2-b61ec3bce5d7","email":"front_trainer_895@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd975ff-a77f-e09d-62ad-c13d4bb6ecf1', '7cd975ff-a77f-e09d-62ad-c13d4bb6ecf1', 'email',
   '{"sub":"7cd975ff-a77f-e09d-62ad-c13d4bb6ecf1","email":"amber_reichel25@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97600-96d0-ec6b-0fb6-71f0e9e5baf1', '7cd97600-96d0-ec6b-0fb6-71f0e9e5baf1', 'email',
   '{"sub":"7cd97600-96d0-ec6b-0fb6-71f0e9e5baf1","email":"made_up_trainer_161@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97601-7515-ebe8-fab5-aafe70ab3afe', '7cd97601-7515-ebe8-fab5-aafe70ab3afe', 'email',
   '{"sub":"7cd97601-7515-ebe8-fab5-aafe70ab3afe","email":"easy_trainer_738@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97602-c4de-d2d2-1b8c-193fcf72f69e', '7cd97602-c4de-d2d2-1b8c-193fcf72f69e', 'email',
   '{"sub":"7cd97602-c4de-d2d2-1b8c-193fcf72f69e","email":"twin_trainer_704@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97603-1fc8-74ef-3d99-5cab631f4f89', '7cd97603-1fc8-74ef-3d99-5cab631f4f89', 'email',
   '{"sub":"7cd97603-1fc8-74ef-3d99-5cab631f4f89","email":"stunning_trainer_537@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97604-562e-12e7-fc5e-2b95ddfd845a', '7cd97604-562e-12e7-fc5e-2b95ddfd845a', 'email',
   '{"sub":"7cd97604-562e-12e7-fc5e-2b95ddfd845a","email":"fredrick_hagenes66@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97605-db8a-e0d9-739a-8e9fdb287cc1', '7cd97605-db8a-e0d9-739a-8e9fdb287cc1', 'email',
   '{"sub":"7cd97605-db8a-e0d9-739a-8e9fdb287cc1","email":"tatyanahintz44@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97606-e97d-ecf0-2dc6-5b18bca7dcce', '7cd97606-e97d-ecf0-2dc6-5b18bca7dcce', 'email',
   '{"sub":"7cd97606-e97d-ecf0-2dc6-5b18bca7dcce","email":"thorny_trainer_213@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9761c-41df-31b5-cfe8-ead94bbbae2f', '7cd9761c-41df-31b5-cfe8-ead94bbbae2f', 'email',
   '{"sub":"7cd9761c-41df-31b5-cfe8-ead94bbbae2f","email":"arturofahey55@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9761d-fefe-802b-e9ab-14cfd2f40f6e', '7cd9761d-fefe-802b-e9ab-14cfd2f40f6e', 'email',
   '{"sub":"7cd9761d-fefe-802b-e9ab-14cfd2f40f6e","email":"skylar_bednar@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9761e-63d8-597a-f9cc-3fbed9daad7f', '7cd9761e-63d8-597a-f9cc-3fbed9daad7f', 'email',
   '{"sub":"7cd9761e-63d8-597a-f9cc-3fbed9daad7f","email":"ornery_trainer_904@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9761f-53fb-47d1-31ba-afeae0dbb76e', '7cd9761f-53fb-47d1-31ba-afeae0dbb76e', 'email',
   '{"sub":"7cd9761f-53fb-47d1-31ba-afeae0dbb76e","email":"ashamed_elite@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97620-af11-ebda-2aa6-6c1d5dee9f76', '7cd97620-af11-ebda-2aa6-6c1d5dee9f76', 'email',
   '{"sub":"7cd97620-af11-ebda-2aa6-6c1d5dee9f76","email":"true_elite@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97621-91e4-e9fc-e0ad-329ebb30b1de', '7cd97621-91e4-e9fc-e0ad-329ebb30b1de', 'email',
   '{"sub":"7cd97621-91e4-e9fc-e0ad-329ebb30b1de","email":"nettie_hermiston@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97622-6e3f-295a-5dd4-d18fed682fbf', '7cd97622-6e3f-295a-5dd4-d18fed682fbf', 'email',
   '{"sub":"7cd97622-6e3f-295a-5dd4-d18fed682fbf","email":"malvinamitchell24@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97623-0ea7-e0cc-49ef-0e35502f622f', '7cd97623-0ea7-e0cc-49ef-0e35502f622f', 'email',
   '{"sub":"7cd97623-0ea7-e0cc-49ef-0e35502f622f","email":"enriquebalistreri40@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97624-789a-9ce7-c249-4d3adf8dc91a', '7cd97624-789a-9ce7-c249-4d3adf8dc91a', 'email',
   '{"sub":"7cd97624-789a-9ce7-c249-4d3adf8dc91a","email":"desiree_fadel@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97625-5341-40d6-f477-0c0edbbe8e01', '7cd97625-5341-40d6-f477-0c0edbbe8e01', 'email',
   '{"sub":"7cd97625-5341-40d6-f477-0c0edbbe8e01","email":"leta_kunde1@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978c6-acfa-5dc4-5b0f-2b8ad9b105e2', '7cd978c6-acfa-5dc4-5b0f-2b8ad9b105e2', 'email',
   '{"sub":"7cd978c6-acfa-5dc4-5b0f-2b8ad9b105e2","email":"katheryn_braun@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978c7-ca3c-ad75-2bc7-a7ed383dae6e', '7cd978c7-ca3c-ad75-2bc7-a7ed383dae6e', 'email',
   '{"sub":"7cd978c7-ca3c-ad75-2bc7-a7ed383dae6e","email":"incomplete_trainer_6@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978c8-d62a-d060-9dfe-3db3eaaf44f4', '7cd978c8-d62a-d060-9dfe-3db3eaaf44f4', 'email',
   '{"sub":"7cd978c8-d62a-d060-9dfe-3db3eaaf44f4","email":"personal_trainer_58@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978c9-ad2f-f2ec-8a5f-0c9e4eaadada', '7cd978c9-ad2f-f2ec-8a5f-0c9e4eaadada', 'email',
   '{"sub":"7cd978c9-ad2f-f2ec-8a5f-0c9e4eaadada","email":"oswaldo_kling@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978ca-b25c-7ff5-0f92-f0d323ffb875', '7cd978ca-b25c-7ff5-0f92-f0d323ffb875', 'email',
   '{"sub":"7cd978ca-b25c-7ff5-0f92-f0d323ffb875","email":"price_fay82@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978cb-9afc-5dc8-a634-2feea1dc9cfb', '7cd978cb-9afc-5dc8-a634-2feea1dc9cfb', 'email',
   '{"sub":"7cd978cb-9afc-5dc8-a634-2feea1dc9cfb","email":"katrina16@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978cc-aaa6-fe86-a53b-6d2e602ed5bd', '7cd978cc-aaa6-fe86-a53b-6d2e602ed5bd', 'email',
   '{"sub":"7cd978cc-aaa6-fe86-a53b-6d2e602ed5bd","email":"arnoldo81@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978cd-06e7-5bc2-eb3f-88bf29a871f9', '7cd978cd-06e7-5bc2-eb3f-88bf29a871f9', 'email',
   '{"sub":"7cd978cd-06e7-5bc2-eb3f-88bf29a871f9","email":"garett_bergnaum@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978ce-0203-1f63-5eb8-d87486e6c148', '7cd978ce-0203-1f63-5eb8-d87486e6c148', 'email',
   '{"sub":"7cd978ce-0203-1f63-5eb8-d87486e6c148","email":"substantial_trainer_@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978cf-bc66-ad42-d7c7-2cb49bc2cfbd', '7cd978cf-bc66-ad42-d7c7-2cb49bc2cfbd', 'email',
   '{"sub":"7cd978cf-bc66-ad42-d7c7-2cb49bc2cfbd","email":"gaston_funk5@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978e5-ebef-0d9c-5fdb-14a0b0e8df72', '7cd978e5-ebef-0d9c-5fdb-14a0b0e8df72', 'email',
   '{"sub":"7cd978e5-ebef-0d9c-5fdb-14a0b0e8df72","email":"scary_trainer_677@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978e6-fd7c-c901-bff1-4acde0cb5f40', '7cd978e6-fd7c-c901-bff1-4acde0cb5f40', 'email',
   '{"sub":"7cd978e6-fd7c-c901-bff1-4acde0cb5f40","email":"oval_trainer_521@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978e7-daca-2f49-1c2d-daadb9baeaab', '7cd978e7-daca-2f49-1c2d-daadb9baeaab', 'email',
   '{"sub":"7cd978e7-daca-2f49-1c2d-daadb9baeaab","email":"chaunceyjohnson55@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978e8-c466-b13b-259b-a9bd2398ac83', '7cd978e8-c466-b13b-259b-a9bd2398ac83', 'email',
   '{"sub":"7cd978e8-c466-b13b-259b-a9bd2398ac83","email":"kayla75@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978e9-d1d1-ffbf-c9cf-aecb9405b89f', '7cd978e9-d1d1-ffbf-c9cf-aecb9405b89f', 'email',
   '{"sub":"7cd978e9-d1d1-ffbf-c9cf-aecb9405b89f","email":"kiplarkin25@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978ea-0262-f624-c1cf-590e954e93fc', '7cd978ea-0262-f624-c1cf-590e954e93fc', 'email',
   '{"sub":"7cd978ea-0262-f624-c1cf-590e954e93fc","email":"izabellabeahan79@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978eb-fd5b-f59b-6046-93df1eef05ee', '7cd978eb-fd5b-f59b-6046-93df1eef05ee', 'email',
   '{"sub":"7cd978eb-fd5b-f59b-6046-93df1eef05ee","email":"bill_pacocha@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978ec-e4ff-c369-66f3-a0de64eff75f', '7cd978ec-e4ff-c369-66f3-a0de64eff75f', 'email',
   '{"sub":"7cd978ec-e4ff-c369-66f3-a0de64eff75f","email":"sniveling_trainer@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978ed-e0cb-b72d-adce-be8bb882e2e9', '7cd978ed-e0cb-b72d-adce-be8bb882e2e9', 'email',
   '{"sub":"7cd978ed-e0cb-b72d-adce-be8bb882e2e9","email":"jacynthe_klein@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd978ee-d968-865c-1e37-15ad4aadabec', '7cd978ee-d968-865c-1e37-15ad4aadabec', 'email',
   '{"sub":"7cd978ee-d968-865c-1e37-15ad4aadabec","email":"marilie_medhurst82@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97904-9fc3-98f5-ed9e-f25ef203f3bc', '7cd97904-9fc3-98f5-ed9e-f25ef203f3bc', 'email',
   '{"sub":"7cd97904-9fc3-98f5-ed9e-f25ef203f3bc","email":"impossible_trainer_9@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97905-96bb-addc-965b-992f4495c89b', '7cd97905-96bb-addc-965b-992f4495c89b', 'email',
   '{"sub":"7cd97905-96bb-addc-965b-992f4495c89b","email":"pertinent_trainer_27@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97906-5be2-a417-3fb3-0b3d7c61449e', '7cd97906-5be2-a417-3fb3-0b3d7c61449e', 'email',
   '{"sub":"7cd97906-5be2-a417-3fb3-0b3d7c61449e","email":"carleykerluke47@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97907-55ba-b1fb-6e9d-cbfda6a48df8', '7cd97907-55ba-b1fb-6e9d-cbfda6a48df8', 'email',
   '{"sub":"7cd97907-55ba-b1fb-6e9d-cbfda6a48df8","email":"adolfomoen96@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97908-1cd9-91bb-3222-d453fc574a0e', '7cd97908-1cd9-91bb-3222-d453fc574a0e', 'email',
   '{"sub":"7cd97908-1cd9-91bb-3222-d453fc574a0e","email":"flaviedare76@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97909-2f5b-73c6-ecaa-a1ed13f983b2', '7cd97909-2f5b-73c6-ecaa-a1ed13f983b2', 'email',
   '{"sub":"7cd97909-2f5b-73c6-ecaa-a1ed13f983b2","email":"stanley_schneider@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9790a-c7ef-c7c7-1f21-d6e78579fbe0', '7cd9790a-c7ef-c7c7-1f21-d6e78579fbe0', 'email',
   '{"sub":"7cd9790a-c7ef-c7c7-1f21-d6e78579fbe0","email":"norene68@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9790b-0ea0-fa24-1cdb-bcd0f9ce7e2e', '7cd9790b-0ea0-fa24-1cdb-bcd0f9ce7e2e', 'email',
   '{"sub":"7cd9790b-0ea0-fa24-1cdb-bcd0f9ce7e2e","email":"krystina_beatty85@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9790c-07bf-ff62-5cfa-037c1e8ebadd', '7cd9790c-07bf-ff62-5cfa-037c1e8ebadd', 'email',
   '{"sub":"7cd9790c-07bf-ff62-5cfa-037c1e8ebadd","email":"vain_trainer_113@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9790d-abc9-cb0d-c3dd-32f853ede1d8', '7cd9790d-abc9-cb0d-c3dd-32f853ede1d8', 'email',
   '{"sub":"7cd9790d-abc9-cb0d-c3dd-32f853ede1d8","email":"practical_leader@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97923-6c0c-77ec-dc5b-90cedac12d61', '7cd97923-6c0c-77ec-dc5b-90cedac12d61', 'email',
   '{"sub":"7cd97923-6c0c-77ec-dc5b-90cedac12d61","email":"jaleelstracke93@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97924-ebc5-47a6-b3f2-eebf9d76cac6', '7cd97924-ebc5-47a6-b3f2-eebf9d76cac6', 'email',
   '{"sub":"7cd97924-ebc5-47a6-b3f2-eebf9d76cac6","email":"kayden33@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97925-a6b8-c2f9-7f8c-9f2ca436f5a0', '7cd97925-a6b8-c2f9-7f8c-9f2ca436f5a0', 'email',
   '{"sub":"7cd97925-a6b8-c2f9-7f8c-9f2ca436f5a0","email":"artfritsch16@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97926-44ec-b8ba-5b02-da9b8abaf47a', '7cd97926-44ec-b8ba-5b02-da9b8abaf47a', 'email',
   '{"sub":"7cd97926-44ec-b8ba-5b02-da9b8abaf47a","email":"khalillarson_schuppe@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97927-fbd6-1e8c-b7f2-63b4febba7ad', '7cd97927-fbd6-1e8c-b7f2-63b4febba7ad', 'email',
   '{"sub":"7cd97927-fbd6-1e8c-b7f2-63b4febba7ad","email":"nicolaconn45@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97928-5ab5-bce7-ad84-fba9789bba2a', '7cd97928-5ab5-bce7-ad84-fba9789bba2a', 'email',
   '{"sub":"7cd97928-5ab5-bce7-ad84-fba9789bba2a","email":"tressie65@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97929-8fcc-3565-c016-45bc0982effa', '7cd97929-8fcc-3565-c016-45bc0982effa', 'email',
   '{"sub":"7cd97929-8fcc-3565-c016-45bc0982effa","email":"colorless_trainer_93@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9792a-afec-e9da-e1bf-bcde1807bec2', '7cd9792a-afec-e9da-e1bf-bcde1807bec2', 'email',
   '{"sub":"7cd9792a-afec-e9da-e1bf-bcde1807bec2","email":"well_lit_trainer_814@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9792b-aa2e-9a80-2af7-fffaea9460d5', '7cd9792b-aa2e-9a80-2af7-fffaea9460d5', 'email',
   '{"sub":"7cd9792b-aa2e-9a80-2af7-fffaea9460d5","email":"overcooked_trainer_5@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9792c-b066-366b-e8f7-6b019ef1cadc', '7cd9792c-b066-366b-e8f7-6b019ef1cadc', 'email',
   '{"sub":"7cd9792c-b066-366b-e8f7-6b019ef1cadc","email":"oleflatley25@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97942-acba-35a3-757f-8c2b8ef4dd94', '7cd97942-acba-35a3-757f-8c2b8ef4dd94', 'email',
   '{"sub":"7cd97942-acba-35a3-757f-8c2b8ef4dd94","email":"dallas56@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97943-6aeb-ca1f-adec-27d41bc3cfbc', '7cd97943-6aeb-ca1f-adec-27d41bc3cfbc', 'email',
   '{"sub":"7cd97943-6aeb-ca1f-adec-27d41bc3cfbc","email":"nicola69@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97944-5f9d-606c-8bde-5acef5f800aa', '7cd97944-5f9d-606c-8bde-5acef5f800aa', 'email',
   '{"sub":"7cd97944-5f9d-606c-8bde-5acef5f800aa","email":"clementina80@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97945-4b3e-a2a1-d5bb-ecc8eb6c9cc4', '7cd97945-4b3e-a2a1-d5bb-ecc8eb6c9cc4', 'email',
   '{"sub":"7cd97945-4b3e-a2a1-d5bb-ecc8eb6c9cc4","email":"ripe_trainer_294@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97946-258a-0ff7-79d3-4c58de7f0aab', '7cd97946-258a-0ff7-79d3-4c58de7f0aab', 'email',
   '{"sub":"7cd97946-258a-0ff7-79d3-4c58de7f0aab","email":"fortunate_champion@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97947-6226-dbdd-0427-b073eaa9f4ba', '7cd97947-6226-dbdd-0427-b073eaa9f4ba', 'email',
   '{"sub":"7cd97947-6226-dbdd-0427-b073eaa9f4ba","email":"tianna46@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97948-4afb-87de-e1ad-2fe1e7c99db0', '7cd97948-4afb-87de-e1ad-2fe1e7c99db0', 'email',
   '{"sub":"7cd97948-4afb-87de-e1ad-2fe1e7c99db0","email":"titus_kohler60@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97949-aeec-2bfc-c1fb-87ddac821187', '7cd97949-aeec-2bfc-c1fb-87ddac821187', 'email',
   '{"sub":"7cd97949-aeec-2bfc-c1fb-87ddac821187","email":"ciara_heidenreich33@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9794a-b387-bb2a-858a-7580a30ebba4', '7cd9794a-b387-bb2a-858a-7580a30ebba4', 'email',
   '{"sub":"7cd9794a-b387-bb2a-858a-7580a30ebba4","email":"sick_trainer@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9794b-4918-a87d-d183-f2e64e090ab7', '7cd9794b-4918-a87d-d183-f2e64e090ab7', 'email',
   '{"sub":"7cd9794b-4918-a87d-d183-f2e64e090ab7","email":"runny_champion@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97961-54bc-e4eb-c550-6a14fbaf838c', '7cd97961-54bc-e4eb-c550-6a14fbaf838c', 'email',
   '{"sub":"7cd97961-54bc-e4eb-c550-6a14fbaf838c","email":"huge_trainer_672@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97962-cf98-c9c5-abbb-4fb73097c4c5', '7cd97962-cf98-c9c5-abbb-4fb73097c4c5', 'email',
   '{"sub":"7cd97962-cf98-c9c5-abbb-4fb73097c4c5","email":"annette_harber2@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97963-3fc4-423a-abad-f06e00cf5fb6', '7cd97963-3fc4-423a-abad-f06e00cf5fb6', 'email',
   '{"sub":"7cd97963-3fc4-423a-abad-f06e00cf5fb6","email":"jaydeemard34@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97964-f4ce-3fed-4daf-3a739babf8d8', '7cd97964-f4ce-3fed-4daf-3a739babf8d8', 'email',
   '{"sub":"7cd97964-f4ce-3fed-4daf-3a739babf8d8","email":"violent_trainer_345@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97965-05bc-ee9e-b42e-cbadfb2c5bff', '7cd97965-05bc-ee9e-b42e-cbadfb2c5bff', 'email',
   '{"sub":"7cd97965-05bc-ee9e-b42e-cbadfb2c5bff","email":"mauricelittel79@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97966-e9d3-f20d-5abc-f6f28c8dbef1', '7cd97966-e9d3-f20d-5abc-f6f28c8dbef1', 'email',
   '{"sub":"7cd97966-e9d3-f20d-5abc-f6f28c8dbef1","email":"jailyn75@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97967-94e3-6b54-d118-fc9c8e1edb46', '7cd97967-94e3-6b54-d118-fc9c8e1edb46', 'email',
   '{"sub":"7cd97967-94e3-6b54-d118-fc9c8e1edb46","email":"sally_block33@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97968-0083-ce8c-0307-d2d9e24096dd', '7cd97968-0083-ce8c-0307-d2d9e24096dd', 'email',
   '{"sub":"7cd97968-0083-ce8c-0307-d2d9e24096dd","email":"bowed_ace@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97969-5062-aeda-e10e-6575b9be8537', '7cd97969-5062-aeda-e10e-6575b9be8537', 'email',
   '{"sub":"7cd97969-5062-aeda-e10e-6575b9be8537","email":"multicolored_trainer@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9796a-cf2a-21ff-194a-ced7d6edc760', '7cd9796a-cf2a-21ff-194a-ced7d6edc760', 'email',
   '{"sub":"7cd9796a-cf2a-21ff-194a-ced7d6edc760","email":"slushy_breeder@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97980-3dad-0eaa-dae7-b0052530e0a3', '7cd97980-3dad-0eaa-dae7-b0052530e0a3', 'email',
   '{"sub":"7cd97980-3dad-0eaa-dae7-b0052530e0a3","email":"itzel12@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97981-2e34-cad5-0afb-ad9ba9bb650c', '7cd97981-2e34-cad5-0afb-ad9ba9bb650c', 'email',
   '{"sub":"7cd97981-2e34-cad5-0afb-ad9ba9bb650c","email":"sincere98@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97982-f649-1fcc-ea0d-f9a4438cc8cf', '7cd97982-f649-1fcc-ea0d-f9a4438cc8cf', 'email',
   '{"sub":"7cd97982-f649-1fcc-ea0d-f9a4438cc8cf","email":"caleighparker77@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97983-50fa-232d-2a05-df1cacdff5da', '7cd97983-50fa-232d-2a05-df1cacdff5da', 'email',
   '{"sub":"7cd97983-50fa-232d-2a05-df1cacdff5da","email":"cathrinemosciski_wun@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97984-8dbb-bc8d-561b-955dccda8e29', '7cd97984-8dbb-bc8d-561b-955dccda8e29', 'email',
   '{"sub":"7cd97984-8dbb-bc8d-561b-955dccda8e29","email":"aged_trainer_120@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97985-daea-88ea-cd32-d60d4efa45b3', '7cd97985-daea-88ea-cd32-d60d4efa45b3', 'email',
   '{"sub":"7cd97985-daea-88ea-cd32-d60d4efa45b3","email":"jessicaleannon22@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97986-cdbd-6b2e-ff50-cfb45b7cabcb', '7cd97986-cdbd-6b2e-ff50-cfb45b7cabcb', 'email',
   '{"sub":"7cd97986-cdbd-6b2e-ff50-cfb45b7cabcb","email":"emmittdubuque80@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97987-f0f5-08e0-cbd1-eeeec0a86989', '7cd97987-f0f5-08e0-cbd1-eeeec0a86989', 'email',
   '{"sub":"7cd97987-f0f5-08e0-cbd1-eeeec0a86989","email":"rickylockman29@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97988-292d-3b06-eafd-71cec2f5fd5d', '7cd97988-292d-3b06-eafd-71cec2f5fd5d', 'email',
   '{"sub":"7cd97988-292d-3b06-eafd-71cec2f5fd5d","email":"ashton_kshlerin@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97989-c5f0-4595-adfc-1f3b597c2c3f', '7cd97989-c5f0-4595-adfc-1f3b597c2c3f', 'email',
   '{"sub":"7cd97989-c5f0-4595-adfc-1f3b597c2c3f","email":"westonwilderman14@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd9799f-82dd-dfd0-8c8d-d8dbafa3bbbb', '7cd9799f-82dd-dfd0-8c8d-d8dbafa3bbbb', 'email',
   '{"sub":"7cd9799f-82dd-dfd0-8c8d-d8dbafa3bbbb","email":"houston_walter@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979a0-dbeb-1abe-ba36-34f35cd3bb56', '7cd979a0-dbeb-1abe-ba36-34f35cd3bb56', 'email',
   '{"sub":"7cd979a0-dbeb-1abe-ba36-34f35cd3bb56","email":"fake_ace@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979a1-c2c3-1ead-76ba-7facf5f8eafa', '7cd979a1-c2c3-1ead-76ba-7facf5f8eafa', 'email',
   '{"sub":"7cd979a1-c2c3-1ead-76ba-7facf5f8eafa","email":"rey_bode55@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979a2-3897-bbcc-b2f9-61a75fa51c0e', '7cd979a2-3897-bbcc-b2f9-61a75fa51c0e', 'email',
   '{"sub":"7cd979a2-3897-bbcc-b2f9-61a75fa51c0e","email":"robin_schultz@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979a3-c600-0a6b-99bf-62c79eadbafb', '7cd979a3-c600-0a6b-99bf-62c79eadbafb', 'email',
   '{"sub":"7cd979a3-c600-0a6b-99bf-62c79eadbafb","email":"gloomy_champion@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979a4-aae1-d971-ca2d-aad9ed6398cc', '7cd979a4-aae1-d971-ca2d-aad9ed6398cc', 'email',
   '{"sub":"7cd979a4-aae1-d971-ca2d-aad9ed6398cc","email":"trusty_gym@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979a5-1fc9-ecdc-67dd-fd2c9facb71d', '7cd979a5-1fc9-ecdc-67dd-fd2c9facb71d', 'email',
   '{"sub":"7cd979a5-1fc9-ecdc-67dd-fd2c9facb71d","email":"memorable_master@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979a6-4ee8-4eda-dba3-78bed2376ddf', '7cd979a6-4ee8-4eda-dba3-78bed2376ddf', 'email',
   '{"sub":"7cd979a6-4ee8-4eda-dba3-78bed2376ddf","email":"brody25@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979a7-8f9a-a5cd-ae41-dcfeeccc8e9b', '7cd979a7-8f9a-a5cd-ae41-dcfeeccc8e9b', 'email',
   '{"sub":"7cd979a7-8f9a-a5cd-ae41-dcfeeccc8e9b","email":"taut_leader@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979a8-4430-add4-6ae5-a96a1b5f1f4d', '7cd979a8-4430-add4-6ae5-a96a1b5f1f4d', 'email',
   '{"sub":"7cd979a8-4430-add4-6ae5-a96a1b5f1f4d","email":"kenna_beahan@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979be-e2c6-eaf0-6405-e5bdf88a3d8c', '7cd979be-e2c6-eaf0-6405-e5bdf88a3d8c', 'email',
   '{"sub":"7cd979be-e2c6-eaf0-6405-e5bdf88a3d8c","email":"viviane_rempel@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979bf-b5b9-cdd9-09dc-e3e4a7f18f4b', '7cd979bf-b5b9-cdd9-09dc-e3e4a7f18f4b', 'email',
   '{"sub":"7cd979bf-b5b9-cdd9-09dc-e3e4a7f18f4b","email":"pitiful_elite@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979c0-406a-b4fb-eff1-40f7b7c23787', '7cd979c0-406a-b4fb-eff1-40f7b7c23787', 'email',
   '{"sub":"7cd979c0-406a-b4fb-eff1-40f7b7c23787","email":"outstanding_elite@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979c1-8bde-a2cf-cdf4-9a1f2fb0ecb5', '7cd979c1-8bde-a2cf-cdf4-9a1f2fb0ecb5', 'email',
   '{"sub":"7cd979c1-8bde-a2cf-cdf4-9a1f2fb0ecb5","email":"bustling_elite@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979c2-cad6-2ccd-e1b8-db6cf2bde72b', '7cd979c2-cad6-2ccd-e1b8-db6cf2bde72b', 'email',
   '{"sub":"7cd979c2-cad6-2ccd-e1b8-db6cf2bde72b","email":"heavy_trainer_256@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979c3-6e69-b2e8-18db-f16c1c2c7d31', '7cd979c3-6e69-b2e8-18db-f16c1c2c7d31', 'email',
   '{"sub":"7cd979c3-6e69-b2e8-18db-f16c1c2c7d31","email":"willing_trainer_39@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979c4-c50e-4dc1-2ad6-fd70a4c9cdc8', '7cd979c4-c50e-4dc1-2ad6-fd70a4c9cdc8', 'email',
   '{"sub":"7cd979c4-c50e-4dc1-2ad6-fd70a4c9cdc8","email":"brannonlarkin62@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979c5-77e1-e4f3-a41d-c8fcc6ba7d33', '7cd979c5-77e1-e4f3-a41d-c8fcc6ba7d33', 'email',
   '{"sub":"7cd979c5-77e1-e4f3-a41d-c8fcc6ba7d33","email":"opheliadicki91@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979c6-fdd7-6400-deed-cad7ef5cb3d6', '7cd979c6-fdd7-6400-deed-cad7ef5cb3d6', 'email',
   '{"sub":"7cd979c6-fdd7-6400-deed-cad7ef5cb3d6","email":"madyson24@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979c7-5dee-e8ef-0daa-c3ac0609abed', '7cd979c7-5dee-e8ef-0daa-c3ac0609abed', 'email',
   '{"sub":"7cd979c7-5dee-e8ef-0daa-c3ac0609abed","email":"weekly_trainer_641@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979dd-8302-ebf7-de3f-a1cb0217bb5e', '7cd979dd-8302-ebf7-de3f-a1cb0217bb5e', 'email',
   '{"sub":"7cd979dd-8302-ebf7-de3f-a1cb0217bb5e","email":"thoramarvin72@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979de-df8d-c9ee-b07a-6fcaf5da7a2b', '7cd979de-df8d-c9ee-b07a-6fcaf5da7a2b', 'email',
   '{"sub":"7cd979de-df8d-c9ee-b07a-6fcaf5da7a2b","email":"alvertalemke46@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979df-a48d-0fc8-9cb6-7ec36dffae4a', '7cd979df-a48d-0fc8-9cb6-7ec36dffae4a', 'email',
   '{"sub":"7cd979df-a48d-0fc8-9cb6-7ec36dffae4a","email":"elaina_nitzsche@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979e0-9c6e-3ee5-7ca7-b14a1cfefecd', '7cd979e0-9c6e-3ee5-7ca7-b14a1cfefecd', 'email',
   '{"sub":"7cd979e0-9c6e-3ee5-7ca7-b14a1cfefecd","email":"recent_trainer_469@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979e1-d34d-25c7-ae48-dadeb5083fe0', '7cd979e1-d34d-25c7-ae48-dadeb5083fe0', 'email',
   '{"sub":"7cd979e1-d34d-25c7-ae48-dadeb5083fe0","email":"lucy_reilly@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979e2-e59b-d2d4-bbda-65d394ba77cc', '7cd979e2-e59b-d2d4-bbda-65d394ba77cc', 'email',
   '{"sub":"7cd979e2-e59b-d2d4-bbda-65d394ba77cc","email":"delores_orn44@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979e3-66d9-fde4-e531-c2366dba55f0', '7cd979e3-66d9-fde4-e531-c2366dba55f0', 'email',
   '{"sub":"7cd979e3-66d9-fde4-e531-c2366dba55f0","email":"unpleasant_pro@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979e4-2e49-4c20-1e3f-12baeebda7ed', '7cd979e4-2e49-4c20-1e3f-12baeebda7ed', 'email',
   '{"sub":"7cd979e4-2e49-4c20-1e3f-12baeebda7ed","email":"cody_heaney@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979e5-3c63-c883-8d7e-e33c806db22e', '7cd979e5-3c63-c883-8d7e-e33c806db22e', 'email',
   '{"sub":"7cd979e5-3c63-c883-8d7e-e33c806db22e","email":"dario_west44@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd979e6-f7ee-5b9e-9aa5-49adf6a0bf80', '7cd979e6-f7ee-5b9e-9aa5-49adf6a0bf80', 'email',
   '{"sub":"7cd979e6-f7ee-5b9e-9aa5-49adf6a0bf80","email":"overcooked_ranger@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97c87-39d9-cc4c-b829-1296e8abf5eb', '7cd97c87-39d9-cc4c-b829-1296e8abf5eb', 'email',
   '{"sub":"7cd97c87-39d9-cc4c-b829-1296e8abf5eb","email":"qualified_trainer_61@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97c88-edb6-b49a-cd90-c3d08f296dd5', '7cd97c88-edb6-b49a-cd90-c3d08f296dd5', 'email',
   '{"sub":"7cd97c88-edb6-b49a-cd90-c3d08f296dd5","email":"fred_pacocha47@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97c89-14f9-f4df-6cd8-cc3878aae69b', '7cd97c89-14f9-f4df-6cd8-cc3878aae69b', 'email',
   '{"sub":"7cd97c89-14f9-f4df-6cd8-cc3878aae69b","email":"powerless_trainer_33@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97c8a-3770-dc8a-d83f-cf041ca2ccff', '7cd97c8a-3770-dc8a-d83f-cf041ca2ccff', 'email',
   '{"sub":"7cd97c8a-3770-dc8a-d83f-cf041ca2ccff","email":"kasey_jacobi99@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97c8b-c2ba-99be-ce3f-bedccc2c95d9', '7cd97c8b-c2ba-99be-ce3f-bedccc2c95d9', 'email',
   '{"sub":"7cd97c8b-c2ba-99be-ce3f-bedccc2c95d9","email":"unselfish_trainer_12@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97c8c-eeb2-5dfe-e90b-ead76dbb24e8', '7cd97c8c-eeb2-5dfe-e90b-ead76dbb24e8', 'email',
   '{"sub":"7cd97c8c-eeb2-5dfe-e90b-ead76dbb24e8","email":"diamond_kunze75@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97c8d-0b70-e3c6-1121-aa79eefd78dd', '7cd97c8d-0b70-e3c6-1121-aa79eefd78dd', 'email',
   '{"sub":"7cd97c8d-0b70-e3c6-1121-aa79eefd78dd","email":"valentin_hodkiewicz3@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97c8e-13dd-ef86-cfdb-b7ccf0735d04', '7cd97c8e-13dd-ef86-cfdb-b7ccf0735d04', 'email',
   '{"sub":"7cd97c8e-13dd-ef86-cfdb-b7ccf0735d04","email":"gregorio_schuster_ke@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97c8f-a7e6-cae5-7aed-12a273def8dc', '7cd97c8f-a7e6-cae5-7aed-12a273def8dc', 'email',
   '{"sub":"7cd97c8f-a7e6-cae5-7aed-12a273def8dc","email":"lexieerdman24@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97c90-2dac-c94a-22f4-6a9fdef6796f', '7cd97c90-2dac-c94a-22f4-6a9fdef6796f', 'email',
   '{"sub":"7cd97c90-2dac-c94a-22f4-6a9fdef6796f","email":"rosy_trainer_409@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97ca6-cebf-2c59-d510-00254f62cce6', '7cd97ca6-cebf-2c59-d510-00254f62cce6', 'email',
   '{"sub":"7cd97ca6-cebf-2c59-d510-00254f62cce6","email":"casimer_baumbach@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97ca7-ad4a-2837-8ff2-f102fe435bc4', '7cd97ca7-ad4a-2837-8ff2-f102fe435bc4', 'email',
   '{"sub":"7cd97ca7-ad4a-2837-8ff2-f102fe435bc4","email":"michale_orn@outlook.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97ca8-e309-baeb-2cb2-30ddef1db6f6', '7cd97ca8-e309-baeb-2cb2-30ddef1db6f6', 'email',
   '{"sub":"7cd97ca8-e309-baeb-2cb2-30ddef1db6f6","email":"fuzzy_pro@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97ca9-b210-ddf8-7dce-b9dca430f256', '7cd97ca9-b210-ddf8-7dce-b9dca430f256', 'email',
   '{"sub":"7cd97ca9-b210-ddf8-7dce-b9dca430f256","email":"shanie_maggio@proton.me","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97caa-fe9f-aba9-0ed4-eefdf5cc52f6', '7cd97caa-fe9f-aba9-0ed4-eefdf5cc52f6', 'email',
   '{"sub":"7cd97caa-fe9f-aba9-0ed4-eefdf5cc52f6","email":"grant_bednar@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97cab-2a12-5cec-75cf-f21fcceebefc', '7cd97cab-2a12-5cec-75cf-f21fcceebefc', 'email',
   '{"sub":"7cd97cab-2a12-5cec-75cf-f21fcceebefc","email":"abelardo_konopelski@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97cac-d3c9-ea63-0b28-c63be23f0f0d', '7cd97cac-d3c9-ea63-0b28-c63be23f0f0d', 'email',
   '{"sub":"7cd97cac-d3c9-ea63-0b28-c63be23f0f0d","email":"clevekling88@gmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97cad-9ff7-dc4d-1c31-8ccf91ac96b7', '7cd97cad-9ff7-dc4d-1c31-8ccf91ac96b7', 'email',
   '{"sub":"7cd97cad-9ff7-dc4d-1c31-8ccf91ac96b7","email":"treviono_kon17@yahoo.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97cae-7c9f-28fb-367e-aabb92cebcee', '7cd97cae-7c9f-28fb-367e-aabb92cebcee', 'email',
   '{"sub":"7cd97cae-7c9f-28fb-367e-aabb92cebcee","email":"neat_ace@hotmail.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW()),
  (gen_random_uuid(), '7cd97caf-acd1-416d-cdc6-53cd43dae85f', '7cd97caf-acd1-416d-cdc6-53cd43dae85f', 'email',
   '{"sub":"7cd97caf-acd1-416d-cdc6-53cd43dae85f","email":"eryn_stracke_hand41@icloud.com","email_verified":true}'::jsonb,
   NOW(), NOW(), NOW())
ON CONFLICT (provider, provider_id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- public.users updates
-- -----------------------------------------------------------------------------

UPDATE public.users SET
  birth_date = '1990-01-15', country = 'US',
  did = 'did:plc:admin_trainer00000000000', pds_status = 'active'
WHERE id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

UPDATE public.users SET
  birth_date = '1997-05-22', country = 'JP',
  did = 'did:plc:ash_ketchum0000000000000', pds_status = 'active'
WHERE id = 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e';

UPDATE public.users SET
  birth_date = '1988-07-10', country = 'JP',
  did = 'did:plc:cynthia00000000000000000', pds_status = 'active'
WHERE id = 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f';

UPDATE public.users SET
  birth_date = '1995-11-03', country = 'US',
  did = 'did:plc:brock0000000000000000000', pds_status = 'active'
WHERE id = 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a';

UPDATE public.users SET
  birth_date = '1992-08-18', country = 'JP',
  did = 'did:plc:karen0000000000000000000', pds_status = 'active'
WHERE id = 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b';

UPDATE public.users SET
  birth_date = '1996-02-27', country = 'JP',
  did = 'did:plc:red000000000000000000000', pds_status = 'active'
WHERE id = 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c';

UPDATE public.users SET
  birth_date = '1985-04-01', country = 'JP',
  did = 'did:plc:lance0000000000000000000', pds_status = 'active'
WHERE id = 'a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d';

UPDATE public.users SET
  birth_date = '1999-11-24', country = 'US',
  did = 'did:plc:valentinemiller240000000', pds_status = 'active'
WHERE id = '711a6f7d-fc44-46b9-6d36-8ab4bd1d31ef';

UPDATE public.users SET
  birth_date = '1988-10-19', country = 'JP',
  did = 'did:plc:ellis_paucek000000000000', pds_status = 'active'
WHERE id = '711a6f7c-c4fb-edde-1407-85c76b3b1fa4';

UPDATE public.users SET
  birth_date = '1983-04-26', country = 'FR',
  did = 'did:plc:submissive_trainer_70000', pds_status = 'active'
WHERE id = '711a6f7b-d716-7aed-a2fa-caab9020e6bd';

UPDATE public.users SET
  birth_date = '1997-10-22', country = 'FR',
  did = 'did:plc:halliefay160000000000000', pds_status = 'active'
WHERE id = '711a6f7a-b4db-bd62-59bc-0b9427e7bf7f';

UPDATE public.users SET
  birth_date = '1986-10-12', country = 'US',
  did = 'did:plc:demetrius_gutkowski00000', pds_status = 'active'
WHERE id = '711a6f79-af5e-a5a8-ddb1-c740ce0b4e3f';

UPDATE public.users SET
  birth_date = '2002-12-14', country = 'GB',
  did = 'did:plc:trentheaney2000000000000', pds_status = 'active'
WHERE id = '711a6f78-b52d-dd77-fddb-e13dd02e03cf';

UPDATE public.users SET
  birth_date = '2003-11-07', country = 'DE',
  did = 'did:plc:eminent_ranger0000000000', pds_status = 'active'
WHERE id = '711a6f77-c285-5f8d-dbbc-a4f60e3eee80';

UPDATE public.users SET
  birth_date = '1999-07-24', country = 'GB',
  did = 'did:plc:hilbert38000000000000000', pds_status = 'active'
WHERE id = '711a6f76-2df3-bdaf-f76b-bdebbbefbd78';

UPDATE public.users SET
  birth_date = '1980-12-04', country = 'US',
  did = 'did:plc:ordinary_trainer_3600000', pds_status = 'active'
WHERE id = '711a6f75-c72b-a4d1-1bbe-ffb7b5910fcf';

UPDATE public.users SET
  birth_date = '1997-03-14', country = 'JP',
  did = 'did:plc:chad_friesen000000000000', pds_status = 'active'
WHERE id = '711a6f74-57a0-210c-fa2a-a398dd08dbce';

UPDATE public.users SET
  birth_date = '1990-12-10', country = 'GB',
  did = 'did:plc:blank_trainer_6420000000', pds_status = 'active'
WHERE id = '4dcc802c-ace8-fd41-202f-17c0b62fddab';

UPDATE public.users SET
  birth_date = '2006-02-17', country = 'FR',
  did = 'did:plc:charlotteschoen990000000', pds_status = 'active'
WHERE id = '4dcc802d-9aa2-dbc7-d80d-27eecd967eab';

UPDATE public.users SET
  birth_date = '1989-11-24', country = 'US',
  did = 'did:plc:brown_gym000000000000000', pds_status = 'active'
WHERE id = '4dcc802e-3ad2-1f1c-f11f-88befa81bc9d';

UPDATE public.users SET
  birth_date = '1998-04-01', country = 'CA',
  did = 'did:plc:made_up_trainer_12000000', pds_status = 'active'
WHERE id = '4dcc802f-cf86-d4f0-f0db-f1cfbdf9dcd0';

UPDATE public.users SET
  birth_date = '1996-05-31', country = 'US',
  did = 'did:plc:valentinaklocko650000000', pds_status = 'active'
WHERE id = '4dcc8030-fffb-6bf3-ecef-d9ed008bf3d8';

UPDATE public.users SET
  birth_date = '2001-08-08', country = 'IT',
  did = 'did:plc:ronny_koss27000000000000', pds_status = 'active'
WHERE id = '4dcc8031-c592-ed5e-d72e-babcccd820ad';

UPDATE public.users SET
  birth_date = '1992-04-27', country = 'ES',
  did = 'did:plc:early_master000000000000', pds_status = 'active'
WHERE id = '4dcc8032-7bb8-dce3-ea5a-fa7d512233e4';

UPDATE public.users SET
  birth_date = '1985-01-11', country = 'US',
  did = 'did:plc:sophieorn250000000000000', pds_status = 'active'
WHERE id = '4dcc8033-2a48-bf0b-d1de-16ba448ad8aa';

UPDATE public.users SET
  birth_date = '1992-08-07', country = 'JP',
  did = 'did:plc:faint_trainer_7130000000', pds_status = 'active'
WHERE id = '4dcc8034-5580-7472-ddeb-a1bca9267ec7';

UPDATE public.users SET
  birth_date = '1982-04-27', country = 'JP',
  did = 'did:plc:lempi_brakus240000000000', pds_status = 'active'
WHERE id = '4dcc8035-9f28-fdb5-3eec-c6a479b52d6c';

UPDATE public.users SET
  birth_date = '2007-10-16', country = 'US',
  did = 'did:plc:long_trainer_53300000000', pds_status = 'active'
WHERE id = '4dcc804b-b5ea-da97-ecf2-ae31acc3b433';

UPDATE public.users SET
  birth_date = '2001-01-02', country = 'JP',
  did = 'did:plc:mallory39000000000000000', pds_status = 'active'
WHERE id = '4dcc804c-5d8b-dd2e-d73b-dbdb365a0cad';

UPDATE public.users SET
  birth_date = '2000-04-17', country = 'DE',
  did = 'did:plc:reidstamm210000000000000', pds_status = 'active'
WHERE id = '4dcc804d-efb5-73dc-8ae3-cbd0decfef3c';

UPDATE public.users SET
  birth_date = '2007-08-25', country = 'AU',
  did = 'did:plc:insistent_ranger00000000', pds_status = 'active'
WHERE id = '4dcc804e-2edb-d817-b078-be77a94933a9';

UPDATE public.users SET
  birth_date = '2007-12-26', country = 'JP',
  did = 'did:plc:francesco_nader660000000', pds_status = 'active'
WHERE id = '4dcc804f-d1a4-d440-ac1b-9b98c34ce85e';

UPDATE public.users SET
  birth_date = '2002-06-21', country = 'US',
  did = 'did:plc:alda_rau2000000000000000', pds_status = 'active'
WHERE id = '70036c44-e525-fcc8-e46d-01403c9db758';

UPDATE public.users SET
  birth_date = '1993-09-20', country = 'FR',
  did = 'did:plc:domenic_jast430000000000', pds_status = 'active'
WHERE id = '70036c45-b905-bd53-cfb3-50e2c6cec403';

UPDATE public.users SET
  birth_date = '1984-09-23', country = 'CA',
  did = 'did:plc:scottie17000000000000000', pds_status = 'active'
WHERE id = '70036c46-1d58-67f6-caee-a405d1ad7a21';

UPDATE public.users SET
  birth_date = '1999-07-11', country = 'US',
  did = 'did:plc:major_breeder00000000000', pds_status = 'active'
WHERE id = '70036c47-c72e-3e94-bdab-efc5a4fe0fe3';

UPDATE public.users SET
  birth_date = '1989-01-03', country = 'AU',
  did = 'did:plc:teagan920000000000000000', pds_status = 'active'
WHERE id = '70036c48-0d52-1f7f-16bb-7ddd50d0dbeb';

UPDATE public.users SET
  birth_date = '2000-09-21', country = 'US',
  did = 'did:plc:felicia62000000000000000', pds_status = 'active'
WHERE id = '70036c49-2766-500f-98e4-eb19dead3f5e';

UPDATE public.users SET
  birth_date = '2001-11-25', country = 'JP',
  did = 'did:plc:phony_leader000000000000', pds_status = 'active'
WHERE id = '70036c4a-1fde-f38a-f3b4-4bdc2d52dfcb';

UPDATE public.users SET
  birth_date = '1993-12-15', country = 'US',
  did = 'did:plc:nervous_trainer000000000', pds_status = 'active'
WHERE id = '70036c4b-4f1c-aadc-7ec5-dbecdfcfeda3';

UPDATE public.users SET
  birth_date = '1980-04-02', country = 'US',
  did = 'did:plc:savanah33000000000000000', pds_status = 'active'
WHERE id = '70036c4c-dfd5-dbb2-abf7-de2ef16f1c7d';

UPDATE public.users SET
  birth_date = '1980-10-05', country = 'US',
  did = 'did:plc:trusting_trainer_9730000', pds_status = 'active'
WHERE id = '70036c4d-7aaf-96f9-93bf-41ee6e39e9e8';

UPDATE public.users SET
  birth_date = '2004-04-10', country = 'JP',
  did = 'did:plc:wilsontrantow30000000000', pds_status = 'active'
WHERE id = '6f95e375-f4db-acad-20ed-ba22f94a1c5b';

UPDATE public.users SET
  birth_date = '2004-02-26', country = 'CA',
  did = 'did:plc:jackiebins45000000000000', pds_status = 'active'
WHERE id = '6f95e374-0a25-f3ad-fc07-b170182cfb43';

UPDATE public.users SET
  birth_date = '1999-12-04', country = 'FR',
  did = 'did:plc:prime_trainer_7060000000', pds_status = 'active'
WHERE id = '6f95e373-fb7b-1dcb-9eba-1153d4f74bea';

UPDATE public.users SET
  birth_date = '1993-01-09', country = 'FR',
  did = 'did:plc:millie_zieme650000000000', pds_status = 'active'
WHERE id = '6f95e372-fa97-8f0d-c9fa-dd96de4dda2f';

UPDATE public.users SET
  birth_date = '1990-02-17', country = 'GB',
  did = 'did:plc:chelsea_witting000000000', pds_status = 'active'
WHERE id = '6f95e371-38f5-e7b2-f951-3b7c95df330a';

UPDATE public.users SET
  birth_date = '1983-03-17', country = 'US',
  did = 'did:plc:liquid_ace00000000000000', pds_status = 'active'
WHERE id = '6f95e370-1be0-29e6-b03f-f0eedabae306';

UPDATE public.users SET
  birth_date = '2004-05-18', country = 'US',
  did = 'did:plc:distinct_breeder00000000', pds_status = 'active'
WHERE id = '6f95e36f-fcef-addc-0efe-4e8e2ef1f8db';

UPDATE public.users SET
  birth_date = '1983-06-10', country = 'JP',
  did = 'did:plc:myrtice66000000000000000', pds_status = 'active'
WHERE id = '6f95e36e-0788-f895-841d-eda8cba0788c';

UPDATE public.users SET
  birth_date = '1986-11-21', country = 'ES',
  did = 'did:plc:lenore_schulist950000000', pds_status = 'active'
WHERE id = '6f95e36d-1e72-a566-bb6d-f5923e3bf2c5';

UPDATE public.users SET
  birth_date = '1986-01-04', country = 'GB',
  did = 'did:plc:jayson630000000000000000', pds_status = 'active'
WHERE id = '6f95e36c-9cd7-5b6c-9e2d-9c3ac420edc5';

UPDATE public.users SET
  birth_date = '1999-06-17', country = 'MX',
  did = 'did:plc:laurettayundt22000000000', pds_status = 'active'
WHERE id = '6f95e356-22fc-611d-4747-1b1b5bdeb77e';

UPDATE public.users SET
  birth_date = '1995-01-28', country = 'US',
  did = 'did:plc:maiya_renner000000000000', pds_status = 'active'
WHERE id = '6f95e355-9a7e-be58-3feb-cbd1a2cbf065';

UPDATE public.users SET
  birth_date = '2005-10-24', country = 'JP',
  did = 'did:plc:ashleylueilwitz370000000', pds_status = 'active'
WHERE id = '6f95e354-fc4e-2b8d-dbb6-183f7fec2cea';

UPDATE public.users SET
  birth_date = '1981-12-25', country = 'US',
  did = 'did:plc:sneaky_master00000000000', pds_status = 'active'
WHERE id = '6f95e353-2fcf-96b9-2e4d-e31ba1f1ff53';

UPDATE public.users SET
  birth_date = '2002-11-11', country = 'GB',
  did = 'did:plc:frozen_trainer_101000000', pds_status = 'active'
WHERE id = '6f95e352-6db9-2d94-89ca-a09a05a3b405';

UPDATE public.users SET
  birth_date = '2000-09-19', country = 'JP',
  did = 'did:plc:price4500000000000000000', pds_status = 'active'
WHERE id = '6f95e351-88ab-dfb6-f95c-0daeeded1b3a';

UPDATE public.users SET
  birth_date = '1988-05-17', country = 'US',
  did = 'did:plc:marilyne_bogan7000000000', pds_status = 'active'
WHERE id = '6f95e350-be43-2ea5-01f6-ad842dbeb0fb';

UPDATE public.users SET
  birth_date = '2006-01-21', country = 'US',
  did = 'did:plc:wilhelmmccullough7700000', pds_status = 'active'
WHERE id = '6f95e34f-899d-e524-de6b-cce5aacabe3b';

UPDATE public.users SET
  birth_date = '1995-04-03', country = 'GB',
  did = 'did:plc:tressa720000000000000000', pds_status = 'active'
WHERE id = '6f95e34e-b6cf-dda3-a05f-f28b4cad47bc';

UPDATE public.users SET
  birth_date = '1984-03-29', country = 'US',
  did = 'did:plc:smooth_trainer_360000000', pds_status = 'active'
WHERE id = '6f95e34d-df89-fdd8-9f0d-7b2cae1cccde';

UPDATE public.users SET
  birth_date = '1992-05-25', country = 'US',
  did = 'did:plc:dominic_kuphal0000000000', pds_status = 'active'
WHERE id = '6f95e337-7914-dafe-e9db-29c8cc47700c';

UPDATE public.users SET
  birth_date = '2002-07-18', country = 'JP',
  did = 'did:plc:joshweimann3300000000000', pds_status = 'active'
WHERE id = '6f95e336-a21a-a9aa-3d2a-ef11655d55a9';

UPDATE public.users SET
  birth_date = '1994-12-24', country = 'JP',
  did = 'did:plc:big_gym00000000000000000', pds_status = 'active'
WHERE id = '6f95e335-7d0e-fce1-95af-5e4cafd72345';

UPDATE public.users SET
  birth_date = '1993-08-23', country = 'US',
  did = 'did:plc:kelli_buckridge720000000', pds_status = 'active'
WHERE id = '6f95e334-ecea-9eb1-bba1-b4537ab4ddd5';

UPDATE public.users SET
  birth_date = '2003-02-02', country = 'JP',
  did = 'did:plc:winifred4600000000000000', pds_status = 'active'
WHERE id = '6f95e333-bf4b-6bcd-b8eb-3fb6cd6f344d';

UPDATE public.users SET
  birth_date = '1994-03-21', country = 'BR',
  did = 'did:plc:crooked_gym0000000000000', pds_status = 'active'
WHERE id = '6f95e332-9fed-3d93-0cbf-d1a4ccbf6aca';

UPDATE public.users SET
  birth_date = '1984-01-18', country = 'US',
  did = 'did:plc:jermaineharvey2500000000', pds_status = 'active'
WHERE id = '6f95e331-9aed-7caf-d2e7-f13c4c6efb64';

UPDATE public.users SET
  birth_date = '1998-09-10', country = 'US',
  did = 'did:plc:frozen_trainer_653000000', pds_status = 'active'
WHERE id = '6f95e330-dec2-9adc-8f29-0ae6c6eab0ff';

UPDATE public.users SET
  birth_date = '1980-06-02', country = 'JP',
  did = 'did:plc:richardswaniawski2000000', pds_status = 'active'
WHERE id = '6f95e32f-6d66-a1dc-edd4-15b0cfcb1cd2';

UPDATE public.users SET
  birth_date = '1992-02-15', country = 'US',
  did = 'did:plc:unused_trainer_669000000', pds_status = 'active'
WHERE id = '6f95e32e-9bdd-9ddd-f5b2-8aeedabd157a';

UPDATE public.users SET
  birth_date = '1997-03-04', country = 'US',
  did = 'did:plc:cooperative_trainer_0000', pds_status = 'active'
WHERE id = '6f95e318-4b00-4027-bcb6-e81d27bdaff2';

UPDATE public.users SET
  birth_date = '2006-10-24', country = 'AU',
  did = 'did:plc:godfreyjenkins9100000000', pds_status = 'active'
WHERE id = '6f95e317-0e15-1df2-8a82-9a117eee7d0d';

UPDATE public.users SET
  birth_date = '1988-05-02', country = 'JP',
  did = 'did:plc:lera_reilly9000000000000', pds_status = 'active'
WHERE id = '6f95e316-c02c-7aec-f9e6-6b9bcce97c8d';

UPDATE public.users SET
  birth_date = '1989-10-04', country = 'US',
  did = 'did:plc:robust_elite000000000000', pds_status = 'active'
WHERE id = '6f95e315-0ee7-196e-d84f-9f3a0bf80083';

UPDATE public.users SET
  birth_date = '1988-11-11', country = 'FR',
  did = 'did:plc:slushy_trainer_459000000', pds_status = 'active'
WHERE id = '6f95e314-dcf6-f887-b3cb-ac9654175fc7';

UPDATE public.users SET
  birth_date = '1985-09-16', country = 'JP',
  did = 'did:plc:broderick400000000000000', pds_status = 'active'
WHERE id = '6f95e313-0ab5-fefb-d2b2-b6de3afacc86';

UPDATE public.users SET
  birth_date = '2001-06-24', country = 'GB',
  did = 'did:plc:nolanlangosh540000000000', pds_status = 'active'
WHERE id = '6f95e312-f42c-9cd1-d9bd-e0afff267b64';

UPDATE public.users SET
  birth_date = '2001-08-08', country = 'DE',
  did = 'did:plc:adela1000000000000000000', pds_status = 'active'
WHERE id = '6f95e311-acd1-a188-172b-e1fb61bbf118';

UPDATE public.users SET
  birth_date = '1986-05-27', country = 'GB',
  did = 'did:plc:dariusschneider930000000', pds_status = 'active'
WHERE id = '6f95e310-fd7e-2db9-cd1f-5fcbcb3b5a62';

UPDATE public.users SET
  birth_date = '1987-10-22', country = 'DE',
  did = 'did:plc:awful_ranger000000000000', pds_status = 'active'
WHERE id = '6f95e30f-1c05-a627-5c6b-d9e8f1fa8df0';

UPDATE public.users SET
  birth_date = '1983-01-09', country = 'CA',
  did = 'did:plc:scornful_trainer_6660000', pds_status = 'active'
WHERE id = '6f95e2f9-e17f-b9a4-881a-9cc4ead4ed63';

UPDATE public.users SET
  birth_date = '2004-12-30', country = 'US',
  did = 'did:plc:short_term_elite00000000', pds_status = 'active'
WHERE id = '6f95e2f8-812b-5c08-7029-a8bd0afbe6bb';

UPDATE public.users SET
  birth_date = '1994-07-29', country = 'US',
  did = 'did:plc:werner_auer8000000000000', pds_status = 'active'
WHERE id = '6f95e2f7-806e-fc0d-bba8-6155aaa1febf';

UPDATE public.users SET
  birth_date = '2002-10-13', country = 'GB',
  did = 'did:plc:vincent_hickle1900000000', pds_status = 'active'
WHERE id = '6f95e2f6-8e57-e6ad-f130-d92fb5be16ba';

UPDATE public.users SET
  birth_date = '1986-11-06', country = 'BR',
  did = 'did:plc:hope_cummerata2000000000', pds_status = 'active'
WHERE id = '6f95e2f5-4eff-fc59-d1df-4bdefbfa3af5';

UPDATE public.users SET
  birth_date = '1980-04-29', country = 'JP',
  did = 'did:plc:rare_master0000000000000', pds_status = 'active'
WHERE id = '6f95e2f4-e5d4-7ca2-90ae-268ef0a88aee';

UPDATE public.users SET
  birth_date = '1994-03-28', country = 'US',
  did = 'did:plc:flo_friesen0000000000000', pds_status = 'active'
WHERE id = '6f95e2f3-003d-6ec9-cba6-7ded9baa4d47';

UPDATE public.users SET
  birth_date = '2001-08-30', country = 'DE',
  did = 'did:plc:coralie_bernhard00000000', pds_status = 'active'
WHERE id = '6f95e2f2-3db6-902a-09b1-f46650af4eac';

UPDATE public.users SET
  birth_date = '1996-08-10', country = 'DE',
  did = 'did:plc:ella_ratke00000000000000', pds_status = 'active'
WHERE id = '6f95e2f1-1bf3-bce0-5d6f-a2bb8ecffaef';

UPDATE public.users SET
  birth_date = '2007-06-21', country = 'FR',
  did = 'did:plc:total_champion0000000000', pds_status = 'active'
WHERE id = '6f95e2f0-ffce-a83b-a80c-0ff95fbcf1bf';

UPDATE public.users SET
  birth_date = '1998-11-28', country = 'CA',
  did = 'did:plc:chaz13000000000000000000', pds_status = 'active'
WHERE id = '6f95e2da-5dcc-d0e1-c667-d7a81b69f718';

UPDATE public.users SET
  birth_date = '2007-07-10', country = 'US',
  did = 'did:plc:lucius410000000000000000', pds_status = 'active'
WHERE id = '6f95e2d9-b3f2-8af9-7854-a56efd11e62d';

UPDATE public.users SET
  birth_date = '1999-11-10', country = 'GB',
  did = 'did:plc:purple_champion000000000', pds_status = 'active'
WHERE id = '6f95e2d8-65dd-e23e-ad4c-fe80c59f8c4e';

UPDATE public.users SET
  birth_date = '1980-04-29', country = 'GB',
  did = 'did:plc:bart74000000000000000000', pds_status = 'active'
WHERE id = '6f95e2d7-de5f-24da-0545-51aade1ecbce';

UPDATE public.users SET
  birth_date = '1987-08-08', country = 'JP',
  did = 'did:plc:colby_roberts52000000000', pds_status = 'active'
WHERE id = '6f95e2d6-deb9-d5f9-9ee1-c6906b1ae2a9';

UPDATE public.users SET
  birth_date = '2004-10-04', country = 'AU',
  did = 'did:plc:faraway_master0000000000', pds_status = 'active'
WHERE id = '6f95e2d5-f266-5bb7-7cb6-ee77bed28cb4';

UPDATE public.users SET
  birth_date = '1986-07-02', country = 'US',
  did = 'did:plc:marianna_stokes000000000', pds_status = 'active'
WHERE id = '6f95e2d4-30fa-b310-3d57-24bd51854fdc';

UPDATE public.users SET
  birth_date = '1983-04-22', country = 'GB',
  did = 'did:plc:hildegard_predovic000000', pds_status = 'active'
WHERE id = '6f95e2d3-273f-48d4-b90b-1acdf50fbccc';

UPDATE public.users SET
  birth_date = '2005-04-27', country = 'US',
  did = 'did:plc:estell850000000000000000', pds_status = 'active'
WHERE id = '6f95e2d2-1d8b-f1e1-8b9f-c747818afef0';

UPDATE public.users SET
  birth_date = '1996-06-01', country = 'CA',
  did = 'did:plc:maiyaabshire820000000000', pds_status = 'active'
WHERE id = '6f95e2d1-abb3-eda3-4dad-adedcd3af546';

UPDATE public.users SET
  birth_date = '2003-01-31', country = 'DE',
  did = 'did:plc:cristobalupton5500000000', pds_status = 'active'
WHERE id = '6f95e2bb-b5f5-ee75-4f4d-5ebba41f8905';

UPDATE public.users SET
  birth_date = '2005-03-19', country = 'FR',
  did = 'did:plc:uncomfortable_traine0000', pds_status = 'active'
WHERE id = '6f95e2ba-7dfc-c5c1-2f7a-bcf509207bc6';

UPDATE public.users SET
  birth_date = '2003-07-06', country = 'GB',
  did = 'did:plc:entire_trainer0000000000', pds_status = 'active'
WHERE id = '6f95e2b9-cddc-cfa9-f85d-ee7b4ffebfd1';

UPDATE public.users SET
  birth_date = '1984-06-12', country = 'GB',
  did = 'did:plc:marguerite_hintz00000000', pds_status = 'active'
WHERE id = '6f95e2b8-d3fa-ec30-bdfc-bfba83c6ecd7';

UPDATE public.users SET
  birth_date = '1998-07-11', country = 'US',
  did = 'did:plc:angelic_trainer_42300000', pds_status = 'active'
WHERE id = '6f95e2b7-cd4a-6bf0-ddfa-c171fbce1814';

UPDATE public.users SET
  birth_date = '1992-05-20', country = 'US',
  did = 'did:plc:janellebradtke2500000000', pds_status = 'active'
WHERE id = '6f95e2b6-b765-257e-14b3-7d31a6cb3cb3';

UPDATE public.users SET
  birth_date = '1981-09-01', country = 'JP',
  did = 'did:plc:firsthand_gym00000000000', pds_status = 'active'
WHERE id = '6f95e2b5-afce-bc6b-cfd8-4aaaac7c879a';

UPDATE public.users SET
  birth_date = '1998-02-15', country = 'US',
  did = 'did:plc:dirty_trainer_9510000000', pds_status = 'active'
WHERE id = '6f95e2b4-c8e3-c464-4c6e-fc38b81ccb3e';

UPDATE public.users SET
  birth_date = '2001-01-29', country = 'US',
  did = 'did:plc:cyrilfriesen330000000000', pds_status = 'active'
WHERE id = '6f95e2b3-a72a-e064-5daa-a3a9dfa8c304';

UPDATE public.users SET
  birth_date = '1992-05-04', country = 'AU',
  did = 'did:plc:johnnievandervort5500000', pds_status = 'active'
WHERE id = '6f95e2b2-3095-1f2d-638b-8a2b5ece810c';

UPDATE public.users SET
  birth_date = '1988-12-18', country = 'AU',
  did = 'did:plc:ophelia96000000000000000', pds_status = 'active'
WHERE id = '6f95e29c-eda6-6f0f-fdf6-71957ce48e12';

UPDATE public.users SET
  birth_date = '1993-04-05', country = 'DE',
  did = 'did:plc:parched_trainer_15100000', pds_status = 'active'
WHERE id = '6f95e29b-aacd-ba10-4e98-dde6f54479c2';

UPDATE public.users SET
  birth_date = '1984-09-04', country = 'US',
  did = 'did:plc:multicolored_champio0000', pds_status = 'active'
WHERE id = '6f95e29a-cd7a-eecc-ed87-0cb2ca2f41da';

UPDATE public.users SET
  birth_date = '2006-05-06', country = 'AU',
  did = 'did:plc:quick_trainer_5320000000', pds_status = 'active'
WHERE id = '6f95e299-f5f9-711f-a4d5-c7cca77b741a';

UPDATE public.users SET
  birth_date = '2006-03-20', country = 'DE',
  did = 'did:plc:romaine_homenick00000000', pds_status = 'active'
WHERE id = '6f95e298-b0a8-3efc-f192-dee17c8cbd85';

UPDATE public.users SET
  birth_date = '1985-02-28', country = 'US',
  did = 'did:plc:happy_trainer_4130000000', pds_status = 'active'
WHERE id = '6f95e297-c093-dc5b-af4d-eedd8abe9ac3';

UPDATE public.users SET
  birth_date = '1996-02-13', country = 'US',
  did = 'did:plc:kamron_kemmer91000000000', pds_status = 'active'
WHERE id = '6f95e296-050f-f8a7-ebe8-b5f0def2e3d4';

UPDATE public.users SET
  birth_date = '1991-01-29', country = 'US',
  did = 'did:plc:kasandracronin2500000000', pds_status = 'active'
WHERE id = '6f95e295-0ed3-50cf-25de-910c80c0b60c';

UPDATE public.users SET
  birth_date = '1981-06-28', country = 'JP',
  did = 'did:plc:waynegorczany73000000000', pds_status = 'active'
WHERE id = '6f95e294-cb44-be29-7d14-a1a978b3cba3';

UPDATE public.users SET
  birth_date = '1991-01-17', country = 'DE',
  did = 'did:plc:filthy_trainer_361000000', pds_status = 'active'
WHERE id = '6f95e293-4e5d-d659-5ece-c83a7e51f3ff';

UPDATE public.users SET
  birth_date = '1991-08-02', country = 'JP',
  did = 'did:plc:quick_witted_leader00000', pds_status = 'active'
WHERE id = '6f95e27d-7cc4-efcc-b0c0-df64a5d22fec';

UPDATE public.users SET
  birth_date = '1986-05-29', country = 'DE',
  did = 'did:plc:marianamitchell710000000', pds_status = 'active'
WHERE id = '6f95e27c-5da4-12dc-0a7a-e7a0150d9c36';

UPDATE public.users SET
  birth_date = '1982-01-06', country = 'US',
  did = 'did:plc:wicked_trainer0000000000', pds_status = 'active'
WHERE id = '6f95e27b-d7e8-3f6b-fdbe-ee6054edd0a7';

UPDATE public.users SET
  birth_date = '1998-04-07', country = 'US',
  did = 'did:plc:nippy_elite0000000000000', pds_status = 'active'
WHERE id = '6f95e27a-8ab2-0f75-0bcf-cb1c8d852623';

UPDATE public.users SET
  birth_date = '1999-03-05', country = 'US',
  did = 'did:plc:irma58000000000000000000', pds_status = 'active'
WHERE id = '6f95e279-2d2c-ffad-aad4-069dc42f2acb';

UPDATE public.users SET
  birth_date = '2003-01-13', country = 'US',
  did = 'did:plc:bad_trainer_106000000000', pds_status = 'active'
WHERE id = '6f95e278-af56-ddbc-a8ea-4fc7e061af7e';

UPDATE public.users SET
  birth_date = '1990-08-26', country = 'US',
  did = 'did:plc:nigeljerde94000000000000', pds_status = 'active'
WHERE id = '6f95e277-7b3e-f978-2d98-e9e1beef3adc';

UPDATE public.users SET
  birth_date = '1996-03-24', country = 'US',
  did = 'did:plc:eugene_huel7300000000000', pds_status = 'active'
WHERE id = '6f95e276-bb1c-d863-39d1-eacc1adcb6e2';

UPDATE public.users SET
  birth_date = '2002-09-28', country = 'IT',
  did = 'did:plc:wallace_reichert00000000', pds_status = 'active'
WHERE id = '6f95e275-0f1b-629e-81dd-8491ccc7bccd';

UPDATE public.users SET
  birth_date = '1997-08-03', country = 'GB',
  did = 'did:plc:pastel_gym00000000000000', pds_status = 'active'
WHERE id = '6f95e274-41da-b4e1-9344-818ba8c3b11c';

UPDATE public.users SET
  birth_date = '2006-07-23', country = 'AU',
  did = 'did:plc:shad_williamson900000000', pds_status = 'active'
WHERE id = '7cd97505-6132-2b57-ffe3-8c10ee9a9073';

UPDATE public.users SET
  birth_date = '1982-10-15', country = 'US',
  did = 'did:plc:well_to_do_trainer_50000', pds_status = 'active'
WHERE id = '7cd97506-beca-e167-bf5d-c489f3b7a9cc';

UPDATE public.users SET
  birth_date = '1991-02-28', country = 'US',
  did = 'did:plc:sammy_pouros000000000000', pds_status = 'active'
WHERE id = '7cd97507-3edd-f47e-a97d-c3acc4a07bc5';

UPDATE public.users SET
  birth_date = '1987-05-23', country = 'JP',
  did = 'did:plc:odd_ranger00000000000000', pds_status = 'active'
WHERE id = '7cd97508-db60-a6a0-ce3a-2dc8bd40ccdd';

UPDATE public.users SET
  birth_date = '1996-07-14', country = 'JP',
  did = 'did:plc:hilma_veum18000000000000', pds_status = 'active'
WHERE id = '7cd97509-d113-b468-b0ee-be03daceeeff';

UPDATE public.users SET
  birth_date = '1994-01-27', country = 'DE',
  did = 'did:plc:shanelfeeney900000000000', pds_status = 'active'
WHERE id = '7cd9750a-5aa6-94fe-e6ba-ff82eac4b69e';

UPDATE public.users SET
  birth_date = '1990-06-10', country = 'CA',
  did = 'did:plc:entire_gym00000000000000', pds_status = 'active'
WHERE id = '7cd9750b-dc4f-871a-256b-d6cca3fef7be';

UPDATE public.users SET
  birth_date = '2006-07-21', country = 'US',
  did = 'did:plc:blanca130000000000000000', pds_status = 'active'
WHERE id = '7cd9750c-c2fa-e5d3-1fac-83cc4fbdaccf';

UPDATE public.users SET
  birth_date = '1983-03-24', country = 'JP',
  did = 'did:plc:taut_trainer_67100000000', pds_status = 'active'
WHERE id = '7cd9750d-d1fe-d55e-6b83-0bf877b9dbb3';

UPDATE public.users SET
  birth_date = '1991-10-21', country = 'JP',
  did = 'did:plc:delta_olson0000000000000', pds_status = 'active'
WHERE id = '7cd9750e-5ab7-df9e-7149-40eca321fe92';

UPDATE public.users SET
  birth_date = '1981-03-01', country = 'JP',
  did = 'did:plc:fausto_mraz1100000000000', pds_status = 'active'
WHERE id = '7cd97524-b79e-bcd0-bafa-fa5bfc2f7085';

UPDATE public.users SET
  birth_date = '1991-10-05', country = 'JP',
  did = 'did:plc:ettie_abbott240000000000', pds_status = 'active'
WHERE id = '7cd97525-dda7-2e16-673b-2d21e4cb1f5c';

UPDATE public.users SET
  birth_date = '2003-01-08', country = 'FR',
  did = 'did:plc:thrifty_trainer_14000000', pds_status = 'active'
WHERE id = '7cd97526-4668-8b3f-36bb-ae3c18906fe7';

UPDATE public.users SET
  birth_date = '2007-07-19', country = 'JP',
  did = 'did:plc:delectable_trainer_30000', pds_status = 'active'
WHERE id = '7cd97527-b7d4-3eed-db17-6d73db82456e';

UPDATE public.users SET
  birth_date = '1985-02-12', country = 'US',
  did = 'did:plc:rubbery_elite00000000000', pds_status = 'active'
WHERE id = '7cd97528-d7f0-f61d-5813-61e0a26e3f4a';

UPDATE public.users SET
  birth_date = '2006-09-23', country = 'CA',
  did = 'did:plc:shaylee16000000000000000', pds_status = 'active'
WHERE id = '7cd97529-dd15-a4ae-97f9-a7ecab79c7be';

UPDATE public.users SET
  birth_date = '1998-12-08', country = 'JP',
  did = 'did:plc:shy_ace00000000000000000', pds_status = 'active'
WHERE id = '7cd9752a-a7d4-ac46-aa4f-ff9adbf59240';

UPDATE public.users SET
  birth_date = '2000-06-16', country = 'GB',
  did = 'did:plc:woeful_trainer_243000000', pds_status = 'active'
WHERE id = '7cd9752b-aafc-7e1d-27bd-8ac7d1bc393f';

UPDATE public.users SET
  birth_date = '2000-03-18', country = 'IT',
  did = 'did:plc:lorna_effertz00000000000', pds_status = 'active'
WHERE id = '7cd9752c-b51f-26bc-d38d-faead4eddab7';

UPDATE public.users SET
  birth_date = '2006-03-11', country = 'ES',
  did = 'did:plc:clint_denesik00000000000', pds_status = 'active'
WHERE id = '7cd9752d-b7a0-a7e0-caa1-fbd5a912c54b';

UPDATE public.users SET
  birth_date = '1983-05-18', country = 'US',
  did = 'did:plc:beloved_leader0000000000', pds_status = 'active'
WHERE id = '7cd97543-9c59-09cc-7628-2affddf6daaa';

UPDATE public.users SET
  birth_date = '1989-09-07', country = 'FR',
  did = 'did:plc:emiliebednar530000000000', pds_status = 'active'
WHERE id = '7cd97544-cb20-f8d1-fec2-ca8dedd264da';

UPDATE public.users SET
  birth_date = '1981-03-15', country = 'US',
  did = 'did:plc:frivolous_master00000000', pds_status = 'active'
WHERE id = '7cd97545-a3f4-24a9-c009-bd1be8c2eaee';

UPDATE public.users SET
  birth_date = '2000-10-01', country = 'US',
  did = 'did:plc:treverhartmann7300000000', pds_status = 'active'
WHERE id = '7cd97546-866f-eff8-b9d3-e47a8d9a516a';

UPDATE public.users SET
  birth_date = '1996-10-23', country = 'DE',
  did = 'did:plc:happy_trainer_4000000000', pds_status = 'active'
WHERE id = '7cd97547-9f9b-0fe0-8f9b-efcbdaa8ff1c';

UPDATE public.users SET
  birth_date = '1993-03-20', country = 'FR',
  did = 'did:plc:annette20000000000000000', pds_status = 'active'
WHERE id = '7cd97548-6426-ba53-7e7f-a3daff12f640';

UPDATE public.users SET
  birth_date = '2002-01-04', country = 'US',
  did = 'did:plc:sorrowful_trainer_130000', pds_status = 'active'
WHERE id = '7cd97549-ad9b-a8dd-7def-b96f3c668f1c';

UPDATE public.users SET
  birth_date = '1988-07-24', country = 'BR',
  did = 'did:plc:cruel_trainer_4400000000', pds_status = 'active'
WHERE id = '7cd9754a-e7ce-0be2-3fb0-59faf6bb83fc';

UPDATE public.users SET
  birth_date = '1990-11-03', country = 'US',
  did = 'did:plc:lee510000000000000000000', pds_status = 'active'
WHERE id = '7cd9754b-9bab-c7b5-4b50-eb9fcc3cdcf8';

UPDATE public.users SET
  birth_date = '1989-10-26', country = 'FR',
  did = 'did:plc:late_trainer_39500000000', pds_status = 'active'
WHERE id = '7cd9754c-f97b-f6a1-1876-a746f99cf5ef';

UPDATE public.users SET
  birth_date = '2003-08-21', country = 'US',
  did = 'did:plc:brilliant_breeder0000000', pds_status = 'active'
WHERE id = '7cd97562-ca42-e147-db26-549f488ffb51';

UPDATE public.users SET
  birth_date = '1981-10-11', country = 'DE',
  did = 'did:plc:dixiesanford870000000000', pds_status = 'active'
WHERE id = '7cd97563-097f-a6b6-9fff-4ede3ac6a7cd';

UPDATE public.users SET
  birth_date = '1993-01-23', country = 'US',
  did = 'did:plc:lonny_bechtelar490000000', pds_status = 'active'
WHERE id = '7cd97564-edf2-bba2-ecce-ab0e196b2fb3';

UPDATE public.users SET
  birth_date = '2004-05-17', country = 'AU',
  did = 'did:plc:courteous_trainer_870000', pds_status = 'active'
WHERE id = '7cd97565-d121-5258-edcf-2a6e7f56e0ff';

UPDATE public.users SET
  birth_date = '1981-03-11', country = 'JP',
  did = 'did:plc:weldon_bergnaum_schu0000', pds_status = 'active'
WHERE id = '7cd97566-cfa1-9aee-6b1f-7a7fef562e0d';

UPDATE public.users SET
  birth_date = '1986-11-18', country = 'GB',
  did = 'did:plc:sigrid670000000000000000', pds_status = 'active'
WHERE id = '7cd97567-42ec-a1c9-7c2a-c4441cc01cc7';

UPDATE public.users SET
  birth_date = '1985-11-02', country = 'JP',
  did = 'did:plc:laurynbalistreri76000000', pds_status = 'active'
WHERE id = '7cd97568-22ec-fd42-bcdb-fc1ac6e6f0c3';

UPDATE public.users SET
  birth_date = '2001-04-28', country = 'JP',
  did = 'did:plc:defensive_champion000000', pds_status = 'active'
WHERE id = '7cd97569-e3e5-3fda-698f-667c5e5d2ed3';

UPDATE public.users SET
  birth_date = '2002-05-07', country = 'US',
  did = 'did:plc:jabari_pagac180000000000', pds_status = 'active'
WHERE id = '7cd9756a-2e42-3ec7-ebef-d50adccf3fef';

UPDATE public.users SET
  birth_date = '1988-10-05', country = 'CA',
  did = 'did:plc:marquis78000000000000000', pds_status = 'active'
WHERE id = '7cd9756b-ee3d-a515-edf5-f08d3c5e8d20';

UPDATE public.users SET
  birth_date = '1983-11-16', country = 'BR',
  did = 'did:plc:dominic_zulauf0000000000', pds_status = 'active'
WHERE id = '7cd97581-f362-5b81-7fd9-3fc6112ceac9';

UPDATE public.users SET
  birth_date = '1995-01-17', country = 'MX',
  did = 'did:plc:shameful_master000000000', pds_status = 'active'
WHERE id = '7cd97582-ab9b-dd9d-d932-0d54a7b3fcd8';

UPDATE public.users SET
  birth_date = '1980-04-13', country = 'JP',
  did = 'did:plc:corrupt_trainer000000000', pds_status = 'active'
WHERE id = '7cd97583-f9a5-bc45-dc95-de9a4d7faace';

UPDATE public.users SET
  birth_date = '1994-12-31', country = 'GB',
  did = 'did:plc:ivah_mcglynn000000000000', pds_status = 'active'
WHERE id = '7cd97584-b282-d9b4-38ef-9b1fe6c2f3e5';

UPDATE public.users SET
  birth_date = '1987-01-10', country = 'MX',
  did = 'did:plc:soupy_breeder00000000000', pds_status = 'active'
WHERE id = '7cd97585-8af4-5695-0df7-70ec33bd0d68';

UPDATE public.users SET
  birth_date = '2005-03-15', country = 'ES',
  did = 'did:plc:stunning_gym000000000000', pds_status = 'active'
WHERE id = '7cd97586-1ecb-4bc6-e13b-ce0f030ceec0';

UPDATE public.users SET
  birth_date = '2004-07-01', country = 'GB',
  did = 'did:plc:jaeden500000000000000000', pds_status = 'active'
WHERE id = '7cd97587-3fb1-d5bb-fbaa-2cc19cc215d2';

UPDATE public.users SET
  birth_date = '1986-09-03', country = 'DE',
  did = 'did:plc:candid_breeder0000000000', pds_status = 'active'
WHERE id = '7cd97588-d2dd-293f-a2bb-ebeb8caaacc8';

UPDATE public.users SET
  birth_date = '2006-08-26', country = 'US',
  did = 'did:plc:jeraldferry8100000000000', pds_status = 'active'
WHERE id = '7cd97589-3a60-7bc7-9f85-5aa4f09b7c4a';

UPDATE public.users SET
  birth_date = '2005-06-08', country = 'US',
  did = 'did:plc:those_trainer_1980000000', pds_status = 'active'
WHERE id = '7cd9758a-3a14-ef8e-b5fe-f5e120fbbb63';

UPDATE public.users SET
  birth_date = '1997-12-02', country = 'AU',
  did = 'did:plc:garricklindgren160000000', pds_status = 'active'
WHERE id = '7cd975a0-a72d-b3ba-decb-1140af2c3658';

UPDATE public.users SET
  birth_date = '2003-06-29', country = 'JP',
  did = 'did:plc:jeffryyost15000000000000', pds_status = 'active'
WHERE id = '7cd975a1-bc34-7d42-f0bb-623febef35c4';

UPDATE public.users SET
  birth_date = '1987-04-25', country = 'US',
  did = 'did:plc:salty_trainer_4030000000', pds_status = 'active'
WHERE id = '7cd975a2-81a2-87bb-3883-bf482d2fb8ce';

UPDATE public.users SET
  birth_date = '2000-10-21', country = 'CA',
  did = 'did:plc:chance650000000000000000', pds_status = 'active'
WHERE id = '7cd975a3-d3bf-1a37-08cd-ec42c3fcbf26';

UPDATE public.users SET
  birth_date = '1987-03-26', country = 'JP',
  did = 'did:plc:gummy_pro000000000000000', pds_status = 'active'
WHERE id = '7cd975a4-c4cc-af4c-d9f9-38e7dd71f6b9';

UPDATE public.users SET
  birth_date = '1987-08-14', country = 'US',
  did = 'did:plc:orland_kihn0000000000000', pds_status = 'active'
WHERE id = '7cd975a5-efce-0dbc-714e-8a10fbb5a34a';

UPDATE public.users SET
  birth_date = '1996-10-07', country = 'DE',
  did = 'did:plc:delilaho_hara84000000000', pds_status = 'active'
WHERE id = '7cd975a6-0b0c-efba-ee1a-5aac73bce7ee';

UPDATE public.users SET
  birth_date = '1986-12-24', country = 'JP',
  did = 'did:plc:aliviashields97000000000', pds_status = 'active'
WHERE id = '7cd975a7-dca6-c19a-ff6a-79cfd4d1d76b';

UPDATE public.users SET
  birth_date = '2007-09-30', country = 'JP',
  did = 'did:plc:alyson_stiedemann0000000', pds_status = 'active'
WHERE id = '7cd975a8-1593-ea5c-fedb-bcc22b50f0db';

UPDATE public.users SET
  birth_date = '1991-06-07', country = 'US',
  did = 'did:plc:jazmin_lubowitz000000000', pds_status = 'active'
WHERE id = '7cd975a9-75fe-5b1b-1eae-ceffeb2b2dad';

UPDATE public.users SET
  birth_date = '1996-12-23', country = 'US',
  did = 'did:plc:dim_trainer_491000000000', pds_status = 'active'
WHERE id = '7cd975bf-94f2-804b-41a0-1baecf1bcbb5';

UPDATE public.users SET
  birth_date = '1990-04-21', country = 'AU',
  did = 'did:plc:monica_crist_fahey790000', pds_status = 'active'
WHERE id = '7cd975c0-cde0-15ed-ad4b-f5a1cb397bc0';

UPDATE public.users SET
  birth_date = '1985-03-21', country = 'GB',
  did = 'did:plc:scornful_elite0000000000', pds_status = 'active'
WHERE id = '7cd975c1-37fc-89c0-1d1f-e58cdea1e9a1';

UPDATE public.users SET
  birth_date = '1987-09-12', country = 'US',
  did = 'did:plc:squeaky_trainer_45400000', pds_status = 'active'
WHERE id = '7cd975c2-5ecb-d8bb-22be-6da502a48bf2';

UPDATE public.users SET
  birth_date = '1998-09-18', country = 'JP',
  did = 'did:plc:jazmyne80000000000000000', pds_status = 'active'
WHERE id = '7cd975c3-e7dc-19ab-ad59-ddfc1d735957';

UPDATE public.users SET
  birth_date = '2001-04-05', country = 'US',
  did = 'did:plc:frequent_trainer_5720000', pds_status = 'active'
WHERE id = '7cd975c4-a327-b512-cd5c-be5d6f087b1b';

UPDATE public.users SET
  birth_date = '1996-01-25', country = 'CA',
  did = 'did:plc:mariannamacejkovic760000', pds_status = 'active'
WHERE id = '7cd975c5-86ab-ebed-25fc-c91956a1c9d1';

UPDATE public.users SET
  birth_date = '2006-07-01', country = 'US',
  did = 'did:plc:assuntaschoen_koelpi0000', pds_status = 'active'
WHERE id = '7cd975c6-5e32-ccaf-e1f8-6c6109ccf663';

UPDATE public.users SET
  birth_date = '1989-04-06', country = 'US',
  did = 'did:plc:foolhardy_trainer_790000', pds_status = 'active'
WHERE id = '7cd975c7-dd39-6a9f-17ab-6adebccc686a';

UPDATE public.users SET
  birth_date = '1992-03-15', country = 'CA',
  did = 'did:plc:vidaboyle570000000000000', pds_status = 'active'
WHERE id = '7cd975c8-a976-b10b-a25e-cfabff4b44e8';

UPDATE public.users SET
  birth_date = '1983-06-20', country = 'US',
  did = 'did:plc:ashtyn_vonrueden00000000', pds_status = 'active'
WHERE id = '7cd975de-e499-d14e-db07-d6ed1df1b683';

UPDATE public.users SET
  birth_date = '1987-07-05', country = 'CA',
  did = 'did:plc:vernie340000000000000000', pds_status = 'active'
WHERE id = '7cd975df-47ae-e473-bade-8adb079540e5';

UPDATE public.users SET
  birth_date = '1985-09-09', country = 'US',
  did = 'did:plc:enlightened_trainer_0000', pds_status = 'active'
WHERE id = '7cd975e0-638e-d9e1-4cd0-8efe7292ea6a';

UPDATE public.users SET
  birth_date = '1980-08-20', country = 'CA',
  did = 'did:plc:elsie_stroman00000000000', pds_status = 'active'
WHERE id = '7cd975e1-a90c-7bef-fb8e-e62c7ea4d19c';

UPDATE public.users SET
  birth_date = '1992-02-05', country = 'JP',
  did = 'did:plc:nella_russel000000000000', pds_status = 'active'
WHERE id = '7cd975e2-30e5-51ec-ee7d-04ca78b0545b';

UPDATE public.users SET
  birth_date = '2002-12-10', country = 'IT',
  did = 'did:plc:claudestreich31000000000', pds_status = 'active'
WHERE id = '7cd975e3-bda0-f83e-6cc9-c59beb8e3e8a';

UPDATE public.users SET
  birth_date = '1993-10-21', country = 'US',
  did = 'did:plc:drab_trainer_48700000000', pds_status = 'active'
WHERE id = '7cd975e4-b5de-ebeb-2d0a-3489d1b4ceca';

UPDATE public.users SET
  birth_date = '1982-06-23', country = 'US',
  did = 'did:plc:novakuhic680000000000000', pds_status = 'active'
WHERE id = '7cd975e5-ef27-dc05-d04f-d5105d9fe84b';

UPDATE public.users SET
  birth_date = '1982-01-17', country = 'US',
  did = 'did:plc:quincy_pouros90000000000', pds_status = 'active'
WHERE id = '7cd975e6-7e6a-e3aa-dde2-e2b5efa49da2';

UPDATE public.users SET
  birth_date = '1999-08-27', country = 'DE',
  did = 'did:plc:sigmund_senger4600000000', pds_status = 'active'
WHERE id = '7cd975e7-1ca5-5ad8-a2af-a4b59ba5ed8b';

UPDATE public.users SET
  birth_date = '1983-09-29', country = 'CA',
  did = 'did:plc:noted_gym000000000000000', pds_status = 'active'
WHERE id = '7cd975fd-ee82-b2e4-588b-a35b3dcfeee5';

UPDATE public.users SET
  birth_date = '1991-12-05', country = 'US',
  did = 'did:plc:front_trainer_8950000000', pds_status = 'active'
WHERE id = '7cd975fe-91b7-adde-9cd2-b61ec3bce5d7';

UPDATE public.users SET
  birth_date = '1985-06-08', country = 'JP',
  did = 'did:plc:amber_reichel25000000000', pds_status = 'active'
WHERE id = '7cd975ff-a77f-e09d-62ad-c13d4bb6ecf1';

UPDATE public.users SET
  birth_date = '1997-12-22', country = 'US',
  did = 'did:plc:made_up_trainer_16100000', pds_status = 'active'
WHERE id = '7cd97600-96d0-ec6b-0fb6-71f0e9e5baf1';

UPDATE public.users SET
  birth_date = '2006-06-14', country = 'JP',
  did = 'did:plc:easy_trainer_73800000000', pds_status = 'active'
WHERE id = '7cd97601-7515-ebe8-fab5-aafe70ab3afe';

UPDATE public.users SET
  birth_date = '1990-07-10', country = 'JP',
  did = 'did:plc:twin_trainer_70400000000', pds_status = 'active'
WHERE id = '7cd97602-c4de-d2d2-1b8c-193fcf72f69e';

UPDATE public.users SET
  birth_date = '1999-04-13', country = 'US',
  did = 'did:plc:stunning_trainer_5370000', pds_status = 'active'
WHERE id = '7cd97603-1fc8-74ef-3d99-5cab631f4f89';

UPDATE public.users SET
  birth_date = '2005-03-07', country = 'US',
  did = 'did:plc:fredrick_hagenes66000000', pds_status = 'active'
WHERE id = '7cd97604-562e-12e7-fc5e-2b95ddfd845a';

UPDATE public.users SET
  birth_date = '2002-12-21', country = 'US',
  did = 'did:plc:tatyanahintz440000000000', pds_status = 'active'
WHERE id = '7cd97605-db8a-e0d9-739a-8e9fdb287cc1';

UPDATE public.users SET
  birth_date = '1983-09-16', country = 'GB',
  did = 'did:plc:thorny_trainer_213000000', pds_status = 'active'
WHERE id = '7cd97606-e97d-ecf0-2dc6-5b18bca7dcce';

UPDATE public.users SET
  birth_date = '1991-05-28', country = 'JP',
  did = 'did:plc:arturofahey5500000000000', pds_status = 'active'
WHERE id = '7cd9761c-41df-31b5-cfe8-ead94bbbae2f';

UPDATE public.users SET
  birth_date = '1984-10-17', country = 'GB',
  did = 'did:plc:skylar_bednar00000000000', pds_status = 'active'
WHERE id = '7cd9761d-fefe-802b-e9ab-14cfd2f40f6e';

UPDATE public.users SET
  birth_date = '1989-06-29', country = 'US',
  did = 'did:plc:ornery_trainer_904000000', pds_status = 'active'
WHERE id = '7cd9761e-63d8-597a-f9cc-3fbed9daad7f';

UPDATE public.users SET
  birth_date = '1989-05-22', country = 'JP',
  did = 'did:plc:ashamed_elite00000000000', pds_status = 'active'
WHERE id = '7cd9761f-53fb-47d1-31ba-afeae0dbb76e';

UPDATE public.users SET
  birth_date = '1994-07-26', country = 'GB',
  did = 'did:plc:true_elite00000000000000', pds_status = 'active'
WHERE id = '7cd97620-af11-ebda-2aa6-6c1d5dee9f76';

UPDATE public.users SET
  birth_date = '1990-05-05', country = 'US',
  did = 'did:plc:nettie_hermiston00000000', pds_status = 'active'
WHERE id = '7cd97621-91e4-e9fc-e0ad-329ebb30b1de';

UPDATE public.users SET
  birth_date = '1984-11-13', country = 'CA',
  did = 'did:plc:malvinamitchell240000000', pds_status = 'active'
WHERE id = '7cd97622-6e3f-295a-5dd4-d18fed682fbf';

UPDATE public.users SET
  birth_date = '1980-12-08', country = 'FR',
  did = 'did:plc:enriquebalistreri4000000', pds_status = 'active'
WHERE id = '7cd97623-0ea7-e0cc-49ef-0e35502f622f';

UPDATE public.users SET
  birth_date = '2005-06-09', country = 'GB',
  did = 'did:plc:desiree_fadel00000000000', pds_status = 'active'
WHERE id = '7cd97624-789a-9ce7-c249-4d3adf8dc91a';

UPDATE public.users SET
  birth_date = '1991-11-12', country = 'JP',
  did = 'did:plc:leta_kunde10000000000000', pds_status = 'active'
WHERE id = '7cd97625-5341-40d6-f477-0c0edbbe8e01';

UPDATE public.users SET
  birth_date = '2002-07-08', country = 'JP',
  did = 'did:plc:katheryn_braun0000000000', pds_status = 'active'
WHERE id = '7cd978c6-acfa-5dc4-5b0f-2b8ad9b105e2';

UPDATE public.users SET
  birth_date = '1987-05-16', country = 'FR',
  did = 'did:plc:incomplete_trainer_60000', pds_status = 'active'
WHERE id = '7cd978c7-ca3c-ad75-2bc7-a7ed383dae6e';

UPDATE public.users SET
  birth_date = '1984-04-13', country = 'US',
  did = 'did:plc:personal_trainer_5800000', pds_status = 'active'
WHERE id = '7cd978c8-d62a-d060-9dfe-3db3eaaf44f4';

UPDATE public.users SET
  birth_date = '1987-09-21', country = 'US',
  did = 'did:plc:oswaldo_kling00000000000', pds_status = 'active'
WHERE id = '7cd978c9-ad2f-f2ec-8a5f-0c9e4eaadada';

UPDATE public.users SET
  birth_date = '1986-12-13', country = 'US',
  did = 'did:plc:price_fay820000000000000', pds_status = 'active'
WHERE id = '7cd978ca-b25c-7ff5-0f92-f0d323ffb875';

UPDATE public.users SET
  birth_date = '1996-01-19', country = 'JP',
  did = 'did:plc:katrina16000000000000000', pds_status = 'active'
WHERE id = '7cd978cb-9afc-5dc8-a634-2feea1dc9cfb';

UPDATE public.users SET
  birth_date = '1985-08-19', country = 'JP',
  did = 'did:plc:arnoldo81000000000000000', pds_status = 'active'
WHERE id = '7cd978cc-aaa6-fe86-a53b-6d2e602ed5bd';

UPDATE public.users SET
  birth_date = '1990-07-17', country = 'IT',
  did = 'did:plc:garett_bergnaum000000000', pds_status = 'active'
WHERE id = '7cd978cd-06e7-5bc2-eb3f-88bf29a871f9';

UPDATE public.users SET
  birth_date = '1986-09-06', country = 'CA',
  did = 'did:plc:substantial_trainer_0000', pds_status = 'active'
WHERE id = '7cd978ce-0203-1f63-5eb8-d87486e6c148';

UPDATE public.users SET
  birth_date = '1995-09-10', country = 'JP',
  did = 'did:plc:gaston_funk5000000000000', pds_status = 'active'
WHERE id = '7cd978cf-bc66-ad42-d7c7-2cb49bc2cfbd';

UPDATE public.users SET
  birth_date = '1986-02-15', country = 'GB',
  did = 'did:plc:scary_trainer_6770000000', pds_status = 'active'
WHERE id = '7cd978e5-ebef-0d9c-5fdb-14a0b0e8df72';

UPDATE public.users SET
  birth_date = '1980-10-24', country = 'US',
  did = 'did:plc:oval_trainer_52100000000', pds_status = 'active'
WHERE id = '7cd978e6-fd7c-c901-bff1-4acde0cb5f40';

UPDATE public.users SET
  birth_date = '1991-02-25', country = 'US',
  did = 'did:plc:chaunceyjohnson550000000', pds_status = 'active'
WHERE id = '7cd978e7-daca-2f49-1c2d-daadb9baeaab';

UPDATE public.users SET
  birth_date = '1981-06-14', country = 'FR',
  did = 'did:plc:kayla7500000000000000000', pds_status = 'active'
WHERE id = '7cd978e8-c466-b13b-259b-a9bd2398ac83';

UPDATE public.users SET
  birth_date = '2007-05-21', country = 'US',
  did = 'did:plc:kiplarkin250000000000000', pds_status = 'active'
WHERE id = '7cd978e9-d1d1-ffbf-c9cf-aecb9405b89f';

UPDATE public.users SET
  birth_date = '1987-03-05', country = 'US',
  did = 'did:plc:izabellabeahan7900000000', pds_status = 'active'
WHERE id = '7cd978ea-0262-f624-c1cf-590e954e93fc';

UPDATE public.users SET
  birth_date = '2006-11-11', country = 'US',
  did = 'did:plc:bill_pacocha000000000000', pds_status = 'active'
WHERE id = '7cd978eb-fd5b-f59b-6046-93df1eef05ee';

UPDATE public.users SET
  birth_date = '1983-11-08', country = 'JP',
  did = 'did:plc:sniveling_trainer0000000', pds_status = 'active'
WHERE id = '7cd978ec-e4ff-c369-66f3-a0de64eff75f';

UPDATE public.users SET
  birth_date = '1999-02-11', country = 'GB',
  did = 'did:plc:jacynthe_klein0000000000', pds_status = 'active'
WHERE id = '7cd978ed-e0cb-b72d-adce-be8bb882e2e9';

UPDATE public.users SET
  birth_date = '1995-04-01', country = 'ES',
  did = 'did:plc:marilie_medhurst82000000', pds_status = 'active'
WHERE id = '7cd978ee-d968-865c-1e37-15ad4aadabec';

UPDATE public.users SET
  birth_date = '1994-08-24', country = 'DE',
  did = 'did:plc:impossible_trainer_90000', pds_status = 'active'
WHERE id = '7cd97904-9fc3-98f5-ed9e-f25ef203f3bc';

UPDATE public.users SET
  birth_date = '1986-04-11', country = 'US',
  did = 'did:plc:pertinent_trainer_270000', pds_status = 'active'
WHERE id = '7cd97905-96bb-addc-965b-992f4495c89b';

UPDATE public.users SET
  birth_date = '1999-11-14', country = 'US',
  did = 'did:plc:carleykerluke47000000000', pds_status = 'active'
WHERE id = '7cd97906-5be2-a417-3fb3-0b3d7c61449e';

UPDATE public.users SET
  birth_date = '2003-04-08', country = 'US',
  did = 'did:plc:adolfomoen96000000000000', pds_status = 'active'
WHERE id = '7cd97907-55ba-b1fb-6e9d-cbfda6a48df8';

UPDATE public.users SET
  birth_date = '1991-01-09', country = 'US',
  did = 'did:plc:flaviedare76000000000000', pds_status = 'active'
WHERE id = '7cd97908-1cd9-91bb-3222-d453fc574a0e';

UPDATE public.users SET
  birth_date = '1991-08-05', country = 'IT',
  did = 'did:plc:stanley_schneider0000000', pds_status = 'active'
WHERE id = '7cd97909-2f5b-73c6-ecaa-a1ed13f983b2';

UPDATE public.users SET
  birth_date = '1985-10-04', country = 'JP',
  did = 'did:plc:norene680000000000000000', pds_status = 'active'
WHERE id = '7cd9790a-c7ef-c7c7-1f21-d6e78579fbe0';

UPDATE public.users SET
  birth_date = '1998-06-22', country = 'JP',
  did = 'did:plc:krystina_beatty850000000', pds_status = 'active'
WHERE id = '7cd9790b-0ea0-fa24-1cdb-bcd0f9ce7e2e';

UPDATE public.users SET
  birth_date = '1996-06-15', country = 'JP',
  did = 'did:plc:vain_trainer_11300000000', pds_status = 'active'
WHERE id = '7cd9790c-07bf-ff62-5cfa-037c1e8ebadd';

UPDATE public.users SET
  birth_date = '1986-02-10', country = 'US',
  did = 'did:plc:practical_leader00000000', pds_status = 'active'
WHERE id = '7cd9790d-abc9-cb0d-c3dd-32f853ede1d8';

UPDATE public.users SET
  birth_date = '1986-12-15', country = 'GB',
  did = 'did:plc:jaleelstracke93000000000', pds_status = 'active'
WHERE id = '7cd97923-6c0c-77ec-dc5b-90cedac12d61';

UPDATE public.users SET
  birth_date = '1999-07-29', country = 'JP',
  did = 'did:plc:kayden330000000000000000', pds_status = 'active'
WHERE id = '7cd97924-ebc5-47a6-b3f2-eebf9d76cac6';

UPDATE public.users SET
  birth_date = '1987-09-15', country = 'FR',
  did = 'did:plc:artfritsch16000000000000', pds_status = 'active'
WHERE id = '7cd97925-a6b8-c2f9-7f8c-9f2ca436f5a0';

UPDATE public.users SET
  birth_date = '2004-02-16', country = 'US',
  did = 'did:plc:khalillarson_schuppe0000', pds_status = 'active'
WHERE id = '7cd97926-44ec-b8ba-5b02-da9b8abaf47a';

UPDATE public.users SET
  birth_date = '1982-01-23', country = 'JP',
  did = 'did:plc:nicolaconn45000000000000', pds_status = 'active'
WHERE id = '7cd97927-fbd6-1e8c-b7f2-63b4febba7ad';

UPDATE public.users SET
  birth_date = '1999-12-12', country = 'IT',
  did = 'did:plc:tressie65000000000000000', pds_status = 'active'
WHERE id = '7cd97928-5ab5-bce7-ad84-fba9789bba2a';

UPDATE public.users SET
  birth_date = '1997-12-07', country = 'CA',
  did = 'did:plc:colorless_trainer_930000', pds_status = 'active'
WHERE id = '7cd97929-8fcc-3565-c016-45bc0982effa';

UPDATE public.users SET
  birth_date = '2003-07-07', country = 'US',
  did = 'did:plc:well_lit_trainer_8140000', pds_status = 'active'
WHERE id = '7cd9792a-afec-e9da-e1bf-bcde1807bec2';

UPDATE public.users SET
  birth_date = '2004-12-31', country = 'JP',
  did = 'did:plc:overcooked_trainer_50000', pds_status = 'active'
WHERE id = '7cd9792b-aa2e-9a80-2af7-fffaea9460d5';

UPDATE public.users SET
  birth_date = '1999-04-27', country = 'GB',
  did = 'did:plc:oleflatley25000000000000', pds_status = 'active'
WHERE id = '7cd9792c-b066-366b-e8f7-6b019ef1cadc';

UPDATE public.users SET
  birth_date = '1982-10-31', country = 'US',
  did = 'did:plc:dallas560000000000000000', pds_status = 'active'
WHERE id = '7cd97942-acba-35a3-757f-8c2b8ef4dd94';

UPDATE public.users SET
  birth_date = '1997-10-14', country = 'BR',
  did = 'did:plc:nicola690000000000000000', pds_status = 'active'
WHERE id = '7cd97943-6aeb-ca1f-adec-27d41bc3cfbc';

UPDATE public.users SET
  birth_date = '2004-07-13', country = 'US',
  did = 'did:plc:clementina80000000000000', pds_status = 'active'
WHERE id = '7cd97944-5f9d-606c-8bde-5acef5f800aa';

UPDATE public.users SET
  birth_date = '1986-07-30', country = 'JP',
  did = 'did:plc:ripe_trainer_29400000000', pds_status = 'active'
WHERE id = '7cd97945-4b3e-a2a1-d5bb-ecc8eb6c9cc4';

UPDATE public.users SET
  birth_date = '2000-02-06', country = 'US',
  did = 'did:plc:fortunate_champion000000', pds_status = 'active'
WHERE id = '7cd97946-258a-0ff7-79d3-4c58de7f0aab';

UPDATE public.users SET
  birth_date = '2007-06-24', country = 'FR',
  did = 'did:plc:tianna460000000000000000', pds_status = 'active'
WHERE id = '7cd97947-6226-dbdd-0427-b073eaa9f4ba';

UPDATE public.users SET
  birth_date = '1999-08-16', country = 'GB',
  did = 'did:plc:titus_kohler600000000000', pds_status = 'active'
WHERE id = '7cd97948-4afb-87de-e1ad-2fe1e7c99db0';

UPDATE public.users SET
  birth_date = '1983-04-24', country = 'IT',
  did = 'did:plc:ciara_heidenreich3300000', pds_status = 'active'
WHERE id = '7cd97949-aeec-2bfc-c1fb-87ddac821187';

UPDATE public.users SET
  birth_date = '1983-10-28', country = 'IT',
  did = 'did:plc:sick_trainer000000000000', pds_status = 'active'
WHERE id = '7cd9794a-b387-bb2a-858a-7580a30ebba4';

UPDATE public.users SET
  birth_date = '2006-05-10', country = 'DE',
  did = 'did:plc:runny_champion0000000000', pds_status = 'active'
WHERE id = '7cd9794b-4918-a87d-d183-f2e64e090ab7';

UPDATE public.users SET
  birth_date = '1988-02-13', country = 'US',
  did = 'did:plc:huge_trainer_67200000000', pds_status = 'active'
WHERE id = '7cd97961-54bc-e4eb-c550-6a14fbaf838c';

UPDATE public.users SET
  birth_date = '1988-06-01', country = 'JP',
  did = 'did:plc:annette_harber2000000000', pds_status = 'active'
WHERE id = '7cd97962-cf98-c9c5-abbb-4fb73097c4c5';

UPDATE public.users SET
  birth_date = '2000-01-25', country = 'CA',
  did = 'did:plc:jaydeemard34000000000000', pds_status = 'active'
WHERE id = '7cd97963-3fc4-423a-abad-f06e00cf5fb6';

UPDATE public.users SET
  birth_date = '1987-08-14', country = 'US',
  did = 'did:plc:violent_trainer_34500000', pds_status = 'active'
WHERE id = '7cd97964-f4ce-3fed-4daf-3a739babf8d8';

UPDATE public.users SET
  birth_date = '1987-02-25', country = 'JP',
  did = 'did:plc:mauricelittel79000000000', pds_status = 'active'
WHERE id = '7cd97965-05bc-ee9e-b42e-cbadfb2c5bff';

UPDATE public.users SET
  birth_date = '1995-02-05', country = 'CA',
  did = 'did:plc:jailyn750000000000000000', pds_status = 'active'
WHERE id = '7cd97966-e9d3-f20d-5abc-f6f28c8dbef1';

UPDATE public.users SET
  birth_date = '1999-06-23', country = 'US',
  did = 'did:plc:sally_block3300000000000', pds_status = 'active'
WHERE id = '7cd97967-94e3-6b54-d118-fc9c8e1edb46';

UPDATE public.users SET
  birth_date = '1999-02-08', country = 'AU',
  did = 'did:plc:bowed_ace000000000000000', pds_status = 'active'
WHERE id = '7cd97968-0083-ce8c-0307-d2d9e24096dd';

UPDATE public.users SET
  birth_date = '2003-02-14', country = 'US',
  did = 'did:plc:multicolored_trainer0000', pds_status = 'active'
WHERE id = '7cd97969-5062-aeda-e10e-6575b9be8537';

UPDATE public.users SET
  birth_date = '1995-06-22', country = 'JP',
  did = 'did:plc:slushy_breeder0000000000', pds_status = 'active'
WHERE id = '7cd9796a-cf2a-21ff-194a-ced7d6edc760';

UPDATE public.users SET
  birth_date = '1990-07-14', country = 'US',
  did = 'did:plc:itzel1200000000000000000', pds_status = 'active'
WHERE id = '7cd97980-3dad-0eaa-dae7-b0052530e0a3';

UPDATE public.users SET
  birth_date = '1988-03-27', country = 'GB',
  did = 'did:plc:sincere98000000000000000', pds_status = 'active'
WHERE id = '7cd97981-2e34-cad5-0afb-ad9ba9bb650c';

UPDATE public.users SET
  birth_date = '1997-11-13', country = 'US',
  did = 'did:plc:caleighparker77000000000', pds_status = 'active'
WHERE id = '7cd97982-f649-1fcc-ea0d-f9a4438cc8cf';

UPDATE public.users SET
  birth_date = '1989-01-08', country = 'US',
  did = 'did:plc:cathrinemosciski_wun0000', pds_status = 'active'
WHERE id = '7cd97983-50fa-232d-2a05-df1cacdff5da';

UPDATE public.users SET
  birth_date = '1993-03-19', country = 'ES',
  did = 'did:plc:aged_trainer_12000000000', pds_status = 'active'
WHERE id = '7cd97984-8dbb-bc8d-561b-955dccda8e29';

UPDATE public.users SET
  birth_date = '2001-06-04', country = 'JP',
  did = 'did:plc:jessicaleannon2200000000', pds_status = 'active'
WHERE id = '7cd97985-daea-88ea-cd32-d60d4efa45b3';

UPDATE public.users SET
  birth_date = '1989-05-07', country = 'US',
  did = 'did:plc:emmittdubuque80000000000', pds_status = 'active'
WHERE id = '7cd97986-cdbd-6b2e-ff50-cfb45b7cabcb';

UPDATE public.users SET
  birth_date = '1984-07-21', country = 'CA',
  did = 'did:plc:rickylockman290000000000', pds_status = 'active'
WHERE id = '7cd97987-f0f5-08e0-cbd1-eeeec0a86989';

UPDATE public.users SET
  birth_date = '2003-04-13', country = 'US',
  did = 'did:plc:ashton_kshlerin000000000', pds_status = 'active'
WHERE id = '7cd97988-292d-3b06-eafd-71cec2f5fd5d';

UPDATE public.users SET
  birth_date = '1999-10-30', country = 'US',
  did = 'did:plc:westonwilderman140000000', pds_status = 'active'
WHERE id = '7cd97989-c5f0-4595-adfc-1f3b597c2c3f';

UPDATE public.users SET
  birth_date = '1982-02-05', country = 'CA',
  did = 'did:plc:houston_walter0000000000', pds_status = 'active'
WHERE id = '7cd9799f-82dd-dfd0-8c8d-d8dbafa3bbbb';

UPDATE public.users SET
  birth_date = '2004-05-20', country = 'FR',
  did = 'did:plc:fake_ace0000000000000000', pds_status = 'active'
WHERE id = '7cd979a0-dbeb-1abe-ba36-34f35cd3bb56';

UPDATE public.users SET
  birth_date = '2003-08-09', country = 'US',
  did = 'did:plc:rey_bode5500000000000000', pds_status = 'active'
WHERE id = '7cd979a1-c2c3-1ead-76ba-7facf5f8eafa';

UPDATE public.users SET
  birth_date = '2007-05-06', country = 'ES',
  did = 'did:plc:robin_schultz00000000000', pds_status = 'active'
WHERE id = '7cd979a2-3897-bbcc-b2f9-61a75fa51c0e';

UPDATE public.users SET
  birth_date = '1984-09-26', country = 'JP',
  did = 'did:plc:gloomy_champion000000000', pds_status = 'active'
WHERE id = '7cd979a3-c600-0a6b-99bf-62c79eadbafb';

UPDATE public.users SET
  birth_date = '2005-01-18', country = 'US',
  did = 'did:plc:trusty_gym00000000000000', pds_status = 'active'
WHERE id = '7cd979a4-aae1-d971-ca2d-aad9ed6398cc';

UPDATE public.users SET
  birth_date = '1982-08-15', country = 'US',
  did = 'did:plc:memorable_master00000000', pds_status = 'active'
WHERE id = '7cd979a5-1fc9-ecdc-67dd-fd2c9facb71d';

UPDATE public.users SET
  birth_date = '1993-05-05', country = 'US',
  did = 'did:plc:brody2500000000000000000', pds_status = 'active'
WHERE id = '7cd979a6-4ee8-4eda-dba3-78bed2376ddf';

UPDATE public.users SET
  birth_date = '1986-03-25', country = 'JP',
  did = 'did:plc:taut_leader0000000000000', pds_status = 'active'
WHERE id = '7cd979a7-8f9a-a5cd-ae41-dcfeeccc8e9b';

UPDATE public.users SET
  birth_date = '1982-11-07', country = 'ES',
  did = 'did:plc:kenna_beahan000000000000', pds_status = 'active'
WHERE id = '7cd979a8-4430-add4-6ae5-a96a1b5f1f4d';

UPDATE public.users SET
  birth_date = '1997-08-12', country = 'JP',
  did = 'did:plc:viviane_rempel0000000000', pds_status = 'active'
WHERE id = '7cd979be-e2c6-eaf0-6405-e5bdf88a3d8c';

UPDATE public.users SET
  birth_date = '1985-07-15', country = 'US',
  did = 'did:plc:pitiful_elite00000000000', pds_status = 'active'
WHERE id = '7cd979bf-b5b9-cdd9-09dc-e3e4a7f18f4b';

UPDATE public.users SET
  birth_date = '1992-03-20', country = 'US',
  did = 'did:plc:outstanding_elite0000000', pds_status = 'active'
WHERE id = '7cd979c0-406a-b4fb-eff1-40f7b7c23787';

UPDATE public.users SET
  birth_date = '1982-07-21', country = 'US',
  did = 'did:plc:bustling_elite0000000000', pds_status = 'active'
WHERE id = '7cd979c1-8bde-a2cf-cdf4-9a1f2fb0ecb5';

UPDATE public.users SET
  birth_date = '1998-04-18', country = 'JP',
  did = 'did:plc:heavy_trainer_2560000000', pds_status = 'active'
WHERE id = '7cd979c2-cad6-2ccd-e1b8-db6cf2bde72b';

UPDATE public.users SET
  birth_date = '1997-06-29', country = 'GB',
  did = 'did:plc:willing_trainer_39000000', pds_status = 'active'
WHERE id = '7cd979c3-6e69-b2e8-18db-f16c1c2c7d31';

UPDATE public.users SET
  birth_date = '1993-05-04', country = 'JP',
  did = 'did:plc:brannonlarkin62000000000', pds_status = 'active'
WHERE id = '7cd979c4-c50e-4dc1-2ad6-fd70a4c9cdc8';

UPDATE public.users SET
  birth_date = '1998-08-07', country = 'US',
  did = 'did:plc:opheliadicki910000000000', pds_status = 'active'
WHERE id = '7cd979c5-77e1-e4f3-a41d-c8fcc6ba7d33';

UPDATE public.users SET
  birth_date = '1992-11-22', country = 'GB',
  did = 'did:plc:madyson24000000000000000', pds_status = 'active'
WHERE id = '7cd979c6-fdd7-6400-deed-cad7ef5cb3d6';

UPDATE public.users SET
  birth_date = '1998-12-29', country = 'BR',
  did = 'did:plc:weekly_trainer_641000000', pds_status = 'active'
WHERE id = '7cd979c7-5dee-e8ef-0daa-c3ac0609abed';

UPDATE public.users SET
  birth_date = '1981-03-14', country = 'JP',
  did = 'did:plc:thoramarvin7200000000000', pds_status = 'active'
WHERE id = '7cd979dd-8302-ebf7-de3f-a1cb0217bb5e';

UPDATE public.users SET
  birth_date = '1989-04-19', country = 'JP',
  did = 'did:plc:alvertalemke460000000000', pds_status = 'active'
WHERE id = '7cd979de-df8d-c9ee-b07a-6fcaf5da7a2b';

UPDATE public.users SET
  birth_date = '2001-03-06', country = 'JP',
  did = 'did:plc:elaina_nitzsche000000000', pds_status = 'active'
WHERE id = '7cd979df-a48d-0fc8-9cb6-7ec36dffae4a';

UPDATE public.users SET
  birth_date = '1997-02-19', country = 'JP',
  did = 'did:plc:recent_trainer_469000000', pds_status = 'active'
WHERE id = '7cd979e0-9c6e-3ee5-7ca7-b14a1cfefecd';

UPDATE public.users SET
  birth_date = '1988-01-04', country = 'GB',
  did = 'did:plc:lucy_reilly0000000000000', pds_status = 'active'
WHERE id = '7cd979e1-d34d-25c7-ae48-dadeb5083fe0';

UPDATE public.users SET
  birth_date = '1991-12-07', country = 'DE',
  did = 'did:plc:delores_orn4400000000000', pds_status = 'active'
WHERE id = '7cd979e2-e59b-d2d4-bbda-65d394ba77cc';

UPDATE public.users SET
  birth_date = '2005-02-25', country = 'US',
  did = 'did:plc:unpleasant_pro0000000000', pds_status = 'active'
WHERE id = '7cd979e3-66d9-fde4-e531-c2366dba55f0';

UPDATE public.users SET
  birth_date = '1980-05-21', country = 'JP',
  did = 'did:plc:cody_heaney0000000000000', pds_status = 'active'
WHERE id = '7cd979e4-2e49-4c20-1e3f-12baeebda7ed';

UPDATE public.users SET
  birth_date = '2004-11-23', country = 'DE',
  did = 'did:plc:dario_west44000000000000', pds_status = 'active'
WHERE id = '7cd979e5-3c63-c883-8d7e-e33c806db22e';

UPDATE public.users SET
  birth_date = '2000-06-25', country = 'JP',
  did = 'did:plc:overcooked_ranger0000000', pds_status = 'active'
WHERE id = '7cd979e6-f7ee-5b9e-9aa5-49adf6a0bf80';

UPDATE public.users SET
  birth_date = '1989-02-10', country = 'JP',
  did = 'did:plc:qualified_trainer_610000', pds_status = 'active'
WHERE id = '7cd97c87-39d9-cc4c-b829-1296e8abf5eb';

UPDATE public.users SET
  birth_date = '1994-04-16', country = 'JP',
  did = 'did:plc:fred_pacocha470000000000', pds_status = 'active'
WHERE id = '7cd97c88-edb6-b49a-cd90-c3d08f296dd5';

UPDATE public.users SET
  birth_date = '1986-01-07', country = 'FR',
  did = 'did:plc:powerless_trainer_330000', pds_status = 'active'
WHERE id = '7cd97c89-14f9-f4df-6cd8-cc3878aae69b';

UPDATE public.users SET
  birth_date = '2003-08-10', country = 'FR',
  did = 'did:plc:kasey_jacobi990000000000', pds_status = 'active'
WHERE id = '7cd97c8a-3770-dc8a-d83f-cf041ca2ccff';

UPDATE public.users SET
  birth_date = '1996-09-15', country = 'DE',
  did = 'did:plc:unselfish_trainer_120000', pds_status = 'active'
WHERE id = '7cd97c8b-c2ba-99be-ce3f-bedccc2c95d9';

UPDATE public.users SET
  birth_date = '1984-04-26', country = 'GB',
  did = 'did:plc:diamond_kunze75000000000', pds_status = 'active'
WHERE id = '7cd97c8c-eeb2-5dfe-e90b-ead76dbb24e8';

UPDATE public.users SET
  birth_date = '1985-11-08', country = 'BR',
  did = 'did:plc:valentin_hodkiewicz30000', pds_status = 'active'
WHERE id = '7cd97c8d-0b70-e3c6-1121-aa79eefd78dd';

UPDATE public.users SET
  birth_date = '1990-02-17', country = 'GB',
  did = 'did:plc:gregorio_schuster_ke0000', pds_status = 'active'
WHERE id = '7cd97c8e-13dd-ef86-cfdb-b7ccf0735d04';

UPDATE public.users SET
  birth_date = '1993-01-22', country = 'US',
  did = 'did:plc:lexieerdman2400000000000', pds_status = 'active'
WHERE id = '7cd97c8f-a7e6-cae5-7aed-12a273def8dc';

UPDATE public.users SET
  birth_date = '1987-02-24', country = 'US',
  did = 'did:plc:rosy_trainer_40900000000', pds_status = 'active'
WHERE id = '7cd97c90-2dac-c94a-22f4-6a9fdef6796f';

UPDATE public.users SET
  birth_date = '1994-04-17', country = 'AU',
  did = 'did:plc:casimer_baumbach00000000', pds_status = 'active'
WHERE id = '7cd97ca6-cebf-2c59-d510-00254f62cce6';

UPDATE public.users SET
  birth_date = '2007-11-06', country = 'US',
  did = 'did:plc:michale_orn0000000000000', pds_status = 'active'
WHERE id = '7cd97ca7-ad4a-2837-8ff2-f102fe435bc4';

UPDATE public.users SET
  birth_date = '1988-03-16', country = 'US',
  did = 'did:plc:fuzzy_pro000000000000000', pds_status = 'active'
WHERE id = '7cd97ca8-e309-baeb-2cb2-30ddef1db6f6';

UPDATE public.users SET
  birth_date = '2002-09-22', country = 'IT',
  did = 'did:plc:shanie_maggio00000000000', pds_status = 'active'
WHERE id = '7cd97ca9-b210-ddf8-7dce-b9dca430f256';

UPDATE public.users SET
  birth_date = '1983-06-24', country = 'US',
  did = 'did:plc:grant_bednar000000000000', pds_status = 'active'
WHERE id = '7cd97caa-fe9f-aba9-0ed4-eefdf5cc52f6';

UPDATE public.users SET
  birth_date = '2002-04-03', country = 'JP',
  did = 'did:plc:abelardo_konopelski00000', pds_status = 'active'
WHERE id = '7cd97cab-2a12-5cec-75cf-f21fcceebefc';

UPDATE public.users SET
  birth_date = '1989-01-20', country = 'JP',
  did = 'did:plc:clevekling88000000000000', pds_status = 'active'
WHERE id = '7cd97cac-d3c9-ea63-0b28-c63be23f0f0d';

UPDATE public.users SET
  birth_date = '1992-01-29', country = 'FR',
  did = 'did:plc:treviono_kon170000000000', pds_status = 'active'
WHERE id = '7cd97cad-9ff7-dc4d-1c31-8ccf91ac96b7';

UPDATE public.users SET
  birth_date = '1985-11-12', country = 'GB',
  did = 'did:plc:neat_ace0000000000000000', pds_status = 'active'
WHERE id = '7cd97cae-7c9f-28fb-367e-aabb92cebcee';

UPDATE public.users SET
  birth_date = '1995-05-31', country = 'US',
  did = 'did:plc:eryn_stracke_hand4100000', pds_status = 'active'
WHERE id = '7cd97caf-acd1-416d-cdc6-53cd43dae85f';


-- -----------------------------------------------------------------------------
-- public.alts updates and inserts
-- -----------------------------------------------------------------------------

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = 'f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = 'a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d';

UPDATE public.alts SET
  bio = 'Training hard every day!', tier = 'player_pro'
WHERE user_id = '711a6f7d-fc44-46b9-6d36-8ab4bd1d31ef';

UPDATE public.alts SET
  bio = 'VGC enthusiast', tier = 'player_pro'
WHERE user_id = '711a6f7c-c4fb-edde-1407-85c76b3b1fa4';

UPDATE public.alts SET
  bio = 'Pokemon trainer', tier = 'player_pro'
WHERE user_id = '711a6f7b-d716-7aed-a2fa-caab9020e6bd';

UPDATE public.alts SET
  bio = 'Always learning', tier = 'player_pro'
WHERE user_id = '711a6f7a-b4db-bd62-59bc-0b9427e7bf7f';

UPDATE public.alts SET
  bio = 'Training hard every day!', tier = 'player_pro'
WHERE user_id = '711a6f79-af5e-a5a8-ddb1-c740ce0b4e3f';

UPDATE public.alts SET
  tier = 'player_pro'
WHERE user_id = '711a6f78-b52d-dd77-fddb-e13dd02e03cf';

UPDATE public.alts SET
  bio = 'Draft league player', tier = 'player_pro'
WHERE user_id = '711a6f77-c285-5f8d-dbbc-a4f60e3eee80';

UPDATE public.alts SET
  bio = 'Looking for practice partners', tier = 'player_pro'
WHERE user_id = '711a6f76-2df3-bdaf-f76b-bdebbbefbd78';

UPDATE public.alts SET
  tier = 'player_pro'
WHERE user_id = '711a6f75-c72b-a4d1-1bbe-ffb7b5910fcf';

UPDATE public.alts SET
  bio = 'Always learning', tier = 'player_pro'
WHERE user_id = '711a6f74-57a0-210c-fa2a-a398dd08dbce';

UPDATE public.alts SET
  bio = 'Looking for practice partners', tier = 'player_pro'
WHERE user_id = '4dcc802c-ace8-fd41-202f-17c0b62fddab';

UPDATE public.alts SET
  tier = 'player_pro'
WHERE user_id = '4dcc802d-9aa2-dbc7-d80d-27eecd967eab';

UPDATE public.alts SET
  bio = 'Training hard every day!', tier = 'player_pro'
WHERE user_id = '4dcc802e-3ad2-1f1c-f11f-88befa81bc9d';

UPDATE public.alts SET
  bio = 'Pokemon trainer', tier = 'player_pro'
WHERE user_id = '4dcc802f-cf86-d4f0-f0db-f1cfbdf9dcd0';

UPDATE public.alts SET
  bio = 'Looking for practice partners', tier = 'player_pro'
WHERE user_id = '4dcc8030-fffb-6bf3-ecef-d9ed008bf3d8';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player', tier = 'player_pro'
WHERE user_id = '4dcc8031-c592-ed5e-d72e-babcccd820ad';

UPDATE public.alts SET
  tier = 'player_pro'
WHERE user_id = '4dcc8032-7bb8-dce3-ea5a-fa7d512233e4';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player', tier = 'player_pro'
WHERE user_id = '4dcc8033-2a48-bf0b-d1de-16ba448ad8aa';

UPDATE public.alts SET
  bio = 'Draft league player', tier = 'player_pro'
WHERE user_id = '4dcc8034-5580-7472-ddeb-a1bca9267ec7';

UPDATE public.alts SET
  bio = 'Always learning', tier = 'player_pro'
WHERE user_id = '4dcc8035-9f28-fdb5-3eec-c6a479b52d6c';

UPDATE public.alts SET
  bio = 'Draft league player', tier = 'player_pro'
WHERE user_id = '4dcc804b-b5ea-da97-ecf2-ae31acc3b433';

UPDATE public.alts SET
  tier = 'player_pro'
WHERE user_id = '4dcc804c-5d8b-dd2e-d73b-dbdb365a0cad';

UPDATE public.alts SET
  bio = 'Looking for practice partners', tier = 'player_pro'
WHERE user_id = '4dcc804d-efb5-73dc-8ae3-cbd0decfef3c';

UPDATE public.alts SET
  bio = 'Always learning', tier = 'player_pro'
WHERE user_id = '4dcc804e-2edb-d817-b078-be77a94933a9';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player', tier = 'player_pro'
WHERE user_id = '4dcc804f-d1a4-d440-ac1b-9b98c34ce85e';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '70036c45-b905-bd53-cfb3-50e2c6cec403';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '70036c47-c72e-3e94-bdab-efc5a4fe0fe3';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '70036c48-0d52-1f7f-16bb-7ddd50d0dbeb';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '70036c49-2766-500f-98e4-eb19dead3f5e';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '70036c4a-1fde-f38a-f3b4-4bdc2d52dfcb';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '70036c4b-4f1c-aadc-7ec5-dbecdfcfeda3';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '70036c4c-dfd5-dbb2-abf7-de2ef16f1c7d';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '70036c4d-7aaf-96f9-93bf-41ee6e39e9e8';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '6f95e374-0a25-f3ad-fc07-b170182cfb43';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '6f95e373-fb7b-1dcb-9eba-1153d4f74bea';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '6f95e372-fa97-8f0d-c9fa-dd96de4dda2f';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '6f95e371-38f5-e7b2-f951-3b7c95df330a';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '6f95e370-1be0-29e6-b03f-f0eedabae306';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '6f95e36f-fcef-addc-0efe-4e8e2ef1f8db';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '6f95e36e-0788-f895-841d-eda8cba0788c';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '6f95e36d-1e72-a566-bb6d-f5923e3bf2c5';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '6f95e36c-9cd7-5b6c-9e2d-9c3ac420edc5';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '6f95e356-22fc-611d-4747-1b1b5bdeb77e';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '6f95e355-9a7e-be58-3feb-cbd1a2cbf065';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '6f95e354-fc4e-2b8d-dbb6-183f7fec2cea';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '6f95e353-2fcf-96b9-2e4d-e31ba1f1ff53';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '6f95e352-6db9-2d94-89ca-a09a05a3b405';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '6f95e351-88ab-dfb6-f95c-0daeeded1b3a';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '6f95e350-be43-2ea5-01f6-ad842dbeb0fb';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '6f95e34f-899d-e524-de6b-cce5aacabe3b';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '6f95e34d-df89-fdd8-9f0d-7b2cae1cccde';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '6f95e337-7914-dafe-e9db-29c8cc47700c';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '6f95e336-a21a-a9aa-3d2a-ef11655d55a9';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '6f95e335-7d0e-fce1-95af-5e4cafd72345';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '6f95e334-ecea-9eb1-bba1-b4537ab4ddd5';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '6f95e333-bf4b-6bcd-b8eb-3fb6cd6f344d';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '6f95e332-9fed-3d93-0cbf-d1a4ccbf6aca';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '6f95e331-9aed-7caf-d2e7-f13c4c6efb64';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '6f95e330-dec2-9adc-8f29-0ae6c6eab0ff';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '6f95e32f-6d66-a1dc-edd4-15b0cfcb1cd2';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '6f95e32e-9bdd-9ddd-f5b2-8aeedabd157a';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '6f95e318-4b00-4027-bcb6-e81d27bdaff2';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '6f95e317-0e15-1df2-8a82-9a117eee7d0d';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '6f95e316-c02c-7aec-f9e6-6b9bcce97c8d';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '6f95e315-0ee7-196e-d84f-9f3a0bf80083';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '6f95e314-dcf6-f887-b3cb-ac9654175fc7';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '6f95e313-0ab5-fefb-d2b2-b6de3afacc86';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '6f95e312-f42c-9cd1-d9bd-e0afff267b64';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '6f95e311-acd1-a188-172b-e1fb61bbf118';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '6f95e310-fd7e-2db9-cd1f-5fcbcb3b5a62';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '6f95e30f-1c05-a627-5c6b-d9e8f1fa8df0';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '6f95e2f9-e17f-b9a4-881a-9cc4ead4ed63';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '6f95e2f8-812b-5c08-7029-a8bd0afbe6bb';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '6f95e2f7-806e-fc0d-bba8-6155aaa1febf';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '6f95e2f6-8e57-e6ad-f130-d92fb5be16ba';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '6f95e2f5-4eff-fc59-d1df-4bdefbfa3af5';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '6f95e2f3-003d-6ec9-cba6-7ded9baa4d47';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '6f95e2f1-1bf3-bce0-5d6f-a2bb8ecffaef';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '6f95e2f0-ffce-a83b-a80c-0ff95fbcf1bf';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '6f95e2da-5dcc-d0e1-c667-d7a81b69f718';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '6f95e2d9-b3f2-8af9-7854-a56efd11e62d';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '6f95e2d8-65dd-e23e-ad4c-fe80c59f8c4e';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '6f95e2d7-de5f-24da-0545-51aade1ecbce';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '6f95e2d6-deb9-d5f9-9ee1-c6906b1ae2a9';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '6f95e2d5-f266-5bb7-7cb6-ee77bed28cb4';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '6f95e2d4-30fa-b310-3d57-24bd51854fdc';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '6f95e2d3-273f-48d4-b90b-1acdf50fbccc';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '6f95e2d2-1d8b-f1e1-8b9f-c747818afef0';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '6f95e2d1-abb3-eda3-4dad-adedcd3af546';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '6f95e2ba-7dfc-c5c1-2f7a-bcf509207bc6';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '6f95e2b9-cddc-cfa9-f85d-ee7b4ffebfd1';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '6f95e2b8-d3fa-ec30-bdfc-bfba83c6ecd7';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '6f95e2b7-cd4a-6bf0-ddfa-c171fbce1814';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '6f95e2b6-b765-257e-14b3-7d31a6cb3cb3';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '6f95e2b5-afce-bc6b-cfd8-4aaaac7c879a';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '6f95e2b4-c8e3-c464-4c6e-fc38b81ccb3e';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '6f95e2b3-a72a-e064-5daa-a3a9dfa8c304';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '6f95e2b2-3095-1f2d-638b-8a2b5ece810c';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '6f95e29c-eda6-6f0f-fdf6-71957ce48e12';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '6f95e29b-aacd-ba10-4e98-dde6f54479c2';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '6f95e299-f5f9-711f-a4d5-c7cca77b741a';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '6f95e298-b0a8-3efc-f192-dee17c8cbd85';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '6f95e297-c093-dc5b-af4d-eedd8abe9ac3';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '6f95e296-050f-f8a7-ebe8-b5f0def2e3d4';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '6f95e294-cb44-be29-7d14-a1a978b3cba3';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '6f95e293-4e5d-d659-5ece-c83a7e51f3ff';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '6f95e27d-7cc4-efcc-b0c0-df64a5d22fec';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '6f95e27a-8ab2-0f75-0bcf-cb1c8d852623';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '6f95e279-2d2c-ffad-aad4-069dc42f2acb';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '6f95e278-af56-ddbc-a8ea-4fc7e061af7e';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '6f95e277-7b3e-f978-2d98-e9e1beef3adc';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '6f95e276-bb1c-d863-39d1-eacc1adcb6e2';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '6f95e275-0f1b-629e-81dd-8491ccc7bccd';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '6f95e274-41da-b4e1-9344-818ba8c3b11c';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd97505-6132-2b57-ffe3-8c10ee9a9073';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd97506-beca-e167-bf5d-c489f3b7a9cc';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd97508-db60-a6a0-ce3a-2dc8bd40ccdd';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd97509-d113-b468-b0ee-be03daceeeff';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd9750b-dc4f-871a-256b-d6cca3fef7be';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd9750c-c2fa-e5d3-1fac-83cc4fbdaccf';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd9750d-d1fe-d55e-6b83-0bf877b9dbb3';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd9750e-5ab7-df9e-7149-40eca321fe92';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd97524-b79e-bcd0-bafa-fa5bfc2f7085';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd97526-4668-8b3f-36bb-ae3c18906fe7';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd97527-b7d4-3eed-db17-6d73db82456e';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd97528-d7f0-f61d-5813-61e0a26e3f4a';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd97529-dd15-a4ae-97f9-a7ecab79c7be';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd9752a-a7d4-ac46-aa4f-ff9adbf59240';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd9752b-aafc-7e1d-27bd-8ac7d1bc393f';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd9752c-b51f-26bc-d38d-faead4eddab7';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd9752d-b7a0-a7e0-caa1-fbd5a912c54b';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd97543-9c59-09cc-7628-2affddf6daaa';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd97544-cb20-f8d1-fec2-ca8dedd264da';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd97545-a3f4-24a9-c009-bd1be8c2eaee';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd97546-866f-eff8-b9d3-e47a8d9a516a';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd97547-9f9b-0fe0-8f9b-efcbdaa8ff1c';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd97548-6426-ba53-7e7f-a3daff12f640';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd97549-ad9b-a8dd-7def-b96f3c668f1c';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd9754a-e7ce-0be2-3fb0-59faf6bb83fc';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd9754b-9bab-c7b5-4b50-eb9fcc3cdcf8';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd9754c-f97b-f6a1-1876-a746f99cf5ef';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd97562-ca42-e147-db26-549f488ffb51';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd97563-097f-a6b6-9fff-4ede3ac6a7cd';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd97564-edf2-bba2-ecce-ab0e196b2fb3';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd97566-cfa1-9aee-6b1f-7a7fef562e0d';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd97567-42ec-a1c9-7c2a-c4441cc01cc7';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd97568-22ec-fd42-bcdb-fc1ac6e6f0c3';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd97569-e3e5-3fda-698f-667c5e5d2ed3';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd9756a-2e42-3ec7-ebef-d50adccf3fef';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd9756b-ee3d-a515-edf5-f08d3c5e8d20';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd97581-f362-5b81-7fd9-3fc6112ceac9';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd97583-f9a5-bc45-dc95-de9a4d7faace';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd97584-b282-d9b4-38ef-9b1fe6c2f3e5';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd97585-8af4-5695-0df7-70ec33bd0d68';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd97586-1ecb-4bc6-e13b-ce0f030ceec0';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd97587-3fb1-d5bb-fbaa-2cc19cc215d2';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd97588-d2dd-293f-a2bb-ebeb8caaacc8';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd9758a-3a14-ef8e-b5fe-f5e120fbbb63';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd975a0-a72d-b3ba-decb-1140af2c3658';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd975a2-81a2-87bb-3883-bf482d2fb8ce';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd975a3-d3bf-1a37-08cd-ec42c3fcbf26';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd975a4-c4cc-af4c-d9f9-38e7dd71f6b9';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd975a6-0b0c-efba-ee1a-5aac73bce7ee';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd975a8-1593-ea5c-fedb-bcc22b50f0db';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd975bf-94f2-804b-41a0-1baecf1bcbb5';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd975c0-cde0-15ed-ad4b-f5a1cb397bc0';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd975c1-37fc-89c0-1d1f-e58cdea1e9a1';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd975c3-e7dc-19ab-ad59-ddfc1d735957';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd975c4-a327-b512-cd5c-be5d6f087b1b';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd975c6-5e32-ccaf-e1f8-6c6109ccf663';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd975c7-dd39-6a9f-17ab-6adebccc686a';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd975c8-a976-b10b-a25e-cfabff4b44e8';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd975de-e499-d14e-db07-d6ed1df1b683';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd975df-47ae-e473-bade-8adb079540e5';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd975e0-638e-d9e1-4cd0-8efe7292ea6a';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd975e1-a90c-7bef-fb8e-e62c7ea4d19c';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd975e2-30e5-51ec-ee7d-04ca78b0545b';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd975e3-bda0-f83e-6cc9-c59beb8e3e8a';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd975e4-b5de-ebeb-2d0a-3489d1b4ceca';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd975e5-ef27-dc05-d04f-d5105d9fe84b';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd975e6-7e6a-e3aa-dde2-e2b5efa49da2';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd975e7-1ca5-5ad8-a2af-a4b59ba5ed8b';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd975fd-ee82-b2e4-588b-a35b3dcfeee5';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd975fe-91b7-adde-9cd2-b61ec3bce5d7';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd975ff-a77f-e09d-62ad-c13d4bb6ecf1';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd97600-96d0-ec6b-0fb6-71f0e9e5baf1';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd97601-7515-ebe8-fab5-aafe70ab3afe';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd97602-c4de-d2d2-1b8c-193fcf72f69e';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd97603-1fc8-74ef-3d99-5cab631f4f89';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd97604-562e-12e7-fc5e-2b95ddfd845a';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd97605-db8a-e0d9-739a-8e9fdb287cc1';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd97606-e97d-ecf0-2dc6-5b18bca7dcce';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd9761c-41df-31b5-cfe8-ead94bbbae2f';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd9761d-fefe-802b-e9ab-14cfd2f40f6e';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd9761e-63d8-597a-f9cc-3fbed9daad7f';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd9761f-53fb-47d1-31ba-afeae0dbb76e';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd97620-af11-ebda-2aa6-6c1d5dee9f76';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd97622-6e3f-295a-5dd4-d18fed682fbf';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd97623-0ea7-e0cc-49ef-0e35502f622f';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd97624-789a-9ce7-c249-4d3adf8dc91a';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd97625-5341-40d6-f477-0c0edbbe8e01';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd978c6-acfa-5dc4-5b0f-2b8ad9b105e2';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd978c7-ca3c-ad75-2bc7-a7ed383dae6e';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd978c8-d62a-d060-9dfe-3db3eaaf44f4';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd978c9-ad2f-f2ec-8a5f-0c9e4eaadada';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd978ca-b25c-7ff5-0f92-f0d323ffb875';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd978cb-9afc-5dc8-a634-2feea1dc9cfb';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd978cc-aaa6-fe86-a53b-6d2e602ed5bd';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd978cd-06e7-5bc2-eb3f-88bf29a871f9';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd978ce-0203-1f63-5eb8-d87486e6c148';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd978cf-bc66-ad42-d7c7-2cb49bc2cfbd';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd978e5-ebef-0d9c-5fdb-14a0b0e8df72';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd978e6-fd7c-c901-bff1-4acde0cb5f40';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd978e7-daca-2f49-1c2d-daadb9baeaab';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd978e8-c466-b13b-259b-a9bd2398ac83';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd978ea-0262-f624-c1cf-590e954e93fc';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd978eb-fd5b-f59b-6046-93df1eef05ee';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd978ec-e4ff-c369-66f3-a0de64eff75f';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd978ed-e0cb-b72d-adce-be8bb882e2e9';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd978ee-d968-865c-1e37-15ad4aadabec';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd97904-9fc3-98f5-ed9e-f25ef203f3bc';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd97906-5be2-a417-3fb3-0b3d7c61449e';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd97907-55ba-b1fb-6e9d-cbfda6a48df8';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd97908-1cd9-91bb-3222-d453fc574a0e';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd97909-2f5b-73c6-ecaa-a1ed13f983b2';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd9790a-c7ef-c7c7-1f21-d6e78579fbe0';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd9790b-0ea0-fa24-1cdb-bcd0f9ce7e2e';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd9790c-07bf-ff62-5cfa-037c1e8ebadd';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd9790d-abc9-cb0d-c3dd-32f853ede1d8';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd97924-ebc5-47a6-b3f2-eebf9d76cac6';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd97925-a6b8-c2f9-7f8c-9f2ca436f5a0';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd97927-fbd6-1e8c-b7f2-63b4febba7ad';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd97928-5ab5-bce7-ad84-fba9789bba2a';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd97929-8fcc-3565-c016-45bc0982effa';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd9792a-afec-e9da-e1bf-bcde1807bec2';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd9792b-aa2e-9a80-2af7-fffaea9460d5';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd9792c-b066-366b-e8f7-6b019ef1cadc';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd97942-acba-35a3-757f-8c2b8ef4dd94';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd97943-6aeb-ca1f-adec-27d41bc3cfbc';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd97944-5f9d-606c-8bde-5acef5f800aa';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd97945-4b3e-a2a1-d5bb-ecc8eb6c9cc4';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd97946-258a-0ff7-79d3-4c58de7f0aab';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd97947-6226-dbdd-0427-b073eaa9f4ba';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd97948-4afb-87de-e1ad-2fe1e7c99db0';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd97949-aeec-2bfc-c1fb-87ddac821187';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd9794a-b387-bb2a-858a-7580a30ebba4';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd9794b-4918-a87d-d183-f2e64e090ab7';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd97961-54bc-e4eb-c550-6a14fbaf838c';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd97962-cf98-c9c5-abbb-4fb73097c4c5';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd97963-3fc4-423a-abad-f06e00cf5fb6';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd97964-f4ce-3fed-4daf-3a739babf8d8';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd97965-05bc-ee9e-b42e-cbadfb2c5bff';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd97966-e9d3-f20d-5abc-f6f28c8dbef1';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd97967-94e3-6b54-d118-fc9c8e1edb46';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd97968-0083-ce8c-0307-d2d9e24096dd';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd97969-5062-aeda-e10e-6575b9be8537';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd9796a-cf2a-21ff-194a-ced7d6edc760';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd97980-3dad-0eaa-dae7-b0052530e0a3';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd97981-2e34-cad5-0afb-ad9ba9bb650c';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd97982-f649-1fcc-ea0d-f9a4438cc8cf';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd97983-50fa-232d-2a05-df1cacdff5da';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd97984-8dbb-bc8d-561b-955dccda8e29';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd97985-daea-88ea-cd32-d60d4efa45b3';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd97986-cdbd-6b2e-ff50-cfb45b7cabcb';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd97987-f0f5-08e0-cbd1-eeeec0a86989';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd97989-c5f0-4595-adfc-1f3b597c2c3f';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd9799f-82dd-dfd0-8c8d-d8dbafa3bbbb';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd979a0-dbeb-1abe-ba36-34f35cd3bb56';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd979a2-3897-bbcc-b2f9-61a75fa51c0e';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd979a3-c600-0a6b-99bf-62c79eadbafb';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd979a4-aae1-d971-ca2d-aad9ed6398cc';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd979a5-1fc9-ecdc-67dd-fd2c9facb71d';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd979a6-4ee8-4eda-dba3-78bed2376ddf';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd979a7-8f9a-a5cd-ae41-dcfeeccc8e9b';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd979a8-4430-add4-6ae5-a96a1b5f1f4d';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd979be-e2c6-eaf0-6405-e5bdf88a3d8c';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd979bf-b5b9-cdd9-09dc-e3e4a7f18f4b';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd979c0-406a-b4fb-eff1-40f7b7c23787';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd979c1-8bde-a2cf-cdf4-9a1f2fb0ecb5';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd979c2-cad6-2ccd-e1b8-db6cf2bde72b';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd979c3-6e69-b2e8-18db-f16c1c2c7d31';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd979c4-c50e-4dc1-2ad6-fd70a4c9cdc8';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd979c5-77e1-e4f3-a41d-c8fcc6ba7d33';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd979c6-fdd7-6400-deed-cad7ef5cb3d6';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd979c7-5dee-e8ef-0daa-c3ac0609abed';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd979dd-8302-ebf7-de3f-a1cb0217bb5e';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd979df-a48d-0fc8-9cb6-7ec36dffae4a';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd979e0-9c6e-3ee5-7ca7-b14a1cfefecd';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd979e1-d34d-25c7-ae48-dadeb5083fe0';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd979e2-e59b-d2d4-bbda-65d394ba77cc';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd979e4-2e49-4c20-1e3f-12baeebda7ed';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd979e5-3c63-c883-8d7e-e33c806db22e';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd979e6-f7ee-5b9e-9aa5-49adf6a0bf80';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd97c87-39d9-cc4c-b829-1296e8abf5eb';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd97c88-edb6-b49a-cd90-c3d08f296dd5';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd97c89-14f9-f4df-6cd8-cc3878aae69b';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd97c8a-3770-dc8a-d83f-cf041ca2ccff';

UPDATE public.alts SET
  bio = 'Draft league player'
WHERE user_id = '7cd97c8b-c2ba-99be-ce3f-bedccc2c95d9';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd97c8c-eeb2-5dfe-e90b-ead76dbb24e8';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd97c8d-0b70-e3c6-1121-aa79eefd78dd';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd97c8e-13dd-ef86-cfdb-b7ccf0735d04';

UPDATE public.alts SET
  bio = 'Training hard every day!'
WHERE user_id = '7cd97c8f-a7e6-cae5-7aed-12a273def8dc';

UPDATE public.alts SET
  bio = 'Competitive Pokemon player'
WHERE user_id = '7cd97ca6-cebf-2c59-d510-00254f62cce6';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd97ca7-ad4a-2837-8ff2-f102fe435bc4';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd97ca9-b210-ddf8-7dce-b9dca430f256';

UPDATE public.alts SET
  bio = 'Looking for practice partners'
WHERE user_id = '7cd97caa-fe9f-aba9-0ed4-eefdf5cc52f6';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd97cab-2a12-5cec-75cf-f21fcceebefc';

UPDATE public.alts SET
  bio = 'Always learning'
WHERE user_id = '7cd97cac-d3c9-ea63-0b28-c63be23f0f0d';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd97cad-9ff7-dc4d-1c31-8ccf91ac96b7';

UPDATE public.alts SET
  bio = 'Pokemon trainer'
WHERE user_id = '7cd97cae-7c9f-28fb-367e-aabb92cebcee';

UPDATE public.alts SET
  bio = 'VGC enthusiast'
WHERE user_id = '7cd97caf-acd1-416d-cdc6-53cd43dae85f';


-- -----------------------------------------------------------------------------
-- Additional alts
-- -----------------------------------------------------------------------------

INSERT INTO public.alts (user_id, username, display_name, bio, tier) VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'admin_trainer_vgc', 'Admin (VGC)', 'Competitive Pokemon player', 'free'),
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'admin_trainer_draft', 'Admin Draft', 'Looking for practice partners', 'free'),
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'ash_ketchum_vgc', 'Ash (VGC)', 'Competitive Pokemon player', 'free'),
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'ash_ketchum_draft', 'Ash Draft', 'Draft league player', 'free'),
  ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'cynthia_vgc', 'Cynthia (VGC)', 'Pokemon trainer', 'free'),
  ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'cynthia_draft', 'Cynthia Draft', 'Training hard every day!', 'free'),
  ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'brock_vgc', 'Brock (VGC)', NULL, 'free'),
  ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'brock_draft', 'Brock Draft', 'VGC enthusiast', 'free'),
  ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'karen_vgc', 'Karen (VGC)', 'VGC enthusiast', 'free'),
  ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'karen_draft', 'Karen Draft', 'VGC enthusiast', 'free'),
  ('f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'red_vgc', 'Red (VGC)', 'Competitive Pokemon player', 'free'),
  ('f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c', 'red_draft', 'Red Draft', 'VGC enthusiast', 'free'),
  ('a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d', 'lance_vgc', 'Lance (VGC)', 'Looking for practice partners', 'free'),
  ('a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d', 'lance_draft', 'Lance Draft', 'Pokemon trainer', 'free'),
  ('711a6f7d-fc44-46b9-6d36-8ab4bd1d31ef', 'valentinemiller24_vgc', 'Anderson (VGC)', 'Looking for practice partners', 'free'),
  ('711a6f7d-fc44-46b9-6d36-8ab4bd1d31ef', 'valentinemiller24_draft', 'Anderson Draft', 'Training hard every day!', 'free'),
  ('711a6f7c-c4fb-edde-1407-85c76b3b1fa4', 'ellis_paucek_vgc', 'Sylvia (VGC)', 'Pokemon trainer', 'free'),
  ('711a6f7c-c4fb-edde-1407-85c76b3b1fa4', 'ellis_paucek_draft', 'Sylvia Draft', NULL, 'free'),
  ('711a6f7b-d716-7aed-a2fa-caab9020e6bd', 'submissive_trainer_7_vgc', 'Olen (VGC)', 'Competitive Pokemon player', 'free'),
  ('711a6f7b-d716-7aed-a2fa-caab9020e6bd', 'submissive_trainer_7_draft', 'Olen Draft', 'VGC enthusiast', 'free'),
  ('711a6f7a-b4db-bd62-59bc-0b9427e7bf7f', 'halliefay16_vgc', 'Caroline (VGC)', 'Training hard every day!', 'free'),
  ('711a6f7a-b4db-bd62-59bc-0b9427e7bf7f', 'halliefay16_draft', 'Caroline Draft', 'VGC enthusiast', 'free'),
  ('711a6f7a-b4db-bd62-59bc-0b9427e7bf7f', 'halliefay16_anon', 'Anonymous Trainer', 'Draft league player', 'free'),
  ('711a6f7a-b4db-bd62-59bc-0b9427e7bf7f', 'halliefay16_alt', 'CSchowalter', 'Always learning', 'free'),
  ('711a6f79-af5e-a5a8-ddb1-c740ce0b4e3f', 'demetrius_gutkowski_vgc', 'Amelie (VGC)', 'Pokemon trainer', 'free'),
  ('711a6f79-af5e-a5a8-ddb1-c740ce0b4e3f', 'demetrius_gutkowski_draft', 'Amelie Draft', 'Training hard every day!', 'free'),
  ('711a6f79-af5e-a5a8-ddb1-c740ce0b4e3f', 'demetrius_gutkowski_anon', 'Anonymous Trainer', NULL, 'free'),
  ('711a6f79-af5e-a5a8-ddb1-c740ce0b4e3f', 'demetrius_gutkowski_alt', 'AUpton', 'Competitive Pokemon player', 'free'),
  ('711a6f78-b52d-dd77-fddb-e13dd02e03cf', 'trentheaney20_vgc', 'Serenity (VGC)', 'Draft league player', 'free'),
  ('711a6f78-b52d-dd77-fddb-e13dd02e03cf', 'trentheaney20_draft', 'Serenity Draft', NULL, 'free'),
  ('711a6f78-b52d-dd77-fddb-e13dd02e03cf', 'trentheaney20_anon', 'Anonymous Trainer', 'Looking for practice partners', 'free'),
  ('711a6f78-b52d-dd77-fddb-e13dd02e03cf', 'trentheaney20_alt', 'SOkuneva', 'Looking for practice partners', 'free'),
  ('711a6f77-c285-5f8d-dbbc-a4f60e3eee80', 'eminent_ranger_vgc', 'Eriberto (VGC)', 'VGC enthusiast', 'free'),
  ('711a6f77-c285-5f8d-dbbc-a4f60e3eee80', 'eminent_ranger_draft', 'Eriberto Draft', 'Competitive Pokemon player', 'free'),
  ('711a6f77-c285-5f8d-dbbc-a4f60e3eee80', 'eminent_ranger_anon', 'Anonymous Trainer', 'VGC enthusiast', 'free'),
  ('711a6f77-c285-5f8d-dbbc-a4f60e3eee80', 'eminent_ranger_alt', 'EO''Hara', 'Draft league player', 'free'),
  ('711a6f76-2df3-bdaf-f76b-bdebbbefbd78', 'hilbert38_vgc', 'Ceasar (VGC)', 'Draft league player', 'free'),
  ('711a6f76-2df3-bdaf-f76b-bdebbbefbd78', 'hilbert38_draft', 'Ceasar Draft', 'Competitive Pokemon player', 'free'),
  ('711a6f76-2df3-bdaf-f76b-bdebbbefbd78', 'hilbert38_anon', 'Anonymous Trainer', NULL, 'free'),
  ('711a6f76-2df3-bdaf-f76b-bdebbbefbd78', 'hilbert38_alt', 'CWeber', 'Training hard every day!', 'free'),
  ('711a6f75-c72b-a4d1-1bbe-ffb7b5910fcf', 'ordinary_trainer_36_vgc', 'Kari (VGC)', 'Competitive Pokemon player', 'free'),
  ('711a6f75-c72b-a4d1-1bbe-ffb7b5910fcf', 'ordinary_trainer_36_draft', 'Kari Draft', 'Competitive Pokemon player', 'free'),
  ('711a6f75-c72b-a4d1-1bbe-ffb7b5910fcf', 'ordinary_trainer_36_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('711a6f75-c72b-a4d1-1bbe-ffb7b5910fcf', 'ordinary_trainer_36_alt', 'KMcLaughlin', 'Draft league player', 'free'),
  ('711a6f74-57a0-210c-fa2a-a398dd08dbce', 'chad_friesen_vgc', 'Verda (VGC)', 'Draft league player', 'free'),
  ('711a6f74-57a0-210c-fa2a-a398dd08dbce', 'chad_friesen_draft', 'Verda Draft', 'Looking for practice partners', 'free'),
  ('711a6f74-57a0-210c-fa2a-a398dd08dbce', 'chad_friesen_anon', 'Anonymous Trainer', 'VGC enthusiast', 'free'),
  ('711a6f74-57a0-210c-fa2a-a398dd08dbce', 'chad_friesen_alt', 'VLuettgen', 'Draft league player', 'free'),
  ('4dcc802c-ace8-fd41-202f-17c0b62fddab', 'blank_trainer_642_vgc', 'Kylee (VGC)', 'Training hard every day!', 'free'),
  ('4dcc802c-ace8-fd41-202f-17c0b62fddab', 'blank_trainer_642_draft', 'Kylee Draft', 'Always learning', 'free')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.alts (user_id, username, display_name, bio, tier) VALUES
  ('4dcc802c-ace8-fd41-202f-17c0b62fddab', 'blank_trainer_642_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('4dcc802c-ace8-fd41-202f-17c0b62fddab', 'blank_trainer_642_alt', 'KMayer', 'Pokemon trainer', 'free'),
  ('4dcc802d-9aa2-dbc7-d80d-27eecd967eab', 'charlotteschoen99_vgc', 'Gabrielle (VGC)', 'Training hard every day!', 'free'),
  ('4dcc802d-9aa2-dbc7-d80d-27eecd967eab', 'charlotteschoen99_draft', 'Gabrielle Draft', 'Competitive Pokemon player', 'free'),
  ('4dcc802d-9aa2-dbc7-d80d-27eecd967eab', 'charlotteschoen99_anon', 'Anonymous Trainer', 'Looking for practice partners', 'free'),
  ('4dcc802d-9aa2-dbc7-d80d-27eecd967eab', 'charlotteschoen99_alt', 'GHeaney', NULL, 'free'),
  ('4dcc802e-3ad2-1f1c-f11f-88befa81bc9d', 'brown_gym_vgc', 'Katheryn (VGC)', 'Looking for practice partners', 'free'),
  ('4dcc802e-3ad2-1f1c-f11f-88befa81bc9d', 'brown_gym_draft', 'Katheryn Draft', 'Looking for practice partners', 'free'),
  ('4dcc802e-3ad2-1f1c-f11f-88befa81bc9d', 'brown_gym_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('4dcc802e-3ad2-1f1c-f11f-88befa81bc9d', 'brown_gym_alt', 'KTorphy', 'Looking for practice partners', 'free'),
  ('4dcc802f-cf86-d4f0-f0db-f1cfbdf9dcd0', 'made_up_trainer_12_vgc', 'Anabelle (VGC)', 'Training hard every day!', 'free'),
  ('4dcc802f-cf86-d4f0-f0db-f1cfbdf9dcd0', 'made_up_trainer_12_draft', 'Anabelle Draft', 'Always learning', 'free'),
  ('4dcc802f-cf86-d4f0-f0db-f1cfbdf9dcd0', 'made_up_trainer_12_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('4dcc802f-cf86-d4f0-f0db-f1cfbdf9dcd0', 'made_up_trainer_12_alt', 'ACarroll', 'Competitive Pokemon player', 'free'),
  ('4dcc8030-fffb-6bf3-ecef-d9ed008bf3d8', 'valentinaklocko65_vgc', 'Cindy (VGC)', 'VGC enthusiast', 'free'),
  ('4dcc8030-fffb-6bf3-ecef-d9ed008bf3d8', 'valentinaklocko65_draft', 'Cindy Draft', 'Draft league player', 'free'),
  ('4dcc8030-fffb-6bf3-ecef-d9ed008bf3d8', 'valentinaklocko65_anon', 'Anonymous Trainer', 'Always learning', 'free'),
  ('4dcc8030-fffb-6bf3-ecef-d9ed008bf3d8', 'valentinaklocko65_alt', 'CHermann', 'Draft league player', 'free'),
  ('4dcc8031-c592-ed5e-d72e-babcccd820ad', 'ronny_koss27_vgc', 'Raoul (VGC)', 'Competitive Pokemon player', 'free'),
  ('4dcc8031-c592-ed5e-d72e-babcccd820ad', 'ronny_koss27_draft', 'Raoul Draft', 'Pokemon trainer', 'free'),
  ('4dcc8031-c592-ed5e-d72e-babcccd820ad', 'ronny_koss27_anon', 'Anonymous Trainer', NULL, 'free'),
  ('4dcc8031-c592-ed5e-d72e-babcccd820ad', 'ronny_koss27_alt', 'RZieme-Luettgen', 'Draft league player', 'free'),
  ('4dcc8032-7bb8-dce3-ea5a-fa7d512233e4', 'early_master_vgc', 'Felicia (VGC)', 'Always learning', 'free'),
  ('4dcc8032-7bb8-dce3-ea5a-fa7d512233e4', 'early_master_draft', 'Felicia Draft', 'Competitive Pokemon player', 'free'),
  ('4dcc8032-7bb8-dce3-ea5a-fa7d512233e4', 'early_master_anon', 'Anonymous Trainer', 'Looking for practice partners', 'free'),
  ('4dcc8032-7bb8-dce3-ea5a-fa7d512233e4', 'early_master_alt', 'FHuel', NULL, 'free'),
  ('4dcc8033-2a48-bf0b-d1de-16ba448ad8aa', 'sophieorn25_vgc', 'Alize (VGC)', 'VGC enthusiast', 'free'),
  ('4dcc8033-2a48-bf0b-d1de-16ba448ad8aa', 'sophieorn25_draft', 'Alize Draft', 'Draft league player', 'free'),
  ('4dcc8033-2a48-bf0b-d1de-16ba448ad8aa', 'sophieorn25_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('4dcc8033-2a48-bf0b-d1de-16ba448ad8aa', 'sophieorn25_alt', 'AGottlieb', 'Training hard every day!', 'free'),
  ('4dcc8034-5580-7472-ddeb-a1bca9267ec7', 'faint_trainer_713_vgc', 'Johnson (VGC)', 'Pokemon trainer', 'free'),
  ('4dcc8034-5580-7472-ddeb-a1bca9267ec7', 'faint_trainer_713_draft', 'Johnson Draft', 'Pokemon trainer', 'free'),
  ('4dcc8034-5580-7472-ddeb-a1bca9267ec7', 'faint_trainer_713_anon', 'Anonymous Trainer', 'Pokemon trainer', 'free'),
  ('4dcc8034-5580-7472-ddeb-a1bca9267ec7', 'faint_trainer_713_alt', 'JBreitenberg', 'Draft league player', 'free'),
  ('4dcc8035-9f28-fdb5-3eec-c6a479b52d6c', 'lempi_brakus24_vgc', 'Eddie (VGC)', 'Always learning', 'free'),
  ('4dcc8035-9f28-fdb5-3eec-c6a479b52d6c', 'lempi_brakus24_draft', 'Eddie Draft', 'Pokemon trainer', 'free'),
  ('4dcc8035-9f28-fdb5-3eec-c6a479b52d6c', 'lempi_brakus24_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('4dcc8035-9f28-fdb5-3eec-c6a479b52d6c', 'lempi_brakus24_alt', 'ETreutel', 'Competitive Pokemon player', 'free'),
  ('4dcc804b-b5ea-da97-ecf2-ae31acc3b433', 'long_trainer_533_vgc', 'Ethelyn (VGC)', 'VGC enthusiast', 'free'),
  ('4dcc804b-b5ea-da97-ecf2-ae31acc3b433', 'long_trainer_533_draft', 'Ethelyn Draft', 'Draft league player', 'free'),
  ('4dcc804b-b5ea-da97-ecf2-ae31acc3b433', 'long_trainer_533_anon', 'Anonymous Trainer', 'Always learning', 'free'),
  ('4dcc804b-b5ea-da97-ecf2-ae31acc3b433', 'long_trainer_533_alt', 'EBerge', 'Competitive Pokemon player', 'free'),
  ('4dcc804c-5d8b-dd2e-d73b-dbdb365a0cad', 'mallory39_vgc', 'Garth (VGC)', 'Looking for practice partners', 'free'),
  ('4dcc804c-5d8b-dd2e-d73b-dbdb365a0cad', 'mallory39_draft', 'Garth Draft', NULL, 'free'),
  ('4dcc804c-5d8b-dd2e-d73b-dbdb365a0cad', 'mallory39_anon', 'Anonymous Trainer', 'Always learning', 'free'),
  ('4dcc804c-5d8b-dd2e-d73b-dbdb365a0cad', 'mallory39_alt', 'GGutkowski', NULL, 'free'),
  ('4dcc804d-efb5-73dc-8ae3-cbd0decfef3c', 'reidstamm21_vgc', 'Phoebe (VGC)', 'Always learning', 'free'),
  ('4dcc804d-efb5-73dc-8ae3-cbd0decfef3c', 'reidstamm21_draft', 'Phoebe Draft', 'VGC enthusiast', 'free'),
  ('4dcc804d-efb5-73dc-8ae3-cbd0decfef3c', 'reidstamm21_anon', 'Anonymous Trainer', 'Always learning', 'free'),
  ('4dcc804d-efb5-73dc-8ae3-cbd0decfef3c', 'reidstamm21_alt', 'PFay', 'Pokemon trainer', 'free')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.alts (user_id, username, display_name, bio, tier) VALUES
  ('4dcc804e-2edb-d817-b078-be77a94933a9', 'insistent_ranger_vgc', 'Tianna (VGC)', 'Always learning', 'free'),
  ('4dcc804e-2edb-d817-b078-be77a94933a9', 'insistent_ranger_draft', 'Tianna Draft', 'VGC enthusiast', 'free'),
  ('4dcc804e-2edb-d817-b078-be77a94933a9', 'insistent_ranger_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('4dcc804e-2edb-d817-b078-be77a94933a9', 'insistent_ranger_alt', 'TBruen', 'Pokemon trainer', 'free'),
  ('4dcc804f-d1a4-d440-ac1b-9b98c34ce85e', 'francesco_nader66_vgc', 'Cali (VGC)', 'Pokemon trainer', 'free'),
  ('4dcc804f-d1a4-d440-ac1b-9b98c34ce85e', 'francesco_nader66_draft', 'Cali Draft', 'Always learning', 'free'),
  ('4dcc804f-d1a4-d440-ac1b-9b98c34ce85e', 'francesco_nader66_anon', 'Anonymous Trainer', NULL, 'free'),
  ('4dcc804f-d1a4-d440-ac1b-9b98c34ce85e', 'francesco_nader66_alt', 'CBogan', 'Looking for practice partners', 'free'),
  ('70036c44-e525-fcc8-e46d-01403c9db758', 'alda_rau2_vgc', 'Margarett (VGC)', 'Draft league player', 'free'),
  ('70036c44-e525-fcc8-e46d-01403c9db758', 'alda_rau2_draft', 'Margarett Draft', 'Draft league player', 'free'),
  ('70036c44-e525-fcc8-e46d-01403c9db758', 'alda_rau2_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('70036c44-e525-fcc8-e46d-01403c9db758', 'alda_rau2_alt', 'MBraun', 'Draft league player', 'free'),
  ('70036c45-b905-bd53-cfb3-50e2c6cec403', 'domenic_jast43_vgc', 'Norene (VGC)', 'VGC enthusiast', 'free'),
  ('70036c45-b905-bd53-cfb3-50e2c6cec403', 'domenic_jast43_draft', 'Norene Draft', 'Pokemon trainer', 'free'),
  ('70036c45-b905-bd53-cfb3-50e2c6cec403', 'domenic_jast43_anon', 'Anonymous Trainer', 'Pokemon trainer', 'free'),
  ('70036c45-b905-bd53-cfb3-50e2c6cec403', 'domenic_jast43_alt', 'NStroman', 'Competitive Pokemon player', 'free'),
  ('70036c46-1d58-67f6-caee-a405d1ad7a21', 'scottie17_vgc', 'Gerald (VGC)', 'Pokemon trainer', 'free'),
  ('70036c46-1d58-67f6-caee-a405d1ad7a21', 'scottie17_draft', 'Gerald Draft', 'Always learning', 'free'),
  ('70036c46-1d58-67f6-caee-a405d1ad7a21', 'scottie17_anon', 'Anonymous Trainer', 'Draft league player', 'free'),
  ('70036c46-1d58-67f6-caee-a405d1ad7a21', 'scottie17_alt', 'GBeahan', 'Always learning', 'free'),
  ('70036c47-c72e-3e94-bdab-efc5a4fe0fe3', 'major_breeder_vgc', 'Delbert (VGC)', 'Always learning', 'free'),
  ('70036c47-c72e-3e94-bdab-efc5a4fe0fe3', 'major_breeder_draft', 'Delbert Draft', 'VGC enthusiast', 'free'),
  ('70036c47-c72e-3e94-bdab-efc5a4fe0fe3', 'major_breeder_anon', 'Anonymous Trainer', 'Draft league player', 'free'),
  ('70036c47-c72e-3e94-bdab-efc5a4fe0fe3', 'major_breeder_alt', 'DSchmidt', 'Training hard every day!', 'free'),
  ('70036c48-0d52-1f7f-16bb-7ddd50d0dbeb', 'teagan92_vgc', 'Jaron (VGC)', 'Pokemon trainer', 'free'),
  ('70036c48-0d52-1f7f-16bb-7ddd50d0dbeb', 'teagan92_draft', 'Jaron Draft', 'Draft league player', 'free'),
  ('70036c48-0d52-1f7f-16bb-7ddd50d0dbeb', 'teagan92_anon', 'Anonymous Trainer', NULL, 'free'),
  ('70036c48-0d52-1f7f-16bb-7ddd50d0dbeb', 'teagan92_alt', 'JSporer', 'Training hard every day!', 'free'),
  ('70036c49-2766-500f-98e4-eb19dead3f5e', 'felicia62_vgc', 'Oda (VGC)', 'Looking for practice partners', 'free'),
  ('70036c49-2766-500f-98e4-eb19dead3f5e', 'felicia62_draft', 'Oda Draft', 'Pokemon trainer', 'free'),
  ('70036c49-2766-500f-98e4-eb19dead3f5e', 'felicia62_anon', 'Anonymous Trainer', 'Competitive Pokemon player', 'free'),
  ('70036c49-2766-500f-98e4-eb19dead3f5e', 'felicia62_alt', 'OJones', 'Competitive Pokemon player', 'free'),
  ('70036c4a-1fde-f38a-f3b4-4bdc2d52dfcb', 'phony_leader_vgc', 'Charles (VGC)', 'Competitive Pokemon player', 'free'),
  ('70036c4a-1fde-f38a-f3b4-4bdc2d52dfcb', 'phony_leader_draft', 'Charles Draft', 'Draft league player', 'free'),
  ('70036c4a-1fde-f38a-f3b4-4bdc2d52dfcb', 'phony_leader_anon', 'Anonymous Trainer', 'Draft league player', 'free'),
  ('70036c4a-1fde-f38a-f3b4-4bdc2d52dfcb', 'phony_leader_alt', 'CDibbert', 'VGC enthusiast', 'free'),
  ('70036c4b-4f1c-aadc-7ec5-dbecdfcfeda3', 'nervous_trainer_vgc', 'Gage (VGC)', 'Training hard every day!', 'free'),
  ('70036c4b-4f1c-aadc-7ec5-dbecdfcfeda3', 'nervous_trainer_draft', 'Gage Draft', 'Looking for practice partners', 'free'),
  ('70036c4b-4f1c-aadc-7ec5-dbecdfcfeda3', 'nervous_trainer_anon', 'Anonymous Trainer', 'Competitive Pokemon player', 'free'),
  ('70036c4b-4f1c-aadc-7ec5-dbecdfcfeda3', 'nervous_trainer_alt', 'GReilly', 'Competitive Pokemon player', 'free'),
  ('70036c4c-dfd5-dbb2-abf7-de2ef16f1c7d', 'savanah33_vgc', 'Rebeca (VGC)', 'Looking for practice partners', 'free'),
  ('70036c4c-dfd5-dbb2-abf7-de2ef16f1c7d', 'savanah33_draft', 'Rebeca Draft', NULL, 'free'),
  ('70036c4c-dfd5-dbb2-abf7-de2ef16f1c7d', 'savanah33_anon', 'Anonymous Trainer', 'VGC enthusiast', 'free'),
  ('70036c4c-dfd5-dbb2-abf7-de2ef16f1c7d', 'savanah33_alt', 'RLang', 'Draft league player', 'free'),
  ('70036c4d-7aaf-96f9-93bf-41ee6e39e9e8', 'trusting_trainer_973_vgc', 'Nels (VGC)', 'Training hard every day!', 'free'),
  ('70036c4d-7aaf-96f9-93bf-41ee6e39e9e8', 'trusting_trainer_973_draft', 'Nels Draft', 'Looking for practice partners', 'free'),
  ('70036c4d-7aaf-96f9-93bf-41ee6e39e9e8', 'trusting_trainer_973_anon', 'Anonymous Trainer', 'Pokemon trainer', 'free'),
  ('70036c4d-7aaf-96f9-93bf-41ee6e39e9e8', 'trusting_trainer_973_alt', 'NRosenbaum', 'Training hard every day!', 'free'),
  ('6f95e375-f4db-acad-20ed-ba22f94a1c5b', 'wilsontrantow30_vgc', 'Alexandre (VGC)', 'VGC enthusiast', 'free'),
  ('6f95e375-f4db-acad-20ed-ba22f94a1c5b', 'wilsontrantow30_draft', 'Alexandre Draft', NULL, 'free')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.alts (user_id, username, display_name, bio, tier) VALUES
  ('6f95e375-f4db-acad-20ed-ba22f94a1c5b', 'wilsontrantow30_anon', 'Anonymous Trainer', 'Looking for practice partners', 'free'),
  ('6f95e375-f4db-acad-20ed-ba22f94a1c5b', 'wilsontrantow30_alt', 'AHills', 'Training hard every day!', 'free'),
  ('6f95e374-0a25-f3ad-fc07-b170182cfb43', 'jackiebins45_vgc', 'Layla (VGC)', 'Always learning', 'free'),
  ('6f95e374-0a25-f3ad-fc07-b170182cfb43', 'jackiebins45_draft', 'Layla Draft', 'Training hard every day!', 'free'),
  ('6f95e374-0a25-f3ad-fc07-b170182cfb43', 'jackiebins45_anon', 'Anonymous Trainer', 'Competitive Pokemon player', 'free'),
  ('6f95e374-0a25-f3ad-fc07-b170182cfb43', 'jackiebins45_alt', 'LPowlowski', 'Always learning', 'free'),
  ('6f95e373-fb7b-1dcb-9eba-1153d4f74bea', 'prime_trainer_706_vgc', 'Tremayne (VGC)', 'Looking for practice partners', 'free'),
  ('6f95e373-fb7b-1dcb-9eba-1153d4f74bea', 'prime_trainer_706_draft', 'Tremayne Draft', 'Competitive Pokemon player', 'free'),
  ('6f95e373-fb7b-1dcb-9eba-1153d4f74bea', 'prime_trainer_706_anon', 'Anonymous Trainer', 'Draft league player', 'free'),
  ('6f95e373-fb7b-1dcb-9eba-1153d4f74bea', 'prime_trainer_706_alt', 'TLittel', 'VGC enthusiast', 'free'),
  ('6f95e372-fa97-8f0d-c9fa-dd96de4dda2f', 'millie_zieme65_vgc', 'Antonietta (VGC)', 'Pokemon trainer', 'free'),
  ('6f95e372-fa97-8f0d-c9fa-dd96de4dda2f', 'millie_zieme65_draft', 'Antonietta Draft', NULL, 'free'),
  ('6f95e372-fa97-8f0d-c9fa-dd96de4dda2f', 'millie_zieme65_anon', 'Anonymous Trainer', NULL, 'free'),
  ('6f95e372-fa97-8f0d-c9fa-dd96de4dda2f', 'millie_zieme65_alt', 'AGerhold', 'Training hard every day!', 'free'),
  ('6f95e371-38f5-e7b2-f951-3b7c95df330a', 'chelsea_witting_vgc', 'Sarina (VGC)', 'Pokemon trainer', 'free'),
  ('6f95e371-38f5-e7b2-f951-3b7c95df330a', 'chelsea_witting_draft', 'Sarina Draft', 'Pokemon trainer', 'free'),
  ('6f95e371-38f5-e7b2-f951-3b7c95df330a', 'chelsea_witting_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('6f95e371-38f5-e7b2-f951-3b7c95df330a', 'chelsea_witting_alt', 'SLarkin', 'Pokemon trainer', 'free'),
  ('6f95e370-1be0-29e6-b03f-f0eedabae306', 'liquid_ace_vgc', 'Kyla (VGC)', 'Training hard every day!', 'free'),
  ('6f95e370-1be0-29e6-b03f-f0eedabae306', 'liquid_ace_draft', 'Kyla Draft', 'Looking for practice partners', 'free'),
  ('6f95e370-1be0-29e6-b03f-f0eedabae306', 'liquid_ace_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('6f95e370-1be0-29e6-b03f-f0eedabae306', 'liquid_ace_alt', 'KDuBuque', 'Draft league player', 'free'),
  ('6f95e36f-fcef-addc-0efe-4e8e2ef1f8db', 'distinct_breeder_vgc', 'Aurelia (VGC)', 'Training hard every day!', 'free'),
  ('6f95e36f-fcef-addc-0efe-4e8e2ef1f8db', 'distinct_breeder_draft', 'Aurelia Draft', 'Competitive Pokemon player', 'free'),
  ('6f95e36f-fcef-addc-0efe-4e8e2ef1f8db', 'distinct_breeder_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('6f95e36f-fcef-addc-0efe-4e8e2ef1f8db', 'distinct_breeder_alt', 'AKihn', 'Looking for practice partners', 'free'),
  ('6f95e36e-0788-f895-841d-eda8cba0788c', 'myrtice66_vgc', 'Pierce (VGC)', 'Competitive Pokemon player', 'free'),
  ('6f95e36e-0788-f895-841d-eda8cba0788c', 'myrtice66_draft', 'Pierce Draft', 'Always learning', 'free'),
  ('6f95e36e-0788-f895-841d-eda8cba0788c', 'myrtice66_anon', 'Anonymous Trainer', 'Pokemon trainer', 'free'),
  ('6f95e36e-0788-f895-841d-eda8cba0788c', 'myrtice66_alt', 'PSchumm', 'Draft league player', 'free'),
  ('6f95e36d-1e72-a566-bb6d-f5923e3bf2c5', 'lenore_schulist95_vgc', 'Adam (VGC)', 'Looking for practice partners', 'free'),
  ('6f95e36d-1e72-a566-bb6d-f5923e3bf2c5', 'lenore_schulist95_draft', 'Adam Draft', 'Pokemon trainer', 'free'),
  ('6f95e36d-1e72-a566-bb6d-f5923e3bf2c5', 'lenore_schulist95_anon', 'Anonymous Trainer', 'Competitive Pokemon player', 'free'),
  ('6f95e36d-1e72-a566-bb6d-f5923e3bf2c5', 'lenore_schulist95_alt', 'ATreutel', 'Competitive Pokemon player', 'free'),
  ('6f95e36c-9cd7-5b6c-9e2d-9c3ac420edc5', 'jayson63_vgc', 'Reece (VGC)', 'Draft league player', 'free'),
  ('6f95e36c-9cd7-5b6c-9e2d-9c3ac420edc5', 'jayson63_draft', 'Reece Draft', NULL, 'free'),
  ('6f95e36c-9cd7-5b6c-9e2d-9c3ac420edc5', 'jayson63_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('6f95e36c-9cd7-5b6c-9e2d-9c3ac420edc5', 'jayson63_alt', 'RFarrell', 'Draft league player', 'free'),
  ('6f95e356-22fc-611d-4747-1b1b5bdeb77e', 'laurettayundt22_vgc', 'Guiseppe (VGC)', 'VGC enthusiast', 'free'),
  ('6f95e356-22fc-611d-4747-1b1b5bdeb77e', 'laurettayundt22_draft', 'Guiseppe Draft', 'Competitive Pokemon player', 'free'),
  ('6f95e356-22fc-611d-4747-1b1b5bdeb77e', 'laurettayundt22_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('6f95e356-22fc-611d-4747-1b1b5bdeb77e', 'laurettayundt22_alt', 'GRaynor', 'Training hard every day!', 'free'),
  ('6f95e355-9a7e-be58-3feb-cbd1a2cbf065', 'maiya_renner_vgc', 'Chanel (VGC)', 'Always learning', 'free'),
  ('6f95e355-9a7e-be58-3feb-cbd1a2cbf065', 'maiya_renner_draft', 'Chanel Draft', 'Competitive Pokemon player', 'free'),
  ('6f95e355-9a7e-be58-3feb-cbd1a2cbf065', 'maiya_renner_anon', 'Anonymous Trainer', 'VGC enthusiast', 'free'),
  ('6f95e355-9a7e-be58-3feb-cbd1a2cbf065', 'maiya_renner_alt', 'CDouglas', 'Looking for practice partners', 'free'),
  ('6f95e354-fc4e-2b8d-dbb6-183f7fec2cea', 'ashleylueilwitz37_vgc', 'Isadore (VGC)', 'Training hard every day!', 'free'),
  ('6f95e354-fc4e-2b8d-dbb6-183f7fec2cea', 'ashleylueilwitz37_draft', 'Isadore Draft', NULL, 'free'),
  ('6f95e354-fc4e-2b8d-dbb6-183f7fec2cea', 'ashleylueilwitz37_anon', 'Anonymous Trainer', NULL, 'free'),
  ('6f95e354-fc4e-2b8d-dbb6-183f7fec2cea', 'ashleylueilwitz37_alt', 'ILarkin', 'Competitive Pokemon player', 'free')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.alts (user_id, username, display_name, bio, tier) VALUES
  ('6f95e353-2fcf-96b9-2e4d-e31ba1f1ff53', 'sneaky_master_vgc', 'Grayce (VGC)', 'Draft league player', 'free'),
  ('6f95e353-2fcf-96b9-2e4d-e31ba1f1ff53', 'sneaky_master_draft', 'Grayce Draft', NULL, 'free'),
  ('6f95e353-2fcf-96b9-2e4d-e31ba1f1ff53', 'sneaky_master_anon', 'Anonymous Trainer', NULL, 'free'),
  ('6f95e353-2fcf-96b9-2e4d-e31ba1f1ff53', 'sneaky_master_alt', 'GHilll', 'Looking for practice partners', 'free'),
  ('6f95e352-6db9-2d94-89ca-a09a05a3b405', 'frozen_trainer_101_vgc', 'Angelo (VGC)', 'Always learning', 'free'),
  ('6f95e352-6db9-2d94-89ca-a09a05a3b405', 'frozen_trainer_101_draft', 'Angelo Draft', NULL, 'free'),
  ('6f95e352-6db9-2d94-89ca-a09a05a3b405', 'frozen_trainer_101_anon', 'Anonymous Trainer', 'VGC enthusiast', 'free'),
  ('6f95e352-6db9-2d94-89ca-a09a05a3b405', 'frozen_trainer_101_alt', 'AZieme', 'Looking for practice partners', 'free'),
  ('6f95e351-88ab-dfb6-f95c-0daeeded1b3a', 'price45_vgc', 'Jeffery (VGC)', 'VGC enthusiast', 'free'),
  ('6f95e351-88ab-dfb6-f95c-0daeeded1b3a', 'price45_draft', 'Jeffery Draft', 'Always learning', 'free'),
  ('6f95e351-88ab-dfb6-f95c-0daeeded1b3a', 'price45_anon', 'Anonymous Trainer', 'Competitive Pokemon player', 'free'),
  ('6f95e351-88ab-dfb6-f95c-0daeeded1b3a', 'price45_alt', 'JHane', 'Competitive Pokemon player', 'free'),
  ('6f95e350-be43-2ea5-01f6-ad842dbeb0fb', 'marilyne_bogan7_vgc', 'Vern (VGC)', 'Training hard every day!', 'free'),
  ('6f95e350-be43-2ea5-01f6-ad842dbeb0fb', 'marilyne_bogan7_draft', 'Vern Draft', 'Competitive Pokemon player', 'free'),
  ('6f95e350-be43-2ea5-01f6-ad842dbeb0fb', 'marilyne_bogan7_anon', 'Anonymous Trainer', 'VGC enthusiast', 'free'),
  ('6f95e350-be43-2ea5-01f6-ad842dbeb0fb', 'marilyne_bogan7_alt', 'VHermann', NULL, 'free'),
  ('6f95e34f-899d-e524-de6b-cce5aacabe3b', 'wilhelmmccullough77_vgc', 'Madison (VGC)', 'Training hard every day!', 'free'),
  ('6f95e34f-899d-e524-de6b-cce5aacabe3b', 'wilhelmmccullough77_draft', 'Madison Draft', 'Looking for practice partners', 'free'),
  ('6f95e34f-899d-e524-de6b-cce5aacabe3b', 'wilhelmmccullough77_anon', 'Anonymous Trainer', 'VGC enthusiast', 'free'),
  ('6f95e34f-899d-e524-de6b-cce5aacabe3b', 'wilhelmmccullough77_alt', 'MHayes', 'Always learning', 'free'),
  ('6f95e34e-b6cf-dda3-a05f-f28b4cad47bc', 'tressa72_vgc', 'Jodie (VGC)', NULL, 'free'),
  ('6f95e34e-b6cf-dda3-a05f-f28b4cad47bc', 'tressa72_draft', 'Jodie Draft', 'Training hard every day!', 'free'),
  ('6f95e34e-b6cf-dda3-a05f-f28b4cad47bc', 'tressa72_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('6f95e34e-b6cf-dda3-a05f-f28b4cad47bc', 'tressa72_alt', 'JReynolds', NULL, 'free'),
  ('6f95e34d-df89-fdd8-9f0d-7b2cae1cccde', 'smooth_trainer_36_vgc', 'Colten (VGC)', 'Competitive Pokemon player', 'free'),
  ('6f95e34d-df89-fdd8-9f0d-7b2cae1cccde', 'smooth_trainer_36_draft', 'Colten Draft', NULL, 'free'),
  ('6f95e34d-df89-fdd8-9f0d-7b2cae1cccde', 'smooth_trainer_36_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('6f95e34d-df89-fdd8-9f0d-7b2cae1cccde', 'smooth_trainer_36_alt', 'CHills-Hansen', 'Draft league player', 'free'),
  ('6f95e337-7914-dafe-e9db-29c8cc47700c', 'dominic_kuphal_vgc', 'Melisa (VGC)', 'Pokemon trainer', 'free'),
  ('6f95e337-7914-dafe-e9db-29c8cc47700c', 'dominic_kuphal_draft', 'Melisa Draft', 'Pokemon trainer', 'free'),
  ('6f95e337-7914-dafe-e9db-29c8cc47700c', 'dominic_kuphal_anon', 'Anonymous Trainer', NULL, 'free'),
  ('6f95e337-7914-dafe-e9db-29c8cc47700c', 'dominic_kuphal_alt', 'MLarson', 'Competitive Pokemon player', 'free'),
  ('6f95e336-a21a-a9aa-3d2a-ef11655d55a9', 'joshweimann33_vgc', 'Savion (VGC)', 'Pokemon trainer', 'free'),
  ('6f95e336-a21a-a9aa-3d2a-ef11655d55a9', 'joshweimann33_draft', 'Savion Draft', 'Looking for practice partners', 'free'),
  ('6f95e336-a21a-a9aa-3d2a-ef11655d55a9', 'joshweimann33_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('6f95e336-a21a-a9aa-3d2a-ef11655d55a9', 'joshweimann33_alt', 'SDibbert', 'Draft league player', 'free'),
  ('6f95e335-7d0e-fce1-95af-5e4cafd72345', 'big_gym_vgc', 'Angie (VGC)', 'Competitive Pokemon player', 'free'),
  ('6f95e335-7d0e-fce1-95af-5e4cafd72345', 'big_gym_draft', 'Angie Draft', 'Training hard every day!', 'free'),
  ('6f95e335-7d0e-fce1-95af-5e4cafd72345', 'big_gym_anon', 'Anonymous Trainer', 'Looking for practice partners', 'free'),
  ('6f95e335-7d0e-fce1-95af-5e4cafd72345', 'big_gym_alt', 'AConn', 'Looking for practice partners', 'free'),
  ('6f95e334-ecea-9eb1-bba1-b4537ab4ddd5', 'kelli_buckridge72_vgc', 'Karina (VGC)', 'Pokemon trainer', 'free'),
  ('6f95e334-ecea-9eb1-bba1-b4537ab4ddd5', 'kelli_buckridge72_draft', 'Karina Draft', 'VGC enthusiast', 'free'),
  ('6f95e334-ecea-9eb1-bba1-b4537ab4ddd5', 'kelli_buckridge72_anon', 'Anonymous Trainer', 'Looking for practice partners', 'free'),
  ('6f95e334-ecea-9eb1-bba1-b4537ab4ddd5', 'kelli_buckridge72_alt', 'KKoch', NULL, 'free'),
  ('6f95e333-bf4b-6bcd-b8eb-3fb6cd6f344d', 'winifred46_vgc', 'Jesse (VGC)', NULL, 'free'),
  ('6f95e333-bf4b-6bcd-b8eb-3fb6cd6f344d', 'winifred46_draft', 'Jesse Draft', 'Draft league player', 'free'),
  ('6f95e333-bf4b-6bcd-b8eb-3fb6cd6f344d', 'winifred46_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('6f95e333-bf4b-6bcd-b8eb-3fb6cd6f344d', 'winifred46_alt', 'JO''Reilly', 'Draft league player', 'free'),
  ('6f95e332-9fed-3d93-0cbf-d1a4ccbf6aca', 'crooked_gym_vgc', 'Arnulfo (VGC)', NULL, 'free'),
  ('6f95e332-9fed-3d93-0cbf-d1a4ccbf6aca', 'crooked_gym_draft', 'Arnulfo Draft', 'VGC enthusiast', 'free')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.alts (user_id, username, display_name, bio, tier) VALUES
  ('6f95e332-9fed-3d93-0cbf-d1a4ccbf6aca', 'crooked_gym_anon', 'Anonymous Trainer', 'Pokemon trainer', 'free'),
  ('6f95e332-9fed-3d93-0cbf-d1a4ccbf6aca', 'crooked_gym_alt', 'ASchneider', 'Draft league player', 'free'),
  ('6f95e331-9aed-7caf-d2e7-f13c4c6efb64', 'jermaineharvey25_vgc', 'Reyes (VGC)', 'Training hard every day!', 'free'),
  ('6f95e331-9aed-7caf-d2e7-f13c4c6efb64', 'jermaineharvey25_draft', 'Reyes Draft', 'Looking for practice partners', 'free'),
  ('6f95e331-9aed-7caf-d2e7-f13c4c6efb64', 'jermaineharvey25_anon', 'Anonymous Trainer', 'Draft league player', 'free'),
  ('6f95e331-9aed-7caf-d2e7-f13c4c6efb64', 'jermaineharvey25_alt', 'RFisher', 'Looking for practice partners', 'free'),
  ('6f95e330-dec2-9adc-8f29-0ae6c6eab0ff', 'frozen_trainer_653_vgc', 'Sasha (VGC)', 'Pokemon trainer', 'free'),
  ('6f95e330-dec2-9adc-8f29-0ae6c6eab0ff', 'frozen_trainer_653_draft', 'Sasha Draft', 'Pokemon trainer', 'free'),
  ('6f95e330-dec2-9adc-8f29-0ae6c6eab0ff', 'frozen_trainer_653_anon', 'Anonymous Trainer', 'Looking for practice partners', 'free'),
  ('6f95e330-dec2-9adc-8f29-0ae6c6eab0ff', 'frozen_trainer_653_alt', 'SSchaefer', NULL, 'free'),
  ('6f95e32f-6d66-a1dc-edd4-15b0cfcb1cd2', 'richardswaniawski20_vgc', 'Kamryn (VGC)', 'Training hard every day!', 'free'),
  ('6f95e32f-6d66-a1dc-edd4-15b0cfcb1cd2', 'richardswaniawski20_draft', 'Kamryn Draft', 'Training hard every day!', 'free'),
  ('6f95e32f-6d66-a1dc-edd4-15b0cfcb1cd2', 'richardswaniawski20_anon', 'Anonymous Trainer', 'Pokemon trainer', 'free'),
  ('6f95e32f-6d66-a1dc-edd4-15b0cfcb1cd2', 'richardswaniawski20_alt', 'KFlatley', NULL, 'free'),
  ('6f95e32e-9bdd-9ddd-f5b2-8aeedabd157a', 'unused_trainer_669_vgc', 'Shana (VGC)', NULL, 'free'),
  ('6f95e32e-9bdd-9ddd-f5b2-8aeedabd157a', 'unused_trainer_669_draft', 'Shana Draft', 'Always learning', 'free'),
  ('6f95e32e-9bdd-9ddd-f5b2-8aeedabd157a', 'unused_trainer_669_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('6f95e32e-9bdd-9ddd-f5b2-8aeedabd157a', 'unused_trainer_669_alt', 'SLarson', 'Looking for practice partners', 'free'),
  ('6f95e318-4b00-4027-bcb6-e81d27bdaff2', 'cooperative_trainer__vgc', 'Eryn (VGC)', 'Looking for practice partners', 'free'),
  ('6f95e318-4b00-4027-bcb6-e81d27bdaff2', 'cooperative_trainer__draft', 'Eryn Draft', 'Always learning', 'free'),
  ('6f95e318-4b00-4027-bcb6-e81d27bdaff2', 'cooperative_trainer__anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('6f95e318-4b00-4027-bcb6-e81d27bdaff2', 'cooperative_trainer__alt', 'EDietrich', 'VGC enthusiast', 'free'),
  ('6f95e317-0e15-1df2-8a82-9a117eee7d0d', 'godfreyjenkins91_vgc', 'Lenore (VGC)', 'Always learning', 'free'),
  ('6f95e317-0e15-1df2-8a82-9a117eee7d0d', 'godfreyjenkins91_draft', 'Lenore Draft', 'VGC enthusiast', 'free'),
  ('6f95e317-0e15-1df2-8a82-9a117eee7d0d', 'godfreyjenkins91_anon', 'Anonymous Trainer', 'Competitive Pokemon player', 'free'),
  ('6f95e317-0e15-1df2-8a82-9a117eee7d0d', 'godfreyjenkins91_alt', 'LSenger', 'VGC enthusiast', 'free'),
  ('6f95e316-c02c-7aec-f9e6-6b9bcce97c8d', 'lera_reilly90_vgc', 'Bryce (VGC)', 'Competitive Pokemon player', 'free'),
  ('6f95e316-c02c-7aec-f9e6-6b9bcce97c8d', 'lera_reilly90_draft', 'Bryce Draft', 'Training hard every day!', 'free'),
  ('6f95e316-c02c-7aec-f9e6-6b9bcce97c8d', 'lera_reilly90_anon', 'Anonymous Trainer', 'Draft league player', 'free'),
  ('6f95e316-c02c-7aec-f9e6-6b9bcce97c8d', 'lera_reilly90_alt', 'BJones', 'Training hard every day!', 'free'),
  ('6f95e315-0ee7-196e-d84f-9f3a0bf80083', 'robust_elite_vgc', 'Hipolito (VGC)', 'Always learning', 'free'),
  ('6f95e315-0ee7-196e-d84f-9f3a0bf80083', 'robust_elite_draft', 'Hipolito Draft', 'Looking for practice partners', 'free'),
  ('6f95e315-0ee7-196e-d84f-9f3a0bf80083', 'robust_elite_anon', 'Anonymous Trainer', 'Competitive Pokemon player', 'free'),
  ('6f95e315-0ee7-196e-d84f-9f3a0bf80083', 'robust_elite_alt', 'HToy', 'VGC enthusiast', 'free'),
  ('6f95e314-dcf6-f887-b3cb-ac9654175fc7', 'slushy_trainer_459_vgc', 'Stella (VGC)', 'Training hard every day!', 'free'),
  ('6f95e314-dcf6-f887-b3cb-ac9654175fc7', 'slushy_trainer_459_draft', 'Stella Draft', 'Pokemon trainer', 'free'),
  ('6f95e314-dcf6-f887-b3cb-ac9654175fc7', 'slushy_trainer_459_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('6f95e314-dcf6-f887-b3cb-ac9654175fc7', 'slushy_trainer_459_alt', 'SWill', 'Looking for practice partners', 'free'),
  ('6f95e313-0ab5-fefb-d2b2-b6de3afacc86', 'broderick40_vgc', 'Linda (VGC)', 'Draft league player', 'free'),
  ('6f95e313-0ab5-fefb-d2b2-b6de3afacc86', 'broderick40_draft', 'Linda Draft', 'VGC enthusiast', 'free'),
  ('6f95e313-0ab5-fefb-d2b2-b6de3afacc86', 'broderick40_anon', 'Anonymous Trainer', 'Draft league player', 'free'),
  ('6f95e313-0ab5-fefb-d2b2-b6de3afacc86', 'broderick40_alt', 'LMraz', NULL, 'free'),
  ('6f95e312-f42c-9cd1-d9bd-e0afff267b64', 'nolanlangosh54_vgc', 'Samir (VGC)', 'Always learning', 'free'),
  ('6f95e312-f42c-9cd1-d9bd-e0afff267b64', 'nolanlangosh54_draft', 'Samir Draft', 'Draft league player', 'free'),
  ('6f95e312-f42c-9cd1-d9bd-e0afff267b64', 'nolanlangosh54_anon', 'Anonymous Trainer', 'Draft league player', 'free'),
  ('6f95e312-f42c-9cd1-d9bd-e0afff267b64', 'nolanlangosh54_alt', 'SJaskolski-Shields', 'Competitive Pokemon player', 'free'),
  ('6f95e311-acd1-a188-172b-e1fb61bbf118', 'adela1_vgc', 'Name (VGC)', 'Draft league player', 'free'),
  ('6f95e311-acd1-a188-172b-e1fb61bbf118', 'adela1_draft', 'Name Draft', 'VGC enthusiast', 'free'),
  ('6f95e311-acd1-a188-172b-e1fb61bbf118', 'adela1_anon', 'Anonymous Trainer', NULL, 'free'),
  ('6f95e311-acd1-a188-172b-e1fb61bbf118', 'adela1_alt', 'NRomaguera', 'Always learning', 'free')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.alts (user_id, username, display_name, bio, tier) VALUES
  ('6f95e310-fd7e-2db9-cd1f-5fcbcb3b5a62', 'dariusschneider93_vgc', 'Susie (VGC)', 'Draft league player', 'free'),
  ('6f95e310-fd7e-2db9-cd1f-5fcbcb3b5a62', 'dariusschneider93_draft', 'Susie Draft', 'VGC enthusiast', 'free'),
  ('6f95e310-fd7e-2db9-cd1f-5fcbcb3b5a62', 'dariusschneider93_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('6f95e310-fd7e-2db9-cd1f-5fcbcb3b5a62', 'dariusschneider93_alt', 'SKreiger', NULL, 'free'),
  ('6f95e30f-1c05-a627-5c6b-d9e8f1fa8df0', 'awful_ranger_vgc', 'Aaliyah (VGC)', 'Draft league player', 'free'),
  ('6f95e30f-1c05-a627-5c6b-d9e8f1fa8df0', 'awful_ranger_draft', 'Aaliyah Draft', NULL, 'free'),
  ('6f95e30f-1c05-a627-5c6b-d9e8f1fa8df0', 'awful_ranger_anon', 'Anonymous Trainer', 'Pokemon trainer', 'free'),
  ('6f95e30f-1c05-a627-5c6b-d9e8f1fa8df0', 'awful_ranger_alt', 'ABeahan', 'Looking for practice partners', 'free'),
  ('6f95e2f9-e17f-b9a4-881a-9cc4ead4ed63', 'scornful_trainer_666_vgc', 'Noemie (VGC)', NULL, 'free'),
  ('6f95e2f9-e17f-b9a4-881a-9cc4ead4ed63', 'scornful_trainer_666_draft', 'Noemie Draft', 'Draft league player', 'free'),
  ('6f95e2f9-e17f-b9a4-881a-9cc4ead4ed63', 'scornful_trainer_666_anon', 'Anonymous Trainer', 'VGC enthusiast', 'free'),
  ('6f95e2f9-e17f-b9a4-881a-9cc4ead4ed63', 'scornful_trainer_666_alt', 'NProsacco-Gulgowski', 'Competitive Pokemon player', 'free'),
  ('6f95e2f8-812b-5c08-7029-a8bd0afbe6bb', 'short_term_elite_vgc', 'Golden (VGC)', 'Pokemon trainer', 'free'),
  ('6f95e2f8-812b-5c08-7029-a8bd0afbe6bb', 'short_term_elite_draft', 'Golden Draft', NULL, 'free'),
  ('6f95e2f8-812b-5c08-7029-a8bd0afbe6bb', 'short_term_elite_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('6f95e2f8-812b-5c08-7029-a8bd0afbe6bb', 'short_term_elite_alt', 'GDooley', 'Competitive Pokemon player', 'free'),
  ('6f95e2f7-806e-fc0d-bba8-6155aaa1febf', 'werner_auer80_vgc', 'Ahmad (VGC)', 'Pokemon trainer', 'free'),
  ('6f95e2f7-806e-fc0d-bba8-6155aaa1febf', 'werner_auer80_draft', 'Ahmad Draft', NULL, 'free'),
  ('6f95e2f7-806e-fc0d-bba8-6155aaa1febf', 'werner_auer80_anon', 'Anonymous Trainer', 'Looking for practice partners', 'free'),
  ('6f95e2f7-806e-fc0d-bba8-6155aaa1febf', 'werner_auer80_alt', 'ARutherford', 'Competitive Pokemon player', 'free'),
  ('6f95e2f6-8e57-e6ad-f130-d92fb5be16ba', 'vincent_hickle19_vgc', 'Osvaldo (VGC)', 'Competitive Pokemon player', 'free'),
  ('6f95e2f6-8e57-e6ad-f130-d92fb5be16ba', 'vincent_hickle19_draft', 'Osvaldo Draft', 'Always learning', 'free'),
  ('6f95e2f6-8e57-e6ad-f130-d92fb5be16ba', 'vincent_hickle19_anon', 'Anonymous Trainer', 'Looking for practice partners', 'free'),
  ('6f95e2f6-8e57-e6ad-f130-d92fb5be16ba', 'vincent_hickle19_alt', 'OCorkery', 'Draft league player', 'free'),
  ('6f95e2f5-4eff-fc59-d1df-4bdefbfa3af5', 'hope_cummerata20_vgc', 'Willard (VGC)', 'VGC enthusiast', 'free'),
  ('6f95e2f5-4eff-fc59-d1df-4bdefbfa3af5', 'hope_cummerata20_draft', 'Willard Draft', 'Training hard every day!', 'free'),
  ('6f95e2f5-4eff-fc59-d1df-4bdefbfa3af5', 'hope_cummerata20_anon', 'Anonymous Trainer', 'Draft league player', 'free'),
  ('6f95e2f5-4eff-fc59-d1df-4bdefbfa3af5', 'hope_cummerata20_alt', 'WStehr', 'VGC enthusiast', 'free'),
  ('6f95e2f4-e5d4-7ca2-90ae-268ef0a88aee', 'rare_master_vgc', 'Oleta (VGC)', 'Pokemon trainer', 'free'),
  ('6f95e2f4-e5d4-7ca2-90ae-268ef0a88aee', 'rare_master_draft', 'Oleta Draft', 'Draft league player', 'free'),
  ('6f95e2f4-e5d4-7ca2-90ae-268ef0a88aee', 'rare_master_anon', 'Anonymous Trainer', 'VGC enthusiast', 'free'),
  ('6f95e2f4-e5d4-7ca2-90ae-268ef0a88aee', 'rare_master_alt', 'OAnderson', 'Draft league player', 'free'),
  ('6f95e2f3-003d-6ec9-cba6-7ded9baa4d47', 'flo_friesen_vgc', 'Claude (VGC)', 'Looking for practice partners', 'free'),
  ('6f95e2f3-003d-6ec9-cba6-7ded9baa4d47', 'flo_friesen_draft', 'Claude Draft', 'VGC enthusiast', 'free'),
  ('6f95e2f3-003d-6ec9-cba6-7ded9baa4d47', 'flo_friesen_anon', 'Anonymous Trainer', 'Always learning', 'free'),
  ('6f95e2f3-003d-6ec9-cba6-7ded9baa4d47', 'flo_friesen_alt', 'CBrakus', 'Always learning', 'free'),
  ('6f95e2f2-3db6-902a-09b1-f46650af4eac', 'coralie_bernhard_vgc', 'Rocio (VGC)', 'Pokemon trainer', 'free'),
  ('6f95e2f2-3db6-902a-09b1-f46650af4eac', 'coralie_bernhard_draft', 'Rocio Draft', NULL, 'free'),
  ('6f95e2f2-3db6-902a-09b1-f46650af4eac', 'coralie_bernhard_anon', 'Anonymous Trainer', 'Pokemon trainer', 'free'),
  ('6f95e2f2-3db6-902a-09b1-f46650af4eac', 'coralie_bernhard_alt', 'RPowlowski', 'Draft league player', 'free'),
  ('6f95e2f1-1bf3-bce0-5d6f-a2bb8ecffaef', 'ella_ratke_vgc', 'Rae (VGC)', 'Looking for practice partners', 'free'),
  ('6f95e2f1-1bf3-bce0-5d6f-a2bb8ecffaef', 'ella_ratke_draft', 'Rae Draft', 'Pokemon trainer', 'free'),
  ('6f95e2f1-1bf3-bce0-5d6f-a2bb8ecffaef', 'ella_ratke_anon', 'Anonymous Trainer', 'Draft league player', 'free'),
  ('6f95e2f1-1bf3-bce0-5d6f-a2bb8ecffaef', 'ella_ratke_alt', 'RRomaguera-Huel', 'Draft league player', 'free'),
  ('6f95e2f0-ffce-a83b-a80c-0ff95fbcf1bf', 'total_champion_vgc', 'Cleora (VGC)', 'Training hard every day!', 'free'),
  ('6f95e2f0-ffce-a83b-a80c-0ff95fbcf1bf', 'total_champion_draft', 'Cleora Draft', 'Always learning', 'free'),
  ('6f95e2f0-ffce-a83b-a80c-0ff95fbcf1bf', 'total_champion_anon', 'Anonymous Trainer', 'Competitive Pokemon player', 'free'),
  ('6f95e2f0-ffce-a83b-a80c-0ff95fbcf1bf', 'total_champion_alt', 'CHarvey', 'Training hard every day!', 'free'),
  ('6f95e2da-5dcc-d0e1-c667-d7a81b69f718', 'chaz13_vgc', 'Else (VGC)', 'Looking for practice partners', 'free'),
  ('6f95e2da-5dcc-d0e1-c667-d7a81b69f718', 'chaz13_draft', 'Else Draft', 'Draft league player', 'free')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.alts (user_id, username, display_name, bio, tier) VALUES
  ('6f95e2da-5dcc-d0e1-c667-d7a81b69f718', 'chaz13_anon', 'Anonymous Trainer', 'Competitive Pokemon player', 'free'),
  ('6f95e2da-5dcc-d0e1-c667-d7a81b69f718', 'chaz13_alt', 'ESwaniawski', 'Competitive Pokemon player', 'free'),
  ('6f95e2d9-b3f2-8af9-7854-a56efd11e62d', 'lucius41_vgc', 'Drew (VGC)', 'Pokemon trainer', 'free'),
  ('6f95e2d9-b3f2-8af9-7854-a56efd11e62d', 'lucius41_draft', 'Drew Draft', 'VGC enthusiast', 'free'),
  ('6f95e2d9-b3f2-8af9-7854-a56efd11e62d', 'lucius41_anon', 'Anonymous Trainer', 'Training hard every day!', 'free'),
  ('6f95e2d9-b3f2-8af9-7854-a56efd11e62d', 'lucius41_alt', 'DKemmer', NULL, 'free'),
  ('6f95e2d8-65dd-e23e-ad4c-fe80c59f8c4e', 'purple_champion_vgc', 'Violette (VGC)', 'Looking for practice partners', 'free'),
  ('6f95e2d8-65dd-e23e-ad4c-fe80c59f8c4e', 'purple_champion_draft', 'Violette Draft', 'Looking for practice partners', 'free'),
  ('6f95e2d8-65dd-e23e-ad4c-fe80c59f8c4e', 'purple_champion_anon', 'Anonymous Trainer', 'Draft league player', 'free'),
  ('6f95e2d8-65dd-e23e-ad4c-fe80c59f8c4e', 'purple_champion_alt', 'VPadberg', 'Training hard every day!', 'free'),
  ('6f95e2d7-de5f-24da-0545-51aade1ecbce', 'bart74_vgc', 'Destinee (VGC)', 'VGC enthusiast', 'free'),
  ('6f95e2d7-de5f-24da-0545-51aade1ecbce', 'bart74_draft', 'Destinee Draft', 'Competitive Pokemon player', 'free'),
  ('6f95e2d7-de5f-24da-0545-51aade1ecbce', 'bart74_anon', 'Anonymous Trainer', 'Always learning', 'free'),
  ('6f95e2d7-de5f-24da-0545-51aade1ecbce', 'bart74_alt', 'DReilly', 'Always learning', 'free'),
  ('6f95e2d6-deb9-d5f9-9ee1-c6906b1ae2a9', 'colby_roberts52_vgc', 'Thalia (VGC)', 'Draft league player', 'free'),
  ('6f95e2d6-deb9-d5f9-9ee1-c6906b1ae2a9', 'colby_roberts52_draft', 'Thalia Draft', 'Competitive Pokemon player', 'free'),
  ('6f95e2d6-deb9-d5f9-9ee1-c6906b1ae2a9', 'colby_roberts52_anon', 'Anonymous Trainer', 'Draft league player', 'free'),
  ('6f95e2d6-deb9-d5f9-9ee1-c6906b1ae2a9', 'colby_roberts52_alt', 'TLind', 'VGC enthusiast', 'free'),
  ('6f95e2d5-f266-5bb7-7cb6-ee77bed28cb4', 'faraway_master_vgc', 'Antoinette (VGC)', NULL, 'free'),
  ('6f95e2d5-f266-5bb7-7cb6-ee77bed28cb4', 'faraway_master_draft', 'Antoinette Draft', 'Pokemon trainer', 'free'),
  ('6f95e2d5-f266-5bb7-7cb6-ee77bed28cb4', 'faraway_master_anon', 'Anonymous Trainer', 'Competitive Pokemon player', 'free'),
  ('6f95e2d5-f266-5bb7-7cb6-ee77bed28cb4', 'faraway_master_alt', 'AOndricka', NULL, 'free'),
  ('6f95e2d4-30fa-b310-3d57-24bd51854fdc', 'marianna_stokes_vgc', 'Margie (VGC)', 'Draft league player', 'free'),
  ('6f95e2d4-30fa-b310-3d57-24bd51854fdc', 'marianna_stokes_draft', 'Margie Draft', 'Competitive Pokemon player', 'free'),
  ('6f95e2d4-30fa-b310-3d57-24bd51854fdc', 'marianna_stokes_anon', 'Anonymous Trainer', 'VGC enthusiast', 'free'),
  ('6f95e2d4-30fa-b310-3d57-24bd51854fdc', 'marianna_stokes_alt', 'MPowlowski', 'Competitive Pokemon player', 'free'),
  ('6f95e2d3-273f-48d4-b90b-1acdf50fbccc', 'hildegard_predovic_vgc', 'Sarai (VGC)', 'Pokemon trainer', 'free'),
  ('6f95e2d3-273f-48d4-b90b-1acdf50fbccc', 'hildegard_predovic_draft', 'Sarai Draft', 'Looking for practice partners', 'free'),
  ('6f95e2d3-273f-48d4-b90b-1acdf50fbccc', 'hildegard_predovic_anon', 'Anonymous Trainer', 'Always learning', 'free'),
  ('6f95e2d3-273f-48d4-b90b-1acdf50fbccc', 'hildegard_predovic_alt', 'SLemke', 'Always learning', 'free'),
  ('6f95e2d2-1d8b-f1e1-8b9f-c747818afef0', 'estell85_vgc', 'Archibald (VGC)', 'Pokemon trainer', 'free'),
  ('6f95e2d1-abb3-eda3-4dad-adedcd3af546', 'maiyaabshire82_vgc', 'Katelyn (VGC)', NULL, 'free'),
  ('6f95e2bb-b5f5-ee75-4f4d-5ebba41f8905', 'cristobalupton55_vgc', 'Arely (VGC)', 'Always learning', 'free'),
  ('6f95e2ba-7dfc-c5c1-2f7a-bcf509207bc6', 'uncomfortable_traine_vgc', 'Alison (VGC)', 'VGC enthusiast', 'free'),
  ('6f95e2b9-cddc-cfa9-f85d-ee7b4ffebfd1', 'entire_trainer_vgc', 'Lindsay (VGC)', NULL, 'free'),
  ('6f95e2b8-d3fa-ec30-bdfc-bfba83c6ecd7', 'marguerite_hintz_vgc', 'Mavis (VGC)', 'VGC enthusiast', 'free'),
  ('6f95e2b7-cd4a-6bf0-ddfa-c171fbce1814', 'angelic_trainer_423_vgc', 'Lennie (VGC)', NULL, 'free'),
  ('6f95e2b6-b765-257e-14b3-7d31a6cb3cb3', 'janellebradtke25_vgc', 'Wava (VGC)', 'Training hard every day!', 'free'),
  ('6f95e2b5-afce-bc6b-cfd8-4aaaac7c879a', 'firsthand_gym_vgc', 'Jaida (VGC)', 'Pokemon trainer', 'free'),
  ('6f95e2b4-c8e3-c464-4c6e-fc38b81ccb3e', 'dirty_trainer_951_vgc', 'Kenyon (VGC)', 'Pokemon trainer', 'free'),
  ('6f95e2b3-a72a-e064-5daa-a3a9dfa8c304', 'cyrilfriesen33_vgc', 'Sarina (VGC)', NULL, 'free'),
  ('6f95e2b2-3095-1f2d-638b-8a2b5ece810c', 'johnnievandervort55_vgc', 'Amaya (VGC)', 'Always learning', 'free'),
  ('6f95e29c-eda6-6f0f-fdf6-71957ce48e12', 'ophelia96_vgc', 'Dimitri (VGC)', 'Pokemon trainer', 'free'),
  ('6f95e29b-aacd-ba10-4e98-dde6f54479c2', 'parched_trainer_151_vgc', 'Isac (VGC)', 'VGC enthusiast', 'free'),
  ('6f95e29a-cd7a-eecc-ed87-0cb2ca2f41da', 'multicolored_champio_vgc', 'Elinore (VGC)', 'Always learning', 'free'),
  ('6f95e299-f5f9-711f-a4d5-c7cca77b741a', 'quick_trainer_532_vgc', 'Celine (VGC)', 'Looking for practice partners', 'free'),
  ('6f95e298-b0a8-3efc-f192-dee17c8cbd85', 'romaine_homenick_vgc', 'Ellen (VGC)', NULL, 'free'),
  ('6f95e297-c093-dc5b-af4d-eedd8abe9ac3', 'happy_trainer_413_vgc', 'Maegan (VGC)', 'Draft league player', 'free'),
  ('6f95e296-050f-f8a7-ebe8-b5f0def2e3d4', 'kamron_kemmer91_vgc', 'Jazlyn (VGC)', 'VGC enthusiast', 'free'),
  ('6f95e295-0ed3-50cf-25de-910c80c0b60c', 'kasandracronin25_vgc', 'Nikko (VGC)', NULL, 'free')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.alts (user_id, username, display_name, bio, tier) VALUES
  ('6f95e294-cb44-be29-7d14-a1a978b3cba3', 'waynegorczany73_vgc', 'Summer (VGC)', 'Looking for practice partners', 'free'),
  ('6f95e293-4e5d-d659-5ece-c83a7e51f3ff', 'filthy_trainer_361_vgc', 'Marilie (VGC)', 'Training hard every day!', 'free'),
  ('6f95e27d-7cc4-efcc-b0c0-df64a5d22fec', 'quick_witted_leader_vgc', 'Edyth (VGC)', 'Pokemon trainer', 'free'),
  ('6f95e27c-5da4-12dc-0a7a-e7a0150d9c36', 'marianamitchell71_vgc', 'Hillard (VGC)', 'Looking for practice partners', 'free'),
  ('6f95e27b-d7e8-3f6b-fdbe-ee6054edd0a7', 'wicked_trainer_vgc', 'Kirstin (VGC)', NULL, 'free'),
  ('6f95e27a-8ab2-0f75-0bcf-cb1c8d852623', 'nippy_elite_vgc', 'Aurelie (VGC)', 'Training hard every day!', 'free'),
  ('6f95e279-2d2c-ffad-aad4-069dc42f2acb', 'irma58_vgc', 'Elmira (VGC)', 'Competitive Pokemon player', 'free'),
  ('6f95e278-af56-ddbc-a8ea-4fc7e061af7e', 'bad_trainer_106_vgc', 'Karl (VGC)', 'Always learning', 'free'),
  ('6f95e277-7b3e-f978-2d98-e9e1beef3adc', 'nigeljerde94_vgc', 'Blanche (VGC)', 'Draft league player', 'free'),
  ('6f95e276-bb1c-d863-39d1-eacc1adcb6e2', 'eugene_huel73_vgc', 'Katrine (VGC)', 'VGC enthusiast', 'free'),
  ('6f95e275-0f1b-629e-81dd-8491ccc7bccd', 'wallace_reichert_vgc', 'Tremaine (VGC)', 'Looking for practice partners', 'free'),
  ('6f95e274-41da-b4e1-9344-818ba8c3b11c', 'pastel_gym_vgc', 'Kara (VGC)', 'Draft league player', 'free'),
  ('7cd97505-6132-2b57-ffe3-8c10ee9a9073', 'shad_williamson9_vgc', 'Kara (VGC)', 'VGC enthusiast', 'free'),
  ('7cd97506-beca-e167-bf5d-c489f3b7a9cc', 'well_to_do_trainer_5_vgc', 'Emerald (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97507-3edd-f47e-a97d-c3acc4a07bc5', 'sammy_pouros_vgc', 'Josianne (VGC)', 'Draft league player', 'free'),
  ('7cd97508-db60-a6a0-ce3a-2dc8bd40ccdd', 'odd_ranger_vgc', 'Leonel (VGC)', 'Pokemon trainer', 'free'),
  ('7cd97509-d113-b468-b0ee-be03daceeeff', 'hilma_veum18_vgc', 'Delfina (VGC)', 'Looking for practice partners', 'free'),
  ('7cd9750a-5aa6-94fe-e6ba-ff82eac4b69e', 'shanelfeeney90_vgc', 'Dakota (VGC)', 'VGC enthusiast', 'free'),
  ('7cd9750b-dc4f-871a-256b-d6cca3fef7be', 'entire_gym_vgc', 'Clovis (VGC)', 'Training hard every day!', 'free'),
  ('7cd9750c-c2fa-e5d3-1fac-83cc4fbdaccf', 'blanca13_vgc', 'Makayla (VGC)', 'Training hard every day!', 'free'),
  ('7cd9750d-d1fe-d55e-6b83-0bf877b9dbb3', 'taut_trainer_671_vgc', 'Francisca (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd9750e-5ab7-df9e-7149-40eca321fe92', 'delta_olson_vgc', 'Cletus (VGC)', NULL, 'free'),
  ('7cd97524-b79e-bcd0-bafa-fa5bfc2f7085', 'fausto_mraz11_vgc', 'Darlene (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97525-dda7-2e16-673b-2d21e4cb1f5c', 'ettie_abbott24_vgc', 'Cicero (VGC)', NULL, 'free'),
  ('7cd97526-4668-8b3f-36bb-ae3c18906fe7', 'thrifty_trainer_14_vgc', 'Ofelia (VGC)', 'Always learning', 'free'),
  ('7cd97527-b7d4-3eed-db17-6d73db82456e', 'delectable_trainer_3_vgc', 'Brown (VGC)', 'Draft league player', 'free'),
  ('7cd97528-d7f0-f61d-5813-61e0a26e3f4a', 'rubbery_elite_vgc', 'Connie (VGC)', NULL, 'free'),
  ('7cd97529-dd15-a4ae-97f9-a7ecab79c7be', 'shaylee16_vgc', 'Gaetano (VGC)', 'Pokemon trainer', 'free'),
  ('7cd9752a-a7d4-ac46-aa4f-ff9adbf59240', 'shy_ace_vgc', 'Golden (VGC)', NULL, 'free'),
  ('7cd9752b-aafc-7e1d-27bd-8ac7d1bc393f', 'woeful_trainer_243_vgc', 'Roger (VGC)', 'Pokemon trainer', 'free'),
  ('7cd9752c-b51f-26bc-d38d-faead4eddab7', 'lorna_effertz_vgc', 'Mara (VGC)', 'Draft league player', 'free'),
  ('7cd9752d-b7a0-a7e0-caa1-fbd5a912c54b', 'clint_denesik_vgc', 'Dovie (VGC)', 'Always learning', 'free'),
  ('7cd97543-9c59-09cc-7628-2affddf6daaa', 'beloved_leader_vgc', 'Alfreda (VGC)', 'Training hard every day!', 'free'),
  ('7cd97544-cb20-f8d1-fec2-ca8dedd264da', 'emiliebednar53_vgc', 'Leonie (VGC)', 'VGC enthusiast', 'free'),
  ('7cd97545-a3f4-24a9-c009-bd1be8c2eaee', 'frivolous_master_vgc', 'Jarod (VGC)', NULL, 'free'),
  ('7cd97546-866f-eff8-b9d3-e47a8d9a516a', 'treverhartmann73_vgc', 'Tobin (VGC)', 'Training hard every day!', 'free'),
  ('7cd97547-9f9b-0fe0-8f9b-efcbdaa8ff1c', 'happy_trainer_400_vgc', 'Kristy (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97548-6426-ba53-7e7f-a3daff12f640', 'annette20_vgc', 'Amparo (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd97549-ad9b-a8dd-7def-b96f3c668f1c', 'sorrowful_trainer_13_vgc', 'Lempi (VGC)', 'VGC enthusiast', 'free'),
  ('7cd9754a-e7ce-0be2-3fb0-59faf6bb83fc', 'cruel_trainer_440_vgc', 'Destinee (VGC)', 'Draft league player', 'free'),
  ('7cd9754b-9bab-c7b5-4b50-eb9fcc3cdcf8', 'lee51_vgc', 'Gabe (VGC)', NULL, 'free'),
  ('7cd9754c-f97b-f6a1-1876-a746f99cf5ef', 'late_trainer_395_vgc', 'Dee (VGC)', 'VGC enthusiast', 'free'),
  ('7cd97562-ca42-e147-db26-549f488ffb51', 'brilliant_breeder_vgc', 'Laury (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd97563-097f-a6b6-9fff-4ede3ac6a7cd', 'dixiesanford87_vgc', 'Floy (VGC)', 'Pokemon trainer', 'free'),
  ('7cd97564-edf2-bba2-ecce-ab0e196b2fb3', 'lonny_bechtelar49_vgc', 'Joanne (VGC)', 'Draft league player', 'free'),
  ('7cd97565-d121-5258-edcf-2a6e7f56e0ff', 'courteous_trainer_87_vgc', 'Jammie (VGC)', 'VGC enthusiast', 'free'),
  ('7cd97566-cfa1-9aee-6b1f-7a7fef562e0d', 'weldon_bergnaum_schu_vgc', 'Willow (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd97567-42ec-a1c9-7c2a-c4441cc01cc7', 'sigrid67_vgc', 'Helga (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97568-22ec-fd42-bcdb-fc1ac6e6f0c3', 'laurynbalistreri76_vgc', 'Krista (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97569-e3e5-3fda-698f-667c5e5d2ed3', 'defensive_champion_vgc', 'Taya (VGC)', 'Draft league player', 'free')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.alts (user_id, username, display_name, bio, tier) VALUES
  ('7cd9756a-2e42-3ec7-ebef-d50adccf3fef', 'jabari_pagac18_vgc', 'Buddy (VGC)', 'VGC enthusiast', 'free'),
  ('7cd9756b-ee3d-a515-edf5-f08d3c5e8d20', 'marquis78_vgc', 'London (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97581-f362-5b81-7fd9-3fc6112ceac9', 'dominic_zulauf_vgc', 'Ted (VGC)', 'Pokemon trainer', 'free'),
  ('7cd97582-ab9b-dd9d-d932-0d54a7b3fcd8', 'shameful_master_vgc', 'Louvenia (VGC)', 'Training hard every day!', 'free'),
  ('7cd97583-f9a5-bc45-dc95-de9a4d7faace', 'corrupt_trainer_vgc', 'Kyler (VGC)', 'Training hard every day!', 'free'),
  ('7cd97584-b282-d9b4-38ef-9b1fe6c2f3e5', 'ivah_mcglynn_vgc', 'Taya (VGC)', 'Always learning', 'free'),
  ('7cd97585-8af4-5695-0df7-70ec33bd0d68', 'soupy_breeder_vgc', 'Simone (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97586-1ecb-4bc6-e13b-ce0f030ceec0', 'stunning_gym_vgc', 'Guy (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97587-3fb1-d5bb-fbaa-2cc19cc215d2', 'jaeden50_vgc', 'Callie (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97588-d2dd-293f-a2bb-ebeb8caaacc8', 'candid_breeder_vgc', 'Pat (VGC)', 'VGC enthusiast', 'free'),
  ('7cd97589-3a60-7bc7-9f85-5aa4f09b7c4a', 'jeraldferry81_vgc', 'Estella (VGC)', NULL, 'free'),
  ('7cd9758a-3a14-ef8e-b5fe-f5e120fbbb63', 'those_trainer_198_vgc', 'Felton (VGC)', 'VGC enthusiast', 'free'),
  ('7cd975a0-a72d-b3ba-decb-1140af2c3658', 'garricklindgren16_vgc', 'Bartholome (VGC)', 'Draft league player', 'free'),
  ('7cd975a1-bc34-7d42-f0bb-623febef35c4', 'jeffryyost15_vgc', 'Amie (VGC)', 'VGC enthusiast', 'free'),
  ('7cd975a2-81a2-87bb-3883-bf482d2fb8ce', 'salty_trainer_403_vgc', 'Mable (VGC)', 'Pokemon trainer', 'free'),
  ('7cd975a3-d3bf-1a37-08cd-ec42c3fcbf26', 'chance65_vgc', 'Tevin (VGC)', 'Looking for practice partners', 'free'),
  ('7cd975a4-c4cc-af4c-d9f9-38e7dd71f6b9', 'gummy_pro_vgc', 'Katherine (VGC)', NULL, 'free'),
  ('7cd975a5-efce-0dbc-714e-8a10fbb5a34a', 'orland_kihn_vgc', 'Francesca (VGC)', 'VGC enthusiast', 'free'),
  ('7cd975a6-0b0c-efba-ee1a-5aac73bce7ee', 'delilaho_hara84_vgc', 'Antwan (VGC)', 'Pokemon trainer', 'free'),
  ('7cd975a7-dca6-c19a-ff6a-79cfd4d1d76b', 'aliviashields97_vgc', 'Layne (VGC)', 'Draft league player', 'free'),
  ('7cd975a8-1593-ea5c-fedb-bcc22b50f0db', 'alyson_stiedemann_vgc', 'Taylor (VGC)', 'Always learning', 'free'),
  ('7cd975a9-75fe-5b1b-1eae-ceffeb2b2dad', 'jazmin_lubowitz_vgc', 'Sven (VGC)', 'Draft league player', 'free'),
  ('7cd975bf-94f2-804b-41a0-1baecf1bcbb5', 'dim_trainer_491_vgc', 'Geraldine (VGC)', 'VGC enthusiast', 'free'),
  ('7cd975c0-cde0-15ed-ad4b-f5a1cb397bc0', 'monica_crist_fahey79_vgc', 'Zoie (VGC)', NULL, 'free'),
  ('7cd975c1-37fc-89c0-1d1f-e58cdea1e9a1', 'scornful_elite_vgc', 'Nicola (VGC)', NULL, 'free'),
  ('7cd975c2-5ecb-d8bb-22be-6da502a48bf2', 'squeaky_trainer_454_vgc', 'Gerard (VGC)', 'Training hard every day!', 'free'),
  ('7cd975c3-e7dc-19ab-ad59-ddfc1d735957', 'jazmyne80_vgc', 'Maximus (VGC)', 'VGC enthusiast', 'free'),
  ('7cd975c4-a327-b512-cd5c-be5d6f087b1b', 'frequent_trainer_572_vgc', 'Fabian (VGC)', 'VGC enthusiast', 'free'),
  ('7cd975c5-86ab-ebed-25fc-c91956a1c9d1', 'mariannamacejkovic76_vgc', 'Fiona (VGC)', 'Always learning', 'free'),
  ('7cd975c6-5e32-ccaf-e1f8-6c6109ccf663', 'assuntaschoen_koelpi_vgc', 'Evie (VGC)', 'VGC enthusiast', 'free'),
  ('7cd975c7-dd39-6a9f-17ab-6adebccc686a', 'foolhardy_trainer_79_vgc', 'Wendell (VGC)', 'VGC enthusiast', 'free'),
  ('7cd975c8-a976-b10b-a25e-cfabff4b44e8', 'vidaboyle57_vgc', 'Berniece (VGC)', 'Looking for practice partners', 'free'),
  ('7cd975de-e499-d14e-db07-d6ed1df1b683', 'ashtyn_vonrueden_vgc', 'Carmen (VGC)', 'VGC enthusiast', 'free'),
  ('7cd975df-47ae-e473-bade-8adb079540e5', 'vernie34_vgc', 'Clay (VGC)', 'Training hard every day!', 'free'),
  ('7cd975e0-638e-d9e1-4cd0-8efe7292ea6a', 'enlightened_trainer__vgc', 'Jayme (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd975e1-a90c-7bef-fb8e-e62c7ea4d19c', 'elsie_stroman_vgc', 'Bridie (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd975e2-30e5-51ec-ee7d-04ca78b0545b', 'nella_russel_vgc', 'Robin (VGC)', 'Pokemon trainer', 'free'),
  ('7cd975e3-bda0-f83e-6cc9-c59beb8e3e8a', 'claudestreich31_vgc', 'Flavio (VGC)', 'Always learning', 'free'),
  ('7cd975e4-b5de-ebeb-2d0a-3489d1b4ceca', 'drab_trainer_487_vgc', 'Julien (VGC)', 'Looking for practice partners', 'free'),
  ('7cd975e5-ef27-dc05-d04f-d5105d9fe84b', 'novakuhic68_vgc', 'Madeline (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd975e6-7e6a-e3aa-dde2-e2b5efa49da2', 'quincy_pouros90_vgc', 'Shane (VGC)', 'Pokemon trainer', 'free'),
  ('7cd975e7-1ca5-5ad8-a2af-a4b59ba5ed8b', 'sigmund_senger46_vgc', 'Morgan (VGC)', 'Looking for practice partners', 'free'),
  ('7cd975fd-ee82-b2e4-588b-a35b3dcfeee5', 'noted_gym_vgc', 'Charles (VGC)', 'Always learning', 'free'),
  ('7cd975fe-91b7-adde-9cd2-b61ec3bce5d7', 'front_trainer_895_vgc', 'Rylee (VGC)', NULL, 'free'),
  ('7cd975ff-a77f-e09d-62ad-c13d4bb6ecf1', 'amber_reichel25_vgc', 'Aaron (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97600-96d0-ec6b-0fb6-71f0e9e5baf1', 'made_up_trainer_161_vgc', 'Carmella (VGC)', 'Training hard every day!', 'free'),
  ('7cd97601-7515-ebe8-fab5-aafe70ab3afe', 'easy_trainer_738_vgc', 'Kiera (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd97602-c4de-d2d2-1b8c-193fcf72f69e', 'twin_trainer_704_vgc', 'Kamryn (VGC)', 'Always learning', 'free'),
  ('7cd97603-1fc8-74ef-3d99-5cab631f4f89', 'stunning_trainer_537_vgc', 'Angeline (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97604-562e-12e7-fc5e-2b95ddfd845a', 'fredrick_hagenes66_vgc', 'Clement (VGC)', 'Competitive Pokemon player', 'free')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.alts (user_id, username, display_name, bio, tier) VALUES
  ('7cd97605-db8a-e0d9-739a-8e9fdb287cc1', 'tatyanahintz44_vgc', 'Mac (VGC)', 'Pokemon trainer', 'free'),
  ('7cd97606-e97d-ecf0-2dc6-5b18bca7dcce', 'thorny_trainer_213_vgc', 'Kariane (VGC)', 'Training hard every day!', 'free'),
  ('7cd9761c-41df-31b5-cfe8-ead94bbbae2f', 'arturofahey55_vgc', 'Maybell (VGC)', 'Pokemon trainer', 'free'),
  ('7cd9761d-fefe-802b-e9ab-14cfd2f40f6e', 'skylar_bednar_vgc', 'Caleigh (VGC)', 'Training hard every day!', 'free'),
  ('7cd9761e-63d8-597a-f9cc-3fbed9daad7f', 'ornery_trainer_904_vgc', 'Marco (VGC)', 'Looking for practice partners', 'free'),
  ('7cd9761f-53fb-47d1-31ba-afeae0dbb76e', 'ashamed_elite_vgc', 'Anabelle (VGC)', NULL, 'free'),
  ('7cd97620-af11-ebda-2aa6-6c1d5dee9f76', 'true_elite_vgc', 'Kelli (VGC)', 'VGC enthusiast', 'free'),
  ('7cd97621-91e4-e9fc-e0ad-329ebb30b1de', 'nettie_hermiston_vgc', 'Kale (VGC)', 'Always learning', 'free'),
  ('7cd97622-6e3f-295a-5dd4-d18fed682fbf', 'malvinamitchell24_vgc', 'Eliseo (VGC)', 'VGC enthusiast', 'free'),
  ('7cd97623-0ea7-e0cc-49ef-0e35502f622f', 'enriquebalistreri40_vgc', 'Stacey (VGC)', 'Draft league player', 'free'),
  ('7cd97624-789a-9ce7-c249-4d3adf8dc91a', 'desiree_fadel_vgc', 'Jorge (VGC)', 'Training hard every day!', 'free'),
  ('7cd97625-5341-40d6-f477-0c0edbbe8e01', 'leta_kunde1_vgc', 'Patsy (VGC)', 'Looking for practice partners', 'free'),
  ('7cd978c6-acfa-5dc4-5b0f-2b8ad9b105e2', 'katheryn_braun_vgc', 'Gregoria (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd978c7-ca3c-ad75-2bc7-a7ed383dae6e', 'incomplete_trainer_6_vgc', 'Chauncey (VGC)', 'VGC enthusiast', 'free'),
  ('7cd978c8-d62a-d060-9dfe-3db3eaaf44f4', 'personal_trainer_58_vgc', 'Justice (VGC)', 'Always learning', 'free'),
  ('7cd978c9-ad2f-f2ec-8a5f-0c9e4eaadada', 'oswaldo_kling_vgc', 'Doris (VGC)', 'Training hard every day!', 'free'),
  ('7cd978ca-b25c-7ff5-0f92-f0d323ffb875', 'price_fay82_vgc', 'Rachel (VGC)', 'Always learning', 'free'),
  ('7cd978cb-9afc-5dc8-a634-2feea1dc9cfb', 'katrina16_vgc', 'Jayden (VGC)', 'Looking for practice partners', 'free'),
  ('7cd978cc-aaa6-fe86-a53b-6d2e602ed5bd', 'arnoldo81_vgc', 'Alysha (VGC)', 'Always learning', 'free'),
  ('7cd978cd-06e7-5bc2-eb3f-88bf29a871f9', 'garett_bergnaum_vgc', 'Blanche (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd978ce-0203-1f63-5eb8-d87486e6c148', 'substantial_trainer__vgc', 'Eliane (VGC)', 'Always learning', 'free'),
  ('7cd978cf-bc66-ad42-d7c7-2cb49bc2cfbd', 'gaston_funk5_vgc', 'Chadrick (VGC)', 'Training hard every day!', 'free'),
  ('7cd978e5-ebef-0d9c-5fdb-14a0b0e8df72', 'scary_trainer_677_vgc', 'Hans (VGC)', 'Always learning', 'free'),
  ('7cd978e6-fd7c-c901-bff1-4acde0cb5f40', 'oval_trainer_521_vgc', 'John (VGC)', 'Always learning', 'free'),
  ('7cd978e7-daca-2f49-1c2d-daadb9baeaab', 'chaunceyjohnson55_vgc', 'Donald (VGC)', 'Training hard every day!', 'free'),
  ('7cd978e8-c466-b13b-259b-a9bd2398ac83', 'kayla75_vgc', 'Jan (VGC)', 'Training hard every day!', 'free'),
  ('7cd978e9-d1d1-ffbf-c9cf-aecb9405b89f', 'kiplarkin25_vgc', 'Royal (VGC)', 'VGC enthusiast', 'free'),
  ('7cd978ea-0262-f624-c1cf-590e954e93fc', 'izabellabeahan79_vgc', 'Noemi (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd978eb-fd5b-f59b-6046-93df1eef05ee', 'bill_pacocha_vgc', 'Bruce (VGC)', 'Draft league player', 'free'),
  ('7cd978ec-e4ff-c369-66f3-a0de64eff75f', 'sniveling_trainer_vgc', 'Darien (VGC)', 'Looking for practice partners', 'free'),
  ('7cd978ed-e0cb-b72d-adce-be8bb882e2e9', 'jacynthe_klein_vgc', 'Alanna (VGC)', 'Always learning', 'free'),
  ('7cd978ee-d968-865c-1e37-15ad4aadabec', 'marilie_medhurst82_vgc', 'Madisen (VGC)', NULL, 'free'),
  ('7cd97904-9fc3-98f5-ed9e-f25ef203f3bc', 'impossible_trainer_9_vgc', 'Kariane (VGC)', 'Always learning', 'free'),
  ('7cd97905-96bb-addc-965b-992f4495c89b', 'pertinent_trainer_27_vgc', 'Ebba (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97906-5be2-a417-3fb3-0b3d7c61449e', 'carleykerluke47_vgc', 'Jessica (VGC)', 'Always learning', 'free'),
  ('7cd97907-55ba-b1fb-6e9d-cbfda6a48df8', 'adolfomoen96_vgc', 'Janis (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97908-1cd9-91bb-3222-d453fc574a0e', 'flaviedare76_vgc', 'Jacinto (VGC)', 'Always learning', 'free'),
  ('7cd97909-2f5b-73c6-ecaa-a1ed13f983b2', 'stanley_schneider_vgc', 'Dereck (VGC)', 'Draft league player', 'free'),
  ('7cd9790a-c7ef-c7c7-1f21-d6e78579fbe0', 'norene68_vgc', 'Octavia (VGC)', 'Training hard every day!', 'free'),
  ('7cd9790b-0ea0-fa24-1cdb-bcd0f9ce7e2e', 'krystina_beatty85_vgc', 'Aileen (VGC)', 'VGC enthusiast', 'free'),
  ('7cd9790c-07bf-ff62-5cfa-037c1e8ebadd', 'vain_trainer_113_vgc', 'Estefania (VGC)', 'Always learning', 'free'),
  ('7cd9790d-abc9-cb0d-c3dd-32f853ede1d8', 'practical_leader_vgc', 'Moshe (VGC)', 'Pokemon trainer', 'free'),
  ('7cd97923-6c0c-77ec-dc5b-90cedac12d61', 'jaleelstracke93_vgc', 'Salvatore (VGC)', NULL, 'free'),
  ('7cd97924-ebc5-47a6-b3f2-eebf9d76cac6', 'kayden33_vgc', 'Louvenia (VGC)', 'Draft league player', 'free'),
  ('7cd97925-a6b8-c2f9-7f8c-9f2ca436f5a0', 'artfritsch16_vgc', 'Raoul (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd97926-44ec-b8ba-5b02-da9b8abaf47a', 'khalillarson_schuppe_vgc', 'Emely (VGC)', 'Draft league player', 'free'),
  ('7cd97927-fbd6-1e8c-b7f2-63b4febba7ad', 'nicolaconn45_vgc', 'Dangelo (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd97928-5ab5-bce7-ad84-fba9789bba2a', 'tressie65_vgc', 'Vidal (VGC)', 'VGC enthusiast', 'free'),
  ('7cd97929-8fcc-3565-c016-45bc0982effa', 'colorless_trainer_93_vgc', 'Magdalen (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd9792a-afec-e9da-e1bf-bcde1807bec2', 'well_lit_trainer_814_vgc', 'Afton (VGC)', 'Draft league player', 'free')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.alts (user_id, username, display_name, bio, tier) VALUES
  ('7cd9792b-aa2e-9a80-2af7-fffaea9460d5', 'overcooked_trainer_5_vgc', 'Stefan (VGC)', NULL, 'free'),
  ('7cd9792c-b066-366b-e8f7-6b019ef1cadc', 'oleflatley25_vgc', 'Brayan (VGC)', 'Pokemon trainer', 'free'),
  ('7cd97942-acba-35a3-757f-8c2b8ef4dd94', 'dallas56_vgc', 'Sedrick (VGC)', 'Training hard every day!', 'free'),
  ('7cd97943-6aeb-ca1f-adec-27d41bc3cfbc', 'nicola69_vgc', 'Miguel (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd97944-5f9d-606c-8bde-5acef5f800aa', 'clementina80_vgc', 'Oscar (VGC)', 'VGC enthusiast', 'free'),
  ('7cd97945-4b3e-a2a1-d5bb-ecc8eb6c9cc4', 'ripe_trainer_294_vgc', 'Elise (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97946-258a-0ff7-79d3-4c58de7f0aab', 'fortunate_champion_vgc', 'Mohammed (VGC)', 'Always learning', 'free'),
  ('7cd97947-6226-dbdd-0427-b073eaa9f4ba', 'tianna46_vgc', 'Cora (VGC)', 'VGC enthusiast', 'free'),
  ('7cd97948-4afb-87de-e1ad-2fe1e7c99db0', 'titus_kohler60_vgc', 'Karlee (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd97949-aeec-2bfc-c1fb-87ddac821187', 'ciara_heidenreich33_vgc', 'Alexie (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd9794a-b387-bb2a-858a-7580a30ebba4', 'sick_trainer_vgc', 'Dorothea (VGC)', NULL, 'free'),
  ('7cd9794b-4918-a87d-d183-f2e64e090ab7', 'runny_champion_vgc', 'Bell (VGC)', 'Draft league player', 'free'),
  ('7cd97961-54bc-e4eb-c550-6a14fbaf838c', 'huge_trainer_672_vgc', 'Justine (VGC)', 'VGC enthusiast', 'free'),
  ('7cd97962-cf98-c9c5-abbb-4fb73097c4c5', 'annette_harber2_vgc', 'Kaycee (VGC)', 'Pokemon trainer', 'free'),
  ('7cd97963-3fc4-423a-abad-f06e00cf5fb6', 'jaydeemard34_vgc', 'Miles (VGC)', 'VGC enthusiast', 'free'),
  ('7cd97964-f4ce-3fed-4daf-3a739babf8d8', 'violent_trainer_345_vgc', 'Jerald (VGC)', 'Training hard every day!', 'free'),
  ('7cd97965-05bc-ee9e-b42e-cbadfb2c5bff', 'mauricelittel79_vgc', 'Cortney (VGC)', 'Pokemon trainer', 'free'),
  ('7cd97966-e9d3-f20d-5abc-f6f28c8dbef1', 'jailyn75_vgc', 'Jermain (VGC)', 'VGC enthusiast', 'free'),
  ('7cd97967-94e3-6b54-d118-fc9c8e1edb46', 'sally_block33_vgc', 'Jovany (VGC)', 'Always learning', 'free'),
  ('7cd97968-0083-ce8c-0307-d2d9e24096dd', 'bowed_ace_vgc', 'Monty (VGC)', 'Always learning', 'free'),
  ('7cd97969-5062-aeda-e10e-6575b9be8537', 'multicolored_trainer_vgc', 'Zora (VGC)', 'VGC enthusiast', 'free'),
  ('7cd9796a-cf2a-21ff-194a-ced7d6edc760', 'slushy_breeder_vgc', 'Ladarius (VGC)', 'Pokemon trainer', 'free'),
  ('7cd97980-3dad-0eaa-dae7-b0052530e0a3', 'itzel12_vgc', 'Ubaldo (VGC)', 'Draft league player', 'free'),
  ('7cd97981-2e34-cad5-0afb-ad9ba9bb650c', 'sincere98_vgc', 'Magdalen (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97982-f649-1fcc-ea0d-f9a4438cc8cf', 'caleighparker77_vgc', 'Skylar (VGC)', 'Pokemon trainer', 'free'),
  ('7cd97983-50fa-232d-2a05-df1cacdff5da', 'cathrinemosciski_wun_vgc', 'Damaris (VGC)', 'VGC enthusiast', 'free'),
  ('7cd97984-8dbb-bc8d-561b-955dccda8e29', 'aged_trainer_120_vgc', 'Kenya (VGC)', 'VGC enthusiast', 'free'),
  ('7cd97985-daea-88ea-cd32-d60d4efa45b3', 'jessicaleannon22_vgc', 'Deanna (VGC)', 'Training hard every day!', 'free'),
  ('7cd97986-cdbd-6b2e-ff50-cfb45b7cabcb', 'emmittdubuque80_vgc', 'Alessandra (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97987-f0f5-08e0-cbd1-eeeec0a86989', 'rickylockman29_vgc', 'Emilio (VGC)', NULL, 'free'),
  ('7cd97988-292d-3b06-eafd-71cec2f5fd5d', 'ashton_kshlerin_vgc', 'Haley (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd97989-c5f0-4595-adfc-1f3b597c2c3f', 'westonwilderman14_vgc', 'Juvenal (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd9799f-82dd-dfd0-8c8d-d8dbafa3bbbb', 'houston_walter_vgc', 'Benny (VGC)', 'Draft league player', 'free'),
  ('7cd979a0-dbeb-1abe-ba36-34f35cd3bb56', 'fake_ace_vgc', 'Clementine (VGC)', 'Training hard every day!', 'free'),
  ('7cd979a1-c2c3-1ead-76ba-7facf5f8eafa', 'rey_bode55_vgc', 'Lea (VGC)', 'Training hard every day!', 'free'),
  ('7cd979a2-3897-bbcc-b2f9-61a75fa51c0e', 'robin_schultz_vgc', 'Jude (VGC)', 'Pokemon trainer', 'free'),
  ('7cd979a3-c600-0a6b-99bf-62c79eadbafb', 'gloomy_champion_vgc', 'Darron (VGC)', 'Draft league player', 'free'),
  ('7cd979a4-aae1-d971-ca2d-aad9ed6398cc', 'trusty_gym_vgc', 'Norris (VGC)', 'Pokemon trainer', 'free'),
  ('7cd979a5-1fc9-ecdc-67dd-fd2c9facb71d', 'memorable_master_vgc', 'Else (VGC)', 'Looking for practice partners', 'free'),
  ('7cd979a6-4ee8-4eda-dba3-78bed2376ddf', 'brody25_vgc', 'Katarina (VGC)', 'Training hard every day!', 'free'),
  ('7cd979a7-8f9a-a5cd-ae41-dcfeeccc8e9b', 'taut_leader_vgc', 'Judson (VGC)', 'Always learning', 'free'),
  ('7cd979a8-4430-add4-6ae5-a96a1b5f1f4d', 'kenna_beahan_vgc', 'Abe (VGC)', 'Looking for practice partners', 'free'),
  ('7cd979be-e2c6-eaf0-6405-e5bdf88a3d8c', 'viviane_rempel_vgc', 'Willis (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd979bf-b5b9-cdd9-09dc-e3e4a7f18f4b', 'pitiful_elite_vgc', 'Oran (VGC)', 'Pokemon trainer', 'free'),
  ('7cd979c0-406a-b4fb-eff1-40f7b7c23787', 'outstanding_elite_vgc', 'Laverna (VGC)', 'Training hard every day!', 'free'),
  ('7cd979c1-8bde-a2cf-cdf4-9a1f2fb0ecb5', 'bustling_elite_vgc', 'Annabelle (VGC)', 'Draft league player', 'free'),
  ('7cd979c2-cad6-2ccd-e1b8-db6cf2bde72b', 'heavy_trainer_256_vgc', 'Vita (VGC)', NULL, 'free'),
  ('7cd979c3-6e69-b2e8-18db-f16c1c2c7d31', 'willing_trainer_39_vgc', 'Judy (VGC)', 'Always learning', 'free'),
  ('7cd979c4-c50e-4dc1-2ad6-fd70a4c9cdc8', 'brannonlarkin62_vgc', 'Madison (VGC)', 'Draft league player', 'free'),
  ('7cd979c5-77e1-e4f3-a41d-c8fcc6ba7d33', 'opheliadicki91_vgc', 'Alden (VGC)', 'Looking for practice partners', 'free')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.alts (user_id, username, display_name, bio, tier) VALUES
  ('7cd979c6-fdd7-6400-deed-cad7ef5cb3d6', 'madyson24_vgc', 'Isaias (VGC)', 'Draft league player', 'free'),
  ('7cd979c7-5dee-e8ef-0daa-c3ac0609abed', 'weekly_trainer_641_vgc', 'Marian (VGC)', 'Always learning', 'free'),
  ('7cd979dd-8302-ebf7-de3f-a1cb0217bb5e', 'thoramarvin72_vgc', 'Mertie (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd979de-df8d-c9ee-b07a-6fcaf5da7a2b', 'alvertalemke46_vgc', 'Brendan (VGC)', 'Draft league player', 'free'),
  ('7cd979df-a48d-0fc8-9cb6-7ec36dffae4a', 'elaina_nitzsche_vgc', 'Selmer (VGC)', 'Training hard every day!', 'free'),
  ('7cd979e0-9c6e-3ee5-7ca7-b14a1cfefecd', 'recent_trainer_469_vgc', 'Saige (VGC)', NULL, 'free'),
  ('7cd979e1-d34d-25c7-ae48-dadeb5083fe0', 'lucy_reilly_vgc', 'Yessenia (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd979e2-e59b-d2d4-bbda-65d394ba77cc', 'delores_orn44_vgc', 'Norwood (VGC)', 'Always learning', 'free'),
  ('7cd979e3-66d9-fde4-e531-c2366dba55f0', 'unpleasant_pro_vgc', 'Vaughn (VGC)', 'Training hard every day!', 'free'),
  ('7cd979e4-2e49-4c20-1e3f-12baeebda7ed', 'cody_heaney_vgc', 'Kaycee (VGC)', NULL, 'free'),
  ('7cd979e5-3c63-c883-8d7e-e33c806db22e', 'dario_west44_vgc', 'Alena (VGC)', 'Pokemon trainer', 'free'),
  ('7cd979e6-f7ee-5b9e-9aa5-49adf6a0bf80', 'overcooked_ranger_vgc', 'Nina (VGC)', 'Pokemon trainer', 'free'),
  ('7cd97c87-39d9-cc4c-b829-1296e8abf5eb', 'qualified_trainer_61_vgc', 'Deondre (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd97c88-edb6-b49a-cd90-c3d08f296dd5', 'fred_pacocha47_vgc', 'Wilfrid (VGC)', 'VGC enthusiast', 'free'),
  ('7cd97c89-14f9-f4df-6cd8-cc3878aae69b', 'powerless_trainer_33_vgc', 'Alexandrine (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd97c8a-3770-dc8a-d83f-cf041ca2ccff', 'kasey_jacobi99_vgc', 'Mariana (VGC)', 'Draft league player', 'free'),
  ('7cd97c8b-c2ba-99be-ce3f-bedccc2c95d9', 'unselfish_trainer_12_vgc', 'Roxane (VGC)', 'Draft league player', 'free'),
  ('7cd97c8c-eeb2-5dfe-e90b-ead76dbb24e8', 'diamond_kunze75_vgc', 'Ashlee (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97c8d-0b70-e3c6-1121-aa79eefd78dd', 'valentin_hodkiewicz3_vgc', 'Gerry (VGC)', 'Draft league player', 'free'),
  ('7cd97c8e-13dd-ef86-cfdb-b7ccf0735d04', 'gregorio_schuster_ke_vgc', 'Guadalupe (VGC)', 'Draft league player', 'free'),
  ('7cd97c8f-a7e6-cae5-7aed-12a273def8dc', 'lexieerdman24_vgc', 'Jo (VGC)', 'Draft league player', 'free'),
  ('7cd97c90-2dac-c94a-22f4-6a9fdef6796f', 'rosy_trainer_409_vgc', 'Guadalupe (VGC)', 'Competitive Pokemon player', 'free'),
  ('7cd97ca6-cebf-2c59-d510-00254f62cce6', 'casimer_baumbach_vgc', 'Myles (VGC)', NULL, 'free'),
  ('7cd97ca7-ad4a-2837-8ff2-f102fe435bc4', 'michale_orn_vgc', 'Lucious (VGC)', NULL, 'free'),
  ('7cd97ca8-e309-baeb-2cb2-30ddef1db6f6', 'fuzzy_pro_vgc', 'Hugh (VGC)', 'Draft league player', 'free'),
  ('7cd97ca9-b210-ddf8-7dce-b9dca430f256', 'shanie_maggio_vgc', 'Nils (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97caa-fe9f-aba9-0ed4-eefdf5cc52f6', 'grant_bednar_vgc', 'Annalise (VGC)', 'Training hard every day!', 'free'),
  ('7cd97cab-2a12-5cec-75cf-f21fcceebefc', 'abelardo_konopelski_vgc', 'Carroll (VGC)', 'Pokemon trainer', 'free'),
  ('7cd97cac-d3c9-ea63-0b28-c63be23f0f0d', 'clevekling88_vgc', 'Dessie (VGC)', 'Looking for practice partners', 'free'),
  ('7cd97cad-9ff7-dc4d-1c31-8ccf91ac96b7', 'treviono_kon17_vgc', 'Omari (VGC)', NULL, 'free'),
  ('7cd97cae-7c9f-28fb-367e-aabb92cebcee', 'neat_ace_vgc', 'Davin (VGC)', 'Training hard every day!', 'free'),
  ('7cd97caf-acd1-416d-cdc6-53cd43dae85f', 'eryn_stracke_hand41_vgc', 'Guiseppe (VGC)', 'Looking for practice partners', 'free')
ON CONFLICT (username) DO NOTHING;


-- -----------------------------------------------------------------------------
-- Site Admin Role
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  site_admin_role_id bigint;
BEGIN
  SELECT id INTO site_admin_role_id FROM public.roles WHERE name = 'Site Admin' AND scope = 'site';
  IF site_admin_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id) VALUES
      ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', site_admin_role_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
