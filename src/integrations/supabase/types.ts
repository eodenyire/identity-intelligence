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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      compliance_screenings: {
        Row: {
          adverse_media_hits: number
          created_at: string
          hits: Json | null
          id: string
          pep_hits: number
          provider: string
          query_country: string | null
          query_name: string
          raw_response: Json | null
          risk_level: string
          sanctions_hits: number
          session_id: string
          top_match_score: number | null
          total_hits: number
          user_id: string
        }
        Insert: {
          adverse_media_hits?: number
          created_at?: string
          hits?: Json | null
          id?: string
          pep_hits?: number
          provider?: string
          query_country?: string | null
          query_name: string
          raw_response?: Json | null
          risk_level?: string
          sanctions_hits?: number
          session_id: string
          top_match_score?: number | null
          total_hits?: number
          user_id: string
        }
        Update: {
          adverse_media_hits?: number
          created_at?: string
          hits?: Json | null
          id?: string
          pep_hits?: number
          provider?: string
          query_country?: string | null
          query_name?: string
          raw_response?: Json | null
          risk_level?: string
          sanctions_hits?: number
          session_id?: string
          top_match_score?: number | null
          total_hits?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_screenings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "verification_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_credentials: {
        Row: {
          claims: Json
          credential_id: string
          expires_at: string
          id: string
          issued_at: string
          jwt: string
          revoked_at: string | null
          session_id: string
          subject_country: string | null
          subject_name: string
          trust_score: number | null
          user_id: string
        }
        Insert: {
          claims: Json
          credential_id: string
          expires_at?: string
          id?: string
          issued_at?: string
          jwt: string
          revoked_at?: string | null
          session_id: string
          subject_country?: string | null
          subject_name: string
          trust_score?: number | null
          user_id: string
        }
        Update: {
          claims?: Json
          credential_id?: string
          expires_at?: string
          id?: string
          issued_at?: string
          jwt?: string
          revoked_at?: string | null
          session_id?: string
          subject_country?: string | null
          subject_name?: string
          trust_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_credentials_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "verification_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_documents: {
        Row: {
          created_at: string
          doc_type: Database["public"]["Enums"]["document_type"]
          face_match_score: number | null
          id: string
          liveness_score: number | null
          mime_type: string | null
          ocr_data: Json | null
          session_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          doc_type: Database["public"]["Enums"]["document_type"]
          face_match_score?: number | null
          id?: string
          liveness_score?: number | null
          mime_type?: string | null
          ocr_data?: Json | null
          session_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["document_type"]
          face_match_score?: number | null
          id?: string
          liveness_score?: number | null
          mime_type?: string | null
          ocr_data?: Json | null
          session_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "verification_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_sessions: {
        Row: {
          ai_analysis: Json | null
          completed_at: string | null
          country: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          expires_at: string
          id: string
          id_type: Database["public"]["Enums"]["id_document_type"]
          public_token: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["verification_status"]
          trust_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          completed_at?: string | null
          country?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          expires_at?: string
          id?: string
          id_type?: Database["public"]["Enums"]["id_document_type"]
          public_token: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          trust_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          completed_at?: string | null
          country?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          expires_at?: string
          id?: string
          id_type?: Database["public"]["Enums"]["id_document_type"]
          public_token?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          trust_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt_count: number
          created_at: string
          delivered_at: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          session_id: string | null
          webhook_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          session_id?: string | null
          webhook_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          session_id?: string | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "verification_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string
          enabled_events: string[]
          id: string
          is_active: boolean
          label: string
          signing_secret: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled_events?: string[]
          id?: string
          is_active?: boolean
          label: string
          signing_secret: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled_events?: string[]
          id?: string
          is_active?: boolean
          label?: string
          signing_secret?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_session_by_token: {
        Args: { _token: string }
        Returns: {
          country: string
          customer_name: string
          expires_at: string
          id: string
          id_type: Database["public"]["Enums"]["id_document_type"]
          status: Database["public"]["Enums"]["verification_status"]
        }[]
      }
    }
    Enums: {
      document_type: "id_front" | "id_back" | "selfie" | "liveness"
      id_document_type:
        | "passport"
        | "national_id"
        | "drivers_license"
        | "voter_id"
      verification_status:
        | "pending"
        | "in_progress"
        | "verified"
        | "flagged"
        | "rejected"
        | "expired"
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
  public: {
    Enums: {
      document_type: ["id_front", "id_back", "selfie", "liveness"],
      id_document_type: [
        "passport",
        "national_id",
        "drivers_license",
        "voter_id",
      ],
      verification_status: [
        "pending",
        "in_progress",
        "verified",
        "flagged",
        "rejected",
        "expired",
      ],
    },
  },
} as const
