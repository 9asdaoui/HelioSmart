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
      <div className="text-center py-12">
        <div className="text-gray-500">Loading estimation details...</div>
      </div>
    )
  }
  
  if (!estimation) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500">Estimation not found</div>
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
    <div className="estimation-details-container space-y-6">
      {/* Fixed header/footer for every printed page */}
      <div className="print-page-header">
        <img src={heliosmartLogo} alt="HelioSmart" />
        <span>Confidential Solar Audit &middot; Project #{estimation.id}</span>
      </div>
      <div className="print-page-footer">
        HelioSmart &copy; {new Date().getFullYear()} &middot; Solar Energy Project Report &middot; Project #{estimation.id}
      </div>
      
      {/* HelioSmart Branding Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 shadow-xl rounded-lg p-6 text-white print-header" style={{ pageBreakAfter: 'avoid' }}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-4">
            <img src={heliosmartLogo} alt="HelioSmart" className="h-12" />
          </div>
          <div className="text-right">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">Confidential Solar Audit Report</span>
          </div>
        </div>
        <div className="border-t border-white/20 pt-4 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold">Solar Energy Project Report</h1>
            <p className="text-blue-200 text-sm mt-1">Project ID: #{estimation.id} &middot; {new Date(estimation.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex gap-3 no-print">
            <button
              onClick={handlePrint}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-white/20"
            >
              <Printer className="w-5 h-5" />
              Print Report
            </button>
            <button
              onClick={handleDownloadPDF}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-semibold"
            >
              <Download className="w-5 h-5" />
              Download PDF
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Project Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Side - Location Details */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-orange-600 mb-4">Location Details</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Address</p>
                  <p className="text-sm text-gray-600">{estimation.address || `${estimation.city}, ${estimation.state} ${estimation.zip_code}`}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Coordinates</p>
                <p className="text-sm text-gray-600">{estimation.latitude.toFixed(6)}, {estimation.longitude.toFixed(6)}</p>
              </div>
              {estimation.customer_name && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Customer</p>
                  <p className="text-sm text-gray-600">{estimation.customer_name}</p>
                  {estimation.email && <p className="text-sm text-gray-600">{estimation.email}</p>}
                </div>
              )}
              {/* AI Roof Detection Info */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">AI Roof Detection</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Roof Type:</span>
                    <span className="ml-1 text-gray-700">{estimation.roof_type || estimation.roof_type_detected || 'flat'}</span>
                  </div>
                  {estimation.roof_tilt && (
                    <div>
                      <span className="text-gray-500">Roof Tilt:</span>
                      <span className="ml-1 text-gray-700">{estimation.roof_tilt}°</span>
                    </div>
                  )}
                  {estimation.facade_reduction_ratio && (
                    <div>
                      <span className="text-gray-500">Facade Factor:</span>
                      <span className="ml-1 text-gray-700">{(estimation.facade_reduction_ratio * 100).toFixed(0)}%</span>
                    </div>
                  )}
                  {estimation.meters_per_pixel && (
                    <div>
                      <span className="text-gray-500">Scale:</span>
                      <span className="ml-1 text-gray-700">{estimation.meters_per_pixel?.toFixed(3)} m/px</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Side - System Overview */}
        <div className="lg:col-span-3 space-y-6">
          {/* System Size Cards */}
          <div>
            <h3 className="text-lg font-semibold text-orange-600 mb-4">System Size</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-600">
                <p className="text-sm text-gray-600">Usable Roof Area</p>
                <p className="text-2xl font-bold text-gray-800">{usableArea ? usableArea.toFixed(1) : 'N/A'}</p>
                <p className="text-xs text-gray-500">sq. meters (AI detected)</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-600">
                <p className="text-sm text-gray-600">Panel Count</p>
                <p className="text-2xl font-bold text-gray-800">{estimation.panel_count || 'N/A'}</p>
                <p className="text-xs text-gray-500">panels</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-600">
                <p className="text-sm text-gray-600">System Capacity</p>
                <p className="text-2xl font-bold text-gray-800">{Number(estimation.system_capacity).toFixed(2)}</p>
                <p className="text-xs text-gray-500">kW</p>
              </div>
            </div>
          </div>
          
          {/* Environmental Impact */}
          <div>
            <h3 className="text-lg font-semibold text-green-600 mb-4">Environmental Impact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-600">
                <p className="text-sm text-gray-600">CO₂ Offset</p>
                <p className="text-2xl font-bold text-green-600">{Math.round((estimation.energy_annual || 0) * 0.7 / 1000)}</p>
                <p className="text-xs text-gray-500">tons/year</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-600">
                <p className="text-sm text-gray-600">Trees Planted Equivalent</p>
                <p className="text-2xl font-bold text-green-600">{Math.round((estimation.energy_annual || 0) * 0.7 / 50)}</p>
                <p className="text-xs text-gray-500">trees/year</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-600">
                <p className="text-sm text-gray-600">Cars Off Road</p>
                <p className="text-2xl font-bold text-green-600">{Math.round((estimation.energy_annual || 0) * 0.7 / 4600)}</p>
                <p className="text-xs text-gray-500">equivalent</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* ===== PROPOSED SOLAR SITE PLAN (Hero Section) ===== */}
      <div className="bg-white shadow-xl rounded-lg overflow-hidden" style={{ pageBreakBefore: 'always', pageBreakInside: 'avoid' }}>
        {/* Section Header */}
        <div className="bg-gradient-to-r from-blue-900 to-slate-800 px-6 py-4">
          <h2 className="text-xl font-bold text-white tracking-wide">Proposed Solar Site Plan</h2>
          <p className="text-blue-200 text-sm mt-1">AI-powered roof analysis with optimized panel placement</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT — Site plan image */}
            <div>
              {(estimation.site_plan_snapshot || sitePlanImageUrl) ? (
                <div style={{ position: 'relative', display: 'block', width: '100%', minHeight: '260px' }} className="rounded-lg overflow-hidden border-2 border-gray-200 shadow-lg">
                  <img
                    src={estimation.site_plan_snapshot || sitePlanImageUrl}
                    alt="Approved solar site plan"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                  {/* HelioSmart corner watermark */}
                  <div style={{ position: 'absolute', bottom: 10, right: 12, pointerEvents: 'none', opacity: 0.7 }}>
                    <img src={heliosmartLogo} alt="" style={{ height: '20px', filter: 'brightness(0) invert(1) drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 text-center text-gray-400" style={{ minHeight: '260px' }}>
                  <div>
                    <svg className="mx-auto h-14 w-14 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">No satellite image available</p>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — Legend + system metrics */}
            <div className="flex flex-col justify-between gap-4">
              {/* Legend */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Map Legend</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-block w-6 h-4 rounded flex-shrink-0" style={{ backgroundColor: 'rgba(34, 197, 94, 0.4)', border: '2px solid #22c55e' }}></span>
                    <span className="text-sm text-gray-700">Usable Roof Area — <span className="font-semibold">{usableArea ? usableArea.toFixed(1) : '—'} m²</span></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-block w-6 h-4 rounded flex-shrink-0" style={{ backgroundColor: '#1a2f4a', border: '2px solid #1a1a2e' }}></span>
                    <span className="text-sm text-gray-700">Solar Modules — <span className="font-semibold">{estimation.panel_count || 0} panels</span></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-block w-6 h-4 rounded flex-shrink-0" style={{ border: '2px dashed #3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.08)' }}></span>
                    <span className="text-sm text-gray-700">Detected Roof Boundary</span>
                  </div>
                </div>
              </div>

              {/* Key metrics */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">System Parameters</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-blue-500 uppercase tracking-wide mb-1">System Size</p>
                    <p className="text-xl font-bold text-blue-800">{Number(estimation.system_capacity || 0).toFixed(2)} <span className="text-sm font-medium">kW</span></p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-500 uppercase tracking-wide mb-1">Panels</p>
                    <p className="text-xl font-bold text-green-800">{estimation.panel_count || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Azimuth</p>
                    <p className="text-xl font-bold text-gray-800">{estimation.azimuth || estimation.panel_azimuth || 180}°</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tilt</p>
                    <p className="text-xl font-bold text-gray-800">{estimation.tilt || estimation.panel_tilt || estimation.roof_tilt || 30}°</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-orange-500 uppercase tracking-wide mb-1">Capacity Factor</p>
                    <p className="text-xl font-bold text-orange-800">{capacityFactorDisplay}%</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-purple-500 uppercase tracking-wide mb-1">Roof Area</p>
                    <p className="text-xl font-bold text-purple-800">{usableArea ? usableArea.toFixed(0) : '—'} <span className="text-sm font-medium">m²</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Financial Overview */}
      <div className="bg-white shadow rounded-lg p-6" style={{ pageBreakBefore: 'always' }}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Financial Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Side - Investment Breakdown */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Investment Breakdown</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">System Cost</p>
                <p className="text-xl font-bold text-gray-800">{formatMAD(systemCost)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Installation</p>
                <p className="text-xl font-bold text-gray-800">{formatMAD(installationCost)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg col-span-2">
                <p className="text-sm text-gray-600">Consultation Fees</p>
                <p className="text-xl font-bold text-gray-800">{formatMAD(consultationFees)}</p>
              </div>
              <div className="col-span-2">
                <canvas ref={financialChartRef} style={{ maxHeight: '200px' }}></canvas>
              </div>
            </div>
            <div className="border-t-2 border-blue-600 pt-3 mt-2">
              <div className="bg-blue-50 rounded-lg p-4 flex justify-between items-center">
                <span className="text-lg font-bold text-gray-800">Total Investment</span>
                <span className="text-2xl font-extrabold text-blue-700">{formatMAD(totalInvestment)}</span>
              </div>
            </div>
          </div>
          
          {/* Right Side - Financial Returns */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Financial Returns</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Annual Savings</p>
                <p className="text-2xl font-bold text-green-600">{formatMAD(annualSavings)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Payback Period</p>
                <p className="text-2xl font-bold text-orange-600">{paybackPeriod.toFixed(1)} years</p>
                <p className="text-xs text-gray-500 mt-1">Based on total investment of {formatMAD(totalInvestment)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">ROI (25 years)</p>
                <p className="text-2xl font-bold text-blue-600">
                  {totalInvestment > 0
                    ? ((total25YearSavings / totalInvestment) * 100).toFixed(1)
                    : '0.0'}%
                </p>
              </div>
            </div>
            <div className="border-t pt-3 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-700">Total 25 Year Savings</span>
                <span className="text-2xl font-bold text-green-600">{formatMAD(total25YearSavings)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Return on Investment Chart */}
      <div className="bg-white shadow rounded-lg p-6" style={{ pageBreakInside: 'avoid' }}>
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Return on Investment</h3>
        <div style={{ height: '300px' }}>
          <canvas ref={roiChartRef}></canvas>
        </div>
      </div>
      
      {/* Performance Metrics */}
      <div className="bg-white shadow rounded-lg p-6" style={{ pageBreakInside: 'avoid' }}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500 shadow">
            <Zap className="w-8 h-8 text-orange-600 mb-2" />
            <p className="text-sm text-gray-600">System Capacity</p>
            <p className="text-2xl font-bold text-gray-800">{Number(estimation.system_capacity || 0).toFixed(2)} kW</p>
          </div>
          <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500 shadow">
            <TrendingUp className="w-8 h-8 text-orange-600 mb-2" />
            <p className="text-sm text-gray-600">Annual Production</p>
            <p className="text-2xl font-bold text-gray-800">{Math.round(estimation.energy_annual || 0).toLocaleString()} kWh</p>
          </div>
          <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500 shadow">
            <p className="text-sm text-gray-600">Panel Count</p>
            <p className="text-2xl font-bold text-gray-800">{estimation.panel_count || 'N/A'}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500 shadow">
            <p className="text-sm text-gray-600">Capacity Factor</p>
            <p className="text-2xl font-bold text-gray-800">{capacityFactorDisplay}%</p>
          </div>
          <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 shadow">
            <p className="text-sm text-gray-600">Tilt Angle</p>
            <p className="text-2xl font-bold text-gray-800">{estimation.tilt?.toFixed(1)}°</p>
          </div>
          <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 shadow">
            <p className="text-sm text-gray-600">Azimuth</p>
            <p className="text-2xl font-bold text-gray-800">{estimation.azimuth?.toFixed(1)}°</p>
          </div>
          <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 shadow">
            <p className="text-sm text-gray-600">System Losses</p>
            <p className="text-2xl font-bold text-gray-800">{estimation.losses?.toFixed(1)}%</p>
          </div>
          <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 shadow">
            <p className="text-sm text-gray-600">Solar Irradiance</p>
            <p className="text-2xl font-bold text-gray-800">{estimation.solrad_annual ? estimation.solrad_annual.toFixed(2) : (estimation.solar_irradiance_avg?.toFixed(2) || 'N/A')} kWh/m²/day</p>
          </div>
          <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 shadow">
            <p className="text-sm text-gray-600">Coverage</p>
            <p className="text-2xl font-bold text-gray-800">{estimation.coverage_percentage}%</p>
          </div>
          <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 shadow">
            <p className="text-sm text-gray-600">Usable Area</p>
            <p className="text-2xl font-bold text-gray-800">{usableArea ? usableArea.toFixed(1) : 'N/A'} m²</p>
          </div>
          <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 shadow">
            <p className="text-sm text-gray-600">Performance Ratio</p>
            <p className="text-2xl font-bold text-gray-800">{estimation.performance_ratio ? (estimation.performance_ratio * 100).toFixed(1) : 'N/A'}%</p>
          </div>
          <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 shadow">
            <p className="text-sm text-gray-600">Production/kW</p>
            <p className="text-2xl font-bold text-gray-800">
              {productionPerKw != null
                ? Number(productionPerKw).toLocaleString('en-US', { maximumFractionDigits: 0 })
                : estimation.system_capacity > 0
                  ? Math.round((estimation.energy_annual || 0) / estimation.system_capacity).toLocaleString()
                  : 'N/A'
              } kWh
            </p>
          </div>
        </div>
      </div>
      
      {/* Technical Specifications & Equipment (BOM) */}
      <div className="bg-white shadow rounded-lg p-6" style={{ pageBreakBefore: 'always', pageBreakInside: 'avoid' }}>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Technical Specifications &amp; Equipment</h2>
        <p className="text-sm text-gray-500 mb-6">Bill of Materials for the proposed solar installation</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Module */}
          <div className="border border-blue-200 rounded-lg p-5 bg-gradient-to-br from-blue-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/><path d="M3 12h18M12 3v18" strokeWidth="1.5"/></svg>
              </div>
              <div>
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Solar Module</p>
                <p className="text-lg font-bold text-gray-800">
                  {estimation.panel_info
                    ? `${estimation.panel_info.brand ? estimation.panel_info.brand + ' ' : ''}${estimation.panel_info.name}`
                    : 'N/A'}
                </p>
              </div>
            </div>
            {estimation.panel_info ? (
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between"><span>Quantity</span><span className="font-semibold text-gray-800">{estimation.panel_count || '—'} panels</span></div>
                <div className="flex justify-between"><span>Type</span><span className="font-semibold text-gray-800">{estimation.panel_info.type || '—'}</span></div>
                <div className="flex justify-between"><span>Rated Power</span><span className="font-semibold text-gray-800">{estimation.panel_info.panel_rated_power} Wp</span></div>
                <div className="flex justify-between"><span>Total DC Capacity</span><span className="font-semibold text-gray-800">{((estimation.panel_count || 0) * (estimation.panel_info.panel_rated_power / 1000)).toFixed(2)} kWp</span></div>
                {estimation.panel_info.module_efficiency && (
                  <div className="flex justify-between"><span>Efficiency</span><span className="font-semibold text-gray-800">{estimation.panel_info.module_efficiency.toFixed(1)}%</span></div>
                )}
                {estimation.panel_info.open_circuit_voltage && (
                  <div className="flex justify-between"><span>Voc</span><span className="font-semibold text-gray-800">{estimation.panel_info.open_circuit_voltage} V</span></div>
                )}
                {estimation.panel_info.num_of_cells && (
                  <div className="flex justify-between"><span>Cell Count</span><span className="font-semibold text-gray-800">{estimation.panel_info.num_of_cells} cells</span></div>
                )}
                {estimation.panel_info.connector_type && (
                  <div className="flex justify-between"><span>Connector</span><span className="font-semibold text-gray-800">{estimation.panel_info.connector_type}</span></div>
                )}
                {estimation.panel_info.warranty_years && (
                  <div className="flex justify-between"><span>Warranty</span><span className="font-semibold text-gray-800">{estimation.panel_info.warranty_years} years</span></div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Panel data not available</p>
            )}
          </div>
          
          {/* Inverter */}
          <div className="border border-emerald-200 rounded-lg p-5 bg-gradient-to-br from-emerald-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Inverter</p>
                <p className="text-lg font-bold text-gray-800">
                  {estimation.inverter_info
                    ? `${estimation.inverter_info.brand ? estimation.inverter_info.brand + ' ' : ''}${estimation.inverter_info.name}`
                    : estimation.inverter_combos?.[0]?.model || 'N/A'}
                </p>
              </div>
            </div>
            {estimation.inverter_info ? (
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between"><span>Quantity</span><span className="font-semibold text-gray-800">{estimation.inverter_combos?.[0]?.qty || 1} unit{(estimation.inverter_combos?.[0]?.qty || 1) > 1 ? 's' : ''}</span></div>
                <div className="flex justify-between"><span>Phase</span><span className="font-semibold text-gray-800">{estimation.inverter_info.phase_type || '—'}</span></div>
                <div className="flex justify-between"><span>AC Output</span><span className="font-semibold text-gray-800">{estimation.inverter_info.nominal_ac_power_kw} kW</span></div>
                {estimation.inverter_info.efficiency_max && (
                  <div className="flex justify-between"><span>Max Efficiency</span><span className="font-semibold text-gray-800">{estimation.inverter_info.efficiency_max.toFixed(1)}%</span></div>
                )}
                {estimation.inverter_info.no_of_mppt_ports && (
                  <div className="flex justify-between"><span>MPPT Inputs</span><span className="font-semibold text-gray-800">{estimation.inverter_info.no_of_mppt_ports}</span></div>
                )}
                {estimation.inverter_info.max_strings_per_mppt && (
                  <div className="flex justify-between"><span>Strings / MPPT</span><span className="font-semibold text-gray-800">{estimation.inverter_info.max_strings_per_mppt}</span></div>
                )}
                {estimation.inverter_info.ip_rating && (
                  <div className="flex justify-between"><span>IP Rating</span><span className="font-semibold text-gray-800">{estimation.inverter_info.ip_rating}</span></div>
                )}
                {estimation.inverter_info.warranty && (
                  <div className="flex justify-between"><span>Warranty</span><span className="font-semibold text-gray-800">{estimation.inverter_info.warranty} years</span></div>
                )}
              </div>
            ) : estimation.inverter_combos?.[0]?.model ? (
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between"><span>Quantity</span><span className="font-semibold text-gray-800">{estimation.inverter_combos[0].qty || 1} unit</span></div>
                <p className="text-xs text-gray-400 italic mt-2">Full specs not available</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Inverter data not available</p>
            )}
          </div>
          
          {/* Mounting */}
          <div className="border border-amber-200 rounded-lg p-5 bg-gradient-to-br from-amber-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-16 0H3" /></svg>
              </div>
              <div>
                <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide">Mounting Structure</p>
                <p className="text-lg font-bold text-gray-800">Aluminum Mounting Rails</p>
              </div>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between"><span>Material</span><span className="font-semibold text-gray-800">Anodized Aluminum (6005-T5)</span></div>
              <div className="flex justify-between"><span>Source</span><span className="font-semibold text-gray-800">Moroccan-sourced</span></div>
              <div className="flex justify-between"><span>Installation</span><span className="font-semibold text-gray-800">{estimation.roof_type || estimation.roof_type_detected || 'Flat'} Roof — {estimation.installation_type || 'Rooftop'}</span></div>
              <div className="flex justify-between"><span>Orientation</span><span className="font-semibold text-gray-800">{estimation.panel_orientation || 'Portrait'}</span></div>
              {estimation.mounting_structure_cost && (
                <div className="flex justify-between"><span>Est. Cost</span><span className="font-semibold text-gray-800">{formatMAD(estimation.mounting_structure_cost)}</span></div>
              )}
              <div className="flex justify-between"><span>Wind Rating</span><span className="font-semibold text-gray-800">Up to 130 km/h</span></div>
            </div>
          </div>
          
          {/* Cabling */}
          <div className="border border-slate-200 rounded-lg p-5 bg-gradient-to-br from-slate-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide">DC Cabling</p>
                <p className="text-lg font-bold text-gray-800">4mm² Solar Cable</p>
              </div>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between"><span>Cross Section</span><span className="font-semibold text-gray-800">4 mm²</span></div>
              <div className="flex justify-between"><span>Type</span><span className="font-semibold text-gray-800">UV-resistant, double-insulated</span></div>
              <div className="flex justify-between"><span>Voltage Rating</span><span className="font-semibold text-gray-800">1000V DC (TÜV certified)</span></div>
              <div className="flex justify-between"><span>Temperature Range</span><span className="font-semibold text-gray-800">-40°C to +90°C</span></div>
              <div className="flex justify-between"><span>Connectors</span><span className="font-semibold text-gray-800">MC4 compatible</span></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Monthly Production Chart */}
      <div className="bg-white shadow rounded-lg p-6" style={{ pageBreakBefore: 'always', pageBreakInside: 'avoid' }}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Monthly Energy Production</h2>
        <div style={{ height: '350px' }}>
          <canvas ref={monthlyChartRef}></canvas>
        </div>
      </div>
      
      {/* Comparison and Lifetime Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ pageBreakBefore: 'always' }}>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Monthly Energy Comparison</h3>
          <div style={{ height: '300px' }}>
            <canvas ref={comparisonChartRef}></canvas>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            The chart compares your expected solar production with your current energy consumption pattern.
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Lifetime Performance</h3>
          <div style={{ height: '300px' }}>
            <canvas ref={lifetimeChartRef}></canvas>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            This chart shows the projected system performance over 25 years, accounting for the standard 0.5% annual degradation rate.
          </p>
        </div>
      </div>
      
      {/* System Loss Diagram */}
      <div className="bg-white shadow rounded-lg p-6" style={{ pageBreakBefore: 'always', pageBreakInside: 'avoid' }}>
        <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">System Loss Diagram</h2>
        <div className="mx-auto" style={{ maxWidth: '950px', height: '300px' }}>
          <canvas ref={lossChartRef}></canvas>
        </div>
        {/* Footnote strip */}
        <div className="mt-4 pt-3 border-t border-blue-100 flex flex-wrap gap-x-6 gap-y-1">
          {[
            'Calculations are estimates and may vary by weather conditions.',
            'System efficiency degrades ~0.5% per year.',
            'Financial returns assume stable energy rates.',
            'Actual production depends on shading & maintenance.',
          ].map((note, i) => (
            <span key={i} className="text-xs text-blue-500 flex items-start gap-1">
              <span className="mt-0.5 text-blue-400">•</span>{note}
            </span>
          ))}
        </div>
      </div>
      
      {/* Actions Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200 no-print">
        <Link to="/estimations" className="text-blue-600 hover:underline flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" />
          Back to Estimations
        </Link>
      </div>
    </div>
  )
}
