import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

interface AdminProfile {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
  role: 'main_admin' | 'sub_admin';
}

interface AdminStore {
  admin: AdminProfile | null;
  loading: boolean;
  setAdmin: (admin: AdminProfile | null) => void;
  setLoading: (loading: boolean) => void;
  fetchAdmin: () => Promise<AdminProfile | null>;
  logout: () => Promise<void>;
}

export const useAdminStore = create<AdminStore>((set) => ({
  admin: null,
  loading: true,
  setAdmin: (admin) => set({ admin }),
  setLoading: (loading) => set({ loading }),
  fetchAdmin: async () => {
    set({ loading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { set({ admin: null, loading: false }); return null; }

      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (!adminData || !adminData.is_active) {
        set({ admin: null, loading: false });
        return null;
      }

      const { data: roleData } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const profile: AdminProfile = {
        id: adminData.id,
        auth_user_id: adminData.auth_user_id,
        name: adminData.name,
        email: adminData.email,
        avatar_url: adminData.avatar_url,
        is_active: adminData.is_active ?? true,
        role: (roleData?.role as 'main_admin' | 'sub_admin') || 'sub_admin',
      };

      set({ admin: profile, loading: false });
      return profile;
    } catch {
      set({ admin: null, loading: false });
      return null;
    }
  },
  logout: async () => {
    await supabase.auth.signOut();
    set({ admin: null });
  },
}));
