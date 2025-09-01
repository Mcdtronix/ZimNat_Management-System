import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendRegistrationOtp, verifyRegistrationOtp } from "@/lib/api";

export default function VerifyOtp() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation() as unknown as { state?: { email?: string; otp_hint?: string } };
  const initialEmail = location?.state?.email || "";
  const otpHint = location?.state?.otp_hint;

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await verifyRegistrationOtp({ email, code });
      toast({ title: "Verified", description: "Your account is activated. Please log in." });
      navigate("/login");
    } catch (err: any) {
      toast({
        title: "Verification failed",
        description: err?.data?.error || err?.message || "Invalid code",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onResend() {
    setIsResending(true);
    try {
      const res = await resendRegistrationOtp({ email });
      toast({ title: "OTP resent", description: res?.message || "Check your inbox" });
    } catch (err: any) {
      toast({
        title: "Resend failed",
        description: err?.data?.error || err?.message || "Try again later",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Verify your account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={onVerify} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="code">OTP Code</Label>
                <Input id="code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required />
                {otpHint ? (
                  <p className="text-xs text-muted-foreground mt-1">Debug hint: {otpHint}</p>
                ) : null}
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Verifying..." : "Verify"}
                </Button>
                <Button type="button" variant="outline" onClick={onResend} disabled={isResending}>
                  {isResending ? "Resending..." : "Resend OTP"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
