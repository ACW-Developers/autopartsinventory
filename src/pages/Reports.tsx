import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, FileText } from 'lucide-react';
import { generateSalesReportPDF, generateInventoryReportPDF } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';

export default function Reports() {
  const [period, setPeriod] = useState('week');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [inventoryValue, setInventoryValue] = useState(0);
  const [businessName, setBusinessName] = useState('AutoParts AZ');
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, [period]);

  const fetchData = async () => {
    const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: sales } = await supabase.from('pos_sales').select('total_price, created_at').gte('created_at', startDate.toISOString());
    const { data: inventory } = await supabase.from('inventory').select('quantity, cost_price');
    const { data: businessSetting } = await supabase.from('settings').select('value').eq('key', 'business_name').single();

    if (businessSetting?.value) setBusinessName(businessSetting.value);

    const grouped: Record<string, { total: number; count: number }> = {};
    sales?.forEach(s => {
      const date = new Date(s.created_at).toLocaleDateString();
      if (!grouped[date]) grouped[date] = { total: 0, count: 0 };
      grouped[date].total += Number(s.total_price);
      grouped[date].count += 1;
    });

    setSalesData(Object.entries(grouped).map(([date, data]) => ({ date, total: data.total, transactions: data.count })));
    setInventoryValue(inventory?.reduce((sum, i) => sum + (i.quantity * Number(i.cost_price)), 0) || 0);
  };

  const exportCSV = () => {
    const csv = 'Date,Total,Transactions\n' + salesData.map(d => `${d.date},${d.total},${d.transactions}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sales_report.csv'; a.click();
  };

  const exportSalesPDF = () => {
    const totalRevenue = salesData.reduce((sum, d) => sum + d.total, 0);
    const totalTransactions = salesData.reduce((sum, d) => sum + d.transactions, 0);
    const pdf = generateSalesReportPDF({
      period: period === 'day' ? 'Today' : period === 'week' ? 'Last 7 Days' : 'Last 30 Days',
      businessName, generatedAt: new Date().toLocaleString(), salesData,
      topProducts: [], totalRevenue, totalTransactions, averageOrderValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0
    });
    pdf.save(`sales-report-${period}.pdf`);
    toast({ title: 'PDF Downloaded' });
  };

  const exportInventoryPDF = async () => {
    const { data: items } = await supabase.from('inventory').select('*, categories(name)').order('part_name');
    const pdf = generateInventoryReportPDF({
      businessName, generatedAt: new Date().toLocaleString(),
      items: (items || []).map(i => ({
        partNumber: i.part_number, partName: i.part_name, category: i.categories?.name || i.category,
        quantity: i.quantity, costPrice: Number(i.cost_price), sellingPrice: Number(i.selling_price),
        stockValue: i.quantity * Number(i.cost_price), status: i.quantity <= i.reorder_level ? 'Low Stock' : 'OK'
      })),
      totalItems: items?.length || 0, totalValue: inventoryValue,
      lowStockCount: items?.filter(i => i.quantity <= i.reorder_level).length || 0
    });
    pdf.save('inventory-report.pdf');
    toast({ title: 'PDF Downloaded' });
  };

  const totalSales = salesData.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="font-display text-3xl font-bold gradient-text">Reports</h1><p className="text-muted-foreground">Analytics and insights</p></div>
        <div className="flex gap-2 flex-wrap">
          <Select value={period} onValueChange={setPeriod}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="day">Today</SelectItem><SelectItem value="week">Week</SelectItem><SelectItem value="month">Month</SelectItem></SelectContent></Select>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />CSV</Button>
          <Button variant="outline" onClick={exportSalesPDF}><FileText className="h-4 w-4 mr-2" />Sales PDF</Button>
          <Button variant="outline" onClick={exportInventoryPDF}><FileText className="h-4 w-4 mr-2" />Inventory PDF</Button>
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
