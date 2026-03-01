import { useState, useEffect, useCallback } from 'react'
import { marketplaceAPI } from '../services/api'
import { Search, Box, Zap, Building2, SlidersHorizontal, X, Star, Sun } from 'lucide-react'

// --- Badge ------------------------------------------------------------------
function Badge({ children, color = 'default' }) {
  const cls = {
    default: 'bg-gray-50  text-gray-500  border-gray-200',
    green:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue:    'bg-sky-50    text-sky-700    border-sky-200',
    amber:   'bg-amber-50  text-amber-700  border-amber-200',
    purple:  'bg-violet-50 text-violet-700 border-violet-200',
  }[color] || 'bg-gray-50 text-gray-500 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cls}`}>
      {children}
    </span>
  )
}

function Loader() {
  return (
    <div className="flex items-center justify-center gap-3 py-20">
      <span className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-gray-400 text-sm">Loading products</span>
    </div>
  )
}

function StatCell({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
      <p className="text-gray-400 text-[10px] mb-0.5">{label}</p>
      <p className="font-semibold text-gray-900 text-sm">{value || ''}</p>
    </div>
  )
}

// --- Panel card -------------------------------------------------------------
function PanelCard({ panel, index }) {
  return (
    <div
      className="group relative bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 hover:border-sky-100 transition-all duration-300 overflow-hidden opacity-0"
      style={{ animation: `slideUpFade 0.5s ease-out ${index * 50}ms forwards` }}
    >
      <div className="absolute top-0 left-0 h-[3px] w-0 group-hover:w-full transition-all duration-500 rounded-t-2xl bg-gradient-to-r from-sky-400 to-blue-500" />

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center mb-2 shadow-sm shadow-sky-200 group-hover:scale-110 transition-transform duration-300">
            <Box className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug truncate">{panel.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{panel.product_id || ''}</p>
        </div>
        {panel.score > 0 && (
          <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold flex-shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            {panel.score}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatCell label="Power"      value={`${panel.panel_rated_power} W`} />
        <StatCell label="Efficiency" value={panel.module_efficiency ? `${panel.module_efficiency}%` : null} />
        <StatCell label="Warranty"   value={panel.warranty_years ? `${panel.warranty_years} yr` : null} />
        <StatCell label="Price"      value={panel.price ? `${panel.price.toLocaleString()} MAD` : null} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {panel.brand  && <Badge color="blue">{panel.brand}</Badge>}
          {panel.type   && <Badge>{panel.type}</Badge>}
        </div>
        {panel.vendor && (
          <span className="text-[11px] text-gray-400 truncate max-w-[100px]">
            {panel.vendor.company_name || panel.vendor.email}
          </span>
        )}
      </div>
    </div>
  )
}

// --- Inverter card ----------------------------------------------------------
function InverterCard({ inv, index }) {
  return (
    <div
      className="group relative bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 hover:border-amber-100 transition-all duration-300 overflow-hidden opacity-0"
      style={{ animation: `slideUpFade 0.5s ease-out ${index * 50}ms forwards` }}
    >
      <div className="absolute top-0 left-0 h-[3px] w-0 group-hover:w-full transition-all duration-500 rounded-t-2xl bg-gradient-to-r from-amber-400 to-orange-500" />

      <div className="mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-2 shadow-sm shadow-amber-200 group-hover:scale-110 transition-transform duration-300">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{inv.name}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{inv.product_id || ''}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatCell label="AC Power"   value={`${inv.nominal_ac_power_kw} kW`} />
        <StatCell label="Efficiency" value={inv.efficiency_max ? `${inv.efficiency_max}%` : null} />
        <StatCell label="Phase"      value={inv.phase_type ? inv.phase_type.charAt(0).toUpperCase() + inv.phase_type.slice(1) : null} />
        <StatCell label="Price"      value={inv.price ? `${inv.price.toLocaleString()} MAD` : null} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {inv.brand      && <Badge color="amber">{inv.brand}</Badge>}
          {inv.phase_type && <Badge color="purple">{inv.phase_type}-phase</Badge>}
        </div>
        {inv.vendor && (
          <span className="text-[11px] text-gray-400 truncate max-w-[100px]">
            {inv.vendor.company_name || inv.vendor.email}
          </span>
        )}
      </div>
    </div>
  )
}

// --- Vendor card ------------------------------------------------------------
function VendorCard({ vendor, index }) {
  return (
    <div
      className="group bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 hover:border-amber-100 transition-all duration-300 opacity-0"
      style={{ animation: `slideUpFade 0.5s ease-out ${index * 60}ms forwards` }}
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-200 group-hover:scale-110 transition-transform duration-300">
        <Building2 className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{vendor.company_name || vendor.email}</p>
        <p className="text-xs text-gray-400 truncate">{vendor.email}</p>
      </div>
      <div className="flex gap-4 text-center text-xs flex-shrink-0">
        <div>
          <p className="font-bold text-sky-600 text-base">{vendor.panel_count}</p>
          <p className="text-gray-400">Panels</p>
        </div>
        <div>
          <p className="font-bold text-amber-600 text-base">{vendor.inverter_count}</p>
          <p className="text-gray-400">Inverters</p>
        </div>
      </div>
    </div>
  )
}

// --- Main page --------------------------------------------------------------
const TABS = [
  { id: 'panels',    label: 'Panels',    icon: Box,       gradient: 'from-sky-400 to-blue-500',    activeBg: 'bg-sky-50  text-sky-700  ring-sky-200'  },
  { id: 'inverters', label: 'Inverters', icon: Zap,       gradient: 'from-amber-400 to-orange-500', activeBg: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { id: 'vendors',   label: 'Vendors',   icon: Building2, gradient: 'from-emerald-400 to-green-500', activeBg: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
]

const inputCls = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition-all'

export default function Marketplace() {
  const [tab,        setTab       ] = useState('panels')
  const [panels,     setPanels    ] = useState([])
  const [inverters,  setInverters ] = useState([])
  const [vendors,    setVendors   ] = useState([])
  const [loading,    setLoading   ] = useState(true)
  const [search,     setSearch    ] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [filters,    setFilters   ] = useState({ min_power: '', max_power: '', min_efficiency: '', phase_type: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: 100 }
      if (search) params.brand = search
      if (filters.min_power) params.min_power = filters.min_power
      if (filters.max_power) params.max_power = filters.max_power
      if (tab === 'panels'    && filters.min_efficiency) params.min_efficiency = filters.min_efficiency
      if (tab === 'inverters' && filters.phase_type)     params.phase_type     = filters.phase_type

      if (tab === 'panels') {
        const { data } = await marketplaceAPI.getPanels(params);    setPanels(data)
      } else if (tab === 'inverters') {
        const { data } = await marketplaceAPI.getInverters(params); setInverters(data)
      } else {
        const { data } = await marketplaceAPI.getVendors({ limit: 100 }); setVendors(data)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [tab, search, filters])

  useEffect(() => { load() }, [load])

  const clearFilters = () => setFilters({ min_power: '', max_power: '', min_efficiency: '', phase_type: '' })
  const hasFilters   = Object.values(filters).some(Boolean)
  const activeTab    = TABS.find(t => t.id === tab)

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-0"
        style={{ animation: 'slideUpFade 0.5s ease-out 0.05s forwards' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200">
              <Sun className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-widest">Catalog</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Solar Products</h1>
          <p className="text-gray-400 text-sm mt-0.5">Browse certified solar panels, inverters, and suppliers</p>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-2 opacity-0"
        style={{ animation: 'slideUpFade 0.5s ease-out 0.12s forwards' }}
      >
        {TABS.map(({ id, label, icon: Icon, gradient }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
              tab === id
                ? 'bg-white border-gray-200 text-gray-900 shadow-md shadow-black/5'
                : 'bg-transparent border-transparent text-gray-400 hover:text-gray-700 hover:bg-white hover:border-gray-100'
            }`}
          >
            <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <Icon className="w-3 h-3 text-white" />
            </div>
            {label}
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      {tab !== 'vendors' && (
        <div
          className="flex gap-3 flex-wrap opacity-0"
          style={{ animation: 'slideUpFade 0.5s ease-out 0.18s forwards' }}
        >
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by brand"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition-all shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all shadow-sm ${
              hasFilters
                ? 'border-amber-200 text-amber-700 bg-amber-50'
                : 'border-gray-200 text-gray-500 bg-white hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasFilters && <span className="w-2 h-2 rounded-full bg-amber-500" />}
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-700 px-2 transition-colors">
              Clear
            </button>
          )}
        </div>
      )}

      {/* Filter panel */}
      {showFilter && tab !== 'vendors' && (
        <div
          className="bg-white border border-gray-100 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4 shadow-sm opacity-0"
          style={{ animation: 'slideUpFade 0.4s ease-out forwards' }}
        >
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Min Power (W/kW)</label>
            <input type="number" min="0" placeholder="e.g. 400" value={filters.min_power}
              onChange={e => setFilters({ ...filters, min_power: e.target.value })}
              className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Max Power (W/kW)</label>
            <input type="number" min="0" placeholder="e.g. 600" value={filters.max_power}
              onChange={e => setFilters({ ...filters, max_power: e.target.value })}
              className={inputCls} />
          </div>
          {tab === 'panels' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Min Efficiency (%)</label>
              <input type="number" min="0" max="100" placeholder="e.g. 20" value={filters.min_efficiency}
                onChange={e => setFilters({ ...filters, min_efficiency: e.target.value })}
                className={inputCls} />
            </div>
          )}
          {tab === 'inverters' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Phase Type</label>
              <select value={filters.phase_type}
                onChange={e => setFilters({ ...filters, phase_type: e.target.value })}
                className={inputCls}>
                <option value="">Any</option>
                <option value="single">Single</option>
                <option value="three">Three</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <Loader />
      ) : tab === 'panels' ? (
        panels.length === 0
          ? <EmptyState message="No panels found matching your filters." />
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {panels.map((p, i) => <PanelCard key={p.id} panel={p} index={i} />)}
            </div>
      ) : tab === 'inverters' ? (
        inverters.length === 0
          ? <EmptyState message="No inverters found." />
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {inverters.map((inv, i) => <InverterCard key={inv.id} inv={inv} index={i} />)}
            </div>
      ) : (
        vendors.length === 0
          ? <EmptyState message="No vendors registered yet." link="/register?role=vendor" linkText="Be the first!" />
          : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.map((v, i) => <VendorCard key={v.id} vendor={v} index={i} />)}
            </div>
      )}
    </div>
  )
}

function EmptyState({ message, link, linkText }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
        <Sun className="w-6 h-6 text-amber-400" />
      </div>
      <p className="text-gray-500 text-sm">
        {message}
        {link && <> <a href={link} className="text-amber-600 hover:underline font-medium">{linkText}</a></>}
      </p>
    </div>
  )
}
