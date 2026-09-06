-- Email authentication followed by staff PIN unlock.
-- Run after 009_transit_product_groups.sql.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.wholesale_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  pin_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_pin_attempts INTEGER NOT NULL DEFAULT 0,
  pin_locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wholesale_operator_sessions (
  auth_session_id UUID PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.wholesale_staff(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public.wholesale_security_owner (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  claimed_at TIMESTAMPTZ
);

INSERT INTO public.wholesale_security_owner(id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.wholesale_staff(full_name, role, pin_hash)
SELECT 'Administrator', 'admin', crypt('7738', gen_salt('bf', 10))
WHERE NOT EXISTS (SELECT 1 FROM public.wholesale_staff WHERE role = 'admin');

ALTER TABLE public.wholesale_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_operator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_security_owner ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wholesale_staff, public.wholesale_operator_sessions, public.wholesale_security_owner FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.wholesale_auth_session_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT NULLIF(auth.jwt() ->> 'session_id', '')::UUID;
$$;

CREATE OR REPLACE FUNCTION public.current_wholesale_staff_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT session.staff_id
  FROM public.wholesale_operator_sessions session
  JOIN public.wholesale_staff staff ON staff.id = session.staff_id AND staff.is_active
  WHERE session.auth_session_id = public.wholesale_auth_session_id()
    AND session.auth_user_id = auth.uid()
    AND session.expires_at > NOW()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.wholesale_staff_json(p_staff_id UUID)
RETURNS JSONB
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', staff.id,
    'full_name', staff.full_name,
    'role', staff.role,
    'is_active', staff.is_active
  )
  FROM public.wholesale_staff staff
  WHERE staff.id = p_staff_id;
$$;

CREATE OR REPLACE FUNCTION public.get_wholesale_security_state()
RETURNS JSONB
LANGUAGE PLPGSQL SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE active_staff_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Email login required'; END IF;
  IF EXISTS (SELECT 1 FROM public.wholesale_security_owner WHERE id = TRUE AND auth_user_id IS NOT NULL AND auth_user_id <> auth.uid())
    THEN RAISE EXCEPTION 'This email is not authorized for this business'; END IF;
  active_staff_id := public.current_wholesale_staff_id();
  RETURN jsonb_build_object(
    'active_staff', CASE WHEN active_staff_id IS NULL THEN NULL ELSE public.wholesale_staff_json(active_staff_id) END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_wholesale_staff_for_unlock()
RETURNS TABLE(id UUID, full_name TEXT, role TEXT)
LANGUAGE PLPGSQL SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Email login required'; END IF;
  IF EXISTS (SELECT 1 FROM public.wholesale_security_owner WHERE id = TRUE AND auth_user_id IS NOT NULL AND auth_user_id <> auth.uid())
    THEN RAISE EXCEPTION 'This email is not authorized for this business'; END IF;
  RETURN QUERY
  SELECT staff.id, staff.full_name, staff.role
  FROM public.wholesale_staff staff
  WHERE staff.is_active
  ORDER BY CASE WHEN staff.role = 'admin' THEN 0 ELSE 1 END, staff.full_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.unlock_wholesale_staff(p_staff_id UUID, p_pin TEXT)
RETURNS JSONB
LANGUAGE PLPGSQL SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE staff_row public.wholesale_staff%ROWTYPE; session_id UUID; owner_user_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Email login required'; END IF;
  IF COALESCE(p_pin, '') !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'Enter a 4-digit PIN'; END IF;
  session_id := public.wholesale_auth_session_id();
  IF session_id IS NULL THEN RAISE EXCEPTION 'Could not identify this email session'; END IF;

  SELECT auth_user_id INTO owner_user_id FROM public.wholesale_security_owner WHERE id = TRUE FOR UPDATE;
  IF owner_user_id IS NOT NULL AND owner_user_id <> auth.uid()
    THEN RAISE EXCEPTION 'This email is not authorized for this business'; END IF;

  SELECT * INTO staff_row FROM public.wholesale_staff
  WHERE id = p_staff_id AND is_active FOR UPDATE;
  IF staff_row.id IS NULL THEN RAISE EXCEPTION 'Staff account is unavailable'; END IF;
  IF staff_row.pin_locked_until > NOW() THEN RAISE EXCEPTION 'Too many attempts. Try again shortly'; END IF;

  IF crypt(p_pin, staff_row.pin_hash) <> staff_row.pin_hash THEN
    UPDATE public.wholesale_staff
    SET failed_pin_attempts = failed_pin_attempts + 1,
        pin_locked_until = CASE WHEN failed_pin_attempts + 1 >= 5 THEN NOW() + INTERVAL '1 minute' ELSE NULL END,
        updated_at = NOW()
    WHERE id = staff_row.id;
    RAISE EXCEPTION 'Incorrect PIN';
  END IF;

  IF owner_user_id IS NULL THEN
    IF staff_row.role <> 'admin' THEN RAISE EXCEPTION 'Use the Administrator account for first-time setup'; END IF;
    UPDATE public.wholesale_security_owner SET auth_user_id = auth.uid(), claimed_at = NOW() WHERE id = TRUE;
  END IF;

  UPDATE public.wholesale_staff SET failed_pin_attempts = 0, pin_locked_until = NULL, updated_at = NOW()
  WHERE id = staff_row.id;
  INSERT INTO public.wholesale_operator_sessions(auth_session_id, auth_user_id, staff_id, expires_at)
  VALUES (session_id, auth.uid(), staff_row.id, NOW() + INTERVAL '12 hours')
  ON CONFLICT (auth_session_id) DO UPDATE
  SET staff_id = EXCLUDED.staff_id, unlocked_at = NOW(), expires_at = EXCLUDED.expires_at;
  RETURN public.wholesale_staff_json(staff_row.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.lock_wholesale_staff()
RETURNS VOID
LANGUAGE SQL SECURITY DEFINER
SET search_path = public, auth
AS $$
  DELETE FROM public.wholesale_operator_sessions
  WHERE auth_session_id = public.wholesale_auth_session_id() AND auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.admin_list_wholesale_staff()
RETURNS TABLE(id UUID, full_name TEXT, role TEXT, is_active BOOLEAN, has_pin BOOLEAN, created_at TIMESTAMPTZ)
LANGUAGE PLPGSQL SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.wholesale_staff
    WHERE id = public.current_wholesale_staff_id() AND role = 'admin' AND is_active
  ) THEN RAISE EXCEPTION 'Administrator PIN required'; END IF;
  RETURN QUERY SELECT staff.id, staff.full_name, staff.role, staff.is_active, TRUE, staff.created_at
  FROM public.wholesale_staff staff
  ORDER BY CASE WHEN staff.role = 'admin' THEN 0 ELSE 1 END, staff.full_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_wholesale_staff(
  p_staff_id UUID,
  p_full_name TEXT,
  p_role TEXT,
  p_pin TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE PLPGSQL SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE admin_id UUID; target public.wholesale_staff%ROWTYPE;
BEGIN
  admin_id := public.current_wholesale_staff_id();
  IF NOT EXISTS (SELECT 1 FROM public.wholesale_staff WHERE id = admin_id AND role = 'admin' AND is_active)
    THEN RAISE EXCEPTION 'Administrator PIN required'; END IF;
  IF NULLIF(TRIM(p_full_name), '') IS NULL THEN RAISE EXCEPTION 'Staff name is required'; END IF;
  IF p_role NOT IN ('admin', 'viewer') THEN RAISE EXCEPTION 'Invalid access level'; END IF;
  IF p_pin IS NOT NULL AND p_pin !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'PIN must contain exactly 4 numbers'; END IF;
  IF p_pin IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.wholesale_staff staff
    WHERE staff.id IS DISTINCT FROM p_staff_id AND staff.is_active
      AND crypt(p_pin, staff.pin_hash) = staff.pin_hash
  ) THEN RAISE EXCEPTION 'That PIN is already used by another active account'; END IF;

  IF p_staff_id IS NULL THEN
    IF p_pin IS NULL THEN RAISE EXCEPTION 'Set a PIN for the new account'; END IF;
    INSERT INTO public.wholesale_staff(full_name, role, pin_hash, is_active)
    VALUES (TRIM(p_full_name), p_role, crypt(p_pin, gen_salt('bf', 10)), p_is_active)
    RETURNING * INTO target;
  ELSE
    SELECT * INTO target FROM public.wholesale_staff WHERE id = p_staff_id FOR UPDATE;
    IF target.id IS NULL THEN RAISE EXCEPTION 'Staff account not found'; END IF;
    IF target.id = admin_id AND (p_role <> 'admin' OR NOT p_is_active)
      THEN RAISE EXCEPTION 'The active administrator cannot demote or deactivate their own account'; END IF;
    IF target.role = 'admin' AND (p_role <> 'admin' OR NOT p_is_active)
      AND (SELECT COUNT(*) FROM public.wholesale_staff WHERE role = 'admin' AND is_active AND id <> target.id) = 0
      THEN RAISE EXCEPTION 'The last active administrator cannot be removed'; END IF;
    UPDATE public.wholesale_staff
    SET full_name = TRIM(p_full_name), role = p_role, is_active = p_is_active,
        pin_hash = CASE WHEN p_pin IS NULL THEN pin_hash ELSE crypt(p_pin, gen_salt('bf', 10)) END,
        failed_pin_attempts = CASE WHEN p_pin IS NULL THEN failed_pin_attempts ELSE 0 END,
        pin_locked_until = CASE WHEN p_pin IS NULL THEN pin_locked_until ELSE NULL END,
        updated_at = NOW()
    WHERE id = target.id RETURNING * INTO target;
  END IF;
  RETURN public.wholesale_staff_json(target.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_wholesale_security_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_wholesale_staff_for_unlock() TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_wholesale_staff(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lock_wholesale_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_wholesale_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_wholesale_staff(UUID, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
