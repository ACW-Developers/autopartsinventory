-- Enable RLS on all tables with permissive policies for authenticated users
-- (Security will be handled at application level as per user request)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles policies - users can read all profiles, update own
CREATE POLICY "Users can read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "System can insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Suppliers policies - all authenticated users can CRUD
CREATE POLICY "Authenticated users can read suppliers" ON public.suppliers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert suppliers" ON public.suppliers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update suppliers" ON public.suppliers
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete suppliers" ON public.suppliers
  FOR DELETE TO authenticated USING (true);

-- Inventory policies - all authenticated users can CRUD
CREATE POLICY "Authenticated users can read inventory" ON public.inventory
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert inventory" ON public.inventory
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory" ON public.inventory
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete inventory" ON public.inventory
  FOR DELETE TO authenticated USING (true);

-- POS Sales policies - all authenticated users can read and create
CREATE POLICY "Authenticated users can read sales" ON public.pos_sales
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create sales" ON public.pos_sales
  FOR INSERT TO authenticated WITH CHECK (true);

-- User roles policies
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));