CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.agencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.agency_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, agency_id)
);

CREATE TABLE public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  booking_ref TEXT NOT NULL,
  client_name TEXT NOT NULL,
  activity TEXT NOT NULL,
  travel_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'pending', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (agency_id, booking_ref)
);

CREATE INDEX idx_agency_members_user_id ON public.agency_members(user_id);
CREATE INDEX idx_agency_members_agency_id ON public.agency_members(agency_id);
CREATE INDEX idx_bookings_agency_id ON public.bookings(agency_id);

CREATE OR REPLACE FUNCTION public.user_has_agency_access(agency_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE agency_id = agency_uuid AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.create_agency_for_user(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO public.agencies (name) VALUES (TRIM(p_name)) RETURNING id INTO new_id;
  INSERT INTO public.agency_members (user_id, agency_id, role)
  VALUES (auth.uid(), new_id, 'owner');
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_agency_for_user(p_agency_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE agency_id = p_agency_id
      AND user_id = auth.uid()
      AND role = 'owner'
  ) INTO is_owner;

  IF NOT is_owner THEN
    RAISE EXCEPTION 'Only the owner can delete this agency';
  END IF;

  DELETE FROM public.agencies WHERE id = p_agency_id;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO public.users (id, email, first_name, last_name, full_name, avatar_url)
    VALUES (
      NEW.id,
      NEW.email,
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), ''),
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'last_name', '')), ''),
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
      NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          full_name = EXCLUDED.full_name,
          avatar_url = EXCLUDED.avatar_url;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.users WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auth_user_to_public_users();

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auth_user_to_public_users();

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auth_user_to_public_users();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view agencies they belong to"
  ON public.agencies FOR SELECT
  USING (public.user_has_agency_access(id));

CREATE POLICY "Members can update agencies they belong to"
  ON public.agencies FOR UPDATE
  USING (public.user_has_agency_access(id));

ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memberships"
  ON public.agency_members FOR SELECT
  USING (user_id = auth.uid());

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view bookings"
  ON public.bookings FOR SELECT
  USING (public.user_has_agency_access(agency_id));

CREATE POLICY "Members can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (public.user_has_agency_access(agency_id));

CREATE POLICY "Members can update bookings"
  ON public.bookings FOR UPDATE
  USING (public.user_has_agency_access(agency_id));

CREATE POLICY "Members can delete bookings"
  ON public.bookings FOR DELETE
  USING (public.user_has_agency_access(agency_id));

GRANT EXECUTE ON FUNCTION public.create_agency_for_user(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_agency_for_user(UUID) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
