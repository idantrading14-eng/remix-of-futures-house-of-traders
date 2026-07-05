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
  public: {
    Tables: {
      courses: {
        Row: {
          certificate_enabled: boolean
          content_type: string
          created_at: string
          description: string | null
          enrollment_type: string
          html_content: string | null
          id: string
          pdf_url: string | null
          price: number | null
          thumbnail_url: string | null
          title: string
          type: string
          updated_at: string
          visibility: string
        }
        Insert: {
          certificate_enabled?: boolean
          content_type?: string
          created_at?: string
          description?: string | null
          enrollment_type?: string
          html_content?: string | null
          id?: string
          pdf_url?: string | null
          price?: number | null
          thumbnail_url?: string | null
          title: string
          type?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          certificate_enabled?: boolean
          content_type?: string
          created_at?: string
          description?: string | null
          enrollment_type?: string
          html_content?: string | null
          id?: string
          pdf_url?: string | null
          price?: number | null
          thumbnail_url?: string | null
          title?: string
          type?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          client_id: string
          course_id: string
          enrolled_at: string
          id: string
          status: string
        }
        Insert: {
          client_id: string
          course_id: string
          enrolled_at?: string
          id?: string
          status?: string
        }
        Update: {
          client_id?: string
          course_id?: string
          enrolled_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_bookmarks: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_bookmarks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          client_id: string
          completed: boolean
          completed_at: string | null
          id: string
          lesson_id: string
        }
        Insert: {
          client_id: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          lesson_id: string
        }
        Update: {
          client_id?: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          access_level: string
          content_type: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          embed_code: string | null
          file_url: string | null
          id: string
          module_id: string
          sort_order: number
          text_content: string | null
          thumbnail_url: string | null
          title: string
          video_file_url: string | null
          video_source_type: string
          video_url: string | null
        }
        Insert: {
          access_level?: string
          content_type?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          embed_code?: string | null
          file_url?: string | null
          id?: string
          module_id: string
          sort_order?: number
          text_content?: string | null
          thumbnail_url?: string | null
          title: string
          video_file_url?: string | null
          video_source_type?: string
          video_url?: string | null
        }
        Update: {
          access_level?: string
          content_type?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          embed_code?: string | null
          file_url?: string | null
          id?: string
          module_id?: string
          sort_order?: number
          text_content?: string | null
          thumbnail_url?: string | null
          title?: string
          video_file_url?: string | null
          video_source_type?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          access_level: string
          course_id: string
          created_at: string
          description: string | null
          embed_code: string | null
          id: string
          notes: string | null
          sort_order: number
          thumbnail_url: string | null
          title: string
          video_file_url: string | null
          video_source_type: string
          video_url: string | null
        }
        Insert: {
          access_level?: string
          course_id: string
          created_at?: string
          description?: string | null
          embed_code?: string | null
          id?: string
          notes?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          title: string
          video_file_url?: string | null
          video_source_type?: string
          video_url?: string | null
        }
        Update: {
          access_level?: string
          course_id?: string
          created_at?: string
          description?: string | null
          embed_code?: string | null
          id?: string
          notes?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          video_file_url?: string | null
          video_source_type?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean | null
          created_at: string | null
          display_name: string
          id: string
          role: string
        }
        Insert: {
          approved?: boolean | null
          created_at?: string | null
          display_name: string
          id: string
          role?: string
        }
        Update: {
          approved?: boolean | null
          created_at?: string | null
          display_name?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      student_access: {
        Row: {
          has_courses_access: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          has_courses_access?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          has_courses_access?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_lesson_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_lesson_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      test_levels: {
        Row: {
          created_at: string
          id: string
          questions: Json
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          questions?: Json
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          questions?: Json
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_own_profile_role_approved: {
        Args: { _user_id: string }
        Returns: {
          approved: boolean
          role: string
        }[]
      }
      is_mentor: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
