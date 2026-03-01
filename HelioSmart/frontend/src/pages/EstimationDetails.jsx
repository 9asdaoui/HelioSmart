import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { estimationsAPI } from '@/services/api'
import { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Zap, TrendingUp, Download, Printer, ArrowLeft } from 'lucide-react'
import heliosmartLogo from '@/assets/heliosmart-logo.svg'
import solarPanelSvg from '@/assets/solar-panel.svg'

// Format MAD currency values consistently: "13,796.95 MAD"
const formatMAD = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A'
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD'
}

export default function EstimationDetails() {
  const { id } = useParams()
  const monthlyChartRef = useRef(null)
  const roiChartRef = useRef(null)
  const financialChartRef = useRef(null)
  const comparisonChartRef = useRef(null)
  const lifetimeChartRef = useRef(null)
  const sitePlanCanvasRef = useRef(null)
  const lossChartRef = useRef(null)
  
  const { data, isLoading } = useQuery({
    queryKey: ['estimation', id],
    queryFn: () => estimationsAPI.getById(id),
  })
  
  const estimation = data?.data

  // Backend base URL for loading saved static files (e.g. storage/roof_images/...)
  const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '')

  // Fetch full polygon + satellite image data from the dedicated visualization endpoint
  const vizQuery = useQuery({
    queryKey: ['estimation-viz', id],
    queryFn: () => estimationsAPI.getVisualization(id),
    enabled: !!estimation,
    staleTime: Infinity,
  })
  const vizData = vizQuery.data?.data?.visualization

  // Natural image dimensions needed to correctly scale the SVG overlay
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 640, h: 640 })

  // Registry of Chart.js instances so we can destroy before re-creating
  const chartInstancesRef = useRef({})

  // Month labels for charts
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  // Use real data from backend for monthly production
  // ac_monthly and dc_monthly are arrays of 12 values from PVWatts
  const getMonthlyData = () => {
    if (estimation?.ac_monthly && estimation?.dc_monthly) {
      // Real data from PVWatts API
      const acData = Array.isArray(estimation.ac_monthly) ? estimation.ac_monthly : Object.values(estimation.ac_monthly || {})
      const dcData = Array.isArray(estimation.dc_monthly) ? estimation.dc_monthly : Object.values(estimation.dc_monthly || {})
      return monthLabels.map((month, i) => ({
        month,
        ac: Math.round(acData[i] || 0),
        dc: Math.round(dcData[i] || 0)
      }))
    }
    // Fallback: estimate based on annual production with seasonal variation
    const annualProduction = estimation?.energy_annual || 12000
    const monthlyAvg = annualProduction / 12
    const seasonalFactors = [0.7, 0.75, 0.9, 1.05, 1.15, 1.2, 1.18, 1.1, 0.95, 0.85, 0.72, 0.65]
    return monthLabels.map((month, i) => ({
      month,
      ac: Math.round(monthlyAvg * seasonalFactors[i]),
      dc: Math.round(monthlyAvg * seasonalFactors[i] * 1.08) // DC is typically 8% higher before inverter losses
    }))
  }
  
  const monthlyData = getMonthlyData()
  
  // Use real monthly consumption data if available
  const getMonthlyConsumption = () => {
    if (estimation?.monthly_usage) {
      const usageData = Array.isArray(estimation.monthly_usage) ? estimation.monthly_usage : Object.values(estimation.monthly_usage || {})
      return usageData.map(v => Math.round(v || 0))
    }
    // Fallback: estimate from annual usage with typical residential pattern
    const annualUsage = estimation?.annual_usage_kwh || 10000
    const monthlyAvg = annualUsage / 12
    const consumptionFactors = [0.9, 0.85, 0.9, 0.95, 1.0, 1.15, 1.2, 1.15, 1.0, 0.95, 0.9, 0.95]
    return consumptionFactors.map(f => Math.round(monthlyAvg * f))
  }
  
  const monthlyConsumption = getMonthlyConsumption()
  

  
  // ========= VISUAL SITE PLAN CANVAS =========
  // Draws satellite image + polygon overlays + photo-realistic panels
  const drawSitePlan = useCallback(() => {
    if (!sitePlanCanvasRef.current || !estimation) return
    const canvas = sitePlanCanvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Determine the satellite image source
    const imgSrc = estimation.roof_image_path || estimation.overlay_image || estimation.roof_mask_image
    if (!imgSrc) return
    
    const bgImg = new Image()
    bgImg.onload = () => {
      canvas.width = bgImg.width
      canvas.height = bgImg.height
      ctx.drawImage(bgImg, 0, 0)
      
      // Draw roof polygon (blue dashed outline)
      const roofPoly = estimation.roof_polygon
      if (roofPoly && Array.isArray(roofPoly) && roofPoly.length > 2) {
        ctx.beginPath()
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 2.5
        ctx.setLineDash([6, 4])
        ctx.fillStyle = 'rgba(59, 130, 246, 0.08)'
        ctx.moveTo(roofPoly[0][0], roofPoly[0][1])
        for (let i = 1; i < roofPoly.length; i++) ctx.lineTo(roofPoly[i][0], roofPoly[i][1])
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.setLineDash([])
      }
      
      // Draw usable polygon (green solid)
      const usablePoly = estimation.usable_polygon
      if (usablePoly && Array.isArray(usablePoly) && usablePoly.length > 2) {
        ctx.beginPath()
        ctx.strokeStyle = '#22c55e'
        ctx.lineWidth = 3
        ctx.fillStyle = 'rgba(34, 197, 94, 0.12)'
        ctx.moveTo(usablePoly[0][0], usablePoly[0][1])
        for (let i = 1; i < usablePoly.length; i++) ctx.lineTo(usablePoly[i][0], usablePoly[i][1])
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
      
      // Draw panel positions with photo-realistic texture
      const panels = estimation.panel_positions
      if (panels && Array.isArray(panels) && panels.length > 0) {
        const panelImg = new Image()
        panelImg.onload = () => {
          panels.forEach((panel) => {
            if (panel.corners && panel.corners.length >= 4) {
              const [c0, c1, , c3] = panel.corners
              const w = Math.hypot(c1[0] - c0[0], c1[1] - c0[1])
              const h = Math.hypot(c3[0] - c0[0], c3[1] - c0[1])
              const angle = Math.atan2(c1[1] - c0[1], c1[0] - c0[0])
              ctx.save()
              ctx.translate(c0[0], c0[1])
              ctx.rotate(angle)
              ctx.beginPath()
              ctx.rect(0, 0, w, h)
              ctx.clip()
              ctx.drawImage(panelImg, 0, 0, w, h)
              ctx.strokeStyle = '#1a1a2e'
              ctx.lineWidth = 1.5
              ctx.strokeRect(0, 0, w, h)
              // Glass reflection
              const grad = ctx.createLinearGradient(0, 0, w * 0.6, h * 0.6)
              grad.addColorStop(0, 'rgba(255,255,255,0.12)')
              grad.addColorStop(0.5, 'rgba(255,255,255,0.04)')
              grad.addColorStop(1, 'rgba(255,255,255,0)')
              ctx.fillStyle = grad
              ctx.fillRect(0, 0, w, h)
              ctx.restore()
            }
          })
        }
        panelImg.onerror = () => {
          // Fallback dark blue rectangles
          panels.forEach((panel) => {
            if (panel.corners && panel.corners.length >= 4) {
              const [c0, c1, , c3] = panel.corners
              const w = Math.hypot(c1[0] - c0[0], c1[1] - c0[1])
              const h = Math.hypot(c3[0] - c0[0], c3[1] - c0[1])
              const angle = Math.atan2(c1[1] - c0[1], c1[0] - c0[0])
              ctx.save()
              ctx.translate(c0[0], c0[1])
              ctx.rotate(angle)
              ctx.fillStyle = '#1a2f4a'
              ctx.fillRect(0, 0, w, h)
              ctx.strokeStyle = '#0f1b2d'
              ctx.lineWidth = 1.5
              ctx.strokeRect(0, 0, w, h)
              ctx.restore()
            }
          })
        }
        panelImg.src = solarPanelSvg
      }
    }
    bgImg.src = imgSrc
  }, [estimation])
  
  useEffect(() => {
    if (!estimation || !window.Chart) return

    // Destroy any existing Chart.js instances before recreating (prevents "Canvas already in use" errors)
    ;[monthlyChartRef, financialChartRef, roiChartRef, comparisonChartRef, lifetimeChartRef].forEach(ref => {
      if (ref.current) window.Chart.getChart(ref.current)?.destroy()
    })

    // Monthly Production Chart
    if (monthlyChartRef.current) {
      const ctx = monthlyChartRef.current.getContext('2d')
      new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: monthlyData.map(d => d.month),
          datasets: [
            {
              label: 'AC Output',
              data: monthlyData.map(d => d.ac),
              backgroundColor: 'rgba(16, 185, 129, 0.8)',
              borderRadius: 4
            },
            {
              label: 'DC Output',
              data: monthlyData.map(d => d.dc),
              backgroundColor: 'rgba(59, 130, 246, 0.6)',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.dataset.label + ': ' + context.parsed.y + ' kWh'
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Energy Production (kWh)'
              }
            }
          }
        }
      })
    }
    
    // Financial Overview Pie Chart
    if (financialChartRef.current) {
      const chartSystemCost = (estimation.system_capacity || 5) * 3000
      const chartInstallationCost = estimation.mounting_structure_cost || (chartSystemCost * 0.15)
      const chartConsultationFees = 500
      
      const ctx = financialChartRef.current.getContext('2d')
      new window.Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['System Cost', 'Installation Cost', 'Consulting Fees'],
          datasets: [{
            data: [chartSystemCost, chartInstallationCost, chartConsultationFees],
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.label + ': ' + context.parsed.toLocaleString() + ' MAD'
                }
              }
            }
          }
        }
      })
    }
    
    // ROI Chart
    if (roiChartRef.current) {
      // Use real calculation values
      const realElectricityRate = estimation.annual_cost && estimation.annual_usage_kwh 
        ? estimation.annual_cost / estimation.annual_usage_kwh 
        : 1.5
      const realSystemCost = (estimation.system_capacity || 5) * 3000
      const realInstallationCost = estimation.mounting_structure_cost || (realSystemCost * 0.15)
      const realTotalInvestment = realSystemCost + realInstallationCost + 500
      const realAnnualSavings = (estimation.energy_annual || 0) * realElectricityRate
      const years = Array.from({length: 26}, (_, i) => i)
      const cumulativeSavings = years.map(year => {
        if (year === 0) return -realTotalInvestment
        return -realTotalInvestment + (year * realAnnualSavings)
      })
      
      const ctx = roiChartRef.current.getContext('2d')
      const gradient = ctx.createLinearGradient(0, 0, 0, 400)
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.8)')
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.1)')
      
      new window.Chart(ctx, {
        type: 'line',
        data: {
          labels: years,
          datasets: [{
            label: 'Net Savings',
            data: cumulativeSavings,
            borderColor: '#10b981',
            backgroundColor: gradient,
            fill: true,
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return 'Net Savings: ' + Math.round(context.parsed.y).toLocaleString() + ' MAD'
                }
              }
            }
          },
          scales: {
            y: {
              title: {
                display: true,
                text: 'Cumulative Savings (MAD)'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Year'
              }
            }
          }
        }
      })
    }
    
    // Energy Comparison Chart
    if (comparisonChartRef.current) {
      const ctx = comparisonChartRef.current.getContext('2d')
      new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: monthlyData.map(d => d.month),
          datasets: [
            {
              label: 'Solar Production',
              data: monthlyData.map(d => d.ac),
              backgroundColor: 'rgba(16, 185, 129, 0.8)'
            },
            {
              label: 'Energy Consumption',
              data: monthlyConsumption,
              backgroundColor: 'rgba(239, 68, 68, 0.6)'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Energy (kWh)'
              }
            }
          }
        }
      })
    }
    
    // Lifetime Performance Chart
    if (lifetimeChartRef.current) {
      const annualProduction = estimation.energy_annual || 12000
      const degradationRate = 0.005
      const years = Array.from({length: 26}, (_, i) => i)
      const lifetimeProduction = years.map(year => {
        if (year === 0) return 0
        return annualProduction * (1 - (degradationRate * (year - 1)))
      })
      const lifetimeEfficiency = years.map(year => {
        if (year === 0) return 100
        return 100 * (1 - (degradationRate * year))
      })
      
      const ctx = lifetimeChartRef.current.getContext('2d')
      new window.Chart(ctx, {
        type: 'line',
        data: {
          labels: years,
          datasets: [
            {
              label: 'Annual Production (kWh)',
              data: lifetimeProduction,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true,
              yAxisID: 'y'
            },
            {
              label: 'System Efficiency (%)',
              data: lifetimeEfficiency,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              fill: true,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              position: 'top'
            }
          },
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: 'Production (kWh)'
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'Efficiency (%)'
              },
              grid: {
                drawOnChartArea: false
              }
            }
          }
        }
      })
    }
    
  }, [estimation])

  // ── System Loss Diagram (Chart.js horizontal bar) ───────────────────────────
  useEffect(() => {
    if (!estimation || !lossChartRef.current) return

    const DEFAULT_LOSSES = {
      temperature_loss: 3.0,
      soiling_loss:     3.0,
      mismatch_loss:    1.0,
      dc_wiring_loss:   2.0,
      inverter_loss:    1.6,
      ac_wiring_loss:   0.5,
      other_loss:       2.0,
      shading_loss:     0.0,
    }

    // Parse loss_breakdown — could be an object or a JSON string from the DB
    const rawLB = estimation.loss_breakdown
    const parsedLB = typeof rawLB === 'string' ? (() => { try { return JSON.parse(rawLB) } catch { return null } })() : rawLB
    const lossBreakdown = parsedLB?.breakdown
      ? { ...DEFAULT_LOSSES, ...parsedLB.breakdown }
      : DEFAULT_LOSSES

    const annualProduction = estimation.energy_annual || 10000
    const performanceRatio = parsedLB?.performance_ratio || 0.85
    const poaEnergy = Math.round(annualProduction / performanceRatio)
    const toKwh = (pct) => Math.round(poaEnergy * (pct / 100))
    const totalLossPct = parsedLB?.total_loss_percentage
      ?? Object.values(DEFAULT_LOSSES).reduce((s, v) => s + v, 0)

    const lossItems = [
      { label: 'Temperature',  pct: lossBreakdown.temperature_loss, color: '#ef4444' },
      { label: 'Soiling',      pct: lossBreakdown.soiling_loss,     color: '#f97316' },
      { label: 'Shading',      pct: lossBreakdown.shading_loss,     color: '#f59e0b' },
      { label: 'Mismatch',     pct: lossBreakdown.mismatch_loss,    color: '#fbbf24' },
      { label: 'DC Wiring',    pct: lossBreakdown.dc_wiring_loss,   color: '#fb923c' },
      { label: 'Inverter',     pct: lossBreakdown.inverter_loss,    color: '#e11d48' },
      { label: 'AC Wiring',    pct: lossBreakdown.ac_wiring_loss,   color: '#dc2626' },
      { label: 'Other',        pct: lossBreakdown.other_loss,       color: '#9f1239' },
    ]

    const ctx = lossChartRef.current
    const existing = window.Chart.getChart(ctx)
    if (existing) existing.destroy()

    new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: lossItems.map(l => `${l.label} (${Number(l.pct).toFixed(1)}%)`),
        datasets: [{
          label: 'Energy Loss (kWh/year)',
          data: lossItems.map(l => toKwh(l.pct)),
          backgroundColor: lossItems.map(l => l.color),
          borderWidth: 0,
          borderRadius: 4,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.raw.toLocaleString()} kWh  (${lossItems[ctx.dataIndex].pct.toFixed(1)}% of POA)`
            }
          },
          title: {
            display: true,
            text: `Total Losses: ${Number(totalLossPct).toFixed(1)}%  |  Performance Ratio: ${(performanceRatio * 100).toFixed(1)}%  |  POA Input: ${poaEnergy.toLocaleString()} kWh`,
            font: { size: 12 },
            color: '#6b7280',
            padding: { bottom: 12 }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Energy Loss (kWh/year)', color: '#374151' },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#374151' }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#374151', font: { size: 12 } }
          }
        }
      }
    })
  }, [estimation])

  const handlePrint = () => {
    window.print()
  }
  
  const handleDownloadPDF = () => {
    const element = document.querySelector('.estimation-details-container')
    const opt = {
      margin: 10,
      filename: `solar_project_report_${id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    
    if (window.html2pdf) {
      window.html2pdf().from(element).set(opt).save()
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20">
        <span className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500">Loading estimation details…</span>
      </div>
    )
  }
  
  if (!estimation) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 font-medium">Estimation not found</div>
      </div>
    )
  }
  
  // Financial calculations using real data
  const electricityRate = estimation.annual_cost && estimation.annual_usage_kwh 
    ? estimation.annual_cost / estimation.annual_usage_kwh 
    : 1.5  // Default rate in MAD/kWh
  const systemCost = (estimation.system_capacity || 5) * 3000  // 3000 MAD per kW
  const installationCost = estimation.mounting_structure_cost || (systemCost * 0.15)
  const consultationFees = 500
  const totalInvestment = systemCost + installationCost + consultationFees
  // Annual savings = energy produced * electricity rate (what you save by not buying from grid)
  const annualSavings = (estimation.energy_annual || 0) * electricityRate
  // Payback = Total Investment (System + Installation + Fees) / Annual Savings
  const paybackPeriod = annualSavings > 0 ? totalInvestment / annualSavings : 0
  const total25YearSavings = (annualSavings * 25) - totalInvestment
  
  // Capacity Factor: stored as ratio (0-1) from backend. Protect against legacy data stored as percentage.
  const rawCF = estimation.capacity_factor || 0
  const capacityFactorPct = rawCF > 1 ? rawCF : rawCF * 100 // If > 1, it's already a percentage (legacy)
  // Sanity check: cap between 0 and 40% for Morocco
  const capacityFactorDisplay = Math.min(capacityFactorPct, 40).toFixed(1)
  
  // Production per kW: backend value → computed → safe fallback
  const productionPerKw = estimation.annual_production_per_kw
    ?? (estimation.energy_annual > 0 && estimation.system_capacity > 0
        ? Math.round(estimation.energy_annual / estimation.system_capacity)
        : null)

  // Usable area - prefer SAM-detected area, fall back to roof_area
  const usableArea = estimation.usable_area_m2 || estimation.roof_area || 0

  // ── Site plan image + overlay data ─────────────────────────────────────────────
  // Priority: base64 overlay from panel-placement > base64 from SAM > file path via backend URL
  const buildImgUrl = (src) => {
    if (!src) return null
    return src.startsWith('data:') ? src : `${BACKEND_URL}/${src}`
  }
  const sitePlanImageUrl =
    estimation.visualization_image ||
    estimation.overlay_image ||
    vizData?.overlay_image ||
    buildImgUrl(vizData?.satellite_image) ||
    buildImgUrl(estimation.roof_image_path) ||
    null
  const sitePlanPanels = (vizData?.panel_positions ?? estimation.panel_positions) || []
  const sitePlanRoofPoly = (vizData?.roof_polygon ?? estimation.roof_polygon) || []
  const sitePlanUsablePoly = (vizData?.usable_polygon ?? estimation.usable_polygon) || []
  
  return (
    <div className="estimation-details-container space-y-8 pb-8">
      {/* Fixed header/footer for every printed page */}
      <div className="print-page-header">
        <img src={heliosmartLogo} alt="HelioSmart" />
        <span>Confidential Solar Audit &middot; Project #{estimation.id}</span>
      </div>
      <div className="print-page-footer">
        HelioSmart &copy; {new Date().getFullYear()} &middot; Solar Energy Project Report &middot; Project #{estimation.id}
      </div>

      {/* Hero Header  deep navy corporate */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-[#1e3a5f] to-slate-900 shadow-xl rounded-2xl p-8 text-white print-header" style={{ pageBreakAfter: 'avoid' }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-teal-400/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-sky-400/10 blur-2xl" />

        <div className="relative z-10 flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <img src={heliosmartLogo} alt="HelioSmart" className="h-11 brightness-0 invert" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-slate-300 font-semibold bg-white/10 px-3 py-1 rounded-full border border-white/10">Confidential Solar Audit</span>
        </div>
        <div className="relative z-10 border-t border-white/15 pt-5 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Solar Energy Project Report</h1>
            <p className="text-slate-400 text-sm mt-1.5">
              Project #{estimation.id} &middot; {new Date(estimation.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-3 no-print">
            <button onClick={handlePrint} className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium transition-all border border-white/15">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={handleDownloadPDF} className="bg-white hover:bg-gray-50 text-slate-800 px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-lg shadow-black/15">
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'System Size', value: `${Number(estimation.system_capacity || 0).toFixed(2)} kW`, color: 'slate', icon: <Zap className="w-5 h-5" /> },
          { label: 'Annual Production', value: `${Math.round(estimation.energy_annual || 0).toLocaleString()} kWh`, color: 'teal', icon: <TrendingUp className="w-5 h-5" /> },
          { label: 'Panel Count', value: estimation.panel_count || 'N/A', color: 'sky', icon: null },
          { label: 'Payback', value: `${paybackPeriod.toFixed(1)} yrs`, color: 'emerald', icon: null },
        ].map(({ label, value, color, icon }, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className={`absolute top-0 left-0 w-1 h-full bg-${color}-500`} />
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">{label}</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-extrabold text-gray-900">{value}</p>
              {icon && <span className={`text-${color}-500 mb-0.5`}>{icon}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Location + System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-5 flex items-center gap-2"><MapPin className="w-4 h-4" /> Location Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">Address</p>
                <p className="text-sm text-gray-800 font-medium">{estimation.address || `${estimation.city}, ${estimation.state} ${estimation.zip_code}`}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">Coordinates</p>
                <p className="text-sm text-gray-600 font-mono">{estimation.latitude.toFixed(6)}, {estimation.longitude.toFixed(6)}</p>
              </div>
              {estimation.customer_name && (
                <div>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">Customer</p>
                  <p className="text-sm text-gray-800 font-medium">{estimation.customer_name}</p>
                  {estimation.email && <p className="text-xs text-gray-400">{estimation.email}</p>}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-3">AI Roof Detection</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { k: 'Roof Type', v: estimation.roof_type || estimation.roof_type_detected || 'flat' },
                    estimation.roof_tilt && { k: 'Roof Tilt', v: `${estimation.roof_tilt}deg` },
                    estimation.facade_reduction_ratio && { k: 'Facade Factor', v: `${(estimation.facade_reduction_ratio * 100).toFixed(0)}%` },
                    estimation.meters_per_pixel && { k: 'Scale', v: `${estimation.meters_per_pixel?.toFixed(3)} m/px` },
                  ].filter(Boolean).map(({ k, v }, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{k}</p>
                      <p className="text-sm font-semibold text-gray-700">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">System Size</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Usable Roof Area', value: usableArea ? usableArea.toFixed(1) : 'N/A', unit: 'sq. meters', sub: 'AI detected' },
                { label: 'Panel Count', value: estimation.panel_count || 'N/A', unit: 'panels', sub: '' },
                { label: 'System Capacity', value: Number(estimation.system_capacity).toFixed(2), unit: 'kW', sub: '' },
              ].map(({ label, value, unit, sub }, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-slate-300">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{label}</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">{value}</p>
                  <p className="text-xs text-gray-400">{unit} {sub && <span className="text-teal-600 font-medium">({sub})</span>}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-4">Environmental Impact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'CO2 Offset', value: Math.round((estimation.energy_annual || 0) * 0.7 / 1000), unit: 'tons/year', icon: '' },
                { label: 'Trees Equivalent', value: Math.round((estimation.energy_annual || 0) * 0.7 / 50), unit: 'trees/year', icon: '' },
                { label: 'Cars Off Road', value: Math.round((estimation.energy_annual || 0) * 0.7 / 4600), unit: 'equivalent', icon: '' },
              ].map(({ label, value, unit, icon }, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-emerald-400">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{label}</p>
                  <div className="flex items-end gap-2 mt-1">
                    <p className="text-2xl font-extrabold text-emerald-700">{value}</p>
                    <span className="text-lg mb-0.5">{icon}</span>
                  </div>
                  <p className="text-xs text-gray-400">{unit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Solar Site Plan */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden" style={{ pageBreakBefore: 'always', pageBreakInside: 'avoid' }}>
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
          <h2 className="text-lg font-bold text-white tracking-wide">Proposed Solar Site Plan</h2>
          <p className="text-slate-300 text-sm mt-0.5">AI-powered roof analysis with optimized panel placement</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              {(estimation.site_plan_snapshot || sitePlanImageUrl) ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg" style={{ minHeight: '260px' }}>
                  <img src={estimation.site_plan_snapshot || sitePlanImageUrl} alt="Solar site plan" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { e.target.style.display = 'none' }} />
                  <div className="absolute bottom-2 right-3 opacity-60">
                    <img src={heliosmartLogo} alt="" style={{ height: '18px', filter: 'brightness(0) invert(1) drop-shadow(0 1px 4px rgba(0,0,0,0.6))' }} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400 text-center" style={{ minHeight: '260px' }}>
                  <div>
                    <svg className="mx-auto h-12 w-12 mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-sm">No satellite image available</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-between gap-5">
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Map Legend</h3>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-3"><span className="inline-block w-6 h-4 rounded" style={{ backgroundColor: 'rgba(34,197,94,0.35)', border: '2px solid #22c55e' }} /><span className="text-sm text-gray-600">Usable Roof Area  <span className="font-semibold text-gray-800">{usableArea ? usableArea.toFixed(1) : ''} m2</span></span></div>
                  <div className="flex items-center gap-3"><span className="inline-block w-6 h-4 rounded" style={{ backgroundColor: '#1a2f4a', border: '2px solid #1a1a2e' }} /><span className="text-sm text-gray-600">Solar Modules  <span className="font-semibold text-gray-800">{estimation.panel_count || 0} panels</span></span></div>
                  <div className="flex items-center gap-3"><span className="inline-block w-6 h-4 rounded" style={{ border: '2px dashed #3b82f6', backgroundColor: 'rgba(59,130,246,0.08)' }} /><span className="text-sm text-gray-600">Detected Roof Boundary</span></div>
                </div>
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">System Parameters</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'System Size', value: `${Number(estimation.system_capacity || 0).toFixed(2)} kW`, bg: 'bg-slate-50', text: 'text-slate-800', sub: 'text-slate-500' },
                    { label: 'Panels', value: estimation.panel_count || 0, bg: 'bg-slate-50', text: 'text-slate-800', sub: 'text-slate-500' },
                    { label: 'Azimuth', value: `${estimation.azimuth || 180} deg`, bg: 'bg-sky-50', text: 'text-sky-800', sub: 'text-sky-500' },
                    { label: 'Tilt', value: `${estimation.tilt || estimation.roof_tilt || 30} deg`, bg: 'bg-sky-50', text: 'text-sky-800', sub: 'text-sky-500' },
                    { label: 'Capacity Factor', value: `${capacityFactorDisplay}%`, bg: 'bg-teal-50', text: 'text-teal-800', sub: 'text-teal-500' },
                    { label: 'Roof Area', value: `${usableArea ? usableArea.toFixed(0) : ''} m2`, bg: 'bg-teal-50', text: 'text-teal-800', sub: 'text-teal-500' },
                  ].map(({ label, value, bg, text, sub }, i) => (
                    <div key={i} className={`${bg} rounded-xl p-3 text-center`}>
                      <p className={`text-[10px] ${sub} uppercase tracking-wider font-semibold mb-1`}>{label}</p>
                      <p className={`text-lg font-bold ${text}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6" style={{ pageBreakBefore: 'always' }}>
        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center"><span className="text-white text-xs font-bold">$</span></span>
          Financial Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Investment Breakdown</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'System Cost', value: formatMAD(systemCost) },
                { label: 'Installation', value: formatMAD(installationCost) },
              ].map(({ label, value }, i) => (
                <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
                </div>
              ))}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 col-span-2">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Consultation Fees</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{formatMAD(consultationFees)}</p>
              </div>
              <div className="col-span-2"><canvas ref={financialChartRef} style={{ maxHeight: '200px' }}></canvas></div>
            </div>
            <div className="border-t-2 border-slate-300 pt-3 mt-2">
              <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-700">Total Investment</span>
                <span className="text-xl font-extrabold text-slate-800">{formatMAD(totalInvestment)}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Financial Returns</h3>
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Annual Savings</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{formatMAD(annualSavings)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Payback Period</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{paybackPeriod.toFixed(1)} years</p>
                <p className="text-xs text-gray-400 mt-1">Based on investment of {formatMAD(totalInvestment)}</p>
              </div>
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                <p className="text-[10px] text-sky-600 font-semibold uppercase tracking-wider">ROI (25 years)</p>
                <p className="text-2xl font-bold text-sky-700 mt-1">{totalInvestment > 0 ? ((total25YearSavings / totalInvestment) * 100).toFixed(1) : '0.0'}%</p>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">Total 25-Year Savings</span>
                <span className="text-xl font-extrabold text-emerald-600">{formatMAD(total25YearSavings)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROI Chart */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6" style={{ pageBreakInside: 'avoid' }}>
        <h3 className="text-sm font-bold text-gray-700 mb-4">Return on Investment</h3>
        <div style={{ height: '300px' }}><canvas ref={roiChartRef}></canvas></div>
      </div>

      {/* Performance Metrics Grid */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6" style={{ pageBreakInside: 'avoid' }}>
        <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></span>
          Performance Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'System Capacity', value: `${Number(estimation.system_capacity || 0).toFixed(2)} kW`, accent: 'slate', icon: <Zap className="w-5 h-5" /> },
            { label: 'Annual Production', value: `${Math.round(estimation.energy_annual || 0).toLocaleString()} kWh`, accent: 'teal', icon: <TrendingUp className="w-5 h-5" /> },
            { label: 'Panel Count', value: estimation.panel_count || 'N/A', accent: 'slate' },
            { label: 'Capacity Factor', value: `${capacityFactorDisplay}%`, accent: 'teal' },
            { label: 'Tilt Angle', value: `${estimation.tilt?.toFixed(1)} deg`, accent: 'sky' },
            { label: 'Azimuth', value: `${estimation.azimuth?.toFixed(1)} deg`, accent: 'sky' },
            { label: 'System Losses', value: `${estimation.losses?.toFixed(1)}%`, accent: 'sky' },
            { label: 'Solar Irradiance', value: `${estimation.solrad_annual ? estimation.solrad_annual.toFixed(2) : (estimation.solar_irradiance_avg?.toFixed(2) || 'N/A')} kWh/m2/d`, accent: 'sky' },
            { label: 'Coverage', value: `${estimation.coverage_percentage}%`, accent: 'emerald' },
            { label: 'Usable Area', value: `${usableArea ? usableArea.toFixed(1) : 'N/A'} m2`, accent: 'emerald' },
            { label: 'Perf. Ratio', value: `${estimation.performance_ratio ? (estimation.performance_ratio * 100).toFixed(1) : 'N/A'}%`, accent: 'emerald' },
            { label: 'Production/kW', value: `${productionPerKw != null ? Number(productionPerKw).toLocaleString('en-US', { maximumFractionDigits: 0 }) : estimation.system_capacity > 0 ? Math.round((estimation.energy_annual || 0) / estimation.system_capacity).toLocaleString() : 'N/A'} kWh`, accent: 'emerald' },
          ].map(({ label, value, accent, icon }, i) => (
            <div key={i} className={`bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4 border-l-${accent}-400 hover:shadow-md transition-shadow`}>
              {icon && <span className={`text-${accent}-500 mb-2 block`}>{icon}</span>}
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{label}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Specifications and Equipment */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6" style={{ pageBreakBefore: 'always', pageBreakInside: 'avoid' }}>
        <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/><path d="M3 12h18M12 3v18" strokeWidth="1.5"/></svg>
          </span>
          Technical Specifications &amp; Equipment
        </h2>
        <p className="text-sm text-gray-400 mb-6 ml-10">Bill of Materials for the proposed solar installation</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Module */}
          <div className="border border-sky-100 rounded-xl p-5 bg-sky-50/40">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-md shadow-sky-200">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/><path d="M3 12h18M12 3v18" strokeWidth="1.5"/></svg>
              </div>
              <div>
                <p className="text-[10px] text-sky-600 font-bold uppercase tracking-wider">Solar Module</p>
                <p className="text-base font-bold text-gray-900">{estimation.panel_info ? `${estimation.panel_info.brand ? estimation.panel_info.brand + ' ' : ''}${estimation.panel_info.name}` : 'N/A'}</p>
              </div>
            </div>
            {estimation.panel_info ? (
              <div className="space-y-2 text-sm">
                {[
                  ['Quantity', `${estimation.panel_count || ''} panels`],
                  ['Type', estimation.panel_info.type || ''],
                  ['Rated Power', `${estimation.panel_info.panel_rated_power} Wp`],
                  ['Total DC Capacity', `${((estimation.panel_count || 0) * (estimation.panel_info.panel_rated_power / 1000)).toFixed(2)} kWp`],
                  estimation.panel_info.module_efficiency && ['Efficiency', `${estimation.panel_info.module_efficiency.toFixed(1)}%`],
                  estimation.panel_info.open_circuit_voltage && ['Voc', `${estimation.panel_info.open_circuit_voltage} V`],
                  estimation.panel_info.num_of_cells && ['Cell Count', `${estimation.panel_info.num_of_cells} cells`],
                  estimation.panel_info.connector_type && ['Connector', estimation.panel_info.connector_type],
                  estimation.panel_info.warranty_years && ['Warranty', `${estimation.panel_info.warranty_years} years`],
                ].filter(Boolean).map(([k, v], i) => (
                  <div key={i} className="flex justify-between"><span className="text-gray-400">{k}</span><span className="font-semibold text-gray-700">{v}</span></div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400 italic">Panel data not available</p>}
          </div>

          {/* Inverter */}
          <div className="border border-emerald-100 rounded-xl p-5 bg-emerald-50/40">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md shadow-emerald-200">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Inverter</p>
                <p className="text-base font-bold text-gray-900">{estimation.inverter_info ? `${estimation.inverter_info.brand ? estimation.inverter_info.brand + ' ' : ''}${estimation.inverter_info.name}` : estimation.inverter_combos?.[0]?.model || 'N/A'}</p>
              </div>
            </div>
            {estimation.inverter_info ? (
              <div className="space-y-2 text-sm">
                {[
                  ['Quantity', `${estimation.inverter_combos?.[0]?.qty || 1} unit${(estimation.inverter_combos?.[0]?.qty || 1) > 1 ? 's' : ''}`],
                  ['Phase', estimation.inverter_info.phase_type || ''],
                  ['AC Output', `${estimation.inverter_info.nominal_ac_power_kw} kW`],
                  estimation.inverter_info.efficiency_max && ['Max Efficiency', `${estimation.inverter_info.efficiency_max.toFixed(1)}%`],
                  estimation.inverter_info.no_of_mppt_ports && ['MPPT Inputs', estimation.inverter_info.no_of_mppt_ports],
                  estimation.inverter_info.max_strings_per_mppt && ['Strings / MPPT', estimation.inverter_info.max_strings_per_mppt],
                  estimation.inverter_info.ip_rating && ['IP Rating', estimation.inverter_info.ip_rating],
                  estimation.inverter_info.warranty && ['Warranty', `${estimation.inverter_info.warranty} years`],
                ].filter(Boolean).map(([k, v], i) => (
                  <div key={i} className="flex justify-between"><span className="text-gray-400">{k}</span><span className="font-semibold text-gray-700">{v}</span></div>
                ))}
              </div>
            ) : estimation.inverter_combos?.[0]?.model ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Quantity</span><span className="font-semibold text-gray-700">{estimation.inverter_combos[0].qty || 1} unit</span></div>
                <p className="text-xs text-gray-400 italic mt-2">Full specs not available</p>
              </div>
            ) : <p className="text-sm text-gray-400 italic">Inverter data not available</p>}
          </div>

          {/* Mounting */}
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/40">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center shadow-md shadow-slate-300">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-16 0H3" /></svg>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mounting Structure</p>
                <p className="text-base font-bold text-gray-900">Aluminum Mounting Rails</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['Material', 'Anodized Aluminum (6005-T5)'],
                ['Source', 'Moroccan-sourced'],
                ['Installation', `${estimation.roof_type || estimation.roof_type_detected || 'Flat'} Roof  ${estimation.installation_type || 'Rooftop'}`],
                ['Orientation', estimation.panel_orientation || 'Portrait'],
                estimation.mounting_structure_cost && ['Est. Cost', formatMAD(estimation.mounting_structure_cost)],
                ['Wind Rating', 'Up to 130 km/h'],
              ].filter(Boolean).map(([k, v], i) => (
                <div key={i} className="flex justify-between"><span className="text-gray-400">{k}</span><span className="font-semibold text-gray-700">{v}</span></div>
              ))}
            </div>
          </div>

          {/* Cabling */}
          <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/40">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center shadow-md shadow-gray-300">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">DC Cabling</p>
                <p className="text-base font-bold text-gray-900">4mm2 Solar Cable</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['Cross Section', '4 mm2'],
                ['Type', 'UV-resistant, double-insulated'],
                ['Voltage Rating', '1000V DC (TUV certified)'],
                ['Temperature Range', '-40 deg C to +90 deg C'],
                ['Connectors', 'MC4 compatible'],
              ].map(([k, v], i) => (
                <div key={i} className="flex justify-between"><span className="text-gray-400">{k}</span><span className="font-semibold text-gray-700">{v}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Production Chart */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6" style={{ pageBreakBefore: 'always', pageBreakInside: 'avoid' }}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Monthly Energy Production</h2>
        <div style={{ height: '350px' }}><canvas ref={monthlyChartRef}></canvas></div>
      </div>

      {/* Comparison + Lifetime Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ pageBreakBefore: 'always' }}>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Monthly Energy Comparison</h3>
          <div style={{ height: '300px' }}><canvas ref={comparisonChartRef}></canvas></div>
          <p className="text-xs text-gray-400 mt-3">Solar production vs. current consumption pattern.</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Lifetime Performance</h3>
          <div style={{ height: '300px' }}><canvas ref={lifetimeChartRef}></canvas></div>
          <p className="text-xs text-gray-400 mt-3">25-year projection with 0.5% annual degradation.</p>
        </div>
      </div>

      {/* System Loss Diagram */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6" style={{ pageBreakBefore: 'always', pageBreakInside: 'avoid' }}>
        <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">System Loss Diagram</h2>
        <div className="mx-auto" style={{ maxWidth: '950px', height: '300px' }}>
          <canvas ref={lossChartRef}></canvas>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-1">
          {[
            'Calculations are estimates and may vary by weather conditions.',
            'System efficiency degrades ~0.5% per year.',
            'Financial returns assume stable energy rates.',
            'Actual production depends on shading & maintenance.',
          ].map((note, i) => (
            <span key={i} className="text-xs text-gray-400 flex items-start gap-1"><span className="mt-0.5 text-slate-400">*</span>{note}</span>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200 no-print">
        <Link to="/estimations" className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm transition-all">
          <ArrowLeft className="w-4 h-4" /> Back to Estimations
        </Link>
      </div>
    </div>
  )
}
