export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activity_type: string | null
          calories_burned: number | null
          duration_min: number | null
          id: string
          logged_at: string | null
          user_id: string
        }
        Insert: {
          activity_type?: string | null
          calories_burned?: number | null
          duration_min?: number | null
          id?: string
          logged_at?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string | null
          calories_burned?: number | null
          duration_min?: number | null
          id?: string
          logged_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          country_code: string | null
          created_at: string | null
          id: string
          name: string
          notify_on_critical: boolean | null
          phone: string
          relationship: string | null
          user_id: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          id?: string
          name: string
          notify_on_critical?: boolean | null
          phone: string
          relationship?: string | null
          user_id: string
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notify_on_critical?: boolean | null
          phone?: string
          relationship?: string | null
          user_id?: string
        }
        Relationships: []
      }
      glucose_readings: {
        Row: {
          context: string | null
          glucose_value_mg_dl: number
          id: string
          measured_at: string | null
          notes: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          context?: string | null
          glucose_value_mg_dl: number
          id?: string
          measured_at?: string | null
          notes?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          context?: string | null
          glucose_value_mg_dl?: number
          id?: string
          measured_at?: string | null
          notes?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      health_profiles: {
        Row: {
          a1c_percent: number | null
          allergies: string[] | null
          blood_type: string | null
          comorbidities: string[] | null
          created_at: string | null
          height_cm: number | null
          id: string
          medications: string[] | null
          updated_at: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          a1c_percent?: number | null
          allergies?: string[] | null
          blood_type?: string | null
          comorbidities?: string[] | null
          created_at?: string | null
          height_cm?: number | null
          id?: string
          medications?: string[] | null
          updated_at?: string | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          a1c_percent?: number | null
          allergies?: string[] | null
          blood_type?: string | null
          comorbidities?: string[] | null
          created_at?: string | null
          height_cm?: number | null
          id?: string
          medications?: string[] | null
          updated_at?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      meal_scans: {
        Row: {
          alternatives: Json | null
          created_at: string | null
          estimated_weight_g: number | null
          food_name: string | null
          glycemic_data: Json | null
          id: string
          image_path: string | null
          image_url: string | null
          is_estimate_fallback: boolean | null
          meal_type: string | null
          nutrition_data: Json | null
          recommendations: string[] | null
          risk_level: string | null
          scanned_at: string | null
          serving_size: string | null
          user_id: string
        }
        Insert: {
          alternatives?: Json | null
          created_at?: string | null
          estimated_weight_g?: number | null
          food_name?: string | null
          glycemic_data?: Json | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_estimate_fallback?: boolean | null
          meal_type?: string | null
          nutrition_data?: Json | null
          recommendations?: string[] | null
          risk_level?: string | null
          scanned_at?: string | null
          serving_size?: string | null
          user_id: string
        }
        Update: {
          alternatives?: Json | null
          created_at?: string | null
          estimated_weight_g?: number | null
          food_name?: string | null
          glycemic_data?: Json | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_estimate_fallback?: boolean | null
          meal_type?: string | null
          nutrition_data?: Json | null
          recommendations?: string[] | null
          risk_level?: string | null
          scanned_at?: string | null
          serving_size?: string | null
          user_id?: string
        }
        Relationships: []
      }
      medications: {
        Row: {
          active: boolean | null
          created_at: string | null
          dosage: string | null
          frequency: string | null
          id: string
          name: string
          notes: string | null
          timing: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          dosage?: string | null
          frequency?: string | null
          id?: string
          name: string
          notes?: string | null
          timing?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          dosage?: string | null
          frequency?: string | null
          id?: string
          name?: string
          notes?: string | null
          timing?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          diabetes_type: string | null
          diagnosis_year: number | null
          full_name: string | null
          gender: string | null
          id: string
          target_glucose_max: number | null
          target_glucose_min: number | null
          timezone: string | null
          units: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          diabetes_type?: string | null
          diagnosis_year?: number | null
          full_name?: string | null
          gender?: string | null
          id: string
          target_glucose_max?: number | null
          target_glucose_min?: number | null
          timezone?: string | null
          units?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          diabetes_type?: string | null
          diagnosis_year?: number | null
          full_name?: string | null
          gender?: string | null
          id?: string
          target_glucose_max?: number | null
          target_glucose_min?: number | null
          timezone?: string | null
          units?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

