import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download } from 'lucide-react';

export default function Reports() {
  const [period, setPeriod] = useState('week');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [inventoryValue, setInventoryValue] = useState(0);

  useEffect(() => { fetchData(); }, [period]);

  const fetchData = async () => {
    const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: sales } = await supabase.from('pos_sales').select('total_price, created_at').gte('created_at', startDate.toISOString());
    const { data: inventory } = await supabase.from('inventory').select('quantity, cost_price');

    const grouped: Record<string, number> = {};
    sales?.forEach(s => {
      const date = new Date(s.created_at).toLocaleDateString();
      grouped[date] = (grouped[date] || 0) + Number(s.total_price);
    });

    setSalesData(Object.entries(grouped).map(([date, total]) => ({ date, total })));
    setInventoryValue(inventory?.reduce((sum, i) => sum + (i.quantity * Number(i.cost_price)), 0) || 0);
  };

  const exportCSV = () => {
    const csv = 'Date,Total\n' + salesData.map(d => `${d.date},${d.total}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales_report.csv';
    a.click();
  };

  const totalSales = salesData.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-3xl font-bold gradient-text">Reports</h1><p className="text-muted-foreground">Analytics and insights</p></div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="day">Today</SelectItem><SelectItem value="week">Week</SelectItem><SelectItem value="month">Month</SelectItem></SelectContent></Select>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="metric-card"><CardContent className="p-6"><p className="text-sm text-muted-foreground">Period Sales</p><p className="text-3xl font-display font-bold gradient-text">${totalSales.toFixed(2)}</p></CardContent></Card>
        <Card className="metric-card"><CardContent className="p-6"><p className="text-sm text-muted-foreground">Inventory Value</p><p className="text-3xl font-display font-bold gradient-text">${inventoryValue.toFixed(2)}</p></CardContent></Card>
      </div>

      <Card className="glass">
        <CardHeader><CardTitle className="font-display">Sales Trend</CardTitle></CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="date" className="text-xs" /><YAxis className="text-xs" /><Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} /><Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
