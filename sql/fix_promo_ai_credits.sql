-- Bug fix: redeem_promo_code's ai_credits reward block granted credits by
-- SUBTRACTING from ai_credits_used, floored at 0:
--   SET ai_credits_used = GREATEST(0, ai_credits_used - v_credits)
-- On a fresh/low-usage workspace (ai_credits_used < v_credits), the floor
-- silently ate the difference -- e.g. 1 used, 500-credit bonus ->
-- GREATEST(0, 1-500) = 0, losing 499 credits with no error, no log, no
-- trace. This is what happened to Bilal's two TEST500 redemptions.
--
-- Fix: grant ai_credits rewards into purchased_ai_credits (Phase 3,
-- sql/phase3_purchased_credits.sql -- never-expiring, additive, no floor
-- to hit) instead of subtracting from ai_credits_used. Every other reward
-- type, every validation check, and the redemption bookkeeping below are
-- copied verbatim from the current production function (provided by the
-- user directly, since this RPC's SQL was never committed to this repo --
-- see project memory) -- ONLY the ai_credits UPDATE statement changed,
-- plus one added RETURNING column (purchased_ai_credits) so the response
-- jsonb can report the new balance. temp_plan_access, discount,
-- INVALID/EXPIRED/CAP_REACHED/ALREADY_REDEEMED validation, the
-- current_redemptions increment, and the promo_code_redemptions insert
-- are all byte-for-byte identical to what was pasted.
--
-- BEFORE running this: this file does not know whether the current
-- function is SECURITY DEFINER or SECURITY INVOKER (that attribute
-- wasn't included in what was pasted, and CREATE OR REPLACE silently
-- resets it to the default -- INVOKER -- if omitted here). Check first:
--   \df+ public.redeem_promo_code
-- If it says "definer", add `security definer` back to the CREATE OR
-- REPLACE below before running it. If it says "invoker" (the default),
-- no change needed. This matters because the calling route
-- (app/api/promo/redeem/route.ts) already uses the service-role client,
-- which bypasses RLS regardless -- so in practice this only matters if
-- the RPC is ever called by a non-service-role client in the future.
--
-- Run this once via nano/psql on the self-hosted Supabase. Requires
-- sql/phase3_purchased_credits.sql to already be applied (purchased_ai_credits
-- column must exist).

create or replace function public.redeem_promo_code(
  p_code text,
  p_workspace_id uuid,
  p_user_id uuid
) returns jsonb
language plpgsql
as $$
DECLARE
  v_promo promo_codes%ROWTYPE;
  v_credits integer;
  v_plan text;
  v_duration_days integer;
  v_redemption_expires_at timestamptz;
  v_new_credits_used integer;
  v_new_plan text;
  v_new_purchased_credits integer;
BEGIN
  -- a. Look up + row-lock the code.
  SELECT *
  INTO v_promo
  FROM promo_codes
  WHERE upper(code) = upper(trim(p_code))
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID: Promo code not found.';
  END IF;
  -- b. Validate active / not expired / under the redemption cap.
  IF v_promo.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'INVALID: This promo code is no longer active.';
  END IF;
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at <= now() THEN
    RAISE EXCEPTION 'EXPIRED: This promo code has expired.';
  END IF;
  IF v_promo.current_redemptions >= v_promo.max_redemptions THEN
    RAISE EXCEPTION 'CAP_REACHED: This promo code has reached its redemption limit.';
  END IF;
  -- c. Explicit already-redeemed checks.
  IF EXISTS (
    SELECT 1 FROM promo_code_redemptions
    WHERE promo_code_id = v_promo.id AND workspace_id = p_workspace_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_REDEEMED: Your workspace has already redeemed this code.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM promo_code_redemptions
    WHERE promo_code_id = v_promo.id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_REDEEMED: You have already redeemed this code.';
  END IF;
  -- d. Apply the reward.
  IF v_promo.reward_type = 'ai_credits' THEN
    IF NOT (v_promo.reward_payload ? 'credits') THEN
      RAISE EXCEPTION 'INVALID: Promo code reward is misconfigured (missing credits).';
    END IF;
    v_credits := (v_promo.reward_payload->>'credits')::integer;
    -- FIX: was `ai_credits_used = GREATEST(0, ai_credits_used - v_credits)`,
    -- which floored at 0 and silently lost the excess on a low-usage
    -- workspace. purchased_ai_credits never expires and is purely
    -- additive -- no floor, so no credits can ever be lost this way again.
    UPDATE workspaces
    SET purchased_ai_credits = purchased_ai_credits + v_credits
    WHERE id = p_workspace_id
    RETURNING ai_credits_used, plan, purchased_ai_credits INTO v_new_credits_used, v_new_plan, v_new_purchased_credits;
    v_redemption_expires_at := NULL;
  ELSIF v_promo.reward_type = 'temp_plan_access' THEN
    IF NOT (v_promo.reward_payload ? 'plan') OR coalesce(v_promo.reward_payload->>'plan', '') = '' THEN
      RAISE EXCEPTION 'INVALID: Promo code reward is misconfigured (missing plan).';
    END IF;
    IF NOT (v_promo.reward_payload ? 'duration_days') THEN
      RAISE EXCEPTION 'INVALID: Promo code reward is misconfigured (missing duration_days).';
    END IF;
    v_plan := v_promo.reward_payload->>'plan';
    v_duration_days := (v_promo.reward_payload->>'duration_days')::integer;
    UPDATE workspaces
    SET plan = v_plan,
        ai_credits_used = 0
    WHERE id = p_workspace_id
    RETURNING ai_credits_used, plan, purchased_ai_credits INTO v_new_credits_used, v_new_plan, v_new_purchased_credits;
    v_redemption_expires_at := now() + make_interval(days => v_duration_days);
  ELSIF v_promo.reward_type = 'discount' THEN
    RAISE EXCEPTION 'UNSUPPORTED: Discount codes are not yet supported.';
  ELSE
    RAISE EXCEPTION 'INVALID: Unrecognized promo code reward type.';
  END IF;
  -- e. Increment redemption count.
  UPDATE promo_codes
  SET current_redemptions = current_redemptions + 1
  WHERE id = v_promo.id;
  -- f. Record the redemption.
  INSERT INTO promo_code_redemptions (promo_code_id, workspace_id, user_id, redeemed_at, expires_at)
  VALUES (v_promo.id, p_workspace_id, p_user_id, now(), v_redemption_expires_at);
  -- g. Return the updated workspace state + reward details.
  RETURN jsonb_build_object(
    'reward_type', v_promo.reward_type,
    'reward_payload', v_promo.reward_payload,
    'redemption_expires_at', v_redemption_expires_at,
    'workspace', jsonb_build_object(
      'plan', v_new_plan,
      'ai_credits_used', v_new_credits_used,
      'purchased_ai_credits', v_new_purchased_credits
    )
  );
END;
$$;
