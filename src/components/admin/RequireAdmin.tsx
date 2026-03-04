import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminStore } from "@/stores/adminStore";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { admin, loading, fetchAdmin } = useAdminStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!admin && !loading) {
      fetchAdmin().then((a) => {
        if (!a) navigate("/admin/login", { replace: true });
      });
    }
  }, [admin, loading, fetchAdmin, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!admin) return null;
  return <>{children}</>;
}

export function RequireMainAdmin({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAdminStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!admin || admin.role !== 'main_admin')) {
      navigate("/admin", { replace: true });
    }
  }, [admin, loading, navigate]);

  if (loading || !admin || admin.role !== 'main_admin') return null;
  return <>{children}</>;
}
