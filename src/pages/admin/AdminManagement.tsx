import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/stores/adminStore";

const AdminManagement = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState<any>(null);
  const [deleteAdmin, setDeleteAdmin] = useState<any>(null);
  const currentAdmin = useAdminStore((s) => s.admin);

  // Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAdmins(); }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    const { data } = await supabase.from('admins').select('*, admin_roles(role)');
    setAdmins(data || []);
    setLoading(false);
  };

  const resetForm = () => { setName(""); setEmail(""); setPassword(""); setFormActive(true); setEditAdmin(null); };

  const openCreate = () => { resetForm(); setSheetOpen(true); };

  const openEdit = (admin: any) => {
    setEditAdmin(admin); setName(admin.name); setEmail(admin.email);
    setFormActive(admin.is_active); setPassword(""); setSheetOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editAdmin) {
        const updates: any = { name, is_active: formActive };
        await supabase.from('admins').update(updates).eq('id', editAdmin.id);
        if (password) {
          await supabase.functions.invoke('create-admin-user', {
            body: { action: 'update_password', auth_user_id: editAdmin.auth_user_id, password },
          });
        }
        toast.success("Admin updated");
      } else {
        if (!email || !password || !name) { toast.error("All fields required"); setSaving(false); return; }
        const { data, error } = await supabase.functions.invoke('create-admin-user', {
          body: { name, email, password },
        });
        if (error) throw error;
        toast.success("Admin created! Share credentials securely.");
      }
      setSheetOpen(false); resetForm(); fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteAdmin) return;
    try {
      await supabase.functions.invoke('delete-admin-user', {
        body: { admin_id: deleteAdmin.id, auth_user_id: deleteAdmin.auth_user_id },
      });
      toast.success("Admin deleted");
      setDeleteAdmin(null); fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Admin</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-body text-xs">Name</TableHead>
                <TableHead className="font-body text-xs">Email</TableHead>
                <TableHead className="font-body text-xs">Role</TableHead>
                <TableHead className="font-body text-xs">Status</TableHead>
                <TableHead className="font-body text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground font-body">Loading...</TableCell></TableRow>
              ) : admins.map(a => {
                const role = (a.admin_roles as any)?.[0]?.role || 'sub_admin';
                const isSelf = a.id === currentAdmin?.id;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-body text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{a.name.charAt(0)}</div>
                        {a.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-body text-sm text-muted-foreground">{a.email}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px] capitalize">{role.replace('_', ' ')}</Badge></TableCell>
                    <TableCell><Badge variant={a.is_active ? "secondary" : "destructive"} className="text-[10px]">{a.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                        {!isSelf && <Button variant="ghost" size="icon" onClick={() => setDeleteAdmin(a)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader><SheetTitle className="font-body">{editAdmin ? "Edit Admin" : "Add Admin"}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label className="font-body">Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Admin Name" />
            </div>
            {!editAdmin && (
              <div className="space-y-2">
                <Label className="font-body">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@elara.store" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="font-body">{editAdmin ? "New Password (leave blank to keep)" : "Temporary Password"}</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-body">Active</Label>
              <Switch checked={formActive} onCheckedChange={setFormActive} />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editAdmin ? "Update" : "Create Admin"}</Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteAdmin} onOpenChange={() => setDeleteAdmin(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-body">Delete Admin?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground font-body">This will permanently deactivate {deleteAdmin?.name}'s admin access.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAdmin(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminManagement;
