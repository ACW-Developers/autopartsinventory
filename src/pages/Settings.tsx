import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Building, Phone, Mail, MapPin, Percent, DollarSign, Save } from 'lucide-react';
import { motion } from 'framer-motion';

interface SettingsData {
  business_name: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  tax_rate: string;
  currency: string;
  receipt_footer: string;
}

const defaultSettings: SettingsData = {
  business_name: '',
  business_address: '',
  business_phone: '',
  business_email: '',
  tax_rate: '0',
  currency: 'USD',
  receipt_footer: '',
};

export default function Settings() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*');
    if (data) {
      const settingsMap: Record<string, string> = {};
      data.forEach(s => { settingsMap[s.key] = s.value || ''; });
      setSettings({
        business_name: settingsMap.business_name || '',
        business_address: settingsMap.business_address || '',
        business_phone: settingsMap.business_phone || '',
        business_email: settingsMap.business_email || '',
        tax_rate: settingsMap.tax_rate || '0',
        currency: settingsMap.currency || 'USD',
        receipt_footer: settingsMap.receipt_footer || '',
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    
    for (const [key, value] of Object.entries(settings)) {
      const { data: existing } = await supabase.from('settings').select('id').eq('key', key).single();
      if (existing) {
        await supabase.from('settings').update({ value }).eq('key', key);
      } else {
        await supabase.from('settings').insert([{ key, value }]);
      }
    }

    toast({ title: 'Settings Saved', description: 'Your business settings have been updated.' });
    setLoading(false);
  };

  const settingFields = [
    { key: 'business_name', label: 'Business Name', icon: Building, placeholder: 'AutoParts Arizona' },
    { key: 'business_address', label: 'Address', icon: MapPin, placeholder: '123 Main St, Phoenix, AZ 85001' },
    { key: 'business_phone', label: 'Phone', icon: Phone, placeholder: '(602) 555-0123' },
    { key: 'business_email', label: 'Email', icon: Mail, placeholder: 'info@autopartsaz.com' },
    { key: 'tax_rate', label: 'Tax Rate (%)', icon: Percent, placeholder: '8.6' },
    { key: 'currency', label: 'Currency', icon: DollarSign, placeholder: 'USD' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold gradient-text">Settings</h1>
        <p className="text-muted-foreground">Configure your business settings</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass max-w-2xl">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {settingFields.map(field => (
              <div key={field.key} className="space-y-2">
                <Label className="flex items-center gap-2">
                  <field.icon className="h-4 w-4 text-muted-foreground" />
                  {field.label}
                </Label>
                <Input
                  placeholder={field.placeholder}
                  value={settings[field.key as keyof SettingsData]}
                  onChange={e => setSettings({ ...settings, [field.key]: e.target.value })}
                />
              </div>
            ))}

            <div className="space-y-2">
              <Label>Receipt Footer Message</Label>
              <Textarea
                placeholder="Thank you for your business!"
                value={settings.receipt_footer}
                onChange={e => setSettings({ ...settings, receipt_footer: e.target.value })}
                rows={3}
              />
            </div>

            <Button className="w-full glow" onClick={handleSave} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
