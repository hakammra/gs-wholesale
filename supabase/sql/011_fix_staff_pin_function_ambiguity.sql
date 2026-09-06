-- Repair for installations that already ran 010_staff_pin_access.sql.

CREATE OR REPLACE FUNCTION public.list_wholesale_staff_for_unlock()
RETURNS TABLE(id UUID, full_name TEXT, role TEXT)
LANGUAGE PLPGSQL SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Email login required'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.wholesale_security_owner owner
    WHERE owner.id = TRUE
      AND owner.auth_user_id IS NOT NULL
      AND owner.auth_user_id <> auth.uid()
  ) THEN RAISE EXCEPTION 'This email is not authorized for this business'; END IF;

  RETURN QUERY
  SELECT staff.id, staff.full_name, staff.role
  FROM public.wholesale_staff staff
  WHERE staff.is_active
  ORDER BY CASE WHEN staff.role = 'admin' THEN 0 ELSE 1 END, staff.full_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_wholesale_staff()
RETURNS TABLE(id UUID, full_name TEXT, role TEXT, is_active BOOLEAN, has_pin BOOLEAN, created_at TIMESTAMPTZ)
LANGUAGE PLPGSQL SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.wholesale_staff staff
    WHERE staff.id = public.current_wholesale_staff_id()
      AND staff.role = 'admin'
      AND staff.is_active
  ) THEN RAISE EXCEPTION 'Administrator PIN required'; END IF;

  RETURN QUERY
  SELECT staff.id, staff.full_name, staff.role, staff.is_active, TRUE, staff.created_at
  FROM public.wholesale_staff staff
  ORDER BY CASE WHEN staff.role = 'admin' THEN 0 ELSE 1 END, staff.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_wholesale_staff_for_unlock() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_wholesale_staff() TO authenticated;
NOTIFY pgrst, 'reload schema';
