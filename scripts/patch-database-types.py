from pathlib import Path

MISSING_TABLES = [
    "booking_reviews",
    "closing_checklist_items",
    "commissions",
    "deal_case_counter_offers",
    "escrow_holds",
    "host_listing_settings",
    "lease_rent_schedule",
    "leases",
    "listing_availability",
    "maintenance_requests",
    "mortgage_insurance_inquiries",
    "organization_payout_requests",
    "organization_wallet_ledger",
    "organization_wallets",
    "payout_schedules",
    "resident_home_profiles",
    "saved_payment_methods",
    "short_stay_bookings",
    "user_wallets",
    "wallet_ledger",
    "wallet_payout_requests",
]

TABLE_STUB = """      {name}: {{
        Row: {{
          id: string
          created_at: string | null
          updated_at: string | null
          [key: string]: Json | string | number | boolean | null
        }}
        Insert: {{
          id?: string
          created_at?: string | null
          updated_at?: string | null
          [key: string]: Json | string | number | boolean | null | undefined
        }}
        Update: {{
          id?: string
          created_at?: string | null
          updated_at?: string | null
          [key: string]: Json | string | number | boolean | null | undefined
        }}
        Relationships: []
      }}"""

MISSING_FUNCTIONS = """
      request_wallet_payout: {
        Args: {
          p_user_id: string
          p_amount_minor: number
          p_currency?: string
          p_payout_method?: string
          p_payout_destination: string
          p_notes?: string | null
        }
        Returns: Json
      }
      process_wallet_payout_request: {
        Args: {
          p_request_id: string
          p_action: string
          p_processor_note?: string | null
        }
        Returns: Json
      }
      request_organization_payout: {
        Args: {
          p_organization_id: string
          p_amount_minor: number
          p_currency?: string
          p_payout_method?: string
          p_payout_destination: string
          p_notes?: string | null
        }
        Returns: Json
      }
      process_organization_payout_request: {
        Args: {
          p_request_id: string
          p_action: string
          p_processor_note?: string | null
        }
        Returns: Json
      }
      release_escrow_hold: {
        Args: {
          p_escrow_id: string
          p_release_note?: string | null
        }
        Returns: Json
      }"""

path = Path("src/lib/database.types.ts")
text = path.read_text(encoding="utf-8")

if "user_wallets:" in text:
    print("wallet tables already present")
else:
    table_block = ",\n".join(TABLE_STUB.format(name=name) for name in MISSING_TABLES)

    marker = "        ]\n      }\n    }\n    Views: {"
    if marker not in text:
        raise SystemExit("insertion marker not found")
    text = text.replace(
        marker,
        "        ]\n      },\n" + ",\n".join(TABLE_STUB.format(name=name) for name in MISSING_TABLES) + "\n    }\n    Views: {",
        1,
    )
    print(f"inserted {len(MISSING_TABLES)} tables")

if "request_wallet_payout:" not in text:
    fn_marker = "      get_lead_analytics_by_source: {"
    if fn_marker not in text:
        raise SystemExit("functions marker not found")
    text = text.replace(fn_marker, f"{MISSING_FUNCTIONS.strip()}\n      {fn_marker}", 1)
    print("inserted rpc functions")

path.write_text(text, encoding="utf-8", newline="\n")
print("done")
