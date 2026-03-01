import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { estimationsAPI } from '@/services/api'
import { useEffect, useRef } from 'react'
import { MapPin, Zap, TrendingUp, Download, Printer, ArrowLeft, Leaf, Car, TreePine } from 'lucide-react'

export default function EstimationDetails() {
  const { id } = useParams()
  const monthlyChartRef = useRef(null)
  const roiChartRef = useRef(null)
  const financialChartRef = useRef(null)
  const comparisonChartRef = useRef(null)
  const lifetimeChartRef = useRef(null)

  const { data, isLoading } = useQuery({
    queryKey: ['estimation', id],
    queryFn: () => estimationsAPI.getById(id),
  })

  const estimation = data?.data

  const monthlyData = [
    { month: 'Jan', ac: 850, dc: 920 },
    { month: 'Feb', ac: 920, dc: 990 },
    { month: 'Mar', ac: 1100, dc: 1180 },
    { month: 'Apr', ac: 1250, dc: 1340 },
    { month: 'May', ac: 1350, dc: 1450 },
    { month: 'Jun', ac: 1400, dc: 1500 },
    { month: 'Jul', ac: 1380, dc: 1480 },
    { month: 'Aug', ac: 1300, dc: 1390 },
    { month: 'Sep', ac: 1150, dc: 1230 },
    { month: 'Oct', ac: 980, dc: 1050 },
    { month: 'Nov', ac: 850, dc: 920 },
    { month: 'Dec', ac: 780, dc: 840 }
  ]

  const monthlyConsumption = [900, 950, 1000, 1050, 1100, 1150, 1200, 1180, 1100, 1000, 950, 900]

  useEffect(() => {
    if (!estimation || !window.Chart) return

    if (monthlyChartRef.current) {
      const ctx = monthlyChartRef.current.getContext('2d')
      new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: monthlyData.map(d => d.month),
          datasets: [
            { label: 'AC Output', data: monthlyData.map(d => d.ac), backgroundColor: 'rgba(16, 185, 129, 0.8)', borderRadius: 6 },
            { label: 'DC Output', data: monthlyData.map(d => d.dc), backgroundColor: 'rgba(59, 130, 246, 0.6)', borderRadius: 6 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: function (context) { return context.dataset.label + ': ' + context.parsed.y + ' kWh' } } } },
          scales: { y: { beginAtZero: true, title: { display: true, text: 'Energy Production (kWh)' } } }
        }
      })
    }

    if (financialChartRef.current) {
      const systemCost = (estimation.system_capacity || 5) * 3000
      const installationCost = systemCost * 0.15
      const consultationFees = 500
      const ctx = financialChartRef.current.getContext('2d')
      new window.Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['System Cost', 'Installation Cost', 'Consulting Fees'],
          datasets: [{ data: [systemCost, installationCost, consultationFees], backgroundColor: ['#f59e0b', '#10b981', '#3b82f6'], borderWidth: 3, borderColor: '#ffffff' }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (context) { return context.label + ': $' + context.parsed.toLocaleString() } } } } }
      })
    }

    if (roiChartRef.current) {
      const totalInvestment = (estimation.system_capacity || 5) * 3500
      const annualSavings = (estimation.annual_usage_kwh || 10000) * 0.15
      const years = Array.from({ length: 26 }, (_, i) => i)
      const cumulativeSavings = years.map(year => { if (year === 0) return -totalInvestment; return -totalInvestment + (year * annualSavings) })
      const ctx = roiChartRef.current.getContext('2d')
      const gradient = ctx.createLinearGradient(0, 0, 0, 400)
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.8)')
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.1)')
      new window.Chart(ctx, {
        type: 'line',
        data: { labels: years, datasets: [{ label: 'Net Savings', data: cumulativeSavings, borderColor: '#10b981', backgroundColor: gradient, fill: true, tension: 0.1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (context) { return 'Net Savings: $' + Math.round(context.parsed.y).toLocaleString() } } } }, scales: { y: { title: { display: true, text: 'Cumulative Savings ($)' } }, x: { title: { display: true, text: 'Year' } } } }
      })
    }

    if (comparisonChartRef.current) {
      const ctx = comparisonChartRef.current.getContext('2d')
      new window.Chart(ctx, {
        type: 'bar',
        data: { labels: monthlyData.map(d => d.month), datasets: [{ label: 'Solar Production', data: monthlyData.map(d => d.ac), backgroundColor: 'rgba(16, 185, 129, 0.8)' }, { label: 'Energy Consumption', data: monthlyConsumption, backgroundColor: 'rgba(239, 68, 68, 0.6)' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Energy (kWh)' } } } }
      })
    }

    if (lifetimeChartRef.current) {
      const annualProduction = estimation.energy_annual || 12000
      const degradationRate = 0.005
      const years = Array.from({ length: 26 }, (_, i) => i)
      const lifetimeProduction = years.map(year => { if (year === 0) return 0; return annualProduction * (1 - (degradationRate * (year - 1))) })
      const lifetimeEfficiency = years.map(year => { if (year === 0) return 100; return 100 * (1 - (degradationRate * year)) })
      const ctx = lifetimeChartRef.current.getContext('2d')
      new window.Chart(ctx, {
        type: 'line',
        data: { labels: years, datasets: [{ label: 'Annual Production (kWh)', data: lifetimeProduction, borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: true, yAxisID: 'y' }, { label: 'System Efficiency (%)', data: lifetimeEfficiency, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, yAxisID: 'y1' }] },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'top' } }, scales: { y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Production (kWh)' } }, y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Efficiency (%)' }, grid: { drawOnChartArea: false } } } }
      })
    }

    if (window.Highcharts) {
      window.Highcharts.chart('waterfallChart', {
        chart: { type: 'bar', backgroundColor: '#ffffff', height: 600 },
        title: { text: 'SYSTEM LOSS DIAGRAM', style: { fontSize: '18px', fontWeight: 'bold' } },
        xAxis: { categories: ['POA irradiance', 'Soiling', 'Shading', 'IAM', 'DC nominal energy (with losses)', 'Inverter loss', 'AC energy from inverter', 'Consumptions from auxiliary circuits', 'Exportable energy'], labels: { style: { fontSize: '11px' } } },
        yAxis: { title: { text: null }, min: 0, max: 2200, tickInterval: 200 },
        legend: { enabled: false },
        tooltip: { formatter: function () { return '<b>' + this.x + '</b><br/>' + 'Value: ' + Math.abs(this.y) + ' kWh' } },
        plotOptions: { bar: { dataLabels: { enabled: true, formatter: function () { return Math.abs(this.y) } } } },
        series: [
          { name: 'Base', data: [0, 1950, 1930, 1900, 1850, 1800, 1750, 1730, 0], color: 'transparent', showInLegend: false },
          { name: 'Losses/Production', data: [{ y: 2000, color: '#10b981' }, { y: -20, color: '#ef4444' }, { y: -30, color: '#ef4444' }, { y: -50, color: '#ef4444' }, { y: -50, color: '#f59e0b' }, { y: -50, color: '#ef4444' }, { y: -20, color: '#10b981' }, { y: -20, color: '#ef4444' }, { y: 1710, color: '#3b82f6' }], dataLabels: { enabled: true, formatter: function () { return Math.abs(this.y) } } }
        ],
        exporting: { enabled: false },
        credits: { enabled: false }
      })
    }
  }, [estimation])

  const handlePrint = () => { window.print() }

  const handleDownloadPDF = () => {
    const element = document.querySelector('.estimation-details-container')
    const opt = { margin: 10, filename: `solar_project_report_${id}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }
    if (window.html2pdf) { window.html2pdf().from(element).set(opt).save() }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner-lg mx-auto mb-4"></div>
          <p className="text-slate-500">Loading estimation details...</p>
        </div>
      </div>
    )
  }

  if (!estimation) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-500 text-lg font-semibold">Estimation not found</p>
          <Link to="/estimations" className="btn-primary mt-4 inline-flex"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Estimations</Link>
        </div>
      </div>
    )
  }

  const systemCost = (estimation.system_capacity || 5) * 3000
  const installationCost = systemCost * 0.15
  const consultationFees = 500
  const totalInvestment = systemCost + installationCost + consultationFees
  const annualSavings = (estimation.annual_usage_kwh || 10000) * 0.15
  const paybackPeriod = totalInvestment / annualSavings
  const total25YearSavings = (annualSavings * 25) - totalInvestment

  return (
    <div className="estimation-details-container page-container space-y-6">
      {/* Header Banner */}
      <div className="hero-section rounded-2xl p-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-white">Solar Energy Project Details</h1>
              <p className="text-slate-300 mt-1">Project ID: #{estimation.id}</p>
              <p className="text-slate-400 text-sm">{new Date(estimation.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="flex gap-3 no-print">
              <button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-all">
                <Printer className="w-4 h-4" /> Print
              </button>
              <button onClick={handleDownloadPDF} className="btn-eco">
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </button>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-solar-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Location Card */}
        <div className="lg:col-span-2">
          <div className="card h-full">
            <h3 className="text-lg font-display font-bold gradient-text mb-4">Location Details</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-solar-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Address</p>
                  <p className="text-sm text-slate-500">{estimation.address || `${estimation.city}, ${estimation.state} ${estimation.zip_code}`}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Coordinates</p>
                <p className="text-sm text-slate-500 font-mono">{estimation.latitude.toFixed(6)}, {estimation.longitude.toFixed(6)}</p>
              </div>
              {estimation.customer_name && (
                <div>
                  <p className="text-sm font-semibold text-slate-700">Customer</p>
                  <p className="text-sm text-slate-500">{estimation.customer_name}</p>
                  {estimation.email && <p className="text-sm text-slate-400">{estimation.email}</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Info Cards */}
        <div className="lg:col-span-3 space-y-6">
          <div>
            <h3 className="text-lg font-display font-bold gradient-text mb-4">System Size</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Roof Area', value: estimation.roof_area || 'N/A', unit: 'sq. meters' },
                { label: 'Panel Count', value: estimation.panel_count || 'N/A', unit: 'panels' },
                { label: 'System Capacity', value: estimation.system_capacity, unit: 'kW' },
              ].map((item, i) => (
                <div key={i} className="stat-card">
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="text-2xl font-display font-bold text-slate-900 mt-1">{item.value}</p>
                  <p className="text-xs text-slate-400">{item.unit}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-display font-bold text-eco-600 mb-4">Environmental Impact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: Leaf, label: 'CO₂ Offset', value: Math.round((estimation.energy_annual || 0) * 0.7 / 1000), unit: 'tons/year' },
                { icon: TreePine, label: 'Trees Equivalent', value: Math.round((estimation.energy_annual || 0) * 0.7 / 50), unit: 'trees/year' },
                { icon: Car, label: 'Cars Off Road', value: Math.round((estimation.energy_annual || 0) * 0.7 / 4600), unit: 'equivalent' },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={i} className="card relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-eco-400 to-eco-600 rounded-l-2xl" />
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-1.5 bg-eco-100 rounded-lg"><Icon className="w-4 h-4 text-eco-600" /></div>
                      <p className="text-sm text-slate-500">{item.label}</p>
                    </div>
                    <p className="text-2xl font-display font-bold text-eco-600">{item.value}</p>
                    <p className="text-xs text-slate-400">{item.unit}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="card">
        <h2 className="text-xl font-display font-bold text-slate-900 mb-6">Financial Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Investment Breakdown</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 p-4 rounded-xl"><p className="text-sm text-slate-500">System Cost</p><p className="text-xl font-bold text-slate-900">{systemCost.toLocaleString()} MAD</p></div>
              <div className="bg-slate-50 p-4 rounded-xl"><p className="text-sm text-slate-500">Installation</p><p className="text-xl font-bold text-slate-900">{installationCost.toLocaleString()} MAD</p></div>
              <div className="bg-slate-50 p-4 rounded-xl col-span-2"><p className="text-sm text-slate-500">Consultation Fees</p><p className="text-xl font-bold text-slate-900">{consultationFees.toLocaleString()} MAD</p></div>
              <div className="col-span-2"><canvas ref={financialChartRef} style={{ maxHeight: '200px' }}></canvas></div>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-slate-700">Total Investment</span>
                <span className="text-2xl font-display font-bold gradient-text">{totalInvestment.toLocaleString()} MAD</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Financial Returns</h3>
            <div className="space-y-3">
              <div className="bg-eco-50 p-4 rounded-xl border border-eco-100"><p className="text-sm text-slate-500">Annual Savings</p><p className="text-2xl font-bold text-eco-600">{Math.round(annualSavings).toLocaleString()} MAD</p></div>
              <div className="bg-solar-50 p-4 rounded-xl border border-solar-100"><p className="text-sm text-slate-500">Payback Period</p><p className="text-2xl font-bold text-solar-600">{paybackPeriod.toFixed(1)} years</p></div>
              <div className="bg-helio-50 p-4 rounded-xl border border-helio-100"><p className="text-sm text-slate-500">ROI (25 years)</p><p className="text-2xl font-bold text-helio-600">{((total25YearSavings / totalInvestment) * 100).toFixed(0)}%</p></div>
            </div>
            <div className="border-t border-slate-200 pt-3 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-slate-700">25 Year Savings</span>
                <span className="text-2xl font-display font-bold text-eco-600">{Math.round(total25YearSavings).toLocaleString()} MAD</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROI Chart */}
      <div className="card">
        <h3 className="text-lg font-display font-bold text-slate-900 mb-4">Return on Investment</h3>
        <div style={{ height: '300px' }}><canvas ref={roiChartRef}></canvas></div>
      </div>

      {/* Performance Metrics */}
      <div className="card">
        <h2 className="text-xl font-display font-bold text-slate-900 mb-6">Performance Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Zap, label: 'System Capacity', value: `${estimation.system_capacity} kW` },
            { icon: TrendingUp, label: 'Annual Production', value: `${Math.round(estimation.energy_annual || 0).toLocaleString()} kWh` },
            { label: 'Panel Count', value: estimation.panel_count || 'N/A' },
            { label: 'Tilt Angle', value: `${estimation.tilt}°` },
            { label: 'Azimuth', value: `${estimation.azimuth}°` },
            { label: 'System Losses', value: `${estimation.losses}%` },
            { label: 'Coverage', value: `${estimation.coverage_percentage}%` },
            { label: 'Roof Area', value: `${estimation.roof_area || 'N/A'} m²` },
          ].map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} className="stat-card">
                {Icon && <Icon className="w-6 h-6 text-solar-500 mb-2" />}
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="text-xl font-display font-bold text-slate-900">{item.value}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Monthly Production Chart */}
      <div className="card">
        <h2 className="text-xl font-display font-bold text-slate-900 mb-4">Monthly Energy Production</h2>
        <div style={{ height: '350px' }}><canvas ref={monthlyChartRef}></canvas></div>
      </div>

      {/* Comparison and Lifetime */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-display font-bold text-slate-900 mb-4">Monthly Energy Comparison</h3>
          <div style={{ height: '300px' }}><canvas ref={comparisonChartRef}></canvas></div>
          <p className="text-sm text-slate-500 mt-3">Compares expected solar production with current energy consumption.</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-display font-bold text-slate-900 mb-4">Lifetime Performance</h3>
          <div style={{ height: '300px' }}><canvas ref={lifetimeChartRef}></canvas></div>
          <p className="text-sm text-slate-500 mt-3">Projected performance over 25 years (0.5% annual degradation).</p>
        </div>
      </div>

      {/* System Loss Diagram */}
      <div className="card">
        <h2 className="text-xl font-display font-bold text-slate-900 mb-4">System Loss Diagram</h2>
        <div id="waterfallChart" style={{ height: '600px' }}></div>
      </div>

      {/* Notes */}
      <div className="bg-helio-50 border border-helio-200 p-5 rounded-2xl">
        <h3 className="text-sm font-display font-bold text-helio-800 mb-2">Important Notes</h3>
        <div className="text-sm text-helio-700 space-y-1">
          <p>• All calculations are estimates based on typical conditions</p>
          <p>• Actual production depends on weather, shading, and maintenance</p>
          <p>• Financial returns assume current energy rates</p>
          <p>• System performance degrades ~0.5% per year</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-200 no-print">
        <Link to="/estimations" className="btn-ghost text-primary-600 font-semibold">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Estimations
        </Link>
      </div>
    </div>
  )
}
