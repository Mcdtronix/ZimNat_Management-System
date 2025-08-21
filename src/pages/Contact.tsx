import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin, Youtube } from "lucide-react";

const Contact = () => {
  const [formData, setFormData] = useState({
    customerId: "",
    csrId: "",
    inquiryId: "",
    name: "",
    contact: "",
    email: "",
    inquiry: "",
    date: "",
  });

  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Inquiry Submitted",
      description: "Your inquiry has been submitted successfully. We'll get back to you soon!",
    });
    // Reset form
    setFormData({
      customerId: "",
      csrId: "",
      inquiryId: "",
      name: "",
      contact: "",
      email: "",
      inquiry: "",
      date: "",
    });
  };

  return (
    <div className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <Card>
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerId">
                        customer id <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="customerId"
                        name="customerId"
                        value={formData.customerId}
                        onChange={handleInputChange}
                        placeholder="customer id"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="csrId">
                        csr id <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="csrId"
                        name="csrId"
                        value={formData.csrId}
                        onChange={handleInputChange}
                        placeholder="csr id"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="inquiryId">
                      inquiry id <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="inquiryId"
                      name="inquiryId"
                      value={formData.inquiryId}
                      onChange={handleInputChange}
                      placeholder="inquiry id"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="name">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Your Name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact">
                      Contact <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="contact"
                      name="contact"
                      type="tel"
                      value={formData.contact}
                      onChange={handleInputChange}
                      placeholder="contact"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">
                      E-mail <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="e-mail"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="inquiry">
                      Inquiry <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="inquiry"
                      name="inquiry"
                      value={formData.inquiry}
                      onChange={handleInputChange}
                      placeholder="Please tell about your Inquiry"
                      rows={4}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="date">
                      Select a date: <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary-dark"
                  >
                    Submit
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            {/* Visit Us */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-primary" />
                  Visit Us
                </h3>
                <div className="space-y-2 text-muted-foreground">
                  <p>Rakshana Mandiraya</p>
                  <p>No.21,</p>
                  <p>Vauxhall Street,</p>
                  <p>Colombo 02,</p>
                  <p>Sri Lanka</p>
                </div>
              </CardContent>
            </Card>

            {/* Email */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-primary" />
                  Email
                </h3>
                <p className="text-muted-foreground">info@drivepeak.lk</p>
              </CardContent>
            </Card>

            {/* Call our 24/7 Hotline */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-primary" />
                  Call our 24/7 Hotline
                </h3>
                <div className="space-y-2 text-muted-foreground">
                  <p>+94 11 2 1234 345</p>
                  <p>+94 11 2 1234 345</p>
                  <p>+94 11 2 1234 345</p>
                </div>
              </CardContent>
            </Card>

            {/* Follow us on */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Follow us on</h3>
                <div className="flex space-x-4">
                  <Facebook className="h-6 w-6 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
                  <Twitter className="h-6 w-6 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
                  <Instagram className="h-6 w-6 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
                  <Linkedin className="h-6 w-6 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
                  <Youtube className="h-6 w-6 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
                </div>
              </CardContent>
            </Card>

            {/* Map Placeholder */}
            <Card>
              <CardContent className="p-6">
                <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-2" />
                    <p>Interactive Map</p>
                    <p className="text-sm">Location: Colombo 02, Sri Lanka</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;