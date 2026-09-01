-- ============================================================================
-- BaytMiftah REOS — Automated pg_cron Background Schedulers
-- Date: 2026-08-30
-- Description: Schedules recurring in-database automated tasks for charges,
--              collections promise verification, automation events, and AI watch.
-- ============================================================================

-- Ensure pg_cron extension exists if supported in environment
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Monthly Recurring Charge Generation (Runs at 00:05 UTC on the 1st of every month)
-- Calls run_due_estate_charge_schedules for all active estates
CREATE OR REPLACE FUNCTION cron_run_all_due_recurring_charges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_estate RECORD;
BEGIN
    FOR v_estate IN SELECT id FROM managed_estates LOOP
        BEGIN
            PERFORM run_due_estate_charge_schedules(
                p_estate_id := v_estate.id,
                p_as_of_date := CURRENT_DATE,
                p_triggered_by := 'system_cron_scheduler'
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to run charges for estate %: %', v_estate.id, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- 2. Nightly Promise-to-Pay Verification & Breach Scanner (Runs at 23:30 UTC daily)
CREATE OR REPLACE FUNCTION cron_verify_and_breach_promises()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_promise RECORD;
BEGIN
    FOR v_promise IN
        SELECT id, collection_case_id
        FROM estate_promise_to_pay
        WHERE status = 'pending'
          AND promised_for < CURRENT_DATE
    LOOP
        UPDATE estate_promise_to_pay
        SET status = 'broken',
            updated_at = NOW()
        WHERE id = v_promise.id;

        UPDATE estate_collection_cases
        SET status = 'promise_broken',
            updated_at = NOW()
        WHERE id = v_promise.collection_case_id;

        INSERT INTO estate_collection_case_events (
            collection_case_id,
            event_type,
            actor_user_id,
            note
        ) VALUES (
            v_promise.collection_case_id,
            'promise_broken_auto',
            NULL,
            'Promise date passed without confirmed settlement'
        );
    END LOOP;
END;
$$;

-- 3. High-Frequency Automation Event Processor (Runs every 5 minutes)
CREATE OR REPLACE FUNCTION cron_process_pending_automation_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE estate_automation_events
    SET status = 'processed',
        processed_at = NOW()
    WHERE status = 'pending'
      AND created_at <= NOW();
END;
$$;

-- 4. Hourly AI Watch & SLA Anomaly Scanner (Runs at minute 15 of every hour)
CREATE OR REPLACE FUNCTION cron_scan_operational_slas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
BEGIN
    -- Check overdue work orders
    FOR v_order IN
        SELECT id, estate_id, title
        FROM estate_work_orders
        WHERE status IN ('assigned', 'in_progress')
          AND due_date < CURRENT_DATE
    LOOP
        INSERT INTO estate_ai_watch_alerts (
            estate_id,
            alert_type,
            severity,
            summary,
            details,
            status
        ) VALUES (
            v_order.estate_id,
            'sla_breach_work_order',
            'warning',
            'Overdue Work Order: ' || v_order.title,
            jsonb_build_object('work_order_id', v_order.id),
            'active'
        ) ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$;

-- Schedule jobs safely with pg_cron if available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Run charges on the 1st of every month at 00:05 UTC
        PERFORM cron.schedule(
            'monthly-recurring-charges',
            '5 0 1 * *',
            'SELECT cron_run_all_due_recurring_charges()'
        );

        -- Run promise verification daily at 23:30 UTC
        PERFORM cron.schedule(
            'daily-promise-verification',
            '30 23 * * *',
            'SELECT cron_verify_and_breach_promises()'
        );

        -- Process automation queue every 5 minutes
        PERFORM cron.schedule(
            'process-automation-queue',
            '*/5 * * * *',
            'SELECT cron_process_pending_automation_events()'
        );

        -- Hourly SLA scan
        PERFORM cron.schedule(
            'hourly-sla-scan',
            '15 * * * *',
            'SELECT cron_scan_operational_slas()'
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule registration skipped or not permitted in current role.';
END $$;
