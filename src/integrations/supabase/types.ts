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
      ai_knowledge: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: string
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          kind?: string
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          admin_note: string | null
          challenge_type: string
          course: string
          created_at: string
          department_id: string | null
          description: string
          full_name: string
          id: string
          phone: string
          registration_number: string
          status: string
          track_code: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          challenge_type: string
          course: string
          created_at?: string
          department_id?: string | null
          description: string
          full_name: string
          id?: string
          phone: string
          registration_number: string
          status?: string
          track_code?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          challenge_type?: string
          course?: string
          created_at?: string
          department_id?: string | null
          description?: string
          full_name?: string
          id?: string
          phone?: string
          registration_number?: string
          status?: string
          track_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      deaths: {
        Row: {
          created_at: string
          death_date: string
          deceased_name: string
          description: string | null
          id: string
          location: string
          phone: string
          registration_number: string
          relationship: string
          student_name: string
          track_code: string | null
        }
        Insert: {
          created_at?: string
          death_date: string
          deceased_name: string
          description?: string | null
          id?: string
          location: string
          phone: string
          registration_number: string
          relationship: string
          student_name: string
          track_code?: string | null
        }
        Update: {
          created_at?: string
          death_date?: string
          deceased_name?: string
          description?: string | null
          id?: string
          location?: string
          phone?: string
          registration_number?: string
          relationship?: string
          student_name?: string
          track_code?: string | null
        }
        Relationships: []
      }
      department_submissions: {
        Row: {
          admin_note: string | null
          attachment_name: string | null
          attachment_url: string | null
          category: string | null
          course: string | null
          created_at: string
          department_id: string | null
          description: string | null
          form_four_index: string | null
          full_name: string
          gender: string | null
          id: string
          phone: string
          registration_number: string
          status: string
          track_code: string | null
          updated_at: string
          year_of_study: string | null
        }
        Insert: {
          admin_note?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          category?: string | null
          course?: string | null
          created_at?: string
          department_id?: string | null
          description?: string | null
          form_four_index?: string | null
          full_name: string
          gender?: string | null
          id?: string
          phone: string
          registration_number: string
          status?: string
          track_code?: string | null
          updated_at?: string
          year_of_study?: string | null
        }
        Update: {
          admin_note?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          category?: string | null
          course?: string | null
          created_at?: string
          department_id?: string | null
          description?: string | null
          form_four_index?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          phone?: string
          registration_number?: string
          status?: string
          track_code?: string | null
          updated_at?: string
          year_of_study?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_submissions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          active: boolean
          created_at: string
          deadline_at: string | null
          deadline_note: string | null
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          leader_contact: string | null
          leader_name: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          deadline_at?: string | null
          deadline_note?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          leader_contact?: string | null
          leader_name?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          deadline_at?: string | null
          deadline_note?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          leader_contact?: string | null
          leader_name?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      form_categories: {
        Row: {
          active: boolean
          created_at: string
          department_id: string | null
          id: string
          label: string
          service_key: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          department_id?: string | null
          id?: string
          label: string
          service_key: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          department_id?: string | null
          id?: string
          label?: string
          service_key?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_categories_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      graduations: {
        Row: {
          content: string | null
          created_at: string
          event_date: string | null
          id: string
          image_url: string | null
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          image_url?: string | null
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          image_url?: string | null
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hero_images: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          id: string
          sort_order: number
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          sort_order?: number
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          sort_order?: number
          url?: string
        }
        Relationships: []
      }
      leader_applications: {
        Row: {
          approved_user_id: string | null
          course: string | null
          created_at: string
          department_id: string | null
          full_name: string
          id: string
          password_hash: string
          phone: string | null
          position: string
          registration_number: string
          status: string
          updated_at: string
          year_of_study: string | null
        }
        Insert: {
          approved_user_id?: string | null
          course?: string | null
          created_at?: string
          department_id?: string | null
          full_name: string
          id?: string
          password_hash: string
          phone?: string | null
          position: string
          registration_number: string
          status?: string
          updated_at?: string
          year_of_study?: string | null
        }
        Update: {
          approved_user_id?: string | null
          course?: string | null
          created_at?: string
          department_id?: string | null
          full_name?: string
          id?: string
          password_hash?: string
          phone?: string | null
          position?: string
          registration_number?: string
          status?: string
          updated_at?: string
          year_of_study?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leader_applications_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      leaders: {
        Row: {
          bio: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          photo_url: string | null
          position: string
          published: boolean
          short_message: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          photo_url?: string | null
          position: string
          published?: boolean
          short_message?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          photo_url?: string | null
          position?: string
          published?: boolean
          short_message?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      loan_requests: {
        Row: {
          admin_note: string | null
          course: string
          created_at: string
          email: string
          form_four_index: string
          full_name: string
          id: string
          phone: string
          problem_description: string
          problem_type: string
          registration_number: string
          status: string
          track_code: string | null
          updated_at: string
          year_of_study: string
        }
        Insert: {
          admin_note?: string | null
          course: string
          created_at?: string
          email: string
          form_four_index: string
          full_name: string
          id?: string
          phone: string
          problem_description: string
          problem_type: string
          registration_number: string
          status?: string
          track_code?: string | null
          updated_at?: string
          year_of_study: string
        }
        Update: {
          admin_note?: string | null
          course?: string
          created_at?: string
          email?: string
          form_four_index?: string
          full_name?: string
          id?: string
          phone?: string
          problem_description?: string
          problem_type?: string
          registration_number?: string
          status?: string
          track_code?: string | null
          updated_at?: string
          year_of_study?: string
        }
        Relationships: []
      }
      official_links: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          label: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          label: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          label?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_status: {
        Row: {
          deadline_at: string | null
          deadline_note: string | null
          enabled: boolean
          image_url: string | null
          key: string
          label: string
          updated_at: string
        }
        Insert: {
          deadline_at?: string | null
          deadline_note?: string | null
          enabled?: boolean
          image_url?: string | null
          key: string
          label: string
          updated_at?: string
        }
        Update: {
          deadline_at?: string | null
          deadline_note?: string | null
          enabled?: boolean
          image_url?: string | null
          key?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          address: string | null
          email: string | null
          id: string
          logo_url: string | null
          maintenance_ends_at: string | null
          maintenance_message: string | null
          mum_logo_url: string | null
          phone: string | null
          president_message: string | null
          president_name: string | null
          president_photo_url: string | null
          president_title: string | null
          system_enabled: boolean
          theme_accent: string | null
          theme_background: string | null
          theme_primary: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          maintenance_ends_at?: string | null
          maintenance_message?: string | null
          mum_logo_url?: string | null
          phone?: string | null
          president_message?: string | null
          president_name?: string | null
          president_photo_url?: string | null
          president_title?: string | null
          system_enabled?: boolean
          theme_accent?: string | null
          theme_background?: string | null
          theme_primary?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          maintenance_ends_at?: string | null
          maintenance_message?: string | null
          mum_logo_url?: string | null
          phone?: string | null
          president_message?: string | null
          president_name?: string | null
          president_photo_url?: string | null
          president_title?: string | null
          system_enabled?: boolean
          theme_accent?: string | null
          theme_background?: string | null
          theme_primary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          course: string
          created_at: string
          full_name: string
          id: string
          phone: string
          registration_number: string
          updated_at: string
          year_of_study: string
        }
        Insert: {
          course: string
          created_at?: string
          full_name: string
          id?: string
          phone: string
          registration_number: string
          updated_at?: string
          year_of_study: string
        }
        Update: {
          course?: string
          created_at?: string
          full_name?: string
          id?: string
          phone?: string
          registration_number?: string
          updated_at?: string
          year_of_study?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
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
      student_lookup: {
        Args: { _reg: string }
        Returns: {
          course: string
          full_name: string
          phone: string
          year_of_study: string
        }[]
      }
      track_code_of: { Args: { p_query: string }; Returns: string }
      track_delete: {
        Args: { p_id: string; p_kind: string; p_query: string }
        Returns: Json
      }
      track_lookup: { Args: { p_query: string }; Returns: Json }
      track_norm_phone: { Args: { v: string }; Returns: string }
      track_norm_reg: { Args: { v: string }; Returns: string }
      track_recover_code: {
        Args: { p_last_name: string; p_phone: string }
        Returns: Json
      }
      track_table_for_kind: { Args: { p_kind: string }; Returns: string }
      track_update: {
        Args: { p_id: string; p_kind: string; p_query: string; p_values: Json }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "leader" | "student"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "leader", "student"],
    },
  },
} as const
