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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_access_events: {
        Row: {
          actor_email: string
          actor_id: string
          actor_name: string | null
          entered_at: string
          entry_id: string
          id: string
        }
        Insert: {
          actor_email: string
          actor_id: string
          actor_name?: string | null
          entered_at?: string
          entry_id: string
          id?: string
        }
        Update: {
          actor_email?: string
          actor_id?: string
          actor_name?: string | null
          entered_at?: string
          entry_id?: string
          id?: string
        }
        Relationships: []
      }
      affiliate_payouts: {
        Row: {
          affiliate_id: string
          amount_cents: number
          created_at: string
          id: string
          paid_at: string | null
          pix_key: string
          status: string
        }
        Insert: {
          affiliate_id: string
          amount_cents: number
          created_at?: string
          id?: string
          paid_at?: string | null
          pix_key: string
          status?: string
        }
        Update: {
          affiliate_id?: string
          amount_cents?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          pix_key?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          code: string
          created_at: string
          email: string | null
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          email?: string | null
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          email?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          allowed_models: string[] | null
          api_key: string
          burst_exempt: boolean
          burst_pause_minutes: number | null
          burst_paused_until: string | null
          burst_token_limit: number | null
          burst_window_minutes: number | null
          burst_window_started_at: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          daily_reset_at: string | null
          daily_token_limit: number | null
          expires_at: string | null
          forced_provider: string | null
          id: string
          ip_limit: number
          key_hash: string | null
          key_prefix: string | null
          label: string | null
          last_used_at: string | null
          mass_agent_detected_at: string | null
          mass_agent_until: string | null
          model_family: string
          plano: string | null
          requests_count: number
          reseller_blocked: boolean
          reseller_cost_cents: number
          reseller_id: string | null
          rpm_limit: number
          spam_guard: boolean
          status: string
          token_limit: number | null
          tokens_used: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          allowed_models?: string[] | null
          api_key: string
          burst_exempt?: boolean
          burst_pause_minutes?: number | null
          burst_paused_until?: string | null
          burst_token_limit?: number | null
          burst_window_minutes?: number | null
          burst_window_started_at?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          daily_reset_at?: string | null
          daily_token_limit?: number | null
          expires_at?: string | null
          forced_provider?: string | null
          id?: string
          ip_limit?: number
          key_hash?: string | null
          key_prefix?: string | null
          label?: string | null
          last_used_at?: string | null
          mass_agent_detected_at?: string | null
          mass_agent_until?: string | null
          model_family?: string
          plano?: string | null
          requests_count?: number
          reseller_blocked?: boolean
          reseller_cost_cents?: number
          reseller_id?: string | null
          rpm_limit?: number
          spam_guard?: boolean
          status?: string
          token_limit?: number | null
          tokens_used?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          allowed_models?: string[] | null
          api_key?: string
          burst_exempt?: boolean
          burst_pause_minutes?: number | null
          burst_paused_until?: string | null
          burst_token_limit?: number | null
          burst_window_minutes?: number | null
          burst_window_started_at?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          daily_reset_at?: string | null
          daily_token_limit?: number | null
          expires_at?: string | null
          forced_provider?: string | null
          id?: string
          ip_limit?: number
          key_hash?: string | null
          key_prefix?: string | null
          label?: string | null
          last_used_at?: string | null
          mass_agent_detected_at?: string | null
          mass_agent_until?: string | null
          model_family?: string
          plano?: string | null
          requests_count?: number
          reseller_blocked?: boolean
          reseller_cost_cents?: number
          reseller_id?: string | null
          rpm_limit?: number
          spam_guard?: boolean
          status?: string
          token_limit?: number | null
          tokens_used?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          created_at: string
          id: string
          message_id: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          parts?: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          parts?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "assistant_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      blocked_signup_domains: {
        Row: {
          created_at: string
          domain: string
        }
        Insert: {
          created_at?: string
          domain: string
        }
        Update: {
          created_at?: string
          domain?: string
        }
        Relationships: []
      }
      client_model_prices: {
        Row: {
          estimated: boolean
          input_usd_per_million: number
          model_id: string
          output_usd_per_million: number
          updated_at: string
          usd_to_brl: number
        }
        Insert: {
          estimated?: boolean
          input_usd_per_million: number
          model_id: string
          output_usd_per_million: number
          updated_at?: string
          usd_to_brl?: number
        }
        Update: {
          estimated?: boolean
          input_usd_per_million?: number
          model_id?: string
          output_usd_per_million?: number
          updated_at?: string
          usd_to_brl?: number
        }
        Relationships: []
      }
      clients: {
        Row: {
          phone: string | null
          company: string | null
          created_at: string
          email: string
          forced_provider: string | null
          id: string
          name: string
          notes: string | null
          plan_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          phone?: string | null
          company?: string | null
          created_at?: string
          email: string
          forced_provider?: string | null
          id?: string
          name: string
          notes?: string | null
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          phone?: string | null
          company?: string | null
          created_at?: string
          email?: string
          forced_provider?: string | null
          id?: string
          name?: string
          notes?: string | null
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          amount_off_cents: number | null
          code: string
          created_at: string
          expires_at: string | null
          id: string
          max_uses: number | null
          percent_off: number | null
        }
        Insert: {
          active?: boolean
          amount_off_cents?: number | null
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          percent_off?: number | null
        }
        Update: {
          active?: boolean
          amount_off_cents?: number | null
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          percent_off?: number | null
        }
        Relationships: []
      }
      fallback_routes: {
        Row: {
          active: boolean
          created_at: string
          id: string
          provider_account_id: string
          provider_model: string
          public_model: string
          route_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          provider_account_id: string
          provider_model: string
          public_model: string
          route_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          provider_account_id?: string
          provider_model?: string
          public_model?: string
          route_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fallback_routes_provider_account_id_fkey"
            columns: ["provider_account_id"]
            isOneToOne: false
            referencedRelation: "provider_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      key_spam_fingerprints: {
        Row: {
          api_key_id: string
          bucket: number
          created_at: string
          fingerprint: string
        }
        Insert: {
          api_key_id: string
          bucket: number
          created_at?: string
          fingerprint: string
        }
        Update: {
          api_key_id?: string
          bucket?: number
          created_at?: string
          fingerprint?: string
        }
        Relationships: []
      }
      models: {
        Row: {
          capabilities: Json
          catalog_approved: boolean
          context_window: number | null
          cost_per_credit: number | null
          created_at: string
          description: string | null
          display_name: string | null
          enabled: boolean
          id: string
          internal_id: string | null
          name: string
          provider: string
        }
        Insert: {
          capabilities?: Json
          catalog_approved?: boolean
          context_window?: number | null
          cost_per_credit?: number | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          enabled?: boolean
          id?: string
          internal_id?: string | null
          name: string
          provider?: string
        }
        Update: {
          capabilities?: Json
          catalog_approved?: boolean
          context_window?: number | null
          cost_per_credit?: number | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          enabled?: boolean
          id?: string
          internal_id?: string | null
          name?: string
          provider?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          phone: string | null
          affiliate_id: string | null
          amount_cents: number
          api_key_id: string | null
          approved_at: string | null
          client_id: string | null
          coupon_code: string | null
          created_at: string
          discount_cents: number
          email: string
          id: string
          model_family: string
          mp_payment_id: string | null
          name: string
          plan_code: string
          plan_snapshot: Json | null
          reset_applied_at: string | null
          reset_key_id: string | null
          status: string
          tokens_credited_at: string | null
          upgrade_key_id: string | null
          upgrade_tokens: number | null
          upgrade_user_id: string | null
        }
        Insert: {
          phone?: string | null
          affiliate_id?: string | null
          amount_cents: number
          api_key_id?: string | null
          approved_at?: string | null
          client_id?: string | null
          coupon_code?: string | null
          created_at?: string
          discount_cents?: number
          email: string
          id?: string
          model_family?: string
          mp_payment_id?: string | null
          name: string
          plan_code: string
          plan_snapshot?: Json | null
          reset_applied_at?: string | null
          reset_key_id?: string | null
          status?: string
          tokens_credited_at?: string | null
          upgrade_key_id?: string | null
          upgrade_tokens?: number | null
          upgrade_user_id?: string | null
        }
        Update: {
          phone?: string | null
          affiliate_id?: string | null
          amount_cents?: number
          api_key_id?: string | null
          approved_at?: string | null
          client_id?: string | null
          coupon_code?: string | null
          created_at?: string
          discount_cents?: number
          email?: string
          id?: string
          model_family?: string
          mp_payment_id?: string | null
          name?: string
          plan_code?: string
          plan_snapshot?: Json | null
          reset_applied_at?: string | null
          reset_key_id?: string | null
          status?: string
          tokens_credited_at?: string | null
          upgrade_key_id?: string | null
          upgrade_tokens?: number | null
          upgrade_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reset_key_id_fkey"
            columns: ["reset_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_upgrade_key_id_fkey"
            columns: ["upgrade_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          action_label: string | null
          active: boolean
          allowed_models: string[] | null
          badge: string | null
          best: boolean
          code: string | null
          created_at: string
          daily_token_limit: number | null
          detail: string | null
          discount: string | null
          duration_days: number | null
          id: string
          image_url: string | null
          kind: string
          name: string
          old_price_cents: number | null
          price_cents: number
          rpm_limit: number
          show_on_site: boolean
          sort_order: number
          spam_guard: boolean
          title: string | null
          token_limit: number | null
          updated_at: string
        }
        Insert: {
          action_label?: string | null
          active?: boolean
          allowed_models?: string[] | null
          badge?: string | null
          best?: boolean
          code?: string | null
          created_at?: string
          daily_token_limit?: number | null
          detail?: string | null
          discount?: string | null
          duration_days?: number | null
          id?: string
          image_url?: string | null
          kind?: string
          name: string
          old_price_cents?: number | null
          price_cents?: number
          rpm_limit?: number
          show_on_site?: boolean
          sort_order?: number
          spam_guard?: boolean
          title?: string | null
          token_limit?: number | null
          updated_at?: string
        }
        Update: {
          action_label?: string | null
          active?: boolean
          allowed_models?: string[] | null
          badge?: string | null
          best?: boolean
          code?: string | null
          created_at?: string
          daily_token_limit?: number | null
          detail?: string | null
          discount?: string | null
          duration_days?: number | null
          id?: string
          image_url?: string | null
          kind?: string
          name?: string
          old_price_cents?: number | null
          price_cents?: number
          rpm_limit?: number
          show_on_site?: boolean
          sort_order?: number
          spam_guard?: boolean
          title?: string | null
          token_limit?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_accounts: {
        Row: {
          active: boolean
          api_secret_name: string
          available_models: string[]
          base_url: string
          cost_per_million: number | null
          created_at: string
          dedicated_only: boolean
          default_model: string | null
          distribution_strategy: string
          id: string
          legacy_monthly_token_limit: number | null
          monthly_tokens: number | null
          name: string
          operational_reserve: number
          paused: boolean
          priority: number
          provider_plan: string
          provider_type: string
          requests_per_day: number | null
          requests_per_minute: number | null
          spend_limit: number | null
          split_rpm: boolean
          token_balance: number | null
          token_balance_set_at: string | null
          token_balance_used_offset: number
          updated_at: string
          window_seconds: number | null
          window_token_limit: number | null
        }
        Insert: {
          active?: boolean
          api_secret_name?: string
          available_models?: string[]
          base_url?: string
          cost_per_million?: number | null
          created_at?: string
          dedicated_only?: boolean
          default_model?: string | null
          distribution_strategy?: string
          id?: string
          legacy_monthly_token_limit?: number | null
          monthly_tokens?: number | null
          name: string
          operational_reserve?: number
          paused?: boolean
          priority?: number
          provider_plan?: string
          provider_type?: string
          requests_per_day?: number | null
          requests_per_minute?: number | null
          spend_limit?: number | null
          split_rpm?: boolean
          token_balance?: number | null
          token_balance_set_at?: string | null
          token_balance_used_offset?: number
          updated_at?: string
          window_seconds?: number | null
          window_token_limit?: number | null
        }
        Update: {
          active?: boolean
          api_secret_name?: string
          available_models?: string[]
          base_url?: string
          cost_per_million?: number | null
          created_at?: string
          dedicated_only?: boolean
          default_model?: string | null
          distribution_strategy?: string
          id?: string
          legacy_monthly_token_limit?: number | null
          monthly_tokens?: number | null
          name?: string
          operational_reserve?: number
          paused?: boolean
          priority?: number
          provider_plan?: string
          provider_type?: string
          requests_per_day?: number | null
          requests_per_minute?: number | null
          spend_limit?: number | null
          split_rpm?: boolean
          token_balance?: number | null
          token_balance_set_at?: string | null
          token_balance_used_offset?: number
          updated_at?: string
          window_seconds?: number | null
          window_token_limit?: number | null
        }
        Relationships: []
      }
      provider_key_usage: {
        Row: {
          credit_tokens: number | null
          errors_count: number
          key_index: number
          label: string | null
          last_error: string | null
          last_status: number | null
          last_used_at: string | null
          requests_count: number
          rotation_disabled: boolean
          rotation_disabled_reason: string | null
          secret_name: string
          tokens_used: number
          updated_at: string
        }
        Insert: {
          credit_tokens?: number | null
          errors_count?: number
          key_index: number
          label?: string | null
          last_error?: string | null
          last_status?: number | null
          last_used_at?: string | null
          requests_count?: number
          rotation_disabled?: boolean
          rotation_disabled_reason?: string | null
          secret_name: string
          tokens_used?: number
          updated_at?: string
        }
        Update: {
          credit_tokens?: number | null
          errors_count?: number
          key_index?: number
          label?: string | null
          last_error?: string | null
          last_status?: number | null
          last_used_at?: string | null
          requests_count?: number
          rotation_disabled?: boolean
          rotation_disabled_reason?: string | null
          secret_name?: string
          tokens_used?: number
          updated_at?: string
        }
        Relationships: []
      }
      provider_model_cooldowns: {
        Row: {
          last_status: number | null
          model: string
          provider: string
          until: string
          updated_at: string
        }
        Insert: {
          last_status?: number | null
          model: string
          provider: string
          until: string
          updated_at?: string
        }
        Update: {
          last_status?: number | null
          model?: string
          provider?: string
          until?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_deliveries: {
        Row: {
          attempts: number
          device_id: string
          id: string
          incident_id: string
          last_status: number | null
          retry_at: string
          sent_at: string | null
        }
        Insert: {
          attempts?: number
          device_id: string
          id?: string
          incident_id: string
          last_status?: number | null
          retry_at?: string
          sent_at?: string | null
        }
        Update: {
          attempts?: number
          device_id?: string
          id?: string
          incident_id?: string
          last_status?: number | null
          retry_at?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_deliveries_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "push_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      push_devices: {
        Row: {
          created_at: string
          id: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_outage_state: {
        Row: {
          checked_at: string | null
          id: boolean
          incident_id: string | null
          started_at: string | null
        }
        Insert: {
          checked_at?: string | null
          id?: boolean
          incident_id?: string | null
          started_at?: string | null
        }
        Update: {
          checked_at?: string | null
          id?: boolean
          incident_id?: string | null
          started_at?: string | null
        }
        Relationships: []
      }
      request_logs: {
        Row: {
          api_key_id: string | null
          cache_discount_tokens: number
          cache_write_tokens: number
          cached_tokens: number
          client_id: string | null
          client_ip: string | null
          completion_tokens: number
          created_at: string
          error: string | null
          id: string
          latency_ms: number | null
          model: string | null
          prompt_tokens: number
          provider: string | null
          status_code: number
          stream: boolean
          total_tokens: number
        }
        Insert: {
          api_key_id?: string | null
          cache_discount_tokens?: number
          cache_write_tokens?: number
          cached_tokens?: number
          client_id?: string | null
          client_ip?: string | null
          completion_tokens?: number
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          prompt_tokens?: number
          provider?: string | null
          status_code: number
          stream?: boolean
          total_tokens?: number
        }
        Update: {
          api_key_id?: string | null
          cache_discount_tokens?: number
          cache_write_tokens?: number
          cached_tokens?: number
          client_id?: string | null
          client_ip?: string | null
          completion_tokens?: number
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          prompt_tokens?: number
          provider?: string | null
          status_code?: number
          stream?: boolean
          total_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_api_access_logs: {
        Row: {
          allowed: boolean
          client_ip: string | null
          created_at: string
          id: string
          reseller_id: string
        }
        Insert: {
          allowed: boolean
          client_ip?: string | null
          created_at?: string
          id?: string
          reseller_id: string
        }
        Update: {
          allowed?: boolean
          client_ip?: string | null
          created_at?: string
          id?: string
          reseller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_api_access_logs_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_payouts: {
        Row: {
          amount_cents: number
          approved_at: string | null
          created_at: string
          id: string
          mp_payment_id: string | null
          reseller_id: string
          status: string
        }
        Insert: {
          amount_cents: number
          approved_at?: string | null
          created_at?: string
          id?: string
          mp_payment_id?: string | null
          reseller_id: string
          status?: string
        }
        Update: {
          amount_cents?: number
          approved_at?: string | null
          created_at?: string
          id?: string
          mp_payment_id?: string | null
          reseller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_payouts_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_plans: {
        Row: {
          active: boolean
          code: string
          created_at: string
          duration_days: number | null
          id: string
          kind: string
          name: string
          reseller_id: string
          rpm_limit: number
          token_limit: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          duration_days?: number | null
          id?: string
          kind?: string
          name: string
          reseller_id: string
          rpm_limit?: number
          token_limit?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          duration_days?: number | null
          id?: string
          kind?: string
          name?: string
          reseller_id?: string
          rpm_limit?: number
          token_limit?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_plans_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      resellers: {
        Row: {
          api_allowed_ips: string[]
          api_key: string | null
          api_key_hash: string | null
          cost_cents: number
          created_at: string
          custom_domain: string | null
          custom_domain_status: string
          debt_limit_cents: number
          delivery_template: string | null
          email: string
          id: string
          name: string
          settlement_installments: number | null
          settlement_total_cents: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_allowed_ips?: string[]
          api_key?: string | null
          api_key_hash?: string | null
          cost_cents?: number
          created_at?: string
          custom_domain?: string | null
          custom_domain_status?: string
          debt_limit_cents?: number
          delivery_template?: string | null
          email: string
          id?: string
          name: string
          settlement_installments?: number | null
          settlement_total_cents?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_allowed_ips?: string[]
          api_key?: string | null
          api_key_hash?: string | null
          cost_cents?: number
          created_at?: string
          custom_domain?: string | null
          custom_domain_status?: string
          debt_limit_cents?: number
          delivery_template?: string | null
          email?: string
          id?: string
          name?: string
          settlement_installments?: number | null
          settlement_total_cents?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rpm_exempt_clients: {
        Row: {
          client_id: string
          created_at: string
          reason: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          reason?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          reason?: string | null
        }
        Relationships: []
      }
      signup_domain_exemptions: {
        Row: {
          created_at: string
          domain: string
        }
        Insert: {
          created_at?: string
          domain: string
        }
        Update: {
          created_at?: string
          domain?: string
        }
        Relationships: []
      }
      site_notices: {
        Row: {
          enabled: boolean
          id: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_page_views: {
        Row: {
          country: string
          created_at: string
          device: string
          id: string
          path: string
        }
        Insert: {
          country?: string
          created_at?: string
          device: string
          id: string
          path: string
        }
        Update: {
          country?: string
          created_at?: string
          device?: string
          id?: string
          path?: string
        }
        Relationships: []
      }
      site_promotions: {
        Row: {
          badge: string
          button_label: string
          description: string
          enabled: boolean
          ends_at: string
          headline: string
          id: string
          plan_code: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          badge?: string
          button_label?: string
          description?: string
          enabled?: boolean
          ends_at?: string
          headline?: string
          id: string
          plan_code: string
          starts_at?: string
          updated_at?: string
        }
        Update: {
          badge?: string
          button_label?: string
          description?: string
          enabled?: boolean
          ends_at?: string
          headline?: string
          id?: string
          plan_code?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      status_checks: {
        Row: {
          checked_at: string
          db_ok: boolean
          gateway_ok: boolean
          id: number
          latency_ms: number | null
          note: string | null
          ok: boolean
        }
        Insert: {
          checked_at?: string
          db_ok?: boolean
          gateway_ok?: boolean
          id?: never
          latency_ms?: number | null
          note?: string | null
          ok: boolean
        }
        Update: {
          checked_at?: string
          db_ok?: boolean
          gateway_ok?: boolean
          id?: never
          latency_ms?: number | null
          note?: string | null
          ok?: boolean
        }
        Relationships: []
      }
      token_upgrades: {
        Row: {
          actor_id: string | null
          api_key_id: string
          created_at: string
          id: string
          payment_id: string | null
          tokens: number
        }
        Insert: {
          actor_id?: string | null
          api_key_id: string
          created_at?: string
          id: string
          payment_id?: string | null
          tokens: number
        }
        Update: {
          actor_id?: string | null
          api_key_id?: string
          created_at?: string
          id?: string
          payment_id?: string | null
          tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "token_upgrades_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_upgrades_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
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
      admin_add_key_tokens: {
        Args: { _key_id: string; _request_id: string; _tokens: number }
        Returns: number
      }
      admin_add_provider_balance: {
        Args: { _provider_id: string; _tokens: number }
        Returns: undefined
      }
      admin_cache_summary: {
        Args: never
        Returns: {
          cache_requests: number
          cache_write_tokens: number
          cached_tokens: number
          discount_tokens: number
          new_input_tokens: number
          period: string
          prompt_raw: number
          requests: number
        }[]
      }
      admin_client_key_ips: { Args: { _key_id: string }; Returns: Json }
      admin_client_usage_details: {
        Args: { _client_id: string; _key_id?: string }
        Returns: Json
      }
      admin_dashboard_summary: { Args: { _start: string }; Returns: Json }
      admin_error_causes: { Args: { _start: string }; Returns: Json }
      admin_keys_burst_usage: {
        Args: { _ids: string[] }
        Returns: {
          burst_limit: number
          key_id: string
          paused_until: string
          used: number
          window_started_at: string
        }[]
      }
      admin_keys_daily_usage: {
        Args: { _ids: string[] }
        Returns: {
          key_id: string
          used: number
        }[]
      }
      admin_metrics_period: {
        Args: { _end: string; _start: string }
        Returns: Json
      }
      admin_provider_balances: {
        Args: never
        Returns: {
          balance: number
          name: string
          provider_id: string
          set_at: string
          used: number
          used_24h: number
          window_limit: number
          window_reset_at: string
          window_seconds: number
          window_used: number
        }[]
      }
      admin_reseller_api_ips: { Args: { _reseller_id: string }; Returns: Json }
      admin_save_reseller_api_ips: {
        Args: { _ips: string[]; _reseller_id: string }
        Returns: undefined
      }
      admin_select_primary_provider: {
        Args: { _available_models: string[]; _provider_id: string }
        Returns: Json
      }
      admin_set_provider_balance: {
        Args: { _provider_id: string; _tokens: number }
        Returns: undefined
      }
      check_key_rpm: {
        Args: {
          _detect_factor?: number
          _key_id: string
          _release_minutes?: number
          _throttle_rpm?: number
        }
        Returns: {
          attempts: number
          blocked: boolean
          effective_rpm: number
          throttled: boolean
          until_at: string
        }[]
      }
      check_monthly_burst: {
        Args: { _key_id: string }
        Returns: {
          blocked: boolean
          paused_until: string
          token_limit: number
          used: number
        }[]
      }
      claim_admin: { Args: never; Returns: boolean }
      claim_push_deliveries: {
        Args: never
        Returns: {
          attempts: number
          delivery_id: string
          device_id: string
          incident_id: string
          token: string
        }[]
      }
      client_public_model_names: { Args: never; Returns: string[] }
      credit_key_tokens: {
        Args: {
          _actor_id?: string
          _key_id: string
          _payment_id?: string
          _request_id: string
          _tokens: number
        }
        Returns: number
      }
      evaluate_push_outage: { Args: never; Returns: undefined }
      fulfill_daily_reset: { Args: { _payment_id: string }; Returns: string }
      fulfill_token_upgrade: { Args: { _payment_id: string }; Returns: string }
      get_client_key_pricing_usage: {
        Args: { _daily?: boolean; _key_id: string }
        Returns: Json
      }
      get_client_recent_calls: { Args: never; Returns: Json }
      get_client_usage_summary: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_operational_failure: {
        Args: { _error: string; _provider: string; _status: number }
        Returns: boolean
      }
      key_hourly_burst_status: {
        Args: { _key_id: string }
        Returns: {
          burst_limit: number
          paused: boolean
          resets_at: string
          used: number
          window_started_at: string
        }[]
      }
      key_ip_count: { Args: { _key_id: string }; Returns: number }
      key_tokens_today: { Args: { _key_id: string }; Returns: number }
      monthly_plan_burst_limit: { Args: { _plano: string }; Returns: number }
      monthly_plan_ip_limit: { Args: { _plano: string }; Returns: number }
      provider_window_exhausted: {
        Args: never
        Returns: {
          name: string
          reset_at: string
        }[]
      }
      provider_window_start: {
        Args: { _now?: string; _seconds: number }
        Returns: string
      }
      provider_window_used: {
        Args: { _provider: string; _seconds: number }
        Returns: number
      }
      public_site_stats: { Args: never; Returns: Json }
      push_outage_threshold: {
        Args: { p_now: string; p_started: string }
        Returns: boolean
      }
      record_admin_entrance: { Args: { _entry_id: string }; Returns: undefined }
      record_key_usage: {
        Args: { _key_id: string; _tokens: number }
        Returns: undefined
      }
      record_provider_key_usage: {
        Args: {
          _error: string
          _idx: number
          _secret: string
          _status: number
          _tokens: number
        }
        Returns: undefined
      }
      register_push_device: { Args: { p_token: string }; Returns: string }
      reseller_update_key_display: {
        Args: { _active?: boolean; _key_id: string; _label?: string }
        Returns: undefined
      }
      save_token_promotion: {
        Args: { _plan: Json; _settings: Json }
        Returns: undefined
      }
      status_delivery_summary: { Args: never; Returns: Json }
      status_summary: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user" | "reseller"
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
      app_role: ["admin", "user", "reseller"],
    },
  },
} as const
