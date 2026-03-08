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
      appointments: {
        Row: {
          client_id: string | null
          created_at: string
          end_time: string
          id: string
          notes: string | null
          service_id: string | null
          staff_id: string | null
          start_time: string
          status: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          service_id?: string | null
          staff_id?: string | null
          start_time: string
          status?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          service_id?: string | null
          staff_id?: string | null
          start_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      client_memberships: {
        Row: {
          client_id: string
          created_at: string
          expires_at: string | null
          id: string
          membership_id: string
          started_at: string
          status: string
          usage_count: number
        }
        Insert: {
          client_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          membership_id: string
          started_at?: string
          status?: string
          usage_count?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          membership_id?: string
          started_at?: string
          status?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_memberships_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_memberships_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      commission_rules: {
        Row: {
          category: string
          created_at: string
          id: string
          material_deduction: number
          rate_pct: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          material_deduction?: number
          rate_pct?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          material_deduction?: number
          rate_pct?: number
        }
        Relationships: []
      }
      consent_forms: {
        Row: {
          client_id: string
          created_at: string
          form_data: Json
          id: string
          service_name: string
          signature_data: string | null
          signed_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          form_data?: Json
          id?: string
          service_name: string
          signature_data?: string | null
          signed_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          form_data?: Json
          id?: string
          service_name?: string
          signature_data?: string | null
          signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_forms_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          auto_reorder: boolean
          category: string
          cost_per_unit: number
          current_stock: number
          id: string
          min_stock: number
          name: string
          supplier: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          auto_reorder?: boolean
          category?: string
          cost_per_unit?: number
          current_stock?: number
          id?: string
          min_stock?: number
          name: string
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          auto_reorder?: boolean
          category?: string
          cost_per_unit?: number
          current_stock?: number
          id?: string
          min_stock?: number
          name?: string
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_usage: {
        Row: {
          created_at: string
          id: string
          inventory_id: string
          notes: string | null
          qty_used: number
          staff_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id: string
          notes?: string | null
          qty_used: number
          staff_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string
          notes?: string | null
          qty_used?: number
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_usage_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_usage_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          active: boolean
          billing_cycle: string
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
          usage_limit: number | null
        }
        Insert: {
          active?: boolean
          billing_cycle?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number
          usage_limit?: number | null
        }
        Update: {
          active?: boolean
          billing_cycle?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      offpeak_offers: {
        Row: {
          active: boolean
          auto_notify: boolean
          created_at: string
          day_of_week: number
          discount_pct: number
          end_hour: number
          id: string
          name: string
          start_hour: number
        }
        Insert: {
          active?: boolean
          auto_notify?: boolean
          created_at?: string
          day_of_week: number
          discount_pct?: number
          end_hour?: number
          id?: string
          name: string
          start_hour?: number
        }
        Update: {
          active?: boolean
          auto_notify?: boolean
          created_at?: string
          day_of_week?: number
          discount_pct?: number
          end_hour?: number
          id?: string
          name?: string
          start_hour?: number
        }
        Relationships: []
      }
      portfolio: {
        Row: {
          after_photo: string | null
          before_photo: string | null
          client_id: string
          created_at: string
          id: string
          notes: string | null
          service_name: string
          staff_id: string | null
        }
        Insert: {
          after_photo?: string | null
          before_photo?: string | null
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          service_name: string
          staff_id?: string | null
        }
        Update: {
          after_photo?: string | null
          before_photo?: string | null
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          service_name?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          created_at: string
          estimated_cost: number
          id: string
          inventory_id: string
          qty_ordered: number
          status: string
        }
        Insert: {
          created_at?: string
          estimated_cost?: number
          id?: string
          inventory_id: string
          qty_ordered: number
          status?: string
        }
        Update: {
          created_at?: string
          estimated_cost?: number
          id?: string
          inventory_id?: string
          qty_ordered?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          commission_pct: number
          id: string
          name: string
          price: number
          qty: number
          sale_id: string
          service_id: string | null
        }
        Insert: {
          commission_pct?: number
          id?: string
          name: string
          price: number
          qty?: number
          sale_id: string
          service_id?: string | null
        }
        Update: {
          commission_pct?: number
          id?: string
          name?: string
          price?: number
          qty?: number
          sale_id?: string
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          payment_method: string
          staff_id: string | null
          status: string
          subtotal: number
          tax: number
          tip: number
          total: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          payment_method?: string
          staff_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          tip?: number
          total?: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          payment_method?: string
          staff_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          tip?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_settings: {
        Row: {
          address: string | null
          currency: string
          email: string | null
          hero_image: string | null
          id: string
          name: string
          online_booking: boolean
          phone: string | null
          updated_at: string
          whatsapp_reminders: boolean
        }
        Insert: {
          address?: string | null
          currency?: string
          email?: string | null
          hero_image?: string | null
          id?: string
          name?: string
          online_booking?: boolean
          phone?: string | null
          updated_at?: string
          whatsapp_reminders?: boolean
        }
        Update: {
          address?: string | null
          currency?: string
          email?: string | null
          hero_image?: string | null
          id?: string
          name?: string
          online_booking?: boolean
          phone?: string | null
          updated_at?: string
          whatsapp_reminders?: boolean
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          category: string
          commission_pct: number
          created_at: string
          duration: number
          id: string
          is_product: boolean
          name: string
          price: number
        }
        Insert: {
          active?: boolean
          category?: string
          commission_pct?: number
          created_at?: string
          duration?: number
          id?: string
          is_product?: boolean
          name: string
          price?: number
        }
        Update: {
          active?: boolean
          category?: string
          commission_pct?: number
          created_at?: string
          duration?: number
          id?: string
          is_product?: boolean
          name?: string
          price?: number
        }
        Relationships: []
      }
      staff: {
        Row: {
          active: boolean
          base_commission_pct: number
          created_at: string
          id: string
          name: string
          role: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          base_commission_pct?: number
          created_at?: string
          id?: string
          name: string
          role?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          base_commission_pct?: number
          created_at?: string
          id?: string
          name?: string
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      app_role: "admin" | "moderator" | "user" | "super_admin"
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
      app_role: ["admin", "moderator", "user", "super_admin"],
    },
  },
} as const
