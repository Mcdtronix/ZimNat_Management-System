import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Clock, Users, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative h-96 bg-gradient-to-r from-slate-800 to-slate-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative container mx-auto px-4 h-full flex items-center">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              "WHEREVER YOU GO, OUR INSURANCE GOES THE EXTRA MILE."
            </h1>
            <p className="text-xl mb-6">
              Insure your vehicle quickly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/login">
                <Button size="lg" className="bg-primary hover:bg-primary-dark">
                  Get Started
                </Button>
              </Link>
              {/* <Link to="/underwriter">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-slate-800">
                  Staff Login
                </Button>
              </Link> */}
            </div>
          </div>
        </div>
      </section>

      {/* Why Zimnat Section */}
      <section className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">WHY Zimnat ?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Quick Damage Assistance</h3>
            <p className="text-muted-foreground text-sm">
              Fast and reliable damage assessment services
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">20 years of reliable service</h3>
            <p className="text-muted-foreground text-sm">
              Two decades of trusted insurance solutions
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Excellent customer service</h3>
            <p className="text-muted-foreground text-sm">
              Dedicated support for all your insurance needs
            </p>
          </div>
        </div>
      </section>

      {/* Motor Insurance in Sri Lanka */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">MOTOR INSURANCE IN ZIMBABWE</h2>
          <p className="text-lg text-muted-foreground max-w-4xl">
            Zimnat offers tailored vehicle insurance solutions designed to perfectly match your driving needs, whether you're 
            behind the wheel of a car, a motorcycle, or even a tuk-tuk. Our comprehensive motor insurance plans can be fully 
            customized to fit your vehicle's specific make, model, and other important details, ensuring that you only pay for the 
            coverage you truly require. Experience the enhanced reliability of switching to Zimnat insurance with just a simple click. 
            Securing your insurance has never been more convenient!
          </p>
        </div>
      </section>

      {/* Motor Insurance Categories */}
      <section className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-12">Motor Insurance Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="group hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="h-32 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg mb-4 bg-cover bg-center" 
                   style={{backgroundImage: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"%23e0f2fe\"/><circle cx=\"50\" cy=\"50\" r=\"30\" fill=\"%23006064\"/></svg>')"}}>
              </div>
              <h3 className="font-semibold mb-2">Car Insurance</h3>
              <p className="text-sm text-muted-foreground">
                Verify whether any risks or losses resulting from theft, accidents, or natural catastrophes are covered for your vehicle.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="h-32 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg mb-4">
              </div>
              <h3 className="font-semibold mb-2">Motorcycle Insurance</h3>
              <p className="text-sm text-muted-foreground">
                Verify whether any risks or losses resulting from theft, accidents, or natural catastrophes are covered for your vehicle.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="h-32 bg-gradient-to-br from-green-100 to-green-200 rounded-lg mb-4">
              </div>
              <h3 className="font-semibold mb-2">Three-Wheel Insurance</h3>
              <p className="text-sm text-muted-foreground">
                Verify whether any risks or losses resulting from theft, accidents, or natural catastrophes are covered for your vehicle.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="h-32 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg mb-4">
              </div>
              <h3 className="font-semibold mb-2">Commercial Vehicle Insurance</h3>
              <p className="text-sm text-muted-foreground">
                Verify whether any risks or losses resulting from theft, accidents, or natural catastrophes are covered for your vehicle.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Coverage Options */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12">Motor Insurance Coverage Option</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Third Party */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4 text-primary">Third Party</h3>
                <p className="text-sm text-muted-foreground mb-6">Basic coverage</p>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Covers death or bodily injury to any third-party person.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Covers any damaged property up to Rs.15,000.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Does not cover you.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Does not cover any damages to your vehicle.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Comprehensive */}
            <Card className="bg-primary border-primary">
              <CardContent className="p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">Comprehensive</h3>
                <p className="text-sm opacity-90 mb-6">Complete coverage</p>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Covers death or injuries caused to a third-party person by your vehicle during an accident.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Covers damages caused to a property of a third-party person up to a maximum amount of LKR 5 million.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Covers damages to your vehicle based on the total sum insured.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Add-ons available to extend your cover.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Manage your own deductibles.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="container mx-auto px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Insure Your Vehicle Now</h2>
          <p className="text-lg text-muted-foreground mb-8">
            "Rev up your protection with zimnat! Tailored insurance plans for cars, bikes, and tuk-tuks, 
            designed to fit your unique needs. Register now for personalized coverage and peace of mind on the road!"
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-primary hover:bg-primary-dark">
                REGISTER NOW
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;