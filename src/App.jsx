export default function SpatialLinkWebsite() {
  const services = [
    {
      title: 'Crop Health Monitoring',
      text: 'Multispectral drone imagery detects pests, disease, nutrient deficiency, and crop stress early.'
    },
    {
      title: 'Precision Spraying',
      text: 'Apply fertilizers and pesticides only where needed to reduce operational costs.'
    },
    {
      title: 'GIS Mapping & Analytics',
      text: 'Generate accurate field intelligence reports for smarter agricultural planning.'
    },
  ]

  const testimonials = [
    {
      name: 'John Banda',
      role: 'Commercial Farmer',
      quote: 'Spatial Link helped us identify irrigation problems early and improved our maize yield significantly.'
    },
    {
      name: 'Grace Phiri',
      role: 'Farmer Cooperative Leader',
      quote: 'The drone monitoring reports made it easier for our farmers to reduce fertilizer waste.'
    },
    {
      name: 'Patrick Mbewe',
      role: 'Agricultural Officer',
      quote: 'Their GIS analytics provide real-time insights that traditional methods cannot match.'
    }
  ]

  const plans = [
    {
      name: 'Starter',
      price: 'MWK 40K',
      features: ['2 Drone Visits', 'Basic Crop Report', 'WhatsApp Support']
    },
    {
      name: 'Professional',
      price: 'MWK 150K',
      features: ['Weekly Monitoring', 'NDVI Analysis', 'Precision Spraying']
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      features: ['Large Estate Coverage', 'Dedicated Analytics', 'Custom GIS Dashboard']
    }
  ]

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans scroll-smooth">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/mnt/data/49e1efc3-0a37-455e-bd2c-10c568b860b3.png"
              alt="Spatial Link Logo"
              className="w-12 h-12 object-contain"
            />

            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-wide">
                SPATIAL LINK
              </h1>
              <p className="text-xs text-slate-500">
                Drone Powered Precision Agriculture
              </p>
            </div>
          </div>

          <nav className="hidden lg:flex gap-6 text-sm font-medium">
            <a href="#services" className="hover:text-green-600">Services</a>
            <a href="#dashboard" className="hover:text-green-600">Dashboard</a>
            <a href="#pricing" className="hover:text-green-600">Pricing</a>
            <a href="#gallery" className="hover:text-green-600">Gallery</a>
            <a href="#contact" className="hover:text-green-600">Contact</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-green-50 via-white to-blue-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="uppercase tracking-[5px] text-green-600 font-semibold text-sm mb-4">
              FDH–MUST Graduate Initiative
            </p>

            <h2 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            Smart Drone Farming for Malawi.
            </h2>

            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              Spatial Link combines drones, GIS mapping, remote sensing, and AI-powered analytics to deliver real-time agricultural intelligence to Malawian farmers.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-green-600 hover:bg-green-700 text-white px-7 py-4 rounded-2xl font-semibold shadow-lg transition">
                Book Drone Survey
              </button>

              <button className="border border-slate-300 px-7 py-4 rounded-2xl font-semibold hover:border-green-600 transition">
                View Investor Deck
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="bg-white rounded-[30px] shadow-2xl border border-slate-100 p-8">
              <img
                src="spatial.png"
                alt="Spatial Link"
                className="w-full rounded-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {[
            ['2M+', 'Smallholder Farmers'],
            ['95%', 'Field Analysis Accuracy'],
            ['5X', 'Faster Monitoring'],
            ['20K+', 'Potential Users']
          ].map((item, index) => (
            <div key={index} className="bg-white/5 rounded-3xl p-8 border border-white/10">
              <h3 className="text-4xl md:text-5xl font-bold text-green-400 mb-3">
                {item[0]}
              </h3>
              <p className="text-slate-300">{item[1]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4">
              Precision Agriculture Solutions
            </h3>
            <p className="text-slate-600 max-w-3xl mx-auto">
              Advanced geospatial intelligence and drone-powered monitoring for smarter, data-driven agriculture.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-slate-50 border border-slate-200 rounded-3xl p-8 hover:shadow-2xl transition"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 mb-6"></div>
                <h4 className="text-2xl font-semibold mb-4">{service.title}</h4>
                <p className="text-slate-600 leading-relaxed">{service.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Drone Map Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-green-50">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-4xl font-bold mb-6">
              Interactive Drone Intelligence Map
            </h3>

            <p className="text-slate-600 text-lg leading-relaxed mb-8">
              Monitor fields, identify stressed crops, analyze irrigation zones, and generate precision agriculture insights using GIS-powered drone mapping.
            </p>

            <div className="space-y-4">
              {[
                'Real-time crop monitoring',
                'NDVI vegetation analysis',
                'Field-level health insights',
                'GPS-enabled mapping',
                'Precision irrigation intelligence'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <p>{feature}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[30px] p-8 text-white shadow-2xl">
            <div className="aspect-video rounded-2xl border border-white/10 flex items-center justify-center bg-gradient-to-br from-green-700 to-blue-900">
              <div className="text-center">
                <p className="text-2xl font-bold mb-3">Live Drone Map</p>
                <p className="text-slate-300">Dummy GIS Visualization Placeholder</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard */}
      <section id="dashboard" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4">
              Farm Intelligence Dashboard
            </h3>
            <p className="text-slate-600">
              Example analytics powered by Spatial Link drone monitoring.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
              <h4 className="font-semibold text-xl mb-6">Crop Health</h4>
              <div className="h-48 rounded-2xl bg-gradient-to-t from-green-600 to-green-300 flex items-end p-4">
                <div className="w-full grid grid-cols-5 gap-2 items-end h-full">
                  {[30, 60, 50, 90, 75].map((height, i) => (
                    <div key={i} style={{ height: `${height}%` }} className="bg-white rounded-xl"></div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
              <h4 className="font-semibold text-xl mb-6">Water Usage</h4>
              <div className="h-48 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-300 flex items-center justify-center text-white text-5xl font-bold">
                78%
              </div>
            </div>

            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
              <h4 className="font-semibold text-xl mb-6">Yield Forecast</h4>
              <div className="h-48 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex flex-col justify-center items-center text-white">
                <p className="text-5xl font-bold">+24%</p>
                <p className="mt-3 text-slate-300">Projected Increase</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="py-20 bg-slate-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4">
              Drone Imagery Gallery
            </h3>
            <p className="text-slate-600">
              Sample aerial agricultural imagery and GIS mapping visuals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map((item) => (
              <div key={item} className="aspect-video rounded-3xl bg-gradient-to-br from-green-500 to-blue-700 shadow-xl flex items-center justify-center text-white text-xl font-semibold">
                Drone Image {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4">
              Flexible Pricing Plans
            </h3>
            <p className="text-slate-600">
              Affordable precision agriculture packages for farms of all sizes.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div key={index} className="rounded-[30px] border border-slate-200 p-8 shadow-lg hover:shadow-2xl transition">
                <h4 className="text-2xl font-bold mb-3">{plan.name}</h4>
                <p className="text-4xl font-bold text-green-600 mb-6">{plan.price}</p>

                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <p>{feature}</p>
                    </div>
                  ))}
                </div>

                <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-semibold hover:bg-black transition">
                  Choose Plan
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4">
              What Farmers Say
            </h3>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {testimonials.map((item, index) => (
              <div key={index} className="bg-white/5 border border-white/10 rounded-3xl p-8">
                <p className="text-slate-300 leading-relaxed mb-6">
                  “{item.quote}”
                </p>

                <div>
                  <h4 className="font-semibold text-lg">{item.name}</h4>
                  <p className="text-slate-400 text-sm">{item.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Investor Section */}
      <section className="py-20 bg-gradient-to-br from-green-600 to-blue-700 text-white">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h3 className="text-4xl md:text-5xl font-bold mb-6">
            Investor Opportunity
          </h3>

          <p className="text-xl leading-relaxed mb-10 text-white/90">
            Spatial Link targets 20,000–40,000 potential users in Malawi with scalable drone-powered agricultural intelligence services.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white/10 rounded-3xl p-8 border border-white/10">
              <h4 className="text-5xl font-bold mb-3">$76K</h4>
              <p>Funding Ask</p>
            </div>

            <div className="bg-white/10 rounded-3xl p-8 border border-white/10">
              <h4 className="text-5xl font-bold mb-3">Year 2</h4>
              <p>Projected Break-even</p>
            </div>

            <div className="bg-white/10 rounded-3xl p-8 border border-white/10">
              <h4 className="text-5xl font-bold mb-3">$450K</h4>
              <p>Projected Year 5 Profit</p>
            </div>
          </div>

          <button className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-semibold shadow-lg hover:bg-slate-100 transition">
            Download Pitch Deck
          </button>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h3 className="text-4xl font-bold mb-6">
            Contact Spatial Link
          </h3>

          <p className="text-slate-600 text-lg mb-10">
            Ready to modernize agriculture with drone intelligence and GIS analytics?
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <input type="text" placeholder="Your Name" className="border border-slate-300 rounded-2xl px-5 py-4 focus:border-green-500 outline-none" />
            <input type="email" placeholder="Your Email" className="border border-slate-300 rounded-2xl px-5 py-4 focus:border-green-500 outline-none" />
          </div>

          <textarea rows="5" placeholder="Tell us about your project" className="w-full border border-slate-300 rounded-2xl px-5 py-4 focus:border-green-500 outline-none mb-6"></textarea>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-black transition">
              Send Message
            </button>

            <a
              href="https://wa.me/265999123456"
              className="bg-green-600 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-green-700 transition"
            >
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row justify-between items-center gap-6">
          <div>
            <p className="font-semibold text-white text-lg">
              SPATIAL LINK LIMITED
            </p>
            <p className="mt-2">
              Geospatial • Technology • Intelligence
            </p>
          </div>

          <div className="text-sm text-center lg:text-right">
            <p>Lilongwe, Malawi</p>
            <p>Drone-Powered Precision Agriculture Platform</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
