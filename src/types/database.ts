export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: number
          new_data: Json | null
          old_data: Json | null
          operation: string
          record_id: string | null
          table_name: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          record_id?: string | null
          table_name: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      challenge_scores: {
        Row: {
          challenge_id: string
          id: string
          participant_id: string
          score: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          challenge_id: string
          id?: string
          participant_id: string
          score?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          challenge_id?: string
          id?: string
          participant_id?: string
          score?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_scores_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_scores_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          description: string | null
          edition_id: string
          id: string
          name: string
          order_num: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          edition_id: string
          id?: string
          name: string
          order_num: number
        }
        Update: {
          created_at?: string
          description?: string | null
          edition_id?: string
          id?: string
          name?: string
          order_num?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenges_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      editions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          year?: number
        }
        Relationships: []
      }
      judge_round_challenges: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          round_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          round_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_round_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_round_challenges_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "judge_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_round_judges: {
        Row: {
          created_at: string
          id: string
          judge_id: string
          round_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          judge_id: string
          round_id: string
        }
        Update: {
          created_at?: string
          id?: string
          judge_id?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_round_judges_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "judge_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_rounds: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          stage_id: string
          status: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          stage_id: string
          status?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          stage_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_rounds_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_scores: {
        Row: {
          challenge_id: string
          id: string
          judge_id: string
          participant_id: string
          score: number
          stage_id: string
          updated_at: string
        }
        Insert: {
          challenge_id: string
          id?: string
          judge_id: string
          participant_id: string
          score?: number
          stage_id: string
          updated_at?: string
        }
        Update: {
          challenge_id?: string
          id?: string
          judge_id?: string
          participant_id?: string
          score?: number
          stage_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_scores_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_scores_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_scores_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      observations: {
        Row: {
          author_id: string
          body: string
          created_at: string
          edition_id: string
          id: string
          participant_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          edition_id: string
          id?: string
          participant_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          edition_id?: string
          id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "observations_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observations_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          created_at: string
          edition_id: string
          full_name: string
          id: string
          photo_url: string | null
          region: string
          sash_number: number
        }
        Insert: {
          created_at?: string
          edition_id: string
          full_name: string
          id?: string
          photo_url?: string | null
          region: string
          sash_number: number
        }
        Update: {
          created_at?: string
          edition_id?: string
          full_name?: string
          id?: string
          photo_url?: string | null
          region?: string
          sash_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "participants_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: []
      }
      stage_participants: {
        Row: {
          advanced: boolean
          created_at: string
          id: string
          participant_id: string
          rank: number | null
          stage_id: string
        }
        Insert: {
          advanced?: boolean
          created_at?: string
          id?: string
          participant_id: string
          rank?: number | null
          stage_id: string
        }
        Update: {
          advanced?: boolean
          created_at?: string
          id?: string
          participant_id?: string
          rank?: number | null
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_participants_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_participants_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_snapshots: {
        Row: {
          created_at: string
          id: string
          snapshot: Json
          stage_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          snapshot: Json
          stage_id: string
        }
        Update: {
          created_at?: string
          id?: string
          snapshot?: Json
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_snapshots_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: true
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          closed_at: string | null
          created_at: string
          cupo: number
          edition_id: string
          id: string
          name: string
          order_num: number
          slug: string
          status: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          cupo: number
          edition_id: string
          id?: string
          name: string
          order_num: number
          slug: string
          status?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          cupo?: number
          edition_id?: string
          id?: string
          name?: string
          order_num?: number
          slug?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stages_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      title_assignments: {
        Row: {
          approved: boolean
          approved_at: string | null
          assigned_at: string
          assigned_by: string | null
          edition_id: string
          id: string
          participant_id: string
          title_id: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          assigned_at?: string
          assigned_by?: string | null
          edition_id: string
          id?: string
          participant_id: string
          title_id: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          assigned_at?: string
          assigned_by?: string | null
          edition_id?: string
          id?: string
          participant_id?: string
          title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "title_assignments_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "title_assignments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "title_assignments_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: true
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      titles: {
        Row: {
          created_at: string
          edition_id: string
          id: string
          kind: string
          name: string
          order_num: number
        }
        Insert: {
          created_at?: string
          edition_id: string
          id?: string
          kind: string
          name: string
          order_num: number
        }
        Update: {
          created_at?: string
          edition_id?: string
          id?: string
          kind?: string
          name?: string
          order_num?: number
        }
        Relationships: [
          {
            foreignKeyName: "titles_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role: "encargado" | "juez" | "director" | "anunciador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["encargado", "juez", "director", "anunciador"],
    },
  },
} as const
