import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Indstilling = {
  nøgle: string;
  værdi: string;
};

export type Inspiration = {
  id: string;
  platform: string;
  opslag: string;
  oprettet: string;
};

export type Historik = {
  id: string;
  dato: string;
  platform: string;
  briefing: string;
  opslag: string;
};
