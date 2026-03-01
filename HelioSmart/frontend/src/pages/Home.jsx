import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import {
  Sun, FileText, TrendingUp, ShoppingBag, Sparkles,
  Building2, ArrowRight, ChevronRight, Activity, Shield,
  Globe, Zap, CheckCircle, Star,
} from 'lucide-react'

// --- Scroll-reveal hook --------------------------------------------------
function useInView(opts) {
  var options = opts || {}
  var ref = useRef(null)
  var arr = useState(false)
  var inView = arr[0]
  var setInView = arr[1]
  useEffect(function() {
    var el = ref.current
    if (!el) return
    var obs = new IntersectionObserver(
      function(entries) {
        var entry = entries[0]
        if (entry.isIntersecting) { setInView(true); obs.unobserve(el) }
      },
      Object.assign({ threshold: 0.12 }, options)
    )
    obs.observe(el)
    return function() { obs.disconnect() }
  }, [])
  return [ref, inView]
}

// --- Animated counter hook -----------------------------------------------
function useCountUp(target, active, duration) {
  duration = duration || 1600
  var displayArr = useState('0')
  var display = displayArr[0]
  var setDisplay = displayArr[1]
  useEffect(function() {
    if (!active) return
    var str = String(target)
    var num = parseFloat(str)
    var suffix = str.replace(/[\d.]/g, '')
    if (isNaN(num)) { setDisplay(str); return }
    var start = null
    function step(ts) {
      if (!start) start = ts
      var p = Math.min((ts - start) / duration, 1)
      var e = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.floor(e * num) + suffix)
      if (p < 1) requestAnimationFrame(step)
      else setDisplay(str)
    }
    requestAnimationFrame(step)
  }, [active, target, duration])
  return display
}

// --- Data ----------------------------------------------------------------
const features = [
  {
    icon: FileText,
    title: 'Solar Estimations',
    description: 'AI roof detection, precise panel layout, full yield forecast and financial breakdown in minutes.',
    link: '/estimations/create',
    gradient: 'from-amber-400 to-orange-500',
    glow: 'shadow-amber-200',
    badge: 'Core Feature',
    badgeColor: 'bg-orange-50 text-orange-600 border-orange-100',
    accentFrom: '#f59e0b', accentTo: '#f97316',
  },
  {
    icon: ShoppingBag,
    title: 'Marketplace',
    description: 'Browse certified panels and inverters from verified Moroccan suppliers with transparent pricing.',
    link: '/marketplace',
    gradient: 'from-sky-400 to-blue-500',
    glow: 'shadow-sky-200',
    badge: 'Live',
    badgeColor: 'bg-sky-50 text-sky-600 border-sky-100',
    accentFrom: '#38bdf8', accentTo: '#3b82f6',
  },
  {
    icon: Sparkles,
    title: 'AI Solar Assistant',
    description: 'Ask anything about solar in Arabic, French or English  voice input and text-to-speech supported.',
    link: '/chatbot',
    gradient: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-200',
    badge: 'AI  3 Languages',
    badgeColor: 'bg-violet-50 text-violet-600 border-violet-100',
    accentFrom: '#8b5cf6', accentTo: '#9333ea',
  },
  {
    icon: TrendingUp,
    title: 'Production Analysis',
    description: 'PVWatts-powered generation forecasts, CO2 savings tracker, and full ROI payback projections.',
    link: '/estimations/create',
    gradient: 'from-emerald-400 to-green-500',
    glow: 'shadow-emerald-200',
    badge: 'PVWatts',
    badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    accentFrom: '#34d399', accentTo: '#22c55e',
  },
]

const stats = [
  { value: '100+', label: 'Panel Models',    icon: Zap      },
  { value: '50+',  label: 'Inverter Models', icon: Activity },
  { value: 'AI',   label: 'Roof Detection',  icon: Sun      },
  { value: '3',    label: 'Languages',       icon: Globe    },
]

const trust = ['Free to use', 'AI-powered roof detection', 'Verified vendors']

// --- Animated stat card --------------------------------------------------
function StatCard({ value, label, icon: Icon, active, delay }) {
  const count = useCountUp(value, active)
  return (
    <div
      className="flex flex-col items-center gap-2 py-10 px-6 text-center opacity-0 translate-y-4"
      style={{ animation: active ? `slideUpFade 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms forwards` : 'none' }}
    >
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-2">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-4xl font-bold text-white tabular-nums">{count}</div>
      <div className="text-sm text-orange-100 font-medium">{label}</div>
    </div>
  )
}

// --- Main page -----------------------------------------------------------
export default function Home() {
  const [heroRef,  heroInView ] = useInView({ threshold: 0.05 })
  const [featRef,  featInView ] = useInView()
  const [statsRef, statsInView] = useInView()
  const [whyRef,   whyInView  ] = useInView()
  const [ctaRef,   ctaInView  ] = useInView()

  return (
    <div className="space-y-20">

      {/* HERO */}
      <section ref={heroRef} className="relative text-center pt-10 pb-6 overflow-hidden">

        <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-amber-50 via-orange-50/40 to-transparent pointer-events-none" />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[300px] bg-amber-400/18 blur-[110px] pointer-events-none animate-pulse-slow" />
        <div className="absolute top-12 left-[15%]  w-[260px] h-[180px] bg-sky-400/10    blur-[80px]  pointer-events-none" />
        <div className="absolute top-12 right-[15%] w-[260px] h-[180px] bg-orange-400/10 blur-[80px]  pointer-events-none" />

        <div className="absolute inset-0 hero-dots pointer-events-none" />

        <div className="relative space-y-7">

          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 border border-amber-200 text-amber-700 text-xs font-semibold tracking-wide opacity-0"
            style={{ animation: heroInView ? 'slideUpFade 0.5s ease-out 0.05s forwards' : 'none' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Morocco's #1 Solar Intelligence Platform
          </div>

          <div
            className="flex justify-center opacity-0"
            style={{ animation: heroInView ? 'scaleIn 0.75s cubic-bezier(0.16,1,0.3,1) 0.15s forwards' : 'none' }}
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute rounded-full bg-amber-300/25 animate-ping" style={{ width: 112, height: 112 }} />
              <div className="absolute rounded-full border-2 border-dashed border-amber-300/35 animate-spin-slow"    style={{ width: 136, height: 136 }} />
              <div className="absolute rounded-full border-[1.5px] border-dashed border-orange-200/30 animate-spin-reverse" style={{ width: 164, height: 164 }} />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 blur-2xl opacity-45 scale-110" />
              <div className="relative w-[88px] h-[88px] bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl shadow-amber-400/60 animate-float">
                <Sun style={{ width: 46, height: 46 }} className="text-white drop-shadow-md" />
              </div>
            </div>
          </div>

          <div
            className="space-y-4 opacity-0"
            style={{ animation: heroInView ? 'slideUpFade 0.65s ease-out 0.28s forwards' : 'none' }}
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
              Harness Morocco's{' '}
              <span className="bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500 bg-clip-text text-transparent animate-gradient-x">
                Solar Power
              </span>
            </h1>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
              AI-powered solar estimations, a verified supplier marketplace, and a smart multilingual
              assistant  all in one professional platform built for Morocco's clean energy future.
            </p>
          </div>

          <div
            className="flex flex-wrap justify-center gap-3 pt-1 opacity-0"
            style={{ animation: heroInView ? 'slideUpFade 0.6s ease-out 0.42s forwards' : 'none' }}
          >
            <Link
              to="/estimations/create"
              className="relative inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-amber-300/45 text-sm overflow-hidden group/p"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Free Estimation
                <ArrowRight className="w-4 h-4 group-hover/p:translate-x-1 transition-transform duration-200" />
              </span>
              <span className="absolute inset-0 translate-x-[-100%] group-hover/p:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            </Link>

            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all text-sm"
            >
              <ShoppingBag className="w-4 h-4" /> Browse Products
            </Link>
          </div>

          <div
            className="flex flex-wrap justify-center gap-5 pt-1 opacity-0"
            style={{ animation: heroInView ? 'slideUpFade 0.6s ease-out 0.56s forwards' : 'none' }}
          >
            {trust.map(t => (
              <span key={t} className="flex items-center gap-1.5 text-sm text-gray-400">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                {t}
              </span>
            ))}
          </div>

        </div>
      </section>

      {/* FEATURES */}
      <section ref={featRef}>
        <div
          className="text-center mb-10 opacity-0"
          style={{ animation: featInView ? 'slideUpFade 0.6s ease-out forwards' : 'none' }}
        >
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">Platform Features</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Everything you need, in one place</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            From estimation to installation, HelioSmart covers every step of Morocco's solar journey.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <Link
                key={i}
                to={feature.link}
                className="group relative bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-2 transition-all duration-300 overflow-hidden opacity-0"
                style={{ animation: featInView ? `slideUpFade 0.65s cubic-bezier(0.16,1,0.3,1) ${80 + i * 100}ms forwards` : 'none' }}
              >
                <div
                  className="absolute top-0 left-0 h-[3px] w-0 group-hover:w-full transition-all duration-500 rounded-t-2xl"
                  style={{ background: `linear-gradient(to right, ${feature.accentFrom}, ${feature.accentTo})` }}
                />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `linear-gradient(135deg, ${feature.accentFrom}09, ${feature.accentTo}04)` }}
                />
                <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-md ${feature.glow} mb-5 group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border mb-3 ${feature.badgeColor}`}>
                  {feature.badge}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{feature.description}</p>
                <div className="mt-5 flex items-center gap-1 text-orange-500 text-xs font-semibold group-hover:gap-2 transition-all duration-150">
                  Learn more
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* STATS */}
      <section ref={statsRef} className="relative rounded-3xl overflow-hidden">
        <div
          className="absolute inset-0 animate-gradient-x-slow"
          style={{ background: 'linear-gradient(90deg,#f59e0b,#f97316,#fb923c,#f59e0b)', backgroundSize: '300% auto' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/12 to-transparent animate-shine" />
        </div>
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-0 divide-y md:divide-y-0 divide-x divide-white/20 py-2">
          {stats.map(({ value, label, icon: Icon }, i) => (
            <StatCard key={label} value={value} label={label} icon={Icon} active={statsInView} delay={i * 140} />
          ))}
        </div>
      </section>

      {/* WHY HELIOSMART */}
      <section ref={whyRef}>
        <div
          className="text-center mb-8 opacity-0"
          style={{ animation: whyInView ? 'slideUpFade 0.6s ease-out forwards' : 'none' }}
        >
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">Why Choose Us</p>
          <h2 className="text-3xl font-bold text-gray-900">Built for Morocco's solar future</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Star,
              title: 'AI-Powered Precision',
              text: 'Our roof detection AI analyses satellite imagery to calculate the exact usable area and optimal panel placement.',
              color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', hover: 'hover:border-amber-200 hover:shadow-amber-100/80', iconBg: 'bg-amber-100',
            },
            {
              icon: Shield,
              title: 'Verified Suppliers',
              text: 'Every vendor on our marketplace is screened and approved. Get transparent pricing from certified Moroccan suppliers.',
              color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-100', hover: 'hover:border-sky-200 hover:shadow-sky-100/80', iconBg: 'bg-sky-100',
            },
            {
              icon: Globe,
              title: 'Built for Morocco',
              text: 'Darija, French, and Arabic support, local irradiance data, and MAD pricing  designed for Moroccan conditions.',
              color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', hover: 'hover:border-emerald-200 hover:shadow-emerald-100/80', iconBg: 'bg-emerald-100',
            },
          ].map(({ icon: Icon, title, text, color, bg, border, hover, iconBg }, i) => (
            <div
              key={title}
              className={`${bg} border ${border} ${hover} rounded-2xl p-7 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 opacity-0`}
              style={{ animation: whyInView ? `slideUpFade 0.65s cubic-bezier(0.16,1,0.3,1) ${i * 110}ms forwards` : 'none' }}
            >
              <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mb-5`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-base">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* VENDOR CTA */}
      <section
        ref={ctaRef}
        className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12 overflow-hidden opacity-0"
        style={{ animation: ctaInView ? 'slideUpFade 0.75s cubic-bezier(0.16,1,0.3,1) forwards' : 'none' }}
      >
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-amber-500/20 blur-[80px] pointer-events-none animate-pulse-slow" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-orange-500/10 blur-[60px] pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="relative flex flex-col md:flex-row items-center gap-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xl shadow-amber-900/50 animate-float">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-semibold mb-3">
              <Shield className="w-3 h-3" /> Verified Vendor Program
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Are you a solar supplier?</h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
              List your panels and inverters on the HelioSmart marketplace and get discovered by certified installers across Morocco.
            </p>
          </div>
          <Link
            to="/register?role=vendor"
            className="relative inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-xl shadow-amber-900/40 whitespace-nowrap flex-shrink-0 text-sm overflow-hidden group/cta"
          >
            <span className="relative z-10 flex items-center gap-2">
              List Your Products
              <ArrowRight className="w-4 h-4 group-hover/cta:translate-x-1 transition-transform duration-200" />
            </span>
            <span className="absolute inset-0 translate-x-[-100%] group-hover/cta:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </Link>
        </div>
      </section>

    </div>
  )
}
