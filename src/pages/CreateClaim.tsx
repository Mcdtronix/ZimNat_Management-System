import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@/lib/api";
import { toast } from "sonner";

interface Policy { id: number; policy_number: string; coverage: number; }
interface Coverage { id: number; name: string; }

const api = async (path: string, init?: RequestInit) => {
  const token = getAuthToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const ct = res.headers.get("content-type");
  if (ct && ct.includes("application/json")) return res.json();
  return null;
};

export default function CreateClaim() {
  const qc = useQueryClient();
  const { data: policies } = useQuery<Policy[]>({ queryKey: ["policies"], queryFn: () => api("/api/policies/") });
  const { data: coverages } = useQuery<Coverage[]>({ queryKey: ["coverages"], queryFn: () => api("/api/insurance-coverages/") });

  // Normalize potential paginated responses into arrays
  const coveragesList = useMemo<Coverage[]>(() => {
    if (Array.isArray(coverages)) return coverages;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (coverages as any)?.results ?? [];
  }, [coverages]);

  const policiesList = useMemo<Policy[]>(() => {
    if (Array.isArray(policies)) return policies;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (policies as any)?.results ?? [];
  }, [policies]);

  const comprehensiveIds = useMemo(
    () => new Set(coveragesList.filter(c => c.name?.toLowerCase() === "comprehensive").map(c => c.id)),
    [coveragesList]
  );
  const eligiblePolicies = useMemo(() => policiesList.filter(p => comprehensiveIds.has(p.coverage)), [policiesList, comprehensiveIds]);

  const [policy, setPolicy] = useState<number | undefined>();
  const [incidentDate, setIncidentDate] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [estimate, setEstimate] = useState<string>("");
  const [policeReport, setPoliceReport] = useState<File | null>(null);
  const [idDoc, setIdDoc] = useState<File | null>(null);

  const createClaim = useMutation({
    mutationFn: async () => {
      if (!policy || !incidentDate || !description) throw new Error("Policy, incident date and description required");
      const claim = await api("/api/claims/", { method: "POST", body: JSON.stringify({ policy, incident_date: incidentDate, description, estimated_amount: estimate || undefined }) });
      const claimId = claim?.id;
      if (!claimId) return;
      // Upload documents if provided
      const token = getAuthToken();
      const upload = async (file: File, type: "police_report" | "id_document") => {
        const fd = new FormData();
        fd.append("claim", String(claimId));
        fd.append("document_type", type);
        fd.append("document", file);
        const res = await fetch("/api/claim-documents/", {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: fd,
        });
        if (!res.ok) throw new Error(await res.text());
      };
      if (policeReport) await upload(policeReport, "police_report");
      if (idDoc) await upload(idDoc, "id_document");
    },
    onSuccess: () => { toast.success("Claim submitted"); qc.invalidateQueries({ queryKey: ["claims"] }); },
    onError: (e: any) => toast.error(e?.message || "Failed to submit claim"),
  });

  return (
    <div className="p-6">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Create Claim</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Policy (Comprehensive only)</Label>
              <select className="w-full border rounded h-10 px-3" value={policy || ""} onChange={(e) => setPolicy(Number(e.target.value) || undefined)}>
                <option value="">Select policy</option>
                {eligiblePolicies.map(p => (
                  <option key={p.id} value={p.id}>{p.policy_number}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Incident date</Label>
                <Input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
              </div>
              <div>
                <Label>Estimated amount</Label>
                <Input type="number" value={estimate} onChange={(e) => setEstimate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Police report (PDF/Image)</Label>
                <Input type="file" accept=".pdf,image/*" onChange={(e) => setPoliceReport(e.target.files?.[0] || null)} />
              </div>
              <div>
                <Label>ID document (PDF/Image)</Label>
                <Input type="file" accept=".pdf,image/*" onChange={(e) => setIdDoc(e.target.files?.[0] || null)} />
              </div>
            </div>
            <Button onClick={() => createClaim.mutate()} disabled={createClaim.isPending}>Submit Claim</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
