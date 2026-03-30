export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  username: string | null
  provider: string | null
  provider_user_id: string | null
  bio: string | null
  website_url: string | null
  github_url: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Partial<ProfileRow> & { id: string }
        Update: Partial<ProfileRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
