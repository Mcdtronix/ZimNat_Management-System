import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function useQueryParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function PaymentCheckout() {
  const qp = useQueryParams();
  const policyId = qp.get("policy");

  return (
    <div className="p-6">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Payment Checkout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            This is a placeholder payment page. Use the details below to complete your premium payment.
          </div>
          {policyId && (
            <div className="text-sm"><span className="font-medium">Policy ID:</span> {policyId}</div>
          )}
          <Separator />
          <div className="space-y-1">
            <div className="font-medium">Bank Transfer Details</div>
            <div className="text-sm text-muted-foreground">Bank: CBZ</div>
            <div className="text-sm text-muted-foreground">Account Number: 020224850175100</div>
            <div className="text-sm text-muted-foreground">Branch: Chivhu</div>
          </div>
          <Separator />
          <div className="space-y-1">
            <div className="font-medium">Terms & Conditions</div>
            <div className="text-sm text-muted-foreground">
              By proceeding, you agree to the policy terms and conditions. Cover is activated upon receipt and
              confirmation of payment. Premiums are payable within 7 days of quotation unless otherwise agreed.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
