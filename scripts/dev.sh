#!/usr/bin/env bash
# Web dev: clean Next dev cache, start web + Supabase edge functions via turbo,
# and tee output to a timestamped log under .dev-logs/ (symlinked to dev.log).
set -eo pipefail

rm -rf apps/web/.next/dev
mkdir -p .dev-logs

TS=$(date +%Y%m%d-%H%M%S)
ln -sf "dev-$TS.log" .dev-logs/dev.log

turbo run dev functions:serve \
  --filter=@trainers/web --filter=@trainers/supabase \
  | tee ".dev-logs/dev-$TS.log"
