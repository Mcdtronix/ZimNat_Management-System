import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentForm } from "@/components/PaymentForm";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, confirmPayment } from "@/lib/api";
import { 
  CreditCard, 
  Building2, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  Receipt
} from "lucide-react";

function useQueryParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

interface PolicyData {
  id: string;
  policy_number: string;
  premium_amount: string;
  coverage_amount: string;
  currency: string;
  status: string;
  vehicle: {
    make: string;
    model: string;
    year: number;
    registration_number: string;
  };
}

export default function PaymentCheckout() {
  const qp = useQueryParams();
  const navigate = useNavigate();
  const policyId = qp.get("policy");
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('card');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Fetch policy details
  const { data: policy, isLoading } = useQuery({
    queryKey: ['policy', policyId],
    queryFn: () => apiFetch<PolicyData>(`/api/policies/${policyId}/`),
    enabled: !!policyId,
  });

  const handlePaymentSuccess = async (paymentIntent: any) => {
    try {
      await confirmPayment({
        payment_intent_id: paymentIntent.id,
        policy_id: policyId!,
      });
      setPaymentSuccess(true);
    } catch (error: any) {
      setPaymentError(error.message || 'Payment confirmation failed');
    }
  };

  const handlePaymentError = (error: string) => {
    setPaymentError(error);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Card className="max-w-3xl mx-auto">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="p-6">
        <Card className="max-w-3xl mx-auto">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Policy not found. Please check your link and try again.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="p-6">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              Payment Successful!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your payment has been processed successfully. Your policy is now active.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Policy Number:</span>
                <span className="font-medium">{policy.policy_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Vehicle:</span>
                <span className="font-medium">
                  {policy.vehicle.year} {policy.vehicle.make} {policy.vehicle.model}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Registration:</span>
                <span className="font-medium">{policy.vehicle.registration_number}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/dashboard')} className="flex-1">
                Go to Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate('/policies')} className="flex-1">
                View Policies
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Payment Checkout</h1>
            <p className="text-muted-foreground">Complete your insurance premium payment</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Form */}
          <div>
            <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'card' | 'bank')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="card" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Card Payment
                </TabsTrigger>
                <TabsTrigger value="bank" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Bank Transfer
                </TabsTrigger>
              </TabsList>

              <TabsContent value="card" className="mt-4">
                {paymentError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{paymentError}</AlertDescription>
                  </Alert>
                )}
                <PaymentForm
                  amount={parseFloat(policy.premium_amount)}
                  policyId={policy.id}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </TabsContent>

              <TabsContent value="bank" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Bank Transfer Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <Receipt className="h-4 w-4" />
                      <AlertDescription>
                        Please use the reference number below when making your bank transfer.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="font-medium">Bank:</span>
                        <span>CBZ Bank</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Account Number:</span>
                        <span className="font-mono">020224850175100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Branch:</span>
                        <span>Chivhu</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Reference:</span>
                        <span className="font-mono">{policy.policy_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Amount:</span>
                        <span className="font-bold">${policy.premium_amount} {policy.currency}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="font-medium">Terms & Conditions</div>
                      <div className="text-sm text-muted-foreground">
                        By proceeding, you agree to the policy terms and conditions. Cover is activated upon receipt and
                        confirmation of payment. Premiums are payable within 7 days of quotation unless otherwise agreed.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Policy Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Policy Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Policy Number:</span>
                    <Badge variant="outline">{policy.policy_number}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Vehicle:</span>
                    <span className="text-right">
                      {policy.vehicle.year} {policy.vehicle.make} {policy.vehicle.model}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Registration:</span>
                    <span className="font-mono">{policy.vehicle.registration_number}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>Coverage Amount:</span>
                    <span className="font-medium">${policy.coverage_amount} {policy.currency}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Premium Amount:</span>
                    <span>${policy.premium_amount} {policy.currency}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
