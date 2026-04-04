-- Add long-form about field to communities table
-- Separate from the short description (500 char plain text) shown in the header.
-- The about field supports markdown and is surfaced as a dedicated About tab.
alter table public.communities
  add column if not exists about text;
