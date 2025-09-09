import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { getAuthToken } from "@/lib/api";
import { Link } from "react-router-dom";

interface VehicleCategory { id: number; name: string; display_name?: string }
interface Vehicle {
  id: number;
  customer: number;
  vehicle_number: string;
  category: number;
  make: string;
  model: string;
  year: number;
  engine_number?: string;
  chassis_number?: string;
  market_value?: string;
}

interface Policy {
  id: number;
  vehicle: number | { id: number };
}

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const api = async (path: string, init?: RequestInit) => {
  const token = getAuthToken();
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) return res.json();
  return null;
};

const Vehicles = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<Partial<Vehicle>>({});

  const { data: categories } = useQuery<VehicleCategory[]>({
    queryKey: ["vehicle-categories"],
    queryFn: () => api("/api/vehicle-categories/")
  });

  // Normalize categories into an array to handle paginated or direct array responses
  const categoryList = useMemo<VehicleCategory[]>(() => {
    if (Array.isArray(categories)) return categories;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (categories as any)?.results ?? [];
  }, [categories]);

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => api("/api/vehicles/")
  });

  // Permissions to detect underwriter/manager
  const { data: perms } = useQuery({
    queryKey: ["user-permissions"],
    queryFn: async () => {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/user-permissions/`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("Failed to load permissions");
      return res.json();
    },
  });
  const isUnderwriter = perms?.user_type === "underwriter" || perms?.user_type === "manager";

  // Policies for filtering vehicles (only needed for underwriters/managers)
  const { data: policies } = useQuery<Policy[] | { results: Policy[] }>({
    queryKey: ["policies", "for-vehicle-filter"],
    queryFn: () => api("/api/policies/"),
    enabled: !!isUnderwriter,
  });

  // Normalize vehicles into an array to handle paginated or direct array responses
  const vehiclesList = useMemo<Vehicle[]>(() => {
    if (Array.isArray(vehicles)) return vehicles;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (vehicles as any)?.results ?? [];
  }, [vehicles]);

  const vehiclesWithPolicies = useMemo<Vehicle[]>(() => {
    if (!isUnderwriter) return vehiclesList;
    // Normalize policies array
    const pols: Policy[] = Array.isArray(policies)
      ? policies
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((policies as any)?.results ?? []);
    const vehicleIds = new Set<number>();
    pols.forEach((p) => {
      const vid = typeof p.vehicle === "object" ? p.vehicle?.id : p.vehicle;
      if (vid) vehicleIds.add(vid);
    });
    return vehiclesList.filter((v) => vehicleIds.has(v.id));
  }, [isUnderwriter, policies, vehiclesList]);

  const resetForm = () => {
    setEditing(null);
    setForm({ vehicle_number: "", category: undefined, make: "", model: "", year: new Date().getFullYear() });
  };

  useEffect(() => { resetForm(); }, []);

  useEffect(() => {
    if (editing) {
      setForm({ ...editing });
    }
  }, [editing]);

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Vehicle>) => api("/api/vehicles/", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => { toast.success("Vehicle added"); qc.invalidateQueries({ queryKey: ["vehicles"] }); resetForm(); },
    onError: (err: any) => toast.error(err.message || "Failed to add vehicle"),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Vehicle>) => api(`/api/vehicles/${editing?.id}/`, { method: "PUT", body: JSON.stringify(payload) }),
    onSuccess: () => { toast.success("Vehicle updated"); qc.invalidateQueries({ queryKey: ["vehicles"] }); resetForm(); },
    onError: (err: any) => toast.error(err.message || "Failed to update vehicle"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/api/vehicles/${id}/`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Vehicle deleted"); qc.invalidateQueries({ queryKey: ["vehicles"] }); },
    onError: (err: any) => toast.error(err.message || "Failed to delete vehicle"),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form } as any;
    // let backend set the customer; remove id if present
    delete payload.id;
    if (editing) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const categoryOptions = useMemo(() => categoryList.map(c => ({ value: String(c.id), label: c.display_name || c.name })), [categoryList]);

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {!isUnderwriter && (
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{editing ? "Edit Vehicle" : "Add Vehicle"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label>Vehicle Number</Label>
                <Input value={form.vehicle_number || ""} onChange={(e) => setForm(f => ({ ...f, vehicle_number: e.target.value }))} required />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category ? String(form.category) : undefined} onValueChange={(v) => setForm(f => ({ ...f, category: Number(v) }))}>
                  <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Make</Label>
                  <Input value={form.make || ""} onChange={(e) => setForm(f => ({ ...f, make: e.target.value }))} required />
                </div>
                <div>
                  <Label>Model</Label>
                  <Input value={form.model || ""} onChange={(e) => setForm(f => ({ ...f, model: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Year</Label>
                  <Input type="number" value={form.year || new Date().getFullYear()} onChange={(e) => setForm(f => ({ ...f, year: Number(e.target.value) }))} required />
                </div>
                <div>
                  <Label>Market Value</Label>
                  <Input type="number" value={form.market_value || ""} onChange={(e) => setForm(f => ({ ...f, market_value: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Engine Number</Label>
                  <Input value={form.engine_number || ""} onChange={(e) => setForm(f => ({ ...f, engine_number: e.target.value }))} />
                </div>
                <div>
                  <Label>Chassis Number</Label>
                  <Input value={form.chassis_number || ""} onChange={(e) => setForm(f => ({ ...f, chassis_number: e.target.value }))} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editing ? "Update" : "Add"}
                </Button>
                {editing && (
                  <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
        )}

        <Card className={"lg:col-span-2" + (isUnderwriter ? " lg:col-span-3" : "") }>
          <CardHeader>
            <CardTitle>{isUnderwriter ? "Company Vehicles with Policies" : "My Vehicles"}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Make/Model</TableHead>
                    <TableHead>Year</TableHead>
                    {!isUnderwriter && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehiclesWithPolicies.map(v => (
                    <TableRow key={v.id}>
                      <TableCell>{v.vehicle_number}</TableCell>
                      <TableCell>{categoryList.find(c => c.id === v.category)?.display_name || categoryList.find(c => c.id === v.category)?.name || v.category}</TableCell>
                      <TableCell>{v.make} {v.model}</TableCell>
                      <TableCell>{v.year}</TableCell>
                      {!isUnderwriter && (
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="outline" onClick={() => setEditing(v)}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(v.id)}>Delete</Button>
                          <Link to={`/apply-policy?vehicle=${v.id}`}>
                            <Button size="sm">Apply Policy</Button>
                          </Link>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Vehicles;
