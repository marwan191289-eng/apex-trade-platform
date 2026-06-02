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
      bots: {
        Row: {
          bot_type: string
          config: Json
          created_at: string
          id: string
          investment_usdt: number
          status: string
          stopped_at: string | null
          symbol: string
          total_pnl: number
          total_trades: number
          user_id: string
        }
        Insert: {
          bot_type: string
          config?: Json
          created_at?: string
          id?: string
          investment_usdt: number
          status?: string
          stopped_at?: string | null
          symbol: string
          total_pnl?: number
          total_trades?: number
          user_id: string
        }
        Update: {
          bot_type?: string
          config?: Json
          created_at?: string
          id?: string
          investment_usdt?: number
          status?: string
          stopped_at?: string | null
          symbol?: string
          total_pnl?: number
          total_trades?: number
          user_id?: string
        }
        Relationships: []
      }
      copy_follows: {
        Row: {
          allocation_usdt: number
          current_pnl: number
          id: string
          leader_id: string
          started_at: string
          status: string
          stopped_at: string | null
          user_id: string
        }
        Insert: {
          allocation_usdt: number
          current_pnl?: number
          id?: string
          leader_id: string
          started_at?: string
          status?: string
          stopped_at?: string | null
          user_id: string
        }
        Update: {
          allocation_usdt?: number
          current_pnl?: number
          id?: string
          leader_id?: string
          started_at?: string
          status?: string
          stopped_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copy_follows_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "copy_leaders"
            referencedColumns: ["id"]
          },
        ]
      }
      copy_leaders: {
        Row: {
          aum_usdt: number
          avatar_seed: string
          badge: string | null
          bio: string | null
          created_at: string
          display_name: string
          followers: number
          id: string
          roi_30d: number
          total_pnl: number
          win_rate: number
        }
        Insert: {
          aum_usdt?: number
          avatar_seed: string
          badge?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          followers?: number
          id?: string
          roi_30d: number
          total_pnl?: number
          win_rate: number
        }
        Update: {
          aum_usdt?: number
          avatar_seed?: string
          badge?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          followers?: number
          id?: string
          roi_30d?: number
          total_pnl?: number
          win_rate?: number
        }
        Relationships: []
      }
      futures_positions: {
        Row: {
          close_price: number | null
          closed_at: string | null
          entry_price: number
          id: string
          leverage: number
          liquidation_price: number
          margin_usdt: number
          opened_at: string
          realized_pnl: number | null
          side: string
          size_usdt: number
          status: string
          symbol: string
          user_id: string
        }
        Insert: {
          close_price?: number | null
          closed_at?: string | null
          entry_price: number
          id?: string
          leverage: number
          liquidation_price: number
          margin_usdt: number
          opened_at?: string
          realized_pnl?: number | null
          side: string
          size_usdt: number
          status?: string
          symbol: string
          user_id: string
        }
        Update: {
          close_price?: number | null
          closed_at?: string | null
          entry_price?: number
          id?: string
          leverage?: number
          liquidation_price?: number
          margin_usdt?: number
          opened_at?: string
          realized_pnl?: number | null
          side?: string
          size_usdt?: number
          status?: string
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      holdings: {
        Row: {
          amount: number
          asset_symbol: string
          avg_price: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          asset_symbol: string
          avg_price?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          asset_symbol?: string
          avg_price?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          asset_symbol: string
          created_at: string
          id: string
          limit_price: number | null
          linked_order_id: string | null
          order_type: string
          price: number
          side: string
          status: string
          stop_price: number | null
          total_usdt: number
          trail_percent: number | null
          user_id: string
        }
        Insert: {
          amount: number
          asset_symbol: string
          created_at?: string
          id?: string
          limit_price?: number | null
          linked_order_id?: string | null
          order_type?: string
          price: number
          side: string
          status?: string
          stop_price?: number | null
          total_usdt: number
          trail_percent?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          asset_symbol?: string
          created_at?: string
          id?: string
          limit_price?: number | null
          linked_order_id?: string | null
          order_type?: string
          price?: number
          side?: string
          status?: string
          stop_price?: number | null
          total_usdt?: number
          trail_percent?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          kyc_status: string
          preferred_language: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          kyc_status?: string
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          kyc_status?: string
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      stakes: {
        Row: {
          amount: number
          id: string
          product_id: string
          redeemed_at: string | null
          rewards_accumulated: number
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          id?: string
          product_id: string
          redeemed_at?: string | null
          rewards_accumulated?: number
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          product_id?: string
          redeemed_at?: string | null
          rewards_accumulated?: number
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stakes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staking_products"
            referencedColumns: ["id"]
          },
        ]
      }
      staking_products: {
        Row: {
          apy: number
          asset_symbol: string
          badge: string | null
          id: string
          is_flexible: boolean
          lock_days: number
          min_amount: number
        }
        Insert: {
          apy: number
          asset_symbol: string
          badge?: string | null
          id?: string
          is_flexible?: boolean
          lock_days?: number
          min_amount?: number
        }
        Update: {
          apy?: number
          asset_symbol?: string
          badge?: string | null
          id?: string
          is_flexible?: boolean
          lock_days?: number
          min_amount?: number
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance_usdt: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_usdt?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_usdt?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          asset_symbol: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          asset_symbol: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          asset_symbol?: string
          created_at?: string
          id?: string
          user_id?: string
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
