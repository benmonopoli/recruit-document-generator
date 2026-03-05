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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      company_knowledge: {
        Row: {
          content: string
          content_type: string
          id: string
          source_url: string | null
          updated_at: string
        }
        Insert: {
          content: string
          content_type: string
          id?: string
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          content_type?: string
          id?: string
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      application_questions: {
        Row: {
          created_at: string
          evaluation_notes: string | null
          field_type: string
          id: string
          order_index: number
          project_id: string
          purpose: string | null
          question: string
          word_limit: number | null
        }
        Insert: {
          created_at?: string
          evaluation_notes?: string | null
          field_type?: string
          id?: string
          order_index?: number
          project_id: string
          purpose?: string | null
          question: string
          word_limit?: number | null
        }
        Update: {
          created_at?: string
          evaluation_notes?: string | null
          field_type?: string
          id?: string
          order_index?: number
          project_id?: string
          purpose?: string | null
          question?: string
          word_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "application_questions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
          role: string
          section_type: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project_id: string
          role: string
          section_type?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          section_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          category: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          page_url: string | null
          rating: number | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          page_url?: string | null
          rating?: number | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          page_url?: string | null
          rating?: number | null
          user_id?: string
        }
        Relationships: []
      }
      greenhouse_jobs_cache: {
        Row: {
          cached_at: string
          closed_date: string | null
          created_date: string | null
          custom_fields: Json | null
          department: string | null
          description: string | null
          employment_type: string | null
          id: string
          location: string | null
          remote_status: string | null
          requirements: string | null
          status: string | null
          title: string
        }
        Insert: {
          cached_at?: string
          closed_date?: string | null
          created_date?: string | null
          custom_fields?: Json | null
          department?: string | null
          description?: string | null
          employment_type?: string | null
          id: string
          location?: string | null
          remote_status?: string | null
          requirements?: string | null
          status?: string | null
          title: string
        }
        Update: {
          cached_at?: string
          closed_date?: string | null
          created_date?: string | null
          custom_fields?: Json | null
          department?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          location?: string | null
          remote_status?: string | null
          requirements?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      interview_questions: {
        Row: {
          created_at: string
          evaluation_criteria: string[] | null
          follow_ups: string[] | null
          id: string
          project_id: string
          question: string
          question_type: string
          stage: string
        }
        Insert: {
          created_at?: string
          evaluation_criteria?: string[] | null
          follow_ups?: string[] | null
          id?: string
          project_id: string
          question: string
          question_type: string
          stage: string
        }
        Update: {
          created_at?: string
          evaluation_criteria?: string[] | null
          follow_ups?: string[] | null
          id?: string
          project_id?: string
          question?: string
          question_type?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_questions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      job_descriptions: {
        Row: {
          content: string
          created_at: string
          generation_prompt: string | null
          id: string
          project_id: string
          title: string
          tone_concise_detailed: number
          tone_formal_casual: number
          tone_preset: string | null
          tone_serious_playful: number
          tone_traditional_unconventional: number
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          generation_prompt?: string | null
          id?: string
          project_id: string
          title: string
          tone_concise_detailed?: number
          tone_formal_casual?: number
          tone_preset?: string | null
          tone_serious_playful?: number
          tone_traditional_unconventional?: number
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          generation_prompt?: string | null
          id?: string
          project_id?: string
          title?: string
          tone_concise_detailed?: number
          tone_formal_casual?: number
          tone_preset?: string | null
          tone_serious_playful?: number
          tone_traditional_unconventional?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_descriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_contributors: {
        Row: {
          added_by: string
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          added_by: string
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          added_by?: string
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_contributors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          id: string
          is_public: boolean
          name: string
          source_template_id: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          source_template_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          source_template_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      shared_documents: {
        Row: {
          content: string
          created_at: string
          document_type: string
          id: string
          is_read: boolean
          recipient_id: string
          sender_id: string
          source_project_id: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          document_type: string
          id?: string
          is_read?: boolean
          recipient_id: string
          sender_id: string
          source_project_id?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          document_type?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          sender_id?: string
          source_project_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_documents_source_project_id_fkey"
            columns: ["source_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      test_tasks: {
        Row: {
          context_constraints: string | null
          created_at: string
          deliverables: string | null
          difficulty_level: number
          estimated_hours: number
          evaluation_criteria: string | null
          id: string
          problem_statement: string
          project_id: string
          sample_solution: string | null
          title: string
        }
        Insert: {
          context_constraints?: string | null
          created_at?: string
          deliverables?: string | null
          difficulty_level?: number
          estimated_hours?: number
          evaluation_criteria?: string | null
          id?: string
          problem_statement: string
          project_id: string
          sample_solution?: string | null
          title: string
        }
        Update: {
          context_constraints?: string | null
          created_at?: string
          deliverables?: string | null
          difficulty_level?: number
          estimated_hours?: number
          evaluation_criteria?: string | null
          id?: string
          problem_statement?: string
          project_id?: string
          sample_solution?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          default_department: string | null
          default_tone_preset: string | null
          display_name: string | null
          id: string
          preferred_writing_style: number
          theme: string
          ui_density: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_department?: string | null
          default_tone_preset?: string | null
          display_name?: string | null
          id?: string
          preferred_writing_style?: number
          theme?: string
          ui_density?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_department?: string | null
          default_tone_preset?: string | null
          display_name?: string | null
          id?: string
          preferred_writing_style?: number
          theme?: string
          ui_density?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
