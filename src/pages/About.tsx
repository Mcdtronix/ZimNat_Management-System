import { Card, CardContent } from "@/components/ui/card";

const About = () => {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative h-64 bg-gradient-to-r from-slate-800 to-slate-600 text-white">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative container mx-auto px-4 h-full flex items-center justify-center">
          <h1 className="text-4xl md:text-5xl font-bold text-center">About Drive Peak</h1>
        </div>
      </section>

      {/* Company Overview */}
      <section className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold mb-6">DRIVE PEAK</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                DrivePeak is your trusted partner in vehicle insurance management. Our cutting-edge platform harnesses the latest technology to deliver seamless, efficient, and personalized solutions 
                tailored to your needs. With DrivePeak, you can navigate insurance processes effortlessly, ensuring peace of mind and financial security on the road ahead.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
                <p className="text-muted-foreground leading-relaxed">
                  To envision a future where vehicle insurance management transcends mere protection, 
                  becoming a cornerstone of empowerment, trust, and seamless mobility for all.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our mission is to revolutionize vehicle insurance management by leveraging cutting-edge technology, personalized service, and 
                  a relentless pursuit of innovation. Through transparent practices, proactive risk mitigation, and unwavering dedication to our 
                  customers, we aim to redefine the insurance experience, fostering safer roads, stronger communities, and greater peace of mind 
                  for drivers everywhere.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* History */}
      <section className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">Our History</h3>
              <p className="text-muted-foreground leading-relaxed">
                Established in 1995, our vehicle insurance management company has been a trusted name in the industry for two 
                over decades. With a commitment to innovation and customer satisfaction, we pioneered user-friendly 
                online platforms and personalized insurance options. Our reputation for reliability and transparency has solidified 
                us as leaders in the field, and we continue to evolve, leveraging cutting-edge technology to simplify insurance 
                management for all drivers.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Awards & Values */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">Awards</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our vehicle insurance management system has been honored with several prestigious awards, recognizing our commitment to 
                  excellence and innovation in the insurance industry. These awards highlight our dedication to providing superior solutions for drivers, 
                  backed by cutting-edge technology and exceptional customer service. From industry accolades for innovation to awards for outstanding service, our recognition speaks to our in 
                  ongoing efforts to exceed expectations and set new standards in vehicle insurance management.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">Our Ethos & Values</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Rooted in integrity and driven by innovation, our ethos revolves around providing transparent, reliable, and 
                  personalized insurance solutions. We prioritize customer satisfaction above all else, striving to exceed expectations 
                  with every interaction. With a commitment to excellence and a focus on continuous improvement, we aim to make 
                  insurance accessible and straightforward for all drivers, guided by our core values of integrity, innovation, and 
                  customer-centricity.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;