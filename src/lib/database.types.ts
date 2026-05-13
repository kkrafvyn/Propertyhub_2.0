export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          bio: string | null
          verified: boolean
          banned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          bio?: string | null
          verified?: boolean
          banned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          bio?: string | null
          verified?: boolean
          banned?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          banner_url: string | null
          website: string | null
          email: string | null
          phone: string | null
          owner_id: string
          verified: boolean
          suspended: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          banner_url?: string | null
          website?: string | null
          email?: string | null
          phone?: string | null
          owner_id: string
          verified?: boolean
          suspended?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          banner_url?: string | null
          website?: string | null
          email?: string | null
          phone?: string | null
          owner_id?: string
          verified?: boolean
          suspended?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'owner' | 'manager' | 'agent' | 'analyst'
          joined_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role: 'owner' | 'manager' | 'agent' | 'analyst'
          joined_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: 'owner' | 'manager' | 'agent' | 'analyst'
          joined_at?: string
        }
      }
      organization_conversations: {
        Row: {
          id: string
          organization_id: string
          conversation_id: string
          lead_user_id: string
          deal_case_id: string | null
          assigned_to: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          conversation_id: string
          lead_user_id: string
          deal_case_id?: string | null
          assigned_to?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          conversation_id?: string
          lead_user_id?: string
          deal_case_id?: string | null
          assigned_to?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      organization_invitations: {
        Row: {
          id: string
          organization_id: string
          email: string
          role: 'manager' | 'agent' | 'analyst'
          invited_by: string
          accepted_user_id: string | null
          status: 'pending' | 'accepted' | 'revoked' | 'expired'
          expires_at: string
          accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          role: 'manager' | 'agent' | 'analyst'
          invited_by: string
          accepted_user_id?: string | null
          status?: 'pending' | 'accepted' | 'revoked' | 'expired'
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          role?: 'manager' | 'agent' | 'analyst'
          invited_by?: string
          accepted_user_id?: string | null
          status?: 'pending' | 'accepted' | 'revoked' | 'expired'
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          organization_id: string | null
          address: string
          city: string
          region: string
          country: string
          latitude: number | null
          longitude: number | null
          category: 'apartment' | 'house' | 'office' | 'commercial' | 'land'
          bedrooms: number | null
          bathrooms: number | null
          square_meters: number | null
          description: string | null
          amenities: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          address: string
          city: string
          region: string
          country: string
          latitude?: number | null
          longitude?: number | null
          category: 'apartment' | 'house' | 'office' | 'commercial' | 'land'
          bedrooms?: number | null
          bathrooms?: number | null
          square_meters?: number | null
          description?: string | null
          amenities?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          address?: string
          city?: string
          region?: string
          country?: string
          latitude?: number | null
          longitude?: number | null
          category?: 'apartment' | 'house' | 'office' | 'commercial' | 'land'
          bedrooms?: number | null
          bathrooms?: number | null
          square_meters?: number | null
          description?: string | null
          amenities?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      property_media: {
        Row: {
          id: string
          property_id: string
          organization_id: string
          storage_path: string
          public_url: string
          alt_text: string | null
          sort_order: number
          is_primary: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          organization_id: string
          storage_path: string
          public_url: string
          alt_text?: string | null
          sort_order?: number
          is_primary?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          organization_id?: string
          storage_path?: string
          public_url?: string
          alt_text?: string | null
          sort_order?: number
          is_primary?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      listings: {
        Row: {
          id: string
          property_id: string
          organization_id: string
          listing_type: 'rental' | 'sale' | 'lease'
          price: number
          currency: string
          status: 'draft' | 'pending_review' | 'listed' | 'under_offer' | 'occupied' | 'sold' | 'leased' | 'archived' | 'suspended'
          visibility: 'public' | 'private' | 'hidden'
          featured: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          organization_id: string
          listing_type: 'rental' | 'sale' | 'lease'
          price: number
          currency?: string
          status?: 'draft' | 'pending_review' | 'listed' | 'under_offer' | 'occupied' | 'sold' | 'leased' | 'archived' | 'suspended'
          visibility?: 'public' | 'private' | 'hidden'
          featured?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          organization_id?: string
          listing_type?: 'rental' | 'sale' | 'lease'
          price?: number
          currency?: string
          status?: 'draft' | 'pending_review' | 'listed' | 'under_offer' | 'occupied' | 'sold' | 'leased' | 'archived' | 'suspended'
          visibility?: 'public' | 'private' | 'hidden'
          featured?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      deal_cases: {
        Row: {
          id: string
          listing_id: string
          user_id: string
          organization_id: string
          case_type: 'rental_application' | 'lease_application' | 'purchase_offer'
          status: 'pending' | 'approved' | 'rejected' | 'closed'
          message: string | null
          assigned_to: string | null
          pipeline_stage:
            | 'new_inquiry'
            | 'contacted'
            | 'qualified'
            | 'viewing_scheduled'
            | 'negotiation'
            | 'payment_pending'
            | 'won'
            | 'lost'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          next_follow_up_at: string | null
          last_contacted_at: string | null
          last_stage_updated_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          user_id: string
          organization_id: string
          case_type: 'rental_application' | 'lease_application' | 'purchase_offer'
          status?: 'pending' | 'approved' | 'rejected' | 'closed'
          message?: string | null
          assigned_to?: string | null
          pipeline_stage?:
            | 'new_inquiry'
            | 'contacted'
            | 'qualified'
            | 'viewing_scheduled'
            | 'negotiation'
            | 'payment_pending'
            | 'won'
            | 'lost'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          next_follow_up_at?: string | null
          last_contacted_at?: string | null
          last_stage_updated_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          user_id?: string
          organization_id?: string
          case_type?: 'rental_application' | 'lease_application' | 'purchase_offer'
          status?: 'pending' | 'approved' | 'rejected' | 'closed'
          message?: string | null
          assigned_to?: string | null
          pipeline_stage?:
            | 'new_inquiry'
            | 'contacted'
            | 'qualified'
            | 'viewing_scheduled'
            | 'negotiation'
            | 'payment_pending'
            | 'won'
            | 'lost'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          next_follow_up_at?: string | null
          last_contacted_at?: string | null
          last_stage_updated_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      property_viewings: {
        Row: {
          id: string
          listing_id: string
          property_id: string
          organization_id: string
          user_id: string
          deal_case_id: string | null
          assigned_to: string | null
          requested_datetime: string
          confirmed_datetime: string | null
          duration_minutes: number
          status: 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show'
          requester_note: string | null
          internal_note: string | null
          outcome_note: string | null
          contact_phone: string | null
          contact_email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          property_id: string
          organization_id: string
          user_id: string
          deal_case_id?: string | null
          assigned_to?: string | null
          requested_datetime: string
          confirmed_datetime?: string | null
          duration_minutes?: number
          status?: 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show'
          requester_note?: string | null
          internal_note?: string | null
          outcome_note?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          property_id?: string
          organization_id?: string
          user_id?: string
          deal_case_id?: string | null
          assigned_to?: string | null
          requested_datetime?: string
          confirmed_datetime?: string | null
          duration_minutes?: number
          status?: 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show'
          requester_note?: string | null
          internal_note?: string | null
          outcome_note?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      saved_search_alerts: {
        Row: {
          id: string
          user_id: string
          title: string
          location_query: string | null
          listing_type: 'rental' | 'sale' | 'lease'
          property_type: string | null
          price_min: number | null
          price_max: number | null
          bedrooms: number | null
          bathrooms: number | null
          frequency: 'immediate' | 'daily' | 'weekly'
          is_active: boolean
          last_checked_at: string | null
          last_match_count: number
          last_notified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          location_query?: string | null
          listing_type?: 'rental' | 'sale' | 'lease'
          property_type?: string | null
          price_min?: number | null
          price_max?: number | null
          bedrooms?: number | null
          bathrooms?: number | null
          frequency?: 'immediate' | 'daily' | 'weekly'
          is_active?: boolean
          last_checked_at?: string | null
          last_match_count?: number
          last_notified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          location_query?: string | null
          listing_type?: 'rental' | 'sale' | 'lease'
          property_type?: string | null
          price_min?: number | null
          price_max?: number | null
          bedrooms?: number | null
          bathrooms?: number | null
          frequency?: 'immediate' | 'daily' | 'weekly'
          is_active?: boolean
          last_checked_at?: string | null
          last_match_count?: number
          last_notified_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      mobile_devices: {
        Row: {
          id: string
          user_id: string
          device_id: string
          device_type: 'ios' | 'android' | null
          app_version: string | null
          os_version: string | null
          last_active_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          device_id: string
          device_type?: 'ios' | 'android' | null
          app_version?: string | null
          os_version?: string | null
          last_active_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          device_id?: string
          device_type?: 'ios' | 'android' | null
          app_version?: string | null
          os_version?: string | null
          last_active_at?: string | null
          created_at?: string
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          device_id: string
          subscription_endpoint: string | null
          subscription_key: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          device_id: string
          subscription_endpoint?: string | null
          subscription_key?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          subscription_endpoint?: string | null
          subscription_key?: string | null
          active?: boolean
          created_at?: string
        }
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          email_enabled: boolean
          sms_enabled: boolean
          push_enabled: boolean
          in_app_enabled: boolean
          whatsapp_enabled: boolean
          notification_frequency: 'immediate' | 'daily' | 'weekly' | 'never'
          quiet_hours_enabled: boolean
          quiet_hours_start: string | null
          quiet_hours_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_enabled?: boolean
          sms_enabled?: boolean
          push_enabled?: boolean
          in_app_enabled?: boolean
          whatsapp_enabled?: boolean
          notification_frequency?: 'immediate' | 'daily' | 'weekly' | 'never'
          quiet_hours_enabled?: boolean
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_enabled?: boolean
          sms_enabled?: boolean
          push_enabled?: boolean
          in_app_enabled?: boolean
          whatsapp_enabled?: boolean
          notification_frequency?: 'immediate' | 'daily' | 'weekly' | 'never'
          quiet_hours_enabled?: boolean
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notification_logs: {
        Row: {
          id: string
          user_id: string
          actor_user_id: string | null
          conversation_id: string | null
          notification_type: string | null
          channel: 'email' | 'sms' | 'push' | 'in_app' | 'whatsapp' | null
          subject: string | null
          content: string | null
          action_url: string | null
          metadata: Record<string, unknown> | null
          delivered: boolean
          delivered_at: string | null
          read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          actor_user_id?: string | null
          conversation_id?: string | null
          notification_type?: string | null
          channel?: 'email' | 'sms' | 'push' | 'in_app' | 'whatsapp' | null
          subject?: string | null
          content?: string | null
          action_url?: string | null
          metadata?: Record<string, unknown> | null
          delivered?: boolean
          delivered_at?: string | null
          read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          actor_user_id?: string | null
          conversation_id?: string | null
          notification_type?: string | null
          channel?: 'email' | 'sms' | 'push' | 'in_app' | 'whatsapp' | null
          subject?: string | null
          content?: string | null
          action_url?: string | null
          metadata?: Record<string, unknown> | null
          delivered?: boolean
          delivered_at?: string | null
          read?: boolean
          read_at?: string | null
          created_at?: string
        }
      }
      saved_properties: {
        Row: {
          id: string
          user_id: string
          listing_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          listing_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          listing_id?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          read?: boolean
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          participant_1_id: string
          participant_2_id: string
          last_message_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          participant_1_id: string
          participant_2_id: string
          last_message_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          participant_1_id?: string
          participant_2_id?: string
          last_message_at?: string | null
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string | null
          organization_id: string | null
          deal_case_id: string | null
          amount: number
          currency: string
          type: 'payment' | 'refund' | 'subscription'
          status: 'pending' | 'completed' | 'failed'
          reference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          organization_id?: string | null
          deal_case_id?: string | null
          amount: number
          currency?: string
          type: 'payment' | 'refund' | 'subscription'
          status?: 'pending' | 'completed' | 'failed'
          reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          organization_id?: string | null
          deal_case_id?: string | null
          amount?: number
          currency?: string
          type?: 'payment' | 'refund' | 'subscription'
          status?: 'pending' | 'completed' | 'failed'
          reference?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      property_transactions: {
        Row: {
          id: string
          listing_id: string
          property_id: string
          organization_id: string
          deal_case_id: string | null
          payer_user_id: string
          provider: 'paystack'
          provider_reference: string
          provider_transaction_id: string | null
          amount_minor: number
          currency: string
          purpose:
            | 'deposit'
            | 'rent'
            | 'lease_fee'
            | 'inspection_fee'
            | 'booking_fee'
            | 'purchase_installment'
            | 'other'
          status:
            | 'initialized'
            | 'pending'
            | 'processing'
            | 'success'
            | 'failed'
            | 'abandoned'
            | 'reversal_pending'
            | 'reversed'
          refund_status:
            | 'pending'
            | 'processing'
            | 'needs_attention'
            | 'failed'
            | 'processed'
            | null
          refunded_amount_minor: number
          payment_channel: string | null
          authorization_url: string | null
          access_code: string | null
          paid_at: string | null
          gateway_response: string | null
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          property_id: string
          organization_id: string
          deal_case_id?: string | null
          payer_user_id: string
          provider?: 'paystack'
          provider_reference: string
          provider_transaction_id?: string | null
          amount_minor: number
          currency?: string
          purpose?:
            | 'deposit'
            | 'rent'
            | 'lease_fee'
            | 'inspection_fee'
            | 'booking_fee'
            | 'purchase_installment'
            | 'other'
          status?:
            | 'initialized'
            | 'pending'
            | 'processing'
            | 'success'
            | 'failed'
            | 'abandoned'
            | 'reversal_pending'
            | 'reversed'
          refund_status?:
            | 'pending'
            | 'processing'
            | 'needs_attention'
            | 'failed'
            | 'processed'
            | null
          refunded_amount_minor?: number
          payment_channel?: string | null
          authorization_url?: string | null
          access_code?: string | null
          paid_at?: string | null
          gateway_response?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          property_id?: string
          organization_id?: string
          deal_case_id?: string | null
          payer_user_id?: string
          provider?: 'paystack'
          provider_reference?: string
          provider_transaction_id?: string | null
          amount_minor?: number
          currency?: string
          purpose?:
            | 'deposit'
            | 'rent'
            | 'lease_fee'
            | 'inspection_fee'
            | 'booking_fee'
            | 'purchase_installment'
            | 'other'
          status?:
            | 'initialized'
            | 'pending'
            | 'processing'
            | 'success'
            | 'failed'
            | 'abandoned'
            | 'reversal_pending'
            | 'reversed'
          refund_status?:
            | 'pending'
            | 'processing'
            | 'needs_attention'
            | 'failed'
            | 'processed'
            | null
          refunded_amount_minor?: number
          payment_channel?: string | null
          authorization_url?: string | null
          access_code?: string | null
          paid_at?: string | null
          gateway_response?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
      }
      property_refunds: {
        Row: {
          id: string
          transaction_id: string
          organization_id: string
          property_id: string
          requested_by_user_id: string | null
          provider: 'paystack'
          provider_refund_id: string | null
          provider_refund_reference: string | null
          amount_minor: number
          currency: string
          refund_type: 'partial' | 'full'
          status:
            | 'pending'
            | 'processing'
            | 'needs_attention'
            | 'failed'
            | 'processed'
          refund_reason: string
          customer_note: string | null
          merchant_note: string | null
          processor: string | null
          expected_at: string | null
          processed_at: string | null
          failed_at: string | null
          paystack_response: Record<string, unknown>
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          organization_id: string
          property_id: string
          requested_by_user_id?: string | null
          provider?: 'paystack'
          provider_refund_id?: string | null
          provider_refund_reference?: string | null
          amount_minor: number
          currency?: string
          refund_type: 'partial' | 'full'
          status?:
            | 'pending'
            | 'processing'
            | 'needs_attention'
            | 'failed'
            | 'processed'
          refund_reason: string
          customer_note?: string | null
          merchant_note?: string | null
          processor?: string | null
          expected_at?: string | null
          processed_at?: string | null
          failed_at?: string | null
          paystack_response?: Record<string, unknown>
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          organization_id?: string
          property_id?: string
          requested_by_user_id?: string | null
          provider?: 'paystack'
          provider_refund_id?: string | null
          provider_refund_reference?: string | null
          amount_minor?: number
          currency?: string
          refund_type?: 'partial' | 'full'
          status?:
            | 'pending'
            | 'processing'
            | 'needs_attention'
            | 'failed'
            | 'processed'
          refund_reason?: string
          customer_note?: string | null
          merchant_note?: string | null
          processor?: string | null
          expected_at?: string | null
          processed_at?: string | null
          failed_at?: string | null
          paystack_response?: Record<string, unknown>
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
      }
      transaction_receipts: {
        Row: {
          id: string
          transaction_id: string
          receipt_number: string
          storage_bucket: string
          storage_path: string
          receipt_sha256: string
          receipt_payload: Record<string, unknown>
          blockchain_record_id: string | null
          blockchain_status: 'pending' | 'submitted' | 'confirmed' | 'failed'
          blockchain_network: string
          blockchain_txid: string | null
          verification_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          receipt_number: string
          storage_bucket?: string
          storage_path: string
          receipt_sha256: string
          receipt_payload: Record<string, unknown>
          blockchain_record_id?: string | null
          blockchain_status?: 'pending' | 'submitted' | 'confirmed' | 'failed'
          blockchain_network?: string
          blockchain_txid?: string | null
          verification_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          receipt_number?: string
          storage_bucket?: string
          storage_path?: string
          receipt_sha256?: string
          receipt_payload?: Record<string, unknown>
          blockchain_record_id?: string | null
          blockchain_status?: 'pending' | 'submitted' | 'confirmed' | 'failed'
          blockchain_network?: string
          blockchain_txid?: string | null
          verification_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      blockchain_records: {
        Row: {
          id: string
          organization_id: string
          property_id: string
          transaction_hash: string
          chain_id: number
          block_number: number | null
          timestamp: number | null
          verified_at: string | null
          record_type:
            | 'ownership'
            | 'document'
            | 'escrow'
            | 'title_deed'
            | 'lease_agreement'
            | 'payment_receipt'
          data_hash: string
          contract_address: string | null
          status: 'pending' | 'confirmed' | 'finalized' | 'failed'
          confirmation_count: number | null
          gas_used: number | null
          transaction_cost: number | null
          metadata: Record<string, unknown> | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          property_id: string
          transaction_hash: string
          chain_id?: number
          block_number?: number | null
          timestamp?: number | null
          verified_at?: string | null
          record_type:
            | 'ownership'
            | 'document'
            | 'escrow'
            | 'title_deed'
            | 'lease_agreement'
            | 'payment_receipt'
          data_hash: string
          contract_address?: string | null
          status?: 'pending' | 'confirmed' | 'finalized' | 'failed'
          confirmation_count?: number | null
          gas_used?: number | null
          transaction_cost?: number | null
          metadata?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          property_id?: string
          transaction_hash?: string
          chain_id?: number
          block_number?: number | null
          timestamp?: number | null
          verified_at?: string | null
          record_type?:
            | 'ownership'
            | 'document'
            | 'escrow'
            | 'title_deed'
            | 'lease_agreement'
            | 'payment_receipt'
          data_hash?: string
          contract_address?: string | null
          status?: 'pending' | 'confirmed' | 'finalized' | 'failed'
          confirmation_count?: number | null
          gas_used?: number | null
          transaction_cost?: number | null
          metadata?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      verification_hashes: {
        Row: {
          id: string
          organization_id: string
          document_id: string
          document_type:
            | 'title_deed'
            | 'lease_agreement'
            | 'inspection_report'
            | 'utility_bill'
            | 'id_verification'
            | 'payment_receipt'
          hash_algorithm: string
          hash_value: string
          blockchain_record_id: string | null
          verified: boolean | null
          verification_timestamp: string | null
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          document_id: string
          document_type:
            | 'title_deed'
            | 'lease_agreement'
            | 'inspection_report'
            | 'utility_bill'
            | 'id_verification'
            | 'payment_receipt'
          hash_algorithm?: string
          hash_value: string
          blockchain_record_id?: string | null
          verified?: boolean | null
          verification_timestamp?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          document_id?: string
          document_type?:
            | 'title_deed'
            | 'lease_agreement'
            | 'inspection_report'
            | 'utility_bill'
            | 'id_verification'
            | 'payment_receipt'
          hash_algorithm?: string
          hash_value?: string
          blockchain_record_id?: string | null
          verified?: boolean | null
          verification_timestamp?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      smart_contract_events: {
        Row: {
          id: string
          organization_id: string
          contract_address: string
          contract_type: 'escrow' | 'ownership' | 'lease' | 'franchise'
          event_name: string
          event_signature: string
          transaction_hash: string
          block_number: number | null
          log_index: number | null
          indexed_params: Record<string, unknown> | null
          decoded_params: Record<string, unknown> | null
          event_timestamp: number | null
          status: 'pending' | 'confirmed' | 'failed' | null
          confirmation_count: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          contract_address: string
          contract_type: 'escrow' | 'ownership' | 'lease' | 'franchise'
          event_name: string
          event_signature: string
          transaction_hash: string
          block_number?: number | null
          log_index?: number | null
          indexed_params?: Record<string, unknown> | null
          decoded_params?: Record<string, unknown> | null
          event_timestamp?: number | null
          status?: 'pending' | 'confirmed' | 'failed' | null
          confirmation_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          contract_address?: string
          contract_type?: 'escrow' | 'ownership' | 'lease' | 'franchise'
          event_name?: string
          event_signature?: string
          transaction_hash?: string
          block_number?: number | null
          log_index?: number | null
          indexed_params?: Record<string, unknown> | null
          decoded_params?: Record<string, unknown> | null
          event_timestamp?: number | null
          status?: 'pending' | 'confirmed' | 'failed' | null
          confirmation_count?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      ownership_events: {
        Row: {
          id: string
          organization_id: string
          property_id: string
          from_address: string
          to_address: string
          ownership_percentage: number
          event_type: 'transfer' | 'mint' | 'burn' | 'approve' | 'dispute'
          transaction_hash: string | null
          block_number: number | null
          timestamp: number | null
          verified: boolean | null
          verification_date: string | null
          metadata: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          property_id: string
          from_address: string
          to_address: string
          ownership_percentage: number
          event_type: 'transfer' | 'mint' | 'burn' | 'approve' | 'dispute'
          transaction_hash?: string | null
          block_number?: number | null
          timestamp?: number | null
          verified?: boolean | null
          verification_date?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          property_id?: string
          from_address?: string
          to_address?: string
          ownership_percentage?: number
          event_type?: 'transfer' | 'mint' | 'burn' | 'approve' | 'dispute'
          transaction_hash?: string | null
          block_number?: number | null
          timestamp?: number | null
          verified?: boolean | null
          verification_date?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
      }
      tokenized_assets: {
        Row: {
          id: string
          organization_id: string
          property_id: string
          token_contract_address: string
          token_symbol: string
          token_name: string
          total_supply: number
          decimals: number | null
          chain_id: number | null
          mint_transaction_hash: string | null
          minted_at: string | null
          status: 'pending' | 'minted' | 'active' | 'paused' | 'burned' | null
          metadata_uri: string | null
          dividend_enabled: boolean | null
          transferable: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          property_id: string
          token_contract_address: string
          token_symbol: string
          token_name: string
          total_supply: number
          decimals?: number | null
          chain_id?: number | null
          mint_transaction_hash?: string | null
          minted_at?: string | null
          status?: 'pending' | 'minted' | 'active' | 'paused' | 'burned' | null
          metadata_uri?: string | null
          dividend_enabled?: boolean | null
          transferable?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          property_id?: string
          token_contract_address?: string
          token_symbol?: string
          token_name?: string
          total_supply?: number
          decimals?: number | null
          chain_id?: number | null
          mint_transaction_hash?: string | null
          minted_at?: string | null
          status?: 'pending' | 'minted' | 'active' | 'paused' | 'burned' | null
          metadata_uri?: string | null
          dividend_enabled?: boolean | null
          transferable?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      blockchain_wallets: {
        Row: {
          id: string
          user_id: string | null
          organization_id: string | null
          wallet_address: string
          chain_id: number | null
          wallet_type: 'metamask' | 'ledger' | 'hardware' | 'custodial'
          verified: boolean | null
          verification_signature: string | null
          is_primary: boolean | null
          balance: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          organization_id?: string | null
          wallet_address: string
          chain_id?: number | null
          wallet_type: 'metamask' | 'ledger' | 'hardware' | 'custodial'
          verified?: boolean | null
          verification_signature?: string | null
          is_primary?: boolean | null
          balance?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          organization_id?: string | null
          wallet_address?: string
          chain_id?: number | null
          wallet_type?: 'metamask' | 'ledger' | 'hardware' | 'custodial'
          verified?: boolean | null
          verification_signature?: string | null
          is_primary?: boolean | null
          balance?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      blockchain_verification_logs: {
        Row: {
          id: string
          organization_id: string
          blockchain_record_id: string | null
          verification_type: 'document_hash' | 'ownership' | 'transaction' | 'contract_state'
          status: 'pending' | 'verified' | 'failed'
          verification_details: Record<string, unknown> | null
          verified_by: string | null
          verified_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          blockchain_record_id?: string | null
          verification_type: 'document_hash' | 'ownership' | 'transaction' | 'contract_state'
          status: 'pending' | 'verified' | 'failed'
          verification_details?: Record<string, unknown> | null
          verified_by?: string | null
          verified_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          blockchain_record_id?: string | null
          verification_type?: 'document_hash' | 'ownership' | 'transaction' | 'contract_state'
          status?: 'pending' | 'verified' | 'failed'
          verification_details?: Record<string, unknown> | null
          verified_by?: string | null
          verified_at?: string | null
          error_message?: string | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          admin_id: string
          action: string
          target_type: string
          target_id: string
          details: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          target_type: string
          target_id: string
          details?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action?: string
          target_type?: string
          target_id?: string
          details?: Record<string, unknown> | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_organization_invitation: {
        Args: {
          invitation_id: string
        }
        Returns: {
          organization_id: string
          organization_slug: string
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
