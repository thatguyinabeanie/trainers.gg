// CORS headers for edge functions
// Allow requests from trainers.gg domains

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // TODO: Restrict to trainers.gg domains in production
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
