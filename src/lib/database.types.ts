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
      agent_availability_rules: {
        Row: {
          buffer_minutes: number
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          organization_id: string
          start_time: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          buffer_minutes?: number
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          organization_id: string
          start_time: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          buffer_minutes?: number
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          start_time?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_availability_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_availability_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      aggregated_leads: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          duplicate_of: string | null
          id: string
          interested_price: number | null
          lead_email: string
          lead_name: string
          lead_phone: string
          lead_score: number | null
          listing_id: string | null
          message: string | null
          organization_id: string
          quality_score: number | null
          requested_timeframe: string | null
          source: string
          status: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          duplicate_of?: string | null
          id?: string
          interested_price?: number | null
          lead_email: string
          lead_name: string
          lead_phone: string
          lead_score?: number | null
          listing_id?: string | null
          message?: string | null
          organization_id: string
          quality_score?: number | null
          requested_timeframe?: string | null
          source: string
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          duplicate_of?: string | null
          id?: string
          interested_price?: number | null
          lead_email?: string
          lead_name?: string
          lead_phone?: string
          lead_score?: number | null
          listing_id?: string | null
          message?: string | null
          organization_id?: string
          quality_score?: number | null
          requested_timeframe?: string | null
          source?: string
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aggregated_leads_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "aggregated_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aggregated_leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aggregated_leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_recommendations: {
        Row: {
          clicked: boolean | null
          confidence_score: number | null
          created_at: string | null
          id: string
          listing_id: string
          reason: string | null
          user_id: string | null
        }
        Insert: {
          clicked?: boolean | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          listing_id: string
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          clicked?: boolean | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          listing_id?: string
          reason?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_searches: {
        Row: {
          clicked_listing_id: string | null
          created_at: string | null
          id: string
          organization_id: string | null
          parsed_filters: Json | null
          query: string
          results_count: number | null
          user_id: string | null
        }
        Insert: {
          clicked_listing_id?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          parsed_filters?: Json | null
          query: string
          results_count?: number | null
          user_id?: string | null
        }
        Update: {
          clicked_listing_id?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          parsed_filters?: Json | null
          query?: string
          results_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_searches_clicked_listing_id_fkey"
            columns: ["clicked_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_searches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          result: Json | null
          status: string | null
          trigger_source_id: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          result?: Json | null
          status?: string | null
          trigger_source_id?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          result?: Json | null
          status?: string | null
          trigger_source_id?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: string
          run_type: string
          started_at: string
          status: string
          summary: Json | null
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          run_type: string
          started_at?: string
          status: string
          summary?: Json | null
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          run_type?: string
          started_at?: string
          status?: string
          summary?: Json | null
        }
        Relationships: []
      }
      automation_workflows: {
        Row: {
          actions: Json | null
          conditions: Json | null
          created_at: string | null
          description: string | null
          enabled: boolean | null
          execution_count: number | null
          id: string
          last_executed_at: string | null
          name: string
          organization_id: string
          trigger_type: string | null
          updated_at: string | null
          workflow_type: string | null
        }
        Insert: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          execution_count?: number | null
          id?: string
          last_executed_at?: string | null
          name: string
          organization_id: string
          trigger_type?: string | null
          updated_at?: string | null
          workflow_type?: string | null
        }
        Update: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          execution_count?: number | null
          id?: string
          last_executed_at?: string | null
          name?: string
          organization_id?: string
          trigger_type?: string | null
          updated_at?: string | null
          workflow_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_requests: {
        Row: {
          bedrooms: number | null
          budget_max: number | null
          budget_min: number | null
          buyer_label: string
          channel: string | null
          created_at: string
          id: string
          is_public: boolean
          listing_type: string
          location: string
          notes: string
          property_type: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          bedrooms?: number | null
          budget_max?: number | null
          budget_min?: number | null
          buyer_label: string
          channel?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          listing_type: string
          location: string
          notes: string
          property_type?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          bedrooms?: number | null
          budget_max?: number | null
          budget_min?: number | null
          buyer_label?: string
          channel?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          listing_type?: string
          location?: string
          notes?: string
          property_type?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_connections: {
        Row: {
          connection_metadata: Json | null
          created_at: string
          external_account_email: string | null
          external_calendar_id: string | null
          id: string
          last_synced_at: string | null
          organization_id: string
          provider: string
          status: string
          sync_error: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_metadata?: Json | null
          created_at?: string
          external_account_email?: string | null
          external_calendar_id?: string | null
          id?: string
          last_synced_at?: string | null
          organization_id: string
          provider: string
          status?: string
          sync_error?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_metadata?: Json | null
          created_at?: string
          external_account_email?: string | null
          external_calendar_id?: string | null
          id?: string
          last_synced_at?: string | null
          organization_id?: string
          provider?: string
          status?: string
          sync_error?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant_1_id: string
          participant_2_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1_id: string
          participant_2_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1_id?: string
          participant_2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_1_id_fkey"
            columns: ["participant_1_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_id_fkey"
            columns: ["participant_2_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_rates: {
        Row: {
          created_at: string | null
          from: string
          id: string
          rate: number
          timestamp: number
          to: string
        }
        Insert: {
          created_at?: string | null
          from: string
          id?: string
          rate: number
          timestamp: number
          to: string
        }
        Update: {
          created_at?: string | null
          from?: string
          id?: string
          rate?: number
          timestamp?: number
          to?: string
        }
        Relationships: []
      }
      deal_cases: {
        Row: {
          assigned_to: string | null
          case_type: string
          created_at: string | null
          follow_up_reminded_at: string | null
          id: string
          last_contacted_at: string | null
          last_stage_updated_at: string
          listing_id: string
          message: string | null
          next_follow_up_at: string | null
          organization_id: string
          pipeline_stage: string
          priority: string
          stale_nudged_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          case_type: string
          created_at?: string | null
          follow_up_reminded_at?: string | null
          id?: string
          last_contacted_at?: string | null
          last_stage_updated_at?: string
          listing_id: string
          message?: string | null
          next_follow_up_at?: string | null
          organization_id: string
          pipeline_stage?: string
          priority?: string
          stale_nudged_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          case_type?: string
          created_at?: string | null
          follow_up_reminded_at?: string | null
          id?: string
          last_contacted_at?: string | null
          last_stage_updated_at?: string
          listing_id?: string
          message?: string | null
          next_follow_up_at?: string | null
          organization_id?: string
          pipeline_stage?: string
          priority?: string
          stale_nudged_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_cases_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_cases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_activity_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          details: Json | null
          document_id: string
          id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          document_id: string
          id?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          document_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_activity_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_activity_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "organization_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_signatures: {
        Row: {
          created_at: string
          document_id: string
          id: string
          ip_address: string | null
          signature_type: string
          signature_value: string | null
          signed_at: string
          signer_email: string | null
          signer_name: string
          signer_role: string
          signer_user_id: string | null
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          ip_address?: string | null
          signature_type?: string
          signature_value?: string | null
          signed_at?: string
          signer_email?: string | null
          signer_name: string
          signer_role?: string
          signer_user_id?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          ip_address?: string | null
          signature_type?: string
          signature_value?: string | null
          signed_at?: string
          signer_email?: string | null
          signer_name?: string
          signer_role?: string
          signer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "organization_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_signatures_signer_user_id_fkey"
            columns: ["signer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      external_listings: {
        Row: {
          address: string | null
          agent_email: string | null
          agent_name: string | null
          agent_phone: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          external_id: string
          id: string
          images: string[] | null
          latitude: number | null
          linked_listing_id: string | null
          list_date: string | null
          longitude: number | null
          organization_id: string
          price: number | null
          property_type: string | null
          provider: string
          raw_data: Json | null
          sale_date: string | null
          square_feet: number | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          agent_email?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          external_id: string
          id?: string
          images?: string[] | null
          latitude?: number | null
          linked_listing_id?: string | null
          list_date?: string | null
          longitude?: number | null
          organization_id: string
          price?: number | null
          property_type?: string | null
          provider: string
          raw_data?: Json | null
          sale_date?: string | null
          square_feet?: number | null
          state?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          agent_email?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          external_id?: string
          id?: string
          images?: string[] | null
          latitude?: number | null
          linked_listing_id?: string | null
          list_date?: string | null
          longitude?: number | null
          organization_id?: string
          price?: number | null
          property_type?: string | null
          provider?: string
          raw_data?: Json | null
          sale_date?: string | null
          square_feet?: number | null
          state?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_listings_linked_listing_id_fkey"
            columns: ["linked_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_listings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      field_activity_logs: {
        Row: {
          created_at: string
          deal_case_id: string | null
          details: string | null
          id: string
          latitude: number | null
          longitude: number | null
          organization_id: string
          title: string
          user_id: string
          viewing_id: string | null
        }
        Insert: {
          created_at?: string
          deal_case_id?: string | null
          details?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          organization_id: string
          title: string
          user_id: string
          viewing_id?: string | null
        }
        Update: {
          created_at?: string
          deal_case_id?: string | null
          details?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          organization_id?: string
          title?: string
          user_id?: string
          viewing_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_activity_logs_deal_case_id_fkey"
            columns: ["deal_case_id"]
            isOneToOne: false
            referencedRelation: "deal_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_activity_logs_viewing_id_fkey"
            columns: ["viewing_id"]
            isOneToOne: false
            referencedRelation: "property_viewings"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string | null
          evidence: Json | null
          id: string
          lead_id: string | null
          listing_id: string | null
          organization_id: string
          resolved_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          status: string | null
          target_id: string | null
          target_type: string | null
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description?: string | null
          evidence?: Json | null
          id?: string
          lead_id?: string | null
          listing_id?: string | null
          organization_id: string
          resolved_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity: string
          status?: string | null
          target_id?: string | null
          target_type?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string | null
          evidence?: Json | null
          id?: string
          lead_id?: string | null
          listing_id?: string | null
          organization_id?: string
          resolved_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string | null
          target_id?: string | null
          target_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_alerts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "aggregated_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "external_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_case_events: {
        Row: {
          actor_user_id: string | null
          case_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          note: string | null
        }
        Insert: {
          actor_user_id?: string | null
          case_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          note?: string | null
        }
        Update: {
          actor_user_id?: string | null
          case_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_case_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "fraud_review_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_reports: {
        Row: {
          created_at: string | null
          description: string | null
          evidence: Json | null
          id: string
          reason: string | null
          reporter_id: string
          status: string | null
          target_id: string
          target_type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          evidence?: Json | null
          id?: string
          reason?: string | null
          reporter_id: string
          status?: string | null
          target_id: string
          target_type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          evidence?: Json | null
          id?: string
          reason?: string | null
          reporter_id?: string
          status?: string | null
          target_id?: string
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_review_cases: {
        Row: {
          alert_id: string | null
          assigned_to: string | null
          created_at: string
          id: string
          priority: string
          report_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          summary: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          alert_id?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          priority?: string
          report_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          summary: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          alert_id?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          priority?: string
          report_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          summary?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_review_cases_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "fraud_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_review_cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_review_cases_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "fraud_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      ghana_market_locations: {
        Row: {
          accessibility_score: number
          city: string
          demand_level: string
          flood_risk_level: string
          healthcare_proximity_score: number
          id: string
          investment_score: number
          neighborhood: string
          notes: string | null
          region: string
          safety_score: number
          school_proximity_score: number
          updated_at: string
          walkability_score: number
        }
        Insert: {
          accessibility_score: number
          city: string
          demand_level?: string
          flood_risk_level?: string
          healthcare_proximity_score: number
          id?: string
          investment_score: number
          neighborhood: string
          notes?: string | null
          region: string
          safety_score: number
          school_proximity_score: number
          updated_at?: string
          walkability_score: number
        }
        Update: {
          accessibility_score?: number
          city?: string
          demand_level?: string
          flood_risk_level?: string
          healthcare_proximity_score?: number
          id?: string
          investment_score?: number
          neighborhood?: string
          notes?: string | null
          region?: string
          safety_score?: number
          school_proximity_score?: number
          updated_at?: string
          walkability_score?: number
        }
        Relationships: []
      }
      heatmap_data: {
        Row: {
          city: string
          demand_level: string | null
          id: string
          latitude: number | null
          listing_count: number | null
          longitude: number | null
          price_level: string | null
          region: string
          supply_level: string | null
          updated_at: string | null
        }
        Insert: {
          city: string
          demand_level?: string | null
          id?: string
          latitude?: number | null
          listing_count?: number | null
          longitude?: number | null
          price_level?: string | null
          region: string
          supply_level?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string
          demand_level?: string | null
          id?: string
          latitude?: number | null
          listing_count?: number | null
          longitude?: number | null
          price_level?: string | null
          region?: string
          supply_level?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      image_hashes: {
        Row: {
          created_at: string | null
          file_hash: string | null
          id: string
          image_url: string
          listing_id: string
          perceptual_hash: string | null
        }
        Insert: {
          created_at?: string | null
          file_hash?: string | null
          id?: string
          image_url: string
          listing_id: string
          perceptual_hash?: string | null
        }
        Update: {
          created_at?: string | null
          file_hash?: string | null
          id?: string
          image_url?: string
          listing_id?: string
          perceptual_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "image_hashes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_sync_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          listings_failed: number | null
          listings_sync: number | null
          organization_id: string
          provider: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          listings_failed?: number | null
          listings_sync?: number | null
          organization_id: string
          provider: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          listings_failed?: number | null
          listings_sync?: number | null
          organization_id?: string
          provider?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_sync_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_verification_checks: {
        Row: {
          check_key: string
          checked_at: string
          created_at: string
          details: string | null
          evidence: Json
          id: string
          label: string
          listing_id: string
          organization_id: string
          score: number
          status: string
        }
        Insert: {
          check_key: string
          checked_at?: string
          created_at?: string
          details?: string | null
          evidence?: Json
          id?: string
          label: string
          listing_id: string
          organization_id: string
          score?: number
          status?: string
        }
        Update: {
          check_key?: string
          checked_at?: string
          created_at?: string
          details?: string | null
          evidence?: Json
          id?: string
          label?: string
          listing_id?: string
          organization_id?: string
          score?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_verification_checks_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_verification_checks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          created_at: string | null
          currency: string | null
          featured: boolean | null
          id: string
          inspection_fee_amount: number | null
          last_quality_checked_at: string | null
          listing_type: string
          minimum_deposit_amount: number | null
          organization_id: string
          price: number
          property_id: string
          published_at: string | null
          quality_breakdown: Json
          quality_score: number
          status: string | null
          updated_at: string | null
          verification_notes: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
          visibility: string | null
          whatsapp_enabled: boolean
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          featured?: boolean | null
          id?: string
          inspection_fee_amount?: number | null
          last_quality_checked_at?: string | null
          listing_type: string
          minimum_deposit_amount?: number | null
          organization_id: string
          price: number
          property_id: string
          published_at?: string | null
          quality_breakdown?: Json
          quality_score?: number
          status?: string | null
          updated_at?: string | null
          verification_notes?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          visibility?: string | null
          whatsapp_enabled?: boolean
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          featured?: boolean | null
          id?: string
          inspection_fee_amount?: number | null
          last_quality_checked_at?: string | null
          listing_type?: string
          minimum_deposit_amount?: number | null
          organization_id?: string
          price?: number
          property_id?: string
          published_at?: string | null
          quality_breakdown?: Json
          quality_score?: number
          status?: string | null
          updated_at?: string | null
          verification_notes?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          visibility?: string | null
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "listings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      location_scores: {
        Row: {
          accessibility_score: number | null
          city: string
          healthcare_proximity_score: number | null
          id: string
          investment_score: number | null
          latitude: number | null
          longitude: number | null
          overall_score: number | null
          region: string
          safety_score: number | null
          school_proximity_score: number | null
          updated_at: string | null
          walkability_score: number | null
        }
        Insert: {
          accessibility_score?: number | null
          city: string
          healthcare_proximity_score?: number | null
          id?: string
          investment_score?: number | null
          latitude?: number | null
          longitude?: number | null
          overall_score?: number | null
          region: string
          safety_score?: number | null
          school_proximity_score?: number | null
          updated_at?: string | null
          walkability_score?: number | null
        }
        Update: {
          accessibility_score?: number | null
          city?: string
          healthcare_proximity_score?: number | null
          id?: string
          investment_score?: number | null
          latitude?: number | null
          longitude?: number | null
          overall_score?: number | null
          region?: string
          safety_score?: number | null
          school_proximity_score?: number | null
          updated_at?: string | null
          walkability_score?: number | null
        }
        Relationships: []
      }
      location_trends: {
        Row: {
          accessibility_score: number | null
          city: string
          demand_level: string | null
          growth_rate: number | null
          id: string
          investment_score: number | null
          region: string
          safety_score: number | null
          trending_up: boolean | null
          updated_at: string | null
        }
        Insert: {
          accessibility_score?: number | null
          city: string
          demand_level?: string | null
          growth_rate?: number | null
          id?: string
          investment_score?: number | null
          region: string
          safety_score?: number | null
          trending_up?: boolean | null
          updated_at?: string | null
        }
        Update: {
          accessibility_score?: number | null
          city?: string
          demand_level?: string | null
          growth_rate?: number | null
          id?: string
          investment_score?: number | null
          region?: string
          safety_score?: number | null
          trending_up?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      market_analytics: {
        Row: {
          avg_listing_days: number | null
          avg_price: number | null
          created_at: string | null
          id: string
          listing_type: string | null
          location: string | null
          median_price: number | null
          new_listings: number | null
          occupancy_rate: number | null
          period: string | null
          price_trend: number | null
          property_type: string | null
          sold_listings: number | null
          total_listings: number | null
        }
        Insert: {
          avg_listing_days?: number | null
          avg_price?: number | null
          created_at?: string | null
          id?: string
          listing_type?: string | null
          location?: string | null
          median_price?: number | null
          new_listings?: number | null
          occupancy_rate?: number | null
          period?: string | null
          price_trend?: number | null
          property_type?: string | null
          sold_listings?: number | null
          total_listings?: number | null
        }
        Update: {
          avg_listing_days?: number | null
          avg_price?: number | null
          created_at?: string | null
          id?: string
          listing_type?: string | null
          location?: string | null
          median_price?: number | null
          new_listings?: number | null
          occupancy_rate?: number | null
          period?: string | null
          price_trend?: number | null
          property_type?: string | null
          sold_listings?: number | null
          total_listings?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mls_credentials: {
        Row: {
          account_id: string | null
          api_key: string
          api_secret: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          organization_id: string
          provider: string
          sync_frequency: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          api_key: string
          api_secret?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          organization_id: string
          provider: string
          sync_frequency?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          api_key?: string
          api_secret?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          organization_id?: string
          provider?: string
          sync_frequency?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mls_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_devices: {
        Row: {
          app_version: string | null
          created_at: string | null
          device_id: string
          device_type: string | null
          id: string
          last_active_at: string | null
          os_version: string | null
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string | null
          device_id: string
          device_type?: string | null
          id?: string
          last_active_at?: string | null
          os_version?: string | null
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string | null
          device_id?: string
          device_type?: string | null
          id?: string
          last_active_at?: string | null
          os_version?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobile_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_app_releases: {
        Row: {
          created_at: string | null
          current_version: string | null
          force_update: boolean
          id: string
          latest_version: string
          minimum_version: string
          platform: string
          update_url: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_version?: string | null
          force_update?: boolean
          id?: string
          latest_version: string
          minimum_version: string
          platform: string
          update_url: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_version?: string | null
          force_update?: boolean
          id?: string
          latest_version?: string
          minimum_version?: string
          platform?: string
          update_url?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      nearby_services: {
        Row: {
          created_at: string | null
          distance_meters: number | null
          google_places_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          property_id: string
          service_name: string | null
          service_type: string | null
        }
        Insert: {
          created_at?: string | null
          distance_meters?: number | null
          google_places_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          property_id: string
          service_name?: string | null
          service_type?: string | null
        }
        Update: {
          created_at?: string | null
          distance_meters?: number | null
          google_places_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          property_id?: string
          service_name?: string | null
          service_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nearby_services_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          action_url: string | null
          actor_user_id: string | null
          channel: string | null
          content: string | null
          conversation_id: string | null
          created_at: string | null
          delivered: boolean | null
          delivered_at: string | null
          id: string
          metadata: Json | null
          notification_type: string | null
          read: boolean | null
          read_at: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          actor_user_id?: string | null
          channel?: string | null
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          delivered?: boolean | null
          delivered_at?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string | null
          read?: boolean | null
          read_at?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          actor_user_id?: string | null
          channel?: string | null
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          delivered?: boolean | null
          delivered_at?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string | null
          read?: boolean | null
          read_at?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          notification_frequency: string | null
          push_enabled: boolean | null
          quiet_hours_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean | null
          updated_at: string | null
          user_id: string
          whatsapp_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_frequency?: string | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          whatsapp_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_frequency?: string | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          whatsapp_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_branding: {
        Row: {
          accent_color: string | null
          banner_url: string | null
          created_at: string | null
          custom_css: string | null
          custom_domain: string | null
          email_from_address: string | null
          email_reply_to: string | null
          id: string
          logo_url: string | null
          organization_id: string
          primary_color: string | null
          privacy_url: string | null
          secondary_color: string | null
          terms_url: string | null
          theme_name: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          banner_url?: string | null
          created_at?: string | null
          custom_css?: string | null
          custom_domain?: string | null
          email_from_address?: string | null
          email_reply_to?: string | null
          id?: string
          logo_url?: string | null
          organization_id: string
          primary_color?: string | null
          privacy_url?: string | null
          secondary_color?: string | null
          terms_url?: string | null
          theme_name?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          banner_url?: string | null
          created_at?: string | null
          custom_css?: string | null
          custom_domain?: string | null
          email_from_address?: string | null
          email_reply_to?: string | null
          id?: string
          logo_url?: string | null
          organization_id?: string
          primary_color?: string | null
          privacy_url?: string | null
          secondary_color?: string | null
          terms_url?: string | null
          theme_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_branding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_conversations: {
        Row: {
          assigned_to: string | null
          conversation_id: string
          created_at: string
          created_by: string
          deal_case_id: string | null
          id: string
          lead_user_id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          conversation_id: string
          created_at?: string
          created_by: string
          deal_case_id?: string | null
          id?: string
          lead_user_id: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          conversation_id?: string
          created_at?: string
          created_by?: string
          deal_case_id?: string | null
          id?: string
          lead_user_id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_conversations_deal_case_id_fkey"
            columns: ["deal_case_id"]
            isOneToOne: false
            referencedRelation: "deal_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_conversations_lead_user_id_fkey"
            columns: ["lead_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_documents: {
        Row: {
          content_markdown: string | null
          created_at: string
          created_by: string | null
          current_version: boolean
          deal_case_id: string | null
          document_family_id: string
          document_sha256: string | null
          document_type: string
          external_signer_email: string | null
          external_signer_name: string | null
          id: string
          listing_id: string | null
          organization_id: string
          previous_version_id: string | null
          public_summary: string | null
          public_visibility: boolean
          signature_method: string | null
          signature_required: boolean
          signed_at: string | null
          signed_by_name: string | null
          signed_by_user_id: string | null
          signed_copy_bucket: string | null
          signed_copy_path: string | null
          status: string
          title: string
          transaction_id: string | null
          updated_at: string
          version_number: number
        }
        Insert: {
          content_markdown?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: boolean
          deal_case_id?: string | null
          document_family_id?: string
          document_sha256?: string | null
          document_type: string
          external_signer_email?: string | null
          external_signer_name?: string | null
          id?: string
          listing_id?: string | null
          organization_id: string
          previous_version_id?: string | null
          public_summary?: string | null
          public_visibility?: boolean
          signature_method?: string | null
          signature_required?: boolean
          signed_at?: string | null
          signed_by_name?: string | null
          signed_by_user_id?: string | null
          signed_copy_bucket?: string | null
          signed_copy_path?: string | null
          status?: string
          title: string
          transaction_id?: string | null
          updated_at?: string
          version_number?: number
        }
        Update: {
          content_markdown?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: boolean
          deal_case_id?: string | null
          document_family_id?: string
          document_sha256?: string | null
          document_type?: string
          external_signer_email?: string | null
          external_signer_name?: string | null
          id?: string
          listing_id?: string | null
          organization_id?: string
          previous_version_id?: string | null
          public_summary?: string | null
          public_visibility?: boolean
          signature_method?: string | null
          signature_required?: boolean
          signed_at?: string | null
          signed_by_name?: string | null
          signed_by_user_id?: string | null
          signed_copy_bucket?: string | null
          signed_copy_path?: string | null
          status?: string
          title?: string
          transaction_id?: string | null
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "organization_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_documents_deal_case_id_fkey"
            columns: ["deal_case_id"]
            isOneToOne: false
            referencedRelation: "deal_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_documents_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_documents_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "organization_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_documents_signed_by_user_id_fkey"
            columns: ["signed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_documents_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "property_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_insights: {
        Row: {
          active_listings: number | null
          avg_lead_quality: number | null
          best_performing_listing_id: string | null
          conversion_rate: number | null
          customer_satisfaction_score: number | null
          id: string
          organization_id: string
          response_time_hours: number | null
          total_listings: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          active_listings?: number | null
          avg_lead_quality?: number | null
          best_performing_listing_id?: string | null
          conversion_rate?: number | null
          customer_satisfaction_score?: number | null
          id?: string
          organization_id: string
          response_time_hours?: number | null
          total_listings?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          active_listings?: number | null
          avg_lead_quality?: number | null
          best_performing_listing_id?: string | null
          conversion_rate?: number | null
          customer_satisfaction_score?: number | null
          id?: string
          organization_id?: string
          response_time_hours?: number | null
          total_listings?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_insights_best_performing_listing_id_fkey"
            columns: ["best_performing_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_accepted_user_id_fkey"
            columns: ["accepted_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          joined_at: string | null
          organization_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          organization_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          organization_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          api_access_enabled: boolean | null
          auto_lead_assignment: boolean | null
          commission_rate: number | null
          email_notifications_enabled: boolean | null
          enabled_features: string[] | null
          id: string
          lead_assignment_strategy: string | null
          max_team_members: number | null
          organization_id: string
          payment_terms: string | null
          push_notifications_enabled: boolean | null
          sms_notifications_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          api_access_enabled?: boolean | null
          auto_lead_assignment?: boolean | null
          commission_rate?: number | null
          email_notifications_enabled?: boolean | null
          enabled_features?: string[] | null
          id?: string
          lead_assignment_strategy?: string | null
          max_team_members?: number | null
          organization_id: string
          payment_terms?: string | null
          push_notifications_enabled?: boolean | null
          sms_notifications_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          api_access_enabled?: boolean | null
          auto_lead_assignment?: boolean | null
          commission_rate?: number | null
          email_notifications_enabled?: boolean | null
          enabled_features?: string[] | null
          id?: string
          lead_assignment_strategy?: string | null
          max_team_members?: number | null
          organization_id?: string
          payment_terms?: string | null
          push_notifications_enabled?: boolean | null
          sms_notifications_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          banner_url: string | null
          created_at: string | null
          description: string | null
          email: string | null
          ghana_business_registration_number: string | null
          ghana_tax_identification_number: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          slug: string
          suspended: boolean | null
          updated_at: string | null
          verification_status: string
          verification_submitted_at: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
          website: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          ghana_business_registration_number?: string | null
          ghana_tax_identification_number?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          slug: string
          suspended?: boolean | null
          updated_at?: string | null
          verification_status?: string
          verification_submitted_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          ghana_business_registration_number?: string | null
          ghana_tax_identification_number?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          slug?: string
          suspended?: boolean | null
          updated_at?: string | null
          verification_status?: string
          verification_submitted_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          currency: string | null
          external_transaction_id: string | null
          id: string
          payment_method: string | null
          payment_provider: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          external_transaction_id?: string | null
          id?: string
          payment_method?: string | null
          payment_provider?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          external_transaction_id?: string | null
          id?: string
          payment_method?: string | null
          payment_provider?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          address_verified: boolean
          address_verified_at: string | null
          amenities: string[] | null
          bathrooms: number | null
          bedrooms: number | null
          category: string
          city: string
          country: string | null
          created_at: string | null
          description: string | null
          flood_risk_level: string
          ghana_post_gps: string | null
          id: string
          latitude: number | null
          locality_notes: string | null
          location_confidence: number
          longitude: number | null
          neighborhood: string | null
          organization_id: string | null
          region: string
          square_meters: number | null
          updated_at: string | null
        }
        Insert: {
          address: string
          address_verified?: boolean
          address_verified_at?: string | null
          amenities?: string[] | null
          bathrooms?: number | null
          bedrooms?: number | null
          category: string
          city: string
          country?: string | null
          created_at?: string | null
          description?: string | null
          flood_risk_level?: string
          ghana_post_gps?: string | null
          id?: string
          latitude?: number | null
          locality_notes?: string | null
          location_confidence?: number
          longitude?: number | null
          neighborhood?: string | null
          organization_id?: string | null
          region: string
          square_meters?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          address_verified?: boolean
          address_verified_at?: string | null
          amenities?: string[] | null
          bathrooms?: number | null
          bedrooms?: number | null
          category?: string
          city?: string
          country?: string | null
          created_at?: string | null
          description?: string | null
          flood_risk_level?: string
          ghana_post_gps?: string | null
          id?: string
          latitude?: number | null
          locality_notes?: string | null
          location_confidence?: number
          longitude?: number | null
          neighborhood?: string | null
          organization_id?: string | null
          region?: string
          square_meters?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_media: {
        Row: {
          alt_text: string | null
          created_at: string
          created_by: string
          id: string
          is_primary: boolean
          organization_id: string
          property_id: string
          public_url: string
          sort_order: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_primary?: boolean
          organization_id: string
          property_id: string
          public_url: string
          sort_order?: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_primary?: boolean
          organization_id?: string
          property_id?: string
          public_url?: string
          sort_order?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_media_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_media_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_media_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_refunds: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          customer_note: string | null
          expected_at: string | null
          failed_at: string | null
          id: string
          merchant_note: string | null
          metadata: Json
          organization_id: string
          paystack_response: Json
          processed_at: string | null
          processor: string | null
          property_id: string
          provider: string
          provider_refund_id: string | null
          provider_refund_reference: string | null
          refund_reason: string
          refund_type: string
          requested_by_user_id: string | null
          status: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency?: string
          customer_note?: string | null
          expected_at?: string | null
          failed_at?: string | null
          id?: string
          merchant_note?: string | null
          metadata?: Json
          organization_id: string
          paystack_response?: Json
          processed_at?: string | null
          processor?: string | null
          property_id: string
          provider?: string
          provider_refund_id?: string | null
          provider_refund_reference?: string | null
          refund_reason: string
          refund_type: string
          requested_by_user_id?: string | null
          status?: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          customer_note?: string | null
          expected_at?: string | null
          failed_at?: string | null
          id?: string
          merchant_note?: string | null
          metadata?: Json
          organization_id?: string
          paystack_response?: Json
          processed_at?: string | null
          processor?: string | null
          property_id?: string
          provider?: string
          provider_refund_id?: string | null
          provider_refund_reference?: string | null
          refund_reason?: string
          refund_type?: string
          requested_by_user_id?: string | null
          status?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_refunds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_refunds_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_refunds_requested_by_user_id_fkey"
            columns: ["requested_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_refunds_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "property_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      property_transactions: {
        Row: {
          access_code: string | null
          amount_minor: number
          authorization_url: string | null
          created_at: string
          currency: string
          deal_case_id: string | null
          gateway_response: string | null
          id: string
          listing_id: string
          metadata: Json
          organization_id: string
          paid_at: string | null
          payer_user_id: string
          payment_channel: string | null
          property_id: string
          provider: string
          provider_reference: string
          provider_transaction_id: string | null
          purpose: string
          refund_status: string | null
          refunded_amount_minor: number
          status: string
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          amount_minor: number
          authorization_url?: string | null
          created_at?: string
          currency?: string
          deal_case_id?: string | null
          gateway_response?: string | null
          id?: string
          listing_id: string
          metadata?: Json
          organization_id: string
          paid_at?: string | null
          payer_user_id: string
          payment_channel?: string | null
          property_id: string
          provider?: string
          provider_reference: string
          provider_transaction_id?: string | null
          purpose?: string
          refund_status?: string | null
          refunded_amount_minor?: number
          status?: string
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          amount_minor?: number
          authorization_url?: string | null
          created_at?: string
          currency?: string
          deal_case_id?: string | null
          gateway_response?: string | null
          id?: string
          listing_id?: string
          metadata?: Json
          organization_id?: string
          paid_at?: string | null
          payer_user_id?: string
          payment_channel?: string | null
          property_id?: string
          provider?: string
          provider_reference?: string
          provider_transaction_id?: string | null
          purpose?: string
          refund_status?: string | null
          refunded_amount_minor?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_transactions_deal_case_id_fkey"
            columns: ["deal_case_id"]
            isOneToOne: false
            referencedRelation: "deal_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_transactions_payer_user_id_fkey"
            columns: ["payer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_viewings: {
        Row: {
          assigned_to: string | null
          calendar_sync_status: string
          confirmed_datetime: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          deal_case_id: string | null
          duration_minutes: number
          external_calendar_event_id: string | null
          external_calendar_provider: string | null
          id: string
          internal_note: string | null
          listing_id: string
          organization_id: string
          outcome_note: string | null
          property_id: string
          reminder_sent_at: string | null
          requested_datetime: string
          requester_note: string | null
          reschedule_requested_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          calendar_sync_status?: string
          confirmed_datetime?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deal_case_id?: string | null
          duration_minutes?: number
          external_calendar_event_id?: string | null
          external_calendar_provider?: string | null
          id?: string
          internal_note?: string | null
          listing_id: string
          organization_id: string
          outcome_note?: string | null
          property_id: string
          reminder_sent_at?: string | null
          requested_datetime: string
          requester_note?: string | null
          reschedule_requested_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          calendar_sync_status?: string
          confirmed_datetime?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deal_case_id?: string | null
          duration_minutes?: number
          external_calendar_event_id?: string | null
          external_calendar_provider?: string | null
          id?: string
          internal_note?: string | null
          listing_id?: string
          organization_id?: string
          outcome_note?: string | null
          property_id?: string
          reminder_sent_at?: string | null
          requested_datetime?: string
          requester_note?: string | null
          reschedule_requested_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_viewings_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_viewings_deal_case_id_fkey"
            columns: ["deal_case_id"]
            isOneToOne: false
            referencedRelation: "deal_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_viewings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_viewings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_viewings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_viewings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          active: boolean | null
          created_at: string | null
          device_id: string
          id: string
          subscription_endpoint: string | null
          subscription_key: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          device_id: string
          id?: string
          subscription_endpoint?: string | null
          subscription_key?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          device_id?: string
          id?: string
          subscription_endpoint?: string | null
          subscription_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "mobile_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_logs: {
        Row: {
          algorithm_version: string | null
          clicked_listing_id: string | null
          created_at: string | null
          id: string
          interacted: boolean | null
          recommended_listings: Json | null
          user_id: string
        }
        Insert: {
          algorithm_version?: string | null
          clicked_listing_id?: string | null
          created_at?: string | null
          id?: string
          interacted?: boolean | null
          recommended_listings?: Json | null
          user_id: string
        }
        Update: {
          algorithm_version?: string | null
          clicked_listing_id?: string | null
          created_at?: string | null
          id?: string
          interacted?: boolean | null
          recommended_listings?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_logs_clicked_listing_id_fkey"
            columns: ["clicked_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_properties: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_properties_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_properties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_search_alerts: {
        Row: {
          bathrooms: number | null
          bedrooms: number | null
          created_at: string
          frequency: string
          id: string
          is_active: boolean
          last_checked_at: string | null
          last_match_count: number
          last_notified_at: string | null
          listing_type: string
          location_query: string | null
          price_max: number | null
          price_min: number | null
          property_type: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          last_match_count?: number
          last_notified_at?: string | null
          listing_type?: string
          location_query?: string | null
          price_max?: number | null
          price_min?: number | null
          property_type?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          last_match_count?: number
          last_notified_at?: string | null
          listing_type?: string
          location_query?: string | null
          price_max?: number | null
          price_min?: number | null
          property_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_search_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          alerts: boolean
          created_at: string
          filters: Json | null
          id: string
          name: string
          organization_id: string | null
          query: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alerts?: boolean
          created_at?: string
          filters?: Json | null
          id?: string
          name: string
          organization_id?: string | null
          query?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alerts?: boolean
          created_at?: string
          filters?: Json | null
          id?: string
          name?: string
          organization_id?: string | null
          query?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_receipts: {
        Row: {
          created_at: string
          id: string
          integrity_public_key_id: string | null
          integrity_signature: string | null
          integrity_status: string
          receipt_number: string
          receipt_payload: Json
          receipt_sha256: string
          storage_bucket: string
          storage_path: string
          transaction_id: string
          updated_at: string
          verification_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          integrity_public_key_id?: string | null
          integrity_signature?: string | null
          integrity_status?: string
          receipt_number: string
          receipt_payload: Json
          receipt_sha256: string
          storage_bucket?: string
          storage_path: string
          transaction_id: string
          updated_at?: string
          verification_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          integrity_public_key_id?: string | null
          integrity_signature?: string | null
          integrity_status?: string
          receipt_number?: string
          receipt_payload?: Json
          receipt_sha256?: string
          storage_bucket?: string
          storage_path?: string
          transaction_id?: string
          updated_at?: string
          verification_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_receipts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "property_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          deal_case_id: string | null
          id: string
          organization_id: string | null
          reference: string | null
          status: string | null
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          deal_case_id?: string | null
          id?: string
          organization_id?: string | null
          reference?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          deal_case_id?: string | null
          id?: string
          organization_id?: string | null
          reference?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_deal_case_id_fkey"
            columns: ["deal_case_id"]
            isOneToOne: false
            referencedRelation: "deal_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_verification_requests: {
        Row: {
          created_at: string
          document_id: string | null
          evidence: Json
          id: string
          internal_notes: string | null
          listing_id: string | null
          organization_id: string
          public_summary: string | null
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          evidence?: Json
          id?: string
          internal_notes?: string | null
          listing_id?: string | null
          organization_id: string
          public_summary?: string | null
          request_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          evidence?: Json
          id?: string
          internal_notes?: string | null
          listing_id?: string | null
          organization_id?: string
          public_summary?: string | null
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_verification_requests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "organization_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_verification_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_verification_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_verification_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_verification_requests_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_payment_methods: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          method_details: Json | null
          payment_provider: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          method_details?: Json | null
          payment_provider?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          method_details?: Json | null
          payment_provider?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          id: string
          notification_frequency: string | null
          preferred_areas: string[] | null
          preferred_bedroom_count: number | null
          preferred_price_max: number | null
          preferred_price_min: number | null
          preferred_property_types: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          notification_frequency?: string | null
          preferred_areas?: string[] | null
          preferred_bedroom_count?: number | null
          preferred_price_max?: number | null
          preferred_price_min?: number | null
          preferred_property_types?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          notification_frequency?: string | null
          preferred_areas?: string[] | null
          preferred_bedroom_count?: number | null
          preferred_price_max?: number | null
          preferred_price_min?: number | null
          preferred_property_types?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          banned: boolean | null
          bio: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          phone_verified_at: string | null
          preferred_contact_channel: string
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          banned?: boolean | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          phone_verified_at?: string | null
          preferred_contact_channel?: string
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          banned?: boolean | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          phone_verified_at?: string | null
          preferred_contact_channel?: string
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      vendor_assignments: {
        Row: {
          completed_date: string | null
          cost: number | null
          created_at: string | null
          description: string | null
          id: string
          organization_id: string
          property_id: string
          requested_date: string | null
          service_type: string
          status: string | null
          vendor_id: string
        }
        Insert: {
          completed_date?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          organization_id: string
          property_id: string
          requested_date?: string | null
          service_type: string
          status?: string | null
          vendor_id: string
        }
        Update: {
          completed_date?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          property_id?: string
          requested_date?: string | null
          service_type?: string
          status?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_assignments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_assignments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_ratings: {
        Row: {
          assignment_id: string | null
          created_at: string | null
          id: string
          rater_id: string
          rating: number | null
          review_text: string | null
          vendor_id: string
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string | null
          id?: string
          rater_id: string
          rating?: number | null
          review_text?: string | null
          vendor_id: string
        }
        Update: {
          assignment_id?: string | null
          created_at?: string | null
          id?: string
          rater_id?: string
          rating?: number | null
          review_text?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_ratings_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "vendor_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_ratings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_services: {
        Row: {
          base_price: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          estimated_duration_hours: number | null
          id: string
          service_name: string
          vendor_id: string
        }
        Insert: {
          base_price?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          estimated_duration_hours?: number | null
          id?: string
          service_name: string
          vendor_id: string
        }
        Update: {
          base_price?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          estimated_duration_hours?: number | null
          id?: string
          service_name?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_services_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          availability_status: string | null
          business_category: string | null
          business_name: string
          created_at: string | null
          email: string | null
          id: string
          phone: string | null
          rating_avg: number | null
          response_time_minutes: number | null
          service_areas: string[] | null
          total_jobs_completed: number | null
          updated_at: string | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          address?: string | null
          availability_status?: string | null
          business_category?: string | null
          business_name: string
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          rating_avg?: number | null
          response_time_minutes?: number | null
          service_areas?: string[] | null
          total_jobs_completed?: number | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          address?: string | null
          availability_status?: string | null
          business_category?: string | null
          business_name?: string
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          rating_avg?: number | null
          response_time_minutes?: number | null
          service_areas?: string[] | null
          total_jobs_completed?: number | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_hashes: {
        Row: {
          created_at: string | null
          document_id: string
          document_type: string
          hash_algorithm: string
          hash_value: string
          id: string
          metadata: Json
          organization_id: string
          updated_at: string | null
          uploaded_by: string | null
          verification_timestamp: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          document_type: string
          hash_algorithm?: string
          hash_value: string
          id?: string
          metadata?: Json
          organization_id: string
          updated_at?: string | null
          uploaded_by?: string | null
          verification_timestamp?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          document_type?: string
          hash_algorithm?: string
          hash_value?: string
          id?: string
          metadata?: Json
          organization_id?: string
          updated_at?: string | null
          uploaded_by?: string | null
          verification_timestamp?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_hashes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_hashes_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      viewing_reschedule_links: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          expires_at: string
          id: string
          token: string
          used_at: string | null
          viewing_id: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          viewing_id: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          viewing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewing_reschedule_links_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewing_reschedule_links_viewing_id_fkey"
            columns: ["viewing_id"]
            isOneToOne: true
            referencedRelation: "property_viewings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_organization_invitation: {
        Args: { invitation_id: string }
        Returns: {
          organization_id: string
          organization_slug: string
        }[]
      }
      get_lead_analytics_by_source: {
        Args: { org_id: string }
        Returns: {
          average_quality_score: number
          conversion_rate: number
          converted_leads: number
          source: string
          total_leads: number
        }[]
      }
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
