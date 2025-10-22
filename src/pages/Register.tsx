import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    nic: "",
    addressNo: "",
    street: "",
    town: "",
    contactNo: "",
    email: "",
    password: "",
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const { register } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await register.mutateAsync({
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        address_no: formData.addressNo,
        street: formData.street,
        town: formData.town,
        phone_number: formData.contactNo || undefined,
        national_id: formData.nic || undefined,
      });
      toast({ title: "Registration submitted", description: "Enter the OTP we sent to verify your account." });
      navigate("/verify-otp", { state: { email: formData.email, otp_hint: (res as any)?.otp_hint } });
    } catch (err: any) {
      const firstError = typeof err?.data === 'object' ? Object.values(err.data)[0] : undefined;
      toast({
        title: "Registration failed",
        description: Array.isArray(firstError) ? String(firstError[0]) : (err?.data?.error || err?.message || "Please check your details"),
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setFormData({
      firstName: "",
      lastName: "",
      nic: "",
      addressNo: "",
      street: "",
      town: "",
      contactNo: "",
      email: "",
      password: "",
    });
  };

  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Customer Register Form</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="firstName">First Name:</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="lastName">Last Name:</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="nic">National ID:</Label>
                    <Input
                      id="nic"
                      name="nic"
                      value={formData.nic}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="addressNo">Address: No:</Label>
                    <Input
                      id="addressNo"
                      name="addressNo"
                      value={formData.addressNo}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="street">Street:</Label>
                    <Input
                      id="street"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="town">Town:</Label>
                    <Input
                      id="town"
                      name="town"
                      value={formData.town}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="contactNo">Contact No:</Label>
                  <Input
                    id="contactNo"
                    name="contactNo"
                    type="tel"
                    value={formData.contactNo}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {/* Login Credentials */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Create Login Credentials</h3>
                
                <div>
                  <Label htmlFor="email">Username/Email:</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password:</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-6">
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary-dark"
                  disabled={register.isPending}
                >
                  {register.isPending ? "Submitting..." : "Submit"}
                </Button>

                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleReset}
                >
                  Reset
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Login here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;