import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Image 
              src="/logo.png" 
              alt="SponsorPath" 
              width={200} 
              height={50}
              priority
              className="h-12 w-auto"
            />
          </div>
          
          <div className="hidden md:flex gap-8 items-center">
            <a href="#features" className="text-gray-700 hover:text-blue-600 font-semibold transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-gray-700 hover:text-blue-600 font-semibold transition-colors">
              How It Works
            </a>
            <a href="#job-sources" className="text-gray-700 hover:text-blue-600 font-semibold transition-colors">
              Job Sources
            </a>
            <a href="#pricing" className="text-gray-700 hover:text-blue-600 font-semibold transition-colors">
              Pricing
            </a>
          </div>

          <div className="flex gap-3">
            <button className="px-6 py-2.5 border-2 border-gray-200 rounded-lg font-bold hover:bg-gray-50 transition-colors">
              Sign In
            </button>
            <button className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold hover:shadow-lg transition-all">
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-blue-50/50 via-white to-green-50/50">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-blue-700 font-bold text-sm mb-6">
              🇬🇧 Built for UK Sponsorship & Post-Study Work
            </div>
            
            <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6">
              Upload Once.<br/>
              <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                AI Does Everything.
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Wake up to interview requests. Our AI searches 1000s of jobs daily, generates fresh ATS resumes for each role, 
              and auto-submits applications to UK sponsor companies — while you sleep.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all">
                Start Free Trial
              </button>
              <button className="px-8 py-4 border-2 border-gray-200 rounded-xl font-bold text-lg hover:bg-gray-50 transition-colors">
                Watch Demo →
              </button>
            </div>
          </div>

          {/* Automation Preview Card */}
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-green-600 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">
                📄
              </div>
              <p className="font-bold text-gray-700">Upload your resume once</p>
              <p className="text-sm text-gray-500">or build with our AI Resume Builder</p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4 items-center p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl shrink-0">
                  🔍
                </div>
                <div className="flex-1">
                  <h5 className="font-bold text-gray-800 text-sm">AI searches 1000s of jobs daily</h5>
                  <p className="text-xs text-gray-600">LinkedIn, Indeed, Reed, company websites + UK sponsors</p>
                </div>
              </div>

              <div className="flex gap-4 items-center p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-xl shrink-0">
                  ✨
                </div>
                <div className="flex-1">
                  <h5 className="font-bold text-gray-800 text-sm">Fresh resume per application</h5>
                  <p className="text-xs text-gray-600">Tailored to each JD, ATS-optimized, human-written</p>
                </div>
              </div>

              <div className="flex gap-4 items-center p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-xl shrink-0">
                  🚀
                </div>
                <div className="flex-1">
                  <h5 className="font-bold text-gray-800 text-sm">Auto-submits applications</h5>
                  <p className="text-xs text-gray-600">Direct to job boards & company career pages</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-2">
              30%
            </div>
            <div className="text-gray-600 font-semibold text-sm">Response Rate</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-2">
              24/7
            </div>
            <div className="text-gray-600 font-semibold text-sm">Automated Search</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-2">
              100%
            </div>
            <div className="text-gray-600 font-semibold text-sm">ATS Compatible</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-2">
              0
            </div>
            <div className="text-gray-600 font-semibold text-sm">Manual Work</div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-gradient-to-b from-white to-gray-50" id="how-it-works">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-6 py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-full text-sm font-bold uppercase mb-4">
              SIMPLE PROCESS
            </span>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Set It Once.<br/>Forget Forever.
            </h2>
            <p className="text-xl text-gray-600">AI handles everything from job search to application submission.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                num: '1', 
                title: 'Upload Resume', 
                desc: 'Upload your generic CV or use our AI Resume Builder. We extract all your info and build a perfect ATS-standard master profile.' 
              },
              { 
                num: '2', 
                title: 'AI Searches Daily', 
                desc: 'Our AI searches LinkedIn, Indeed, Reed, CWJobs, Totaljobs, and company career pages. Filters by UK sponsor status and match score.' 
              },
              { 
                num: '3', 
                title: 'Fresh Resume Generated', 
                desc: 'For each matched job, AI creates a tailored resume with rewritten summary, relevant skills, and job-specific experience bullets.' 
              },
              { 
                num: '4', 
                title: 'Auto-Submits Application', 
                desc: 'AI fills out applications, answers screening questions, and submits directly to job boards and company websites.' 
              },
              { 
                num: '5', 
                title: 'Track Everything', 
                desc: 'Monitor all applications in your dashboard. Get email alerts for every submission. See response rates and analytics.' 
              },
              { 
                num: '6', 
                title: 'Get Interviews', 
                desc: 'Wake up to interview requests in your inbox. Focus on interview prep, not application spam.' 
              },
            ].map((step) => (
              <div 
                key={step.num} 
                className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-xl hover:-translate-y-2 transition-all text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-green-600 text-white rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-4">
                  {step.num}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Job Sources */}
      <section className="py-24 bg-white" id="job-sources">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-6 py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-full text-sm font-bold uppercase mb-4">
              WHERE WE SEARCH
            </span>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Every Job Source.<br/>One Platform.
            </h2>
            <p className="text-xl text-gray-600">We search job boards AND company websites directly for maximum coverage.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Job Boards */}
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="w-2 h-2 bg-gradient-to-r from-blue-600 to-green-600 rounded-full"></span>
                Job Boards
              </h3>
              <div className="space-y-4">
                {[
                  { icon: '💼', name: 'LinkedIn', desc: 'Easy Apply + Standard applications' },
                  { icon: '🔵', name: 'Indeed', desc: "UK's largest job board" },
                  { icon: '📰', name: 'Reed.co.uk', desc: 'Specialist UK recruitment' },
                  { icon: '💻', name: 'CWJobs', desc: 'Tech & IT focus' },
                  { icon: '🎯', name: 'Totaljobs', desc: 'Graduate & professional roles' },
                ].map((source, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg flex items-center justify-center text-xl shrink-0">
                      {source.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800">{source.name}</h4>
                      <p className="text-sm text-gray-600">{source.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Company Websites */}
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="w-2 h-2 bg-gradient-to-r from-blue-600 to-green-600 rounded-full"></span>
                Company Career Pages
              </h3>
              <div className="space-y-4">
                {[
                  { icon: '🏢', name: 'UK Sponsor Companies', desc: '30,000+ licensed sponsors direct' },
                  { icon: '🚀', name: 'Tech Startups', desc: 'Revolut, Monzo, Wise, Deliveroo' },
                  { icon: '🏦', name: 'Finance Firms', desc: 'Banks, fintech, consulting' },
                  { icon: '⚙️', name: 'Engineering Companies', desc: 'Manufacturing, construction, energy' },
                  { icon: '🌐', name: 'Global Corporations', desc: 'Amazon, Google, Microsoft, Meta' },
                ].map((source, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg flex items-center justify-center text-xl shrink-0">
                      {source.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800">{source.name}</h4>
                      <p className="text-sm text-gray-600">{source.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-gradient-to-b from-white to-gray-50" id="features">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-6 py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-full text-sm font-bold uppercase mb-4">
              WHY SPONSORPATH
            </span>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              100% Automation.<br/>Zero Manual Work.
            </h2>
            <p className="text-xl text-gray-600">Set it once, let AI handle everything forever.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '🎯', title: 'Smart Job Matching', desc: 'AI calculates 0-100% fit score for each job. Only applies to roles where you\'re qualified (>40% match). Saves your reputation.', tag: 'Quality Protection' },
              { icon: '🇬🇧', title: 'UK Sponsor Intelligence', desc: 'Automatically detects which companies have UK sponsor licenses. Prioritizes sponsor jobs if you need sponsorship. 30K+ sponsors tracked.', tag: 'Visa-Aware' },
              { icon: '✨', title: 'Fresh Resume Per Job', desc: 'Generates a new, tailored CV for every single application. Rewrites summary, reorders skills, job-specific language. Not generic templates.', tag: 'ATS-Optimized' },
              { icon: '🤖', title: 'AI Screening Answers', desc: 'Automatically answers application questions like "Why this company?" with personalized, relevant responses based on your profile.', tag: 'Fully Automated' },
              { icon: '🛡️', title: 'Application Protection', desc: 'Hard stop for poor matches (<40%). Daily limits prevent spam. No fake skills ever added. We protect your reputation.', tag: 'Truth-Preserving' },
              { icon: '📊', title: 'Success Analytics', desc: 'Track response rates, interview conversions, top matched companies. See which skills get most traction. Optimize your profile.', tag: 'Data-Driven' },
            ].map((feature, idx) => (
              <div 
                key={idx} 
                className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-xl hover:-translate-y-2 transition-all"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-green-100 rounded-xl flex items-center justify-center text-3xl mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed mb-4">{feature.desc}</p>
                <span className="inline-block px-4 py-1.5 bg-gradient-to-r from-blue-100 to-green-100 text-blue-700 rounded-lg text-sm font-bold">
                  {feature.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Stop Manually Applying.<br/>Start Getting Interviews.
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 mb-10">
            Join UK candidates who wake up to interview requests — not application fatigue.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-10 py-4 bg-white text-gray-900 rounded-xl font-bold text-lg hover:shadow-2xl transition-all">
              Start Free Trial
            </button>
            <button className="px-10 py-4 border-2 border-white/30 text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-all">
              Book a Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Image 
                src="/logo.png" 
                alt="SponsorPath" 
                width={180} 
                height={45}
                className="h-10 w-auto mb-4 brightness-0 invert"
              />
              <p className="text-sm leading-relaxed">
                AI-powered job application automation for UK visa candidates. Upload once, AI handles everything forever.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#job-sources" className="hover:text-white transition-colors">Job Sources</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">UK Sponsor Database</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Visa Guides</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Success Stories</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2026 SponsorPath. Built with ❤️ for UK job seekers. Not immigration advice.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}