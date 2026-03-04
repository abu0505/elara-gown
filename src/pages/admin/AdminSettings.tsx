import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const AdminSettings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('store_settings').select('*').then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach(s => { map[s.key] = s.value || ""; });
      setSettings(map);
    });
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase.from('store_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      }
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm font-body">Store Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-body">Store Name</Label>
            <Input value={settings.store_name || ""} onChange={(e) => updateSetting('store_name', e.target.value)} placeholder="Elara" />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Tagline</Label>
            <Input value={settings.tagline || ""} onChange={(e) => updateSetting('tagline', e.target.value)} placeholder="Beautiful dresses for the modern woman" />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Contact Email</Label>
            <Input value={settings.contact_email || ""} onChange={(e) => updateSetting('contact_email', e.target.value)} placeholder="hello@elara.store" />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Contact Phone</Label>
            <Input value={settings.contact_phone || ""} onChange={(e) => updateSetting('contact_phone', e.target.value)} placeholder="+91 98765 43210" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-body">Delivery Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-body">Free Delivery Threshold (₹)</Label>
            <Input type="number" value={settings.free_delivery_threshold || ""} onChange={(e) => updateSetting('free_delivery_threshold', e.target.value)} placeholder="599" />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Standard Delivery Charge (₹)</Label>
            <Input type="number" value={settings.standard_delivery || ""} onChange={(e) => updateSetting('standard_delivery', e.target.value)} placeholder="49" />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Express Delivery Charge (₹)</Label>
            <Input type="number" value={settings.express_delivery || ""} onChange={(e) => updateSetting('express_delivery', e.target.value)} placeholder="99" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-body">Social Links</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-body">Instagram</Label>
            <Input value={settings.instagram || ""} onChange={(e) => updateSetting('instagram', e.target.value)} placeholder="https://instagram.com/elara" />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Facebook</Label>
            <Input value={settings.facebook || ""} onChange={(e) => updateSetting('facebook', e.target.value)} placeholder="https://facebook.com/elara" />
          </div>
          <div className="space-y-2">
            <Label className="font-body">YouTube</Label>
            <Input value={settings.youtube || ""} onChange={(e) => updateSetting('youtube', e.target.value)} placeholder="https://youtube.com/elara" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-body">Payment Gateway</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label className="font-body">Razorpay Key ID</Label>
            <Input disabled placeholder="Payment gateway will be configured in Phase 3" className="bg-muted" />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "Saving..." : "Save Settings"}</Button>
    </div>
  );
};

export default AdminSettings;
