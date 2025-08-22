import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/api";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  user_type: string;
  phone_number?: string;
  address?: string;
  national_id?: string;
  date_created: string;
  is_active: boolean;
}

interface CustomerProfile {
  id: number;
  customer_id: string;
  user: number;
  address_no: string;
  street: string;
  town: string;
  date_registered: string;
}

function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getAuthToken();
  return fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed with ${res.status}`);
    }
    const ct = res.headers.get("content-type");
    if (ct && ct.includes("application/json")) return res.json();
    return null;
  });
}

const Profile: React.FC = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const userQ = useQuery<UserProfile>({
    queryKey: ["profile", "user"],
    queryFn: () => authFetch("/api/profile/user/", { method: "GET" }),
  });

  const customerQ = useQuery<CustomerProfile>({
    queryKey: ["profile", "customer"],
    queryFn: () => authFetch("/api/profile/customer/", { method: "GET" }),
  });

  const [userForm, setUserForm] = useState<Partial<UserProfile>>({});
  const [customerForm, setCustomerForm] = useState<Partial<CustomerProfile>>({});

  const userData = userQ.data;
  const customerData = customerQ.data;

  React.useEffect(() => {
    if (userData) setUserForm({
      first_name: userData.first_name || "",
      last_name: userData.last_name || "",
      email: userData.email || "",
      phone_number: userData.phone_number || "",
      national_id: userData.national_id || "",
      address: userData.address || "",
    });
  }, [userData]);

  React.useEffect(() => {
    if (customerData) setCustomerForm({
      address_no: customerData.address_no || "",
      street: customerData.street || "",
      town: customerData.town || "",
    });
  }, [customerData]);

  const updateUser = useMutation({
    mutationFn: async (payload: Partial<UserProfile>) =>
      authFetch("/api/profile/user/", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast({ title: "Profile updated", description: "User details saved." });
      qc.invalidateQueries({ queryKey: ["profile", "user"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update user", description: err.message, variant: "destructive" });
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async (payload: Partial<CustomerProfile>) =>
      authFetch("/api/profile/customer/", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast({ title: "Profile updated", description: "Customer details saved." });
      qc.invalidateQueries({ queryKey: ["profile", "customer"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update customer", description: err.message, variant: "destructive" });
    },
  });

  const loading = userQ.isLoading || customerQ.isLoading;
  const error = userQ.error || customerQ.error;

  return (
    <Layout>
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <h1 className="text-2xl font-semibold mb-6">My Profile</h1>

        {loading && <div>Loading profile...</div>}
        {error && <div className="text-red-600">Failed to load profile</div>}

        {userData && (
          <section className="mb-8">
            <h2 className="text-lg font-medium mb-3">User Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">First Name</span>
                <input
                  className="border rounded px-3 py-2"
                  value={userForm.first_name ?? ""}
                  onChange={(e) => setUserForm((p) => ({ ...p, first_name: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Last Name</span>
                <input
                  className="border rounded px-3 py-2"
                  value={userForm.last_name ?? ""}
                  onChange={(e) => setUserForm((p) => ({ ...p, last_name: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-sm text-muted-foreground">Email</span>
                <input
                  type="email"
                  className="border rounded px-3 py-2"
                  value={userForm.email ?? ""}
                  onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Phone Number</span>
                <input
                  className="border rounded px-3 py-2"
                  placeholder="+2637XXXXXXXX"
                  value={userForm.phone_number ?? ""}
                  onChange={(e) => setUserForm((p) => ({ ...p, phone_number: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">National ID</span>
                <input
                  className="border rounded px-3 py-2"
                  value={userForm.national_id ?? ""}
                  onChange={(e) => setUserForm((p) => ({ ...p, national_id: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-sm text-muted-foreground">Address</span>
                <textarea
                  className="border rounded px-3 py-2"
                  rows={3}
                  value={userForm.address ?? ""}
                  onChange={(e) => setUserForm((p) => ({ ...p, address: e.target.value }))}
                />
              </label>
            </div>
            <div className="mt-4">
              <button
                className="inline-flex items-center rounded bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
                disabled={updateUser.isPending}
                onClick={() => updateUser.mutate(userForm)}
              >
                {updateUser.isPending ? "Saving..." : "Save User"}
              </button>
            </div>
          </section>
        )}

        {customerData && (
          <section>
            <h2 className="text-lg font-medium mb-3">Customer Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Address No.</span>
                <input
                  className="border rounded px-3 py-2"
                  value={customerForm.address_no ?? ""}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, address_no: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Street</span>
                <input
                  className="border rounded px-3 py-2"
                  value={customerForm.street ?? ""}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, street: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Town</span>
                <input
                  className="border rounded px-3 py-2"
                  value={customerForm.town ?? ""}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, town: e.target.value }))}
                />
              </label>
            </div>
            <div className="mt-4">
              <button
                className="inline-flex items-center rounded bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
                disabled={updateCustomer.isPending}
                onClick={() => updateCustomer.mutate(customerForm)}
              >
                {updateCustomer.isPending ? "Saving..." : "Save Customer"}
              </button>
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
