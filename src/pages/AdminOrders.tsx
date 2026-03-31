import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import BookingStatusLog from "@/components/BookingStatusLog";
import BookingCompletionPhotos from "@/components/BookingCompletionPhotos";
import * as XLSX from "xlsx";

interface OrderRow {
  id: string;
  customer_name: string;
  customer_whatsapp: string;
  customer_email: string | null;
  booking_date: string;
  booking_time: string;
  status: string;
  notes: string | null;
  selected_services: any;
  customer_address_detail: string | null;
  vendor_name: string;
  vendor_id: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  on_progress: "Dalam Pengerjaan",
  done: "Selesai",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  confirmed: "default",
  on_progress: "secondary",
  done: "default",
  completed: "secondary",
  cancelled: "destructive",
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [vendors, setVendors] = useState<{ id: string; company_name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: vendorsData } = await supabase.from("vendors").select("id, company_name");
    if (vendorsData) setVendors(vendorsData);

    const { data: bookings } = await supabase
      .from("bookings")
      .select("*, vendors(company_name)")
      .order("created_at", { ascending: false });

    if (bookings) {
      setOrders(
        bookings.map((b: any) => ({
          ...b,
          vendor_name: b.vendors?.company_name || "Unknown",
        }))
      );
    }
  };

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (vendorFilter !== "all" && o.vendor_id !== vendorFilter) return false;
    if (dateFrom && o.booking_date < dateFrom) return false;
    if (dateTo && o.booking_date > dateTo) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        o.customer_name.toLowerCase().includes(s) ||
        o.customer_whatsapp.includes(s) ||
        o.vendor_name.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const exportToExcel = () => {
    const rows = filtered.map((o) => ({
      "Nama Customer": o.customer_name,
      WhatsApp: o.customer_whatsapp,
      Email: o.customer_email || "",
      "Tanggal Booking": o.booking_date,
      "Jam Booking": o.booking_time,
      Status: STATUS_LABELS[o.status] || o.status,
      Vendor: o.vendor_name,
      Layanan: (o.selected_services || []).map((s: any) => s.service_name || s.name).join(", "),
      Catatan: o.notes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pesanan");
    XLSX.writeFile(wb, `pesanan_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast({ title: "Berhasil", description: "Data pesanan berhasil diexport" });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle>Manajemen Pesanan</CardTitle>
              <Button onClick={exportToExcel} size="sm" variant="outline">
                <Download className="h-4 w-4 mr-1" /> Export Excel
              </Button>
            </div>
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger><SelectValue placeholder="Semua Vendor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Vendor</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Semua Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="Dari" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="Sampai" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Vendor</TableHead>
                  <TableHead className="hidden md:table-cell">Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{o.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{o.customer_whatsapp}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{o.vendor_name}</TableCell>
                    <TableCell className="hidden md:table-cell">{o.booking_date}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[o.status] || "outline"}>
                        {STATUS_LABELS[o.status] || o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(o)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Tidak ada pesanan ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Order Detail */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Pesanan</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Customer:</span><p className="font-medium">{selectedOrder.customer_name}</p></div>
                <div><span className="text-muted-foreground">WhatsApp:</span><p className="font-medium">{selectedOrder.customer_whatsapp}</p></div>
                <div><span className="text-muted-foreground">Email:</span><p className="font-medium">{selectedOrder.customer_email || "-"}</p></div>
                <div><span className="text-muted-foreground">Vendor:</span><p className="font-medium">{selectedOrder.vendor_name}</p></div>
                <div><span className="text-muted-foreground">Tanggal:</span><p className="font-medium">{selectedOrder.booking_date}</p></div>
                <div><span className="text-muted-foreground">Jam:</span><p className="font-medium">{selectedOrder.booking_time}</p></div>
                <div><span className="text-muted-foreground">Status:</span>
                  <Badge variant={STATUS_VARIANT[selectedOrder.status] || "outline"} className="mt-1">
                    {STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
                  </Badge>
                </div>
                <div><span className="text-muted-foreground">Alamat:</span><p className="font-medium">{selectedOrder.customer_address_detail || "-"}</p></div>
              </div>
              {selectedOrder.selected_services && (selectedOrder.selected_services as any[]).length > 0 && (
                <div>
                  <span className="text-muted-foreground">Layanan:</span>
                  <ul className="mt-1 space-y-1">
                    {(selectedOrder.selected_services as any[]).map((s: any, i: number) => (
                      <li key={i} className="flex justify-between">
                        <span>{s.service_name || s.name}</span>
                        <span className="font-medium">Rp {(s.price || 0).toLocaleString("id-ID")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedOrder.notes && (
                <div><span className="text-muted-foreground">Catatan:</span><p>{selectedOrder.notes}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
