import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { vendorAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  Box, Zap, Plus, Trash2, Edit2, CheckCircle, XCircle,
  Clock, Building2, RefreshCw, AlertCircle, X,
  Brain, Upload, Loader2, FileText, Sparkles, ArrowLeft, Check,
  PackageOpen, Cpu, ScanLine, Database
} from 'lucide-react'

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    active:   { color: 'bg-green-100 text-green-700',  icon: CheckCircle, label: 'Active' },
    pending:  { color: 'bg-amber-100 text-amber-700',  icon: Clock,        label: 'Pending' },
    rejected: { color: 'bg-red-100 text-red-600',      icon: XCircle,      label: 'Rejected' },
  }
  const cfg = map[status] || map.pending
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  )
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
          <p className="text-gray-600 text-sm">{message}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  )
}

// ─── Panel form ───────────────────────────────────────────────────────────────
function PanelForm({ initial = {}, onSave, onCancel }) {
  const blank = {
    name: '', product_id: '', brand: '', type: 'Monocrystalline',
    panel_rated_power: '', module_efficiency: '', price: '', warranty_years: '',
    open_circuit_voltage: '', short_circuit_current: '', max_system_voltage: '', num_of_cells: '',
  }
  const [form, setForm] = useState({ ...blank, ...initial })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Convert numeric strings
      const payload = { ...form }
      ;['panel_rated_power','module_efficiency','price','warranty_years',
        'open_circuit_voltage','short_circuit_current','max_system_voltage','num_of_cells']
        .forEach(k => { if (payload[k] !== '' && payload[k] !== undefined) payload[k] = Number(payload[k]) })
      await onSave(payload)
    } finally {
      setSaving(false)
    }
  }

  const F = ({ label, field, type = 'text', required = false, placeholder = '' }) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        type={type} required={required} placeholder={placeholder}
        value={form[field] ?? ''}
        onChange={e => set(field, e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <F label="Panel Name" field="name" required />
        <F label="Product ID" field="product_id" />
        <F label="Brand" field="brand" />
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
            {['Monocrystalline','Polycrystalline','Thin-Film','Bifacial'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <F label="Rated Power (W)" field="panel_rated_power" type="number" required placeholder="e.g. 550" />
        <F label="Efficiency (%)" field="module_efficiency" type="number" placeholder="e.g. 21.2" />
        <F label="Price (USD)" field="price" type="number" placeholder="e.g. 1650" />
        <F label="Warranty (years)" field="warranty_years" type="number" placeholder="e.g. 25" />
        <F label="Open Circuit Voltage (V)" field="open_circuit_voltage" type="number" />
        <F label="Short Circuit Current (A)" field="short_circuit_current" type="number" />
        <F label="Number of Cells" field="num_of_cells" type="number" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-60 font-medium">
          {saving ? 'Saving…' : 'Submit for Review'}
        </button>
      </div>
    </form>
  )
}

// ─── Inverter form ────────────────────────────────────────────────────────────
function InverterForm({ initial = {}, onSave, onCancel }) {
  const blank = {
    name: '', product_id: '', brand: '', phase_type: 'single',
    nominal_ac_power_kw: '', efficiency_max: '', price: '', warranty: '',
    mppt_min_voltage: '', mppt_max_voltage: '', no_of_mppt_ports: '',
    max_strings_per_mppt: '', ip_rating: '', spd_included: false,
  }
  const [form, setForm] = useState({ ...blank, ...initial })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      ;['nominal_ac_power_kw','efficiency_max','price','warranty',
        'mppt_min_voltage','mppt_max_voltage','no_of_mppt_ports','max_strings_per_mppt']
        .forEach(k => { if (payload[k] !== '' && payload[k] !== undefined) payload[k] = Number(payload[k]) })
      await onSave(payload)
    } finally {
      setSaving(false)
    }
  }

  const F = ({ label, field, type = 'text', required = false, placeholder = '' }) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        type={type} required={required} placeholder={placeholder}
        value={form[field] ?? ''}
        onChange={e => set(field, e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <F label="Inverter Name" field="name" required />
        <F label="Product ID" field="product_id" />
        <F label="Brand" field="brand" />
        <div>
          <label className="block text-xs text-gray-500 mb-1">Phase Type</label>
          <select value={form.phase_type} onChange={e => set('phase_type', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
            <option value="single">Single-Phase</option>
            <option value="three">Three-Phase</option>
          </select>
        </div>
        <F label="AC Power (kW)" field="nominal_ac_power_kw" type="number" required placeholder="e.g. 5.0" />
        <F label="Max Efficiency (%)" field="efficiency_max" type="number" placeholder="e.g. 98.5" />
        <F label="Price (USD)" field="price" type="number" />
        <F label="Warranty (years)" field="warranty" type="number" />
        <F label="MPPT Min Voltage (V)" field="mppt_min_voltage" type="number" />
        <F label="MPPT Max Voltage (V)" field="mppt_max_voltage" type="number" />
        <F label="No. of MPPT Ports" field="no_of_mppt_ports" type="number" />
        <F label="IP Rating" field="ip_rating" placeholder="e.g. IP65" />
        <div className="flex items-center gap-2 mt-1">
          <input type="checkbox" id="spd" checked={form.spd_included}
            onChange={e => set('spd_included', e.target.checked)}
            className="w-4 h-4 accent-amber-500" />
          <label htmlFor="spd" className="text-sm text-gray-600">SPD Included</label>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-60 font-medium">
          {saving ? 'Saving…' : 'Submit for Review'}
        </button>
      </div>
    </form>
  )
}

// ─── Product table row ────────────────────────────────────────────────────────
function ProductRow({ item, type, onDelete, onEdit, isAdmin, onApprove, onReject }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <>
      {confirm && (
        <ConfirmModal
          message={`Delete "${item.name}"? This cannot be undone.`}
          onConfirm={async () => { await onDelete(item.id); setConfirm(false) }}
          onCancel={() => setConfirm(false)}
        />
      )}
      <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="py-3 px-4 text-sm font-medium text-gray-800">{item.name}</td>
        <td className="py-3 px-4 text-sm text-gray-500 hidden sm:table-cell">
          {type === 'panel' ? `${item.panel_rated_power} W` : `${item.nominal_ac_power_kw} kW`}
        </td>
        <td className="py-3 px-4 text-sm text-gray-500 hidden md:table-cell">
          {item.price ? `$${item.price.toLocaleString()}` : '—'}
        </td>
        <td className="py-3 px-4"><StatusBadge status={item.status} /></td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(item)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => setConfirm(true)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
            {isAdmin && item.status === 'pending' && (
              <>
                <button onClick={() => onApprove(item.id)} title="Approve"
                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button onClick={() => onReject(item.id)} title="Reject"
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    </>
  )
}

// ─── AI Processing Animation ─────────────────────────────────────────────────
function AIProcessingAnimation() {
  const [step, setStep] = useState(0)
  const steps = [
    { icon: ScanLine,    label: 'Reading your catalog…'      },
    { icon: Brain,       label: 'Identifying products…'       },
    { icon: Cpu,         label: 'Extracting specifications…'  },
    { icon: Database,    label: 'Structuring data…'           },
  ]
  useEffect(() => {
    const timers = steps.map((_, i) => setTimeout(() => setStep(i + 1), (i + 1) * 2200))
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 space-y-12">
      {/* Animated brain orb */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-40 h-40 rounded-full border-2 border-purple-200 animate-ping opacity-20" />
        <div className="absolute w-32 h-32 rounded-full border-2 border-purple-300 animate-ping opacity-30" style={{ animationDelay: '0.4s', animationDuration: '1.5s' }} />
        <div className="absolute w-24 h-24 rounded-full bg-purple-100 animate-pulse" style={{ animationDuration: '2s' }} />
        {/* Orbiting dot 1 */}
        <div className="absolute w-36 h-36" style={{ animation: 'spin 3s linear infinite' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-purple-400 rounded-full shadow-md shadow-purple-300" />
        </div>
        {/* Orbiting dot 2 */}
        <div className="absolute w-36 h-36" style={{ animation: 'spin 3s linear infinite', animationDelay: '-1s' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-violet-500 rounded-full shadow-md shadow-violet-300" />
        </div>
        {/* Orbiting dot 3 */}
        <div className="absolute w-36 h-36" style={{ animation: 'spin 3s linear infinite', animationDelay: '-2s' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-fuchsia-500 rounded-full" />
        </div>
        <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-2xl">
          <Brain className="w-10 h-10 text-white" />
        </div>
      </div>

      {/* Steps */}
      <div className="w-full max-w-sm space-y-3">
        {steps.map((s, i) => {
          const Icon = s.icon
          const done    = i < step
          const active  = i === step - 1 && step > 0 && step <= steps.length
          const waiting = i >= step
          return (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-700 ${
              done    ? 'bg-purple-50 border-purple-200 opacity-80' :
              active  ? 'bg-purple-100 border-purple-400 shadow-md scale-105' :
                        'bg-gray-50 border-gray-200 opacity-40'
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                done ? 'bg-purple-700' : active ? 'bg-purple-600' : 'bg-white/10'
              }`}>
                <Icon className={`w-4 h-4 ${done || active ? 'text-purple-700' : 'text-gray-400'}`} />
              </div>
              <span className={`text-sm font-medium flex-1 ${done || active ? 'text-purple-800' : 'text-gray-400'}`}>
                {s.label}
              </span>
              {done   && <CheckCircle className="w-4 h-4 text-purple-500" />}
              {active && <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />}
            </div>
          )
        })}
      </div>

      {/* Scanning bar */}
      <div className="w-full max-w-sm">
        <div className="h-1.5 bg-purple-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full transition-all duration-[2200ms] ease-out"
            style={{ width: `${Math.min(100, (step / steps.length) * 100)}%` }}
          />
        </div>
        <p className="text-center text-xs text-purple-400 mt-2 animate-pulse">AI is processing your catalog…</p>
      </div>

      {/* Inject spin keyframe once */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}


// ─── AI Extract Full-Page Flow ────────────────────────────────────────────────
function AIExtractFlow({ onBack, onImported }) {
  const [phase, setPhase] = useState('input')   // 'input' | 'processing' | 'review'
  const [mode,  setMode]  = useState('text')
  const [text,  setText]  = useState('')
  const [file,  setFile]  = useState(null)
  const [panels,    setPanels]    = useState([])
  const [inverters, setInverters] = useState([])
  const [extractErr, setExtractErr] = useState(null)
  const [importing, setImporting]  = useState(false)
  const [importMsg, setImportMsg]  = useState('')
  const fileRef = useRef()

  const handleExtract = async () => {
    if (!text.trim() && !file) return
    setPhase('processing')
    setExtractErr(null)
    try {
      const { data } = await vendorAPI.aiExtract({ text: text || undefined, file: file || undefined })
      setPanels(data.panels || [])
      setInverters(data.inverters || [])
      if (data.error) setExtractErr(data.error)
    } catch (err) {
      setExtractErr(err.response?.data?.detail || 'Extraction failed.')
      setPanels([])
      setInverters([])
    }
    // Small delay so animation completes visually
    await new Promise(r => setTimeout(r, 600))
    setPhase('review')
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const { data } = await vendorAPI.aiBulkImport({ panels, inverters })
      setImportMsg(`✅ ${data.panels_created} panel(s) and ${data.inverters_created} inverter(s) submitted for review.`)
      setTimeout(() => onImported(), 2000)
    } catch (err) {
      setImportMsg(`❌ ${err.response?.data?.detail || err.message}`)
    } finally {
      setImporting(false)
    }
  }

  const removePanel    = (i) => setPanels(ps => ps.filter((_, idx) => idx !== i))
  const removeInverter = (i) => setInverters(ps => ps.filter((_, idx) => idx !== i))
  const total = panels.length + inverters.length

  // ── Phase: input ──────────────────────────────────────────────────────────
  if (phase === 'input') return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-600 rounded-3xl p-8 text-white overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/5 rounded-full" />
        <button onClick={onBack} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <div className="flex items-start gap-5 relative z-10">
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
            <Brain className="w-9 h-9 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">AI Catalog Auto-Extract</h1>
            <p className="text-white/80 text-sm leading-relaxed">
              Paste your supplier catalog text or upload a file. Our AI reads it, identifies every solar panel and inverter, and extracts all technical specifications automatically.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-6 relative z-10">
          {['Reads any format', 'Extracts 20+ fields', '1-click import'].map(t => (
            <div key={t} className="flex items-center gap-1.5 text-sm text-white/90 bg-white/15 rounded-full px-3 py-1">
              <Sparkles className="w-3.5 h-3.5" /> {t}
            </div>
          ))}
        </div>
      </div>

      {/* Input toggle */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5 shadow-sm">
        <div className="flex gap-2">
          {[['text', FileText, 'Paste Text'], ['file', Upload, 'Upload File']].map(([id, Icon, label]) => (
            <button key={id} onClick={() => setMode(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                mode === id ? 'bg-purple-50 border-purple-400 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {mode === 'text' ? (
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={10}
            placeholder={`Paste your vendor catalog here…\n\nExample:\nSunPower SPR-400W-WHT-D\nBrand: SunPower  |  Power: 400W  |  Efficiency: 22.6%\nVoc: 49.1V  |  Isc: 10.26A  |  Vmpp: 41.7V  |  Impp: 9.59A\nDimensions: 1046×1690×35mm  |  Weight: 21.5kg\nTemp Coeff Pmax: -0.35%/°C  |  Warranty: 25yr  |  Price: 4500 MAD\n\nHuawei SUN2000-5KTL-M1\nAC Power: 5000W  |  Max Eff: 98.6%  |  Phase: single\nMPPT: 180-560V  |  Max DC Voltage: 600V\nWarranty: 10yr  |  Price: 12000 MAD`}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-0 focus:border-purple-400 resize-none transition-colors"
          />
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files?.[0] || null) }}
            className="border-2 border-dashed border-gray-300 hover:border-purple-400 rounded-xl p-12 text-center cursor-pointer transition-colors group"
          >
            <div className="w-14 h-14 bg-purple-50 group-hover:bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors">
              <Upload className="w-7 h-7 text-purple-400 group-hover:text-purple-600 transition-colors" />
            </div>
            <p className="text-gray-600 font-medium mb-1">Drop your catalog file here</p>
            <p className="text-sm text-gray-400">.txt · .csv · .json supported</p>
            {file && (
              <div className="mt-4 inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5 text-sm text-green-700 font-medium">
                <Check className="w-4 h-4" /> {file.name}
              </div>
            )}
            <input ref={fileRef} type="file" accept=".txt,.csv,.json"
              onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
          </div>
        )}

        <button
          onClick={handleExtract}
          disabled={!text.trim() && !file}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-purple-200 text-base"
        >
          <Brain className="w-5 h-5" /> Launch AI Extraction
        </button>
      </div>
    </div>
  )

  // ── Phase: processing ─────────────────────────────────────────────────────
  if (phase === 'processing') return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white border border-violet-200 rounded-3xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-4">
          <p className="text-white font-bold text-center">AI is analysing your catalog</p>
        </div>
        <AIProcessingAnimation />
      </div>
    </div>
  )

  // ── Phase: review ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#faf9f6]">

      {/* Sticky dark header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={onBack}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-gray-200" />
            <Sparkles className="w-4 h-4 text-violet-600" />
            <span className="text-gray-800 font-semibold text-sm">AI Extraction Results</span>
            <span className="text-[11px] bg-violet-100 text-violet-600 border border-violet-200 px-2.5 py-0.5 rounded-full font-medium tabular-nums">
              {total} product{total !== 1 ? 's' : ''}
            </span>
            {panels.length > 0 && (
              <span className="text-[11px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full hidden sm:inline">
                {panels.length} panel{panels.length !== 1 ? 's' : ''}
              </span>
            )}
            {inverters.length > 0 && (
              <span className="text-[11px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full hidden sm:inline">
                {inverters.length} inverter{inverters.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {extractErr && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {extractErr}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Empty state */}
        {total === 0 && (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl shadow-sm p-12 text-center">
            <PackageOpen className="w-12 h-12 text-amber-300 mx-auto mb-4" />
            <p className="font-semibold text-gray-800 mb-1">No products identified</p>
            <p className="text-sm text-gray-400 max-w-xs mx-auto">Try adding more specific specs — power (W), brand name, voltages, or dimensions.</p>
            <button onClick={() => setPhase('input')}
              className="mt-5 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors">
              ← Try Again
            </button>
          </div>
        )}

        {/* Panels table */}
        {panels.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 bg-blue-900/40 rounded flex items-center justify-center">
                <Box className="w-3 h-3 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Solar Panels</span>
              <span className="text-xs text-gray-500 bg-white/10 rounded-full px-2 py-0.5 tabular-nums">{panels.length}</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Type</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Power</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Efficiency</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Warranty</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Price</th>
                      <th className="w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {panels.map((p, i) => (
                      <tr key={i}
                        className="border-t border-gray-50 hover:bg-purple-50/40 transition-colors group"
                        style={{ animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${i * 50}ms` }}>
                        <td className="px-4 py-3.5 text-gray-400 font-mono text-xs">{String(i + 1).padStart(2, '0')}</td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-gray-800 leading-tight text-[13px]">{p.name || '—'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{p.brand || 'Unknown brand'}{p.product_id ? ` · ${p.product_id}` : ''}</p>
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <span className="text-[11px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-medium capitalize">
                            {p.type || 'mono'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-gray-800 tabular-nums">
                          {p.panel_rated_power ? <>{p.panel_rated_power}<span className="text-gray-400 font-normal text-xs ml-0.5">W</span></> : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-500 tabular-nums hidden md:table-cell">
                          {p.module_efficiency ? `${p.module_efficiency}%` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-500 hidden lg:table-cell">
                          {p.warranty_years ? `${p.warranty_years} yr` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-500 tabular-nums hidden md:table-cell">
                          {p.price ? `${Number(p.price).toLocaleString()} MAD` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button onClick={() => removePanel(i)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Inverters table */}
        {inverters.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 bg-amber-100 rounded flex items-center justify-center">
                <Zap className="w-3 h-3 text-amber-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Inverters</span>
              <span className="text-xs text-gray-500 bg-white/10 rounded-full px-2 py-0.5 tabular-nums">{inverters.length}</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Phase</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">AC Power</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Max Eff.</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Warranty</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Price</th>
                      <th className="w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {inverters.map((inv, i) => (
                      <tr key={i}
                        className="border-t border-gray-50 hover:bg-amber-50/40 transition-colors group"
                        style={{ animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${i * 50}ms` }}>
                        <td className="px-4 py-3.5 text-gray-400 font-mono text-xs">{String(i + 1).padStart(2, '0')}</td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-gray-800 leading-tight text-[13px]">{inv.name || '—'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{inv.brand || 'Unknown brand'}{inv.product_id ? ` · ${inv.product_id}` : ''}</p>
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <span className="text-[11px] bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full font-medium capitalize">
                            {inv.phase_type === 'three' ? '3-Phase' : '1-Phase'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-gray-800 tabular-nums">
                          {inv.ac_rated_power
                            ? inv.ac_rated_power >= 1000
                              ? <>{(inv.ac_rated_power / 1000).toFixed(1)}<span className="text-gray-400 font-normal text-xs ml-0.5">kW</span></>
                              : <>{inv.ac_rated_power}<span className="text-gray-400 font-normal text-xs ml-0.5">W</span></>
                            : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-500 tabular-nums hidden md:table-cell">
                          {inv.max_efficiency ? `${inv.max_efficiency}%` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-500 hidden lg:table-cell">
                          {inv.warranty_years ? `${inv.warranty_years} yr` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-500 tabular-nums hidden md:table-cell">
                          {inv.price ? `${Number(inv.price).toLocaleString()} MAD` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button onClick={() => removeInverter(i)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Bottom spacer for sticky footer */}
        <div className="h-24" />
      </div>

      {/* Sticky import footer */}
      {total > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-2 pointer-events-none">
          <div className="max-w-5xl mx-auto pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-2xl shadow-2xl shadow-black/10 px-6 py-4 flex items-center justify-between flex-wrap gap-4">
              {importMsg ? (
                <p className="text-sm font-medium text-gray-700 flex-1">{importMsg}</p>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-fuchsia-100 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-fuchsia-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {panels.length > 0 && `${panels.length} panel${panels.length !== 1 ? 's' : ''}`}
                        {panels.length > 0 && inverters.length > 0 && ' · '}
                        {inverters.length > 0 && `${inverters.length} inverter${inverters.length !== 1 ? 's' : ''}`}
                        {' '}ready to import
                      </p>
                      <p className="text-xs text-gray-400">Will be submitted as <span className="text-amber-500 font-medium">pending review</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setPhase('input')}
                      className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors">
                      ← Re-extract
                    </button>
                    <button onClick={handleImport} disabled={importing}
                      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-purple-200 transition-all text-sm">
                      {importing
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                        : <><Check className="w-4 h-4" /> Confirm &amp; Import {total}</>
                      }
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  )
}

export default function VendorDashboard() {
  const { user, isVendor, isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab]               = useState('panels')
  const [panels, setPanels]         = useState([])
  const [inverters, setInverters]   = useState([])
  const [loadingData, setLoadingData] = useState(false)
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState(null)
  const [error, setError]           = useState('')
  const [showAIView, setShowAIView] = useState(false)

  // Guard: redirect if not vendor/admin
  useEffect(() => {
    if (!authLoading && !isVendor) navigate('/login')
  }, [authLoading, isVendor, navigate])

  const loadPanels = useCallback(async () => {
    const { data } = await vendorAPI.listPanels()
    setPanels(data)
  }, [])

  const loadInverters = useCallback(async () => {
    const { data } = await vendorAPI.listInverters()
    setInverters(data)
  }, [])

  const reload = useCallback(async () => {
    setLoadingData(true)
    setError('')
    try {
      await (tab === 'panels' ? loadPanels() : loadInverters())
    } catch { setError('Failed to load products.') }
    finally { setLoadingData(false) }
  }, [tab, loadPanels, loadInverters])

  useEffect(() => { if (isVendor) reload() }, [isVendor, tab, reload])

  // Save (create or update)
  const handleSave = async (data) => {
    try {
      if (tab === 'panels') {
        editing ? await vendorAPI.updatePanel(editing.id, data) : await vendorAPI.createPanel(data)
      } else {
        editing ? await vendorAPI.updateInverter(editing.id, data) : await vendorAPI.createInverter(data)
      }
      setShowForm(false)
      setEditing(null)
      reload()
    } catch (err) {
      setError(err.response?.data?.detail || 'Save failed.')
    }
  }

  const handleDelete = async (id) => {
    try {
      tab === 'panels' ? await vendorAPI.deletePanel(id) : await vendorAPI.deleteInverter(id)
      reload()
    } catch { setError('Delete failed.') }
  }

  const handleApprove = async (id) => {
    await (tab === 'panels' ? vendorAPI.approvePanel(id) : vendorAPI.approveInverter(id))
    reload()
  }

  const handleReject = async (id) => {
    await (tab === 'panels' ? vendorAPI.rejectPanel(id) : vendorAPI.rejectInverter(id))
    reload()
  }

  const openAdd = () => { setEditing(null); setShowForm(true) }
  const openEdit = (item) => { setEditing(item); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditing(null) }

  if (showAIView) return (
    <AIExtractFlow
      onBack={() => setShowAIView(false)}
      onImported={() => { setShowAIView(false); reload() }}
    />
  )

  if (authLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const items = tab === 'panels' ? panels : inverters
  const pendingCount = items.filter(i => i.status === 'pending').length
  const activeCount  = items.filter(i => i.status === 'active').length

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Dashboard</h1>
            <p className="text-sm text-gray-500">{user?.company_name || user?.email}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={reload} className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setShowAIView(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-lg font-medium shadow-md shadow-purple-200">
            <Sparkles className="w-4 h-4" />
            AI Extract
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium">
            <Plus className="w-4 h-4" />
            Add {tab === 'panels' ? 'Panel' : 'Inverter'}
          </button>
        </div>
      </div>

      {/* AI CTA Hero */}
      <div
        onClick={() => setShowAIView(true)}
        className="cursor-pointer bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-600 rounded-2xl p-6 mb-6 text-white flex items-center gap-5 hover:shadow-xl transition-all hover:scale-[1.01]"
      >
        <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-0.5">AI Catalog Auto-Extract</h3>
          <p className="text-white/80 text-sm">Upload your supplier catalog — AI reads it and extracts all product specs automatically.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          <Sparkles className="w-4 h-4" /> Try it now →
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total', value: items.length, color: 'bg-white text-gray-800 border border-gray-200 shadow-sm' },
          { label: 'Active', value: activeCount, color: 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' },
          { label: 'Pending Review', value: pendingCount, color: 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl px-5 py-4 ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm opacity-70">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-xl p-1 w-fit mb-6">
        {[{ id: 'panels', label: 'Panels', icon: Box }, { id: 'inverters', label: 'Inverters', icon: Zap }].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setTab(id); setShowForm(false) }}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-amber-500/90 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">
              {editing ? `Edit ${tab === 'panels' ? 'Panel' : 'Inverter'}` : `Add New ${tab === 'panels' ? 'Panel' : 'Inverter'}`}
            </h2>
            <button onClick={closeForm} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          {tab === 'panels'
            ? <PanelForm initial={editing || {}} onSave={handleSave} onCancel={closeForm} />
            : <InverterForm initial={editing || {}} onSave={handleSave} onCancel={closeForm} />
          }
        </div>
      )}

      {/* Product table */}
      {loadingData ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-2xl shadow-sm">
          <Box className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No {tab} submitted yet.</p>
          <button onClick={openAdd} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium">
            Submit your first {tab === 'panels' ? 'panel' : 'inverter'}
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="py-3 px-4 text-left font-medium">Name</th>
                <th className="py-3 px-4 text-left font-medium hidden sm:table-cell">
                  {tab === 'panels' ? 'Power' : 'AC Power'}
                </th>
                <th className="py-3 px-4 text-left font-medium hidden md:table-cell">Price</th>
                <th className="py-3 px-4 text-left font-medium">Status</th>
                <th className="py-3 px-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <ProductRow
                  key={item.id}
                  item={item}
                  type={tab === 'panels' ? 'panel' : 'inverter'}
                  onDelete={handleDelete}
                  onEdit={openEdit}
                  isAdmin={isAdmin}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin note */}
      <p className="text-xs text-gray-400 mt-4 text-center">
        Submitted products are reviewed before appearing in the public marketplace.
        {isAdmin && ' As admin, you can approve/reject pending products directly.'}
      </p>
    </div>
  )
}


