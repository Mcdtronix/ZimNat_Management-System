import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Shield, Users, Clock, Car, Bike, Truck } from "lucide-react";

const MotorInsurance = () => {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative h-96 bg-gradient-to-r from-slate-800 to-slate-600 text-white">
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative container mx-auto px-4 h-full flex items-center justify-center">
          <div className="text-center max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Your Path to Safe Journeys</h1>
            <p className="text-xl opacity-90">
              Comprehensive vehicle insurance solutions for all your needs
            </p>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">Hello!</h2>
            <h3 className="text-xl font-semibold mb-4 text-primary">We're Zimnat Insurance</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Zimnat is your trusted partner in vehicle insurance management.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Our cutting-edge platform harnesses the latest technology to deliver seamless, efficient, and personalized solutions tailored to your needs.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              With Zimnat, you can navigate insurance processes effortlessly, ensuring peace of mind and financial security on the road ahead.
            </p>
          </div>
          
          <Card className="bg-primary text-white">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-6">"Zimnat Protecting Your Investment with Precision Protection"</h3>
              <p className="mb-6 opacity-90">
                "Zimnat Safeguarding Your Vehicle, Securing Your Peace of Mind" signifies our dedication to protecting your vehicle with comprehensive coverage, advanced security measures, and unparalleled peace of mind.
              </p>
              <div className="space-y-2">
                <h4 className="font-semibold">FOR YOU</h4>
                <ul className="space-y-1 text-sm opacity-90">
                  <li>• Personalised coverage</li>
                  <li>• Personalised coverage</li>
                  <li>• Expert support</li>
                  <li>• Community engagement</li>
                  <li>• Peace of mind</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Zimnat Group */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Zimnat GROUP OF INSURANCE COMPANIES</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-12">
            Peak Vehicle Insurance provides customized coverage, leveraging cutting-edge technology for personalized premiums and proactive risk management. Our dedicated team 
            offers expert guidance and support throughout your insurance journey, ensuring peace of mind on the road. With our comprehensive protection and superior service, Drive 
            Peak is a top choice for vehicle insurance, offering comprehensive coverage tailored to your needs. With competitive rates and excellent customer service, they prioritize your 
            peace of mind on the road.
          </p>
          <div className="bg-primary/10 p-6 rounded-lg">
            <p className="text-lg font-semibold text-center text-primary">
              "Zimnat Simplifying Insurance, Amplifying Confidence"
            </p>
          </div>
        </div>
      </section>

      {/* Zimnat Features */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 h-64 rounded-lg flex items-center justify-center">
              <Car className="h-24 w-24 text-blue-600" />
            </div>
          </div>
          
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl font-bold mb-6">Zimnat</h2>
            <h3 className="text-xl font-semibold mb-4 text-primary">The Best Option</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              "Zimnat" encapsulates our commitment to safeguarding your vehicle and securing your peace of mind. With tailored coverage, advanced technology, and dedicated support, we ensure 
              comprehensive protection for your journeys. Trust in Zimnat for reliability, innovation, and a community-driven approach to insurance, where your safety and satisfaction are our top 
              priorities.Zimnat is a top choice for vehicle insurance, offering comprehensive coverage tailored to your needs. With competitive rates and excellent customer service, they prioritize your peace of 
              mind on the road.
            </p>
            <p className="text-lg font-semibold text-primary">
              "Zimnat Your Reliable Shield Against the Unexpected"
            </p>
          </div>
        </div>
      </section>

      {/* Second Zimnat Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 h-64 rounded-lg flex items-center justify-center">
              <Shield className="h-24 w-24 text-yellow-600" />
            </div>
            
            <div>
              <h2 className="text-3xl font-bold mb-6">Zimnat</h2>
              <h3 className="text-xl font-semibold mb-4 text-primary">The Best Option</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Our values at Peak Vehicle Insurance encompass integrity, innovation, reliability, and community. We prioritize transparency and honesty in all interactions, constantly innovating to meet evolving needs, ensuring reliable 
                protection, and fostering a sense of belonging within our community.
              </p>
              <p className="text-lg font-semibold text-primary">
                "Zimnat: Where Your Vehicle's Protection Matters Most"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="container mx-auto px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Ready to Get Protected?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of satisfied customers who trust Zimnat for their vehicle insurance needs. 
            Get a personalized quote today and experience the difference.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-primary hover:bg-primary-dark">
              Get a Quote
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MotorInsurance;