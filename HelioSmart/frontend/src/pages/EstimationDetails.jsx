import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { estimationsAPI } from '@/services/api'
import { useEffect, useRef } from 'react'
import { MapPin, Zap, TrendingUp, Download, Printer, ArrowLeft } from 'lucide-react'

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
  
  useEffect(() => {
    if (!estimation || !window.Chart) return
    
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
    
    // System Loss Waterfall (using Highcharts)
    if (window.Highcharts) {
      // Get loss data from backend or use defaults
      const lossBreakdown = estimation.loss_breakdown?.breakdown || {
        temperature_loss: 3.0,
        soiling_loss: 3.0,
        mismatch_loss: 1.0,
        dc_wiring_loss: 2.0,
        inverter_loss: 4.0,
        ac_wiring_loss: 1.0,
        other_loss: 2.0,
        shading_loss: 0.0
      }
      
      // Calculate energy values based on annual production
      const annualProduction = estimation.energy_annual || 10000
      const performanceRatio = estimation.loss_breakdown?.performance_ratio || 0.85
      
      // POA irradiance (what the panels receive) is annual production * PR ratio
      const poaEnergy = Math.round(annualProduction / performanceRatio)
      
      // Calculate each loss step
      const tempLossKwh = Math.round(poaEnergy * lossBreakdown.temperature_loss / 100)
      const afterTemp = poaEnergy - tempLossKwh
      
      const soilLossKwh = Math.round(poaEnergy * lossBreakdown.soiling_loss / 100)
      const afterSoil = afterTemp - soilLossKwh
      
      const shadeLossKwh = Math.round(poaEnergy * lossBreakdown.shading_loss / 100)
      const afterShade = afterSoil - shadeLossKwh
      
      const mismatchLossKwh = Math.round(poaEnergy * lossBreakdown.mismatch_loss / 100)
      const dcNominal = afterShade - mismatchLossKwh
      
      const dcWiringLossKwh = Math.round(poaEnergy * lossBreakdown.dc_wiring_loss / 100)
      const afterDcWiring = dcNominal - dcWiringLossKwh
      
      const inverterLossKwh = Math.round(poaEnergy * lossBreakdown.inverter_loss / 100)
      const acFromInverter = afterDcWiring - inverterLossKwh
      
      const acWiringLossKwh = Math.round(poaEnergy * lossBreakdown.ac_wiring_loss / 100)
      const afterAcWiring = acFromInverter - acWiringLossKwh
      
      const otherLossKwh = Math.round(poaEnergy * lossBreakdown.other_loss / 100)
      const exportableEnergy = Math.round(annualProduction)
      
      // Calculate max for Y axis
      const yMax = Math.ceil(poaEnergy / 1000) * 1000 + 500
      
      window.Highcharts.chart('waterfallChart', {
        chart: {
          type: 'bar',
          backgroundColor: '#ffffff',
          height: 600
        },
        title: {
          text: 'SYSTEM LOSS DIAGRAM',
          style: {
            fontSize: '18px',
            fontWeight: 'bold'
          }
        },
        subtitle: {
          text: `Total System Losses: ${estimation.loss_breakdown?.total_loss_percentage?.toFixed(1) || estimation.losses?.toFixed(1)}% | Performance Ratio: ${(performanceRatio * 100).toFixed(1)}%`,
          style: { fontSize: '12px' }
        },
        xAxis: {
          categories: [
            'POA Irradiance',
            `Temperature Loss (${lossBreakdown.temperature_loss}%)`,
            `Soiling Loss (${lossBreakdown.soiling_loss}%)`,
            `Shading Loss (${lossBreakdown.shading_loss}%)`,
            `Mismatch Loss (${lossBreakdown.mismatch_loss}%)`,
            `DC Wiring Loss (${lossBreakdown.dc_wiring_loss}%)`,
            `Inverter Loss (${lossBreakdown.inverter_loss}%)`,
            `AC Wiring Loss (${lossBreakdown.ac_wiring_loss}%)`,
            'Exportable Energy'
          ],
          labels: {
            style: {
              fontSize: '11px'
            }
          }
        },
        yAxis: {
          title: {
            text: 'Energy (kWh/year)'
          },
          min: 0,
          max: yMax,
          tickInterval: Math.round(yMax / 10)
        },
        legend: {
          enabled: false
        },
        tooltip: {
          formatter: function() {
            const val = Math.abs(this.y)
            return '<b>' + this.x + '</b><br/>Value: ' + val.toLocaleString() + ' kWh/year'
          }
        },
        plotOptions: {
          bar: {
            dataLabels: {
              enabled: true,
              formatter: function() {
                return Math.abs(this.y).toLocaleString()
              },
              style: { fontSize: '10px' }
            }
          }
        },
        series: [
          {
            name: 'Base',
            data: [0, poaEnergy - tempLossKwh, afterTemp - soilLossKwh, afterSoil - shadeLossKwh, 
                   afterShade - mismatchLossKwh, dcNominal - dcWiringLossKwh, afterDcWiring - inverterLossKwh, 
                   acFromInverter - acWiringLossKwh, 0],
            color: 'transparent',
            showInLegend: false
          },
          {
            name: 'Energy/Losses',
            data: [
              { y: poaEnergy, color: '#4CAF50' },
              { y: -tempLossKwh, color: '#FF5722' },
              { y: -soilLossKwh, color: '#FF5722' },
              { y: -shadeLossKwh, color: '#FF9800' },
              { y: -mismatchLossKwh, color: '#FFC107' },
              { y: -dcWiringLossKwh, color: '#FF5722' },
              { y: -inverterLossKwh, color: '#E91E63' },
              { y: -acWiringLossKwh, color: '#FF5722' },
              { y: exportableEnergy, color: '#2196F3' }
            ],
            dataLabels: {
              enabled: true,
              formatter: function() {
                const val = Math.abs(this.y)
                if (this.y < 0) return '-' + val.toLocaleString()
                return val.toLocaleString()
              }
            }
          }
        ],
        exporting: {
          enabled: false
        },
        credits: {
          enabled: false
        }
      })
    }
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
  const paybackPeriod = annualSavings > 0 ? totalInvestment / annualSavings : 0
  const total25YearSavings = (annualSavings * 25) - totalInvestment
  
  // Usable area - prefer SAM-detected area, fall back to roof_area
  const usableArea = estimation.usable_area_m2 || estimation.roof_area || 0
  
  return (
    <div className="estimation-details-container space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Solar Energy Project Details</h1>
            <p className="text-gray-600">Project ID: #{estimation.id}</p>
            <p className="text-gray-600">Created on: {new Date(estimation.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex gap-3 no-print">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Printer className="w-5 h-5" />
              Print Report
            </button>
            <button
              onClick={handleDownloadPDF}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
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
                <p className="text-2xl font-bold text-gray-800">{estimation.system_capacity}</p>
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
      
      {/* Financial Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Financial Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Side - Investment Breakdown */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Investment Breakdown</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">System Cost</p>
                <p className="text-xl font-bold text-gray-800">{systemCost.toLocaleString()} MAD</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Installation</p>
                <p className="text-xl font-bold text-gray-800">{installationCost.toLocaleString()} MAD</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg col-span-2">
                <p className="text-sm text-gray-600">Consultation Fees</p>
                <p className="text-xl font-bold text-gray-800">{consultationFees.toLocaleString()} MAD</p>
              </div>
              <div className="col-span-2">
                <canvas ref={financialChartRef} style={{ maxHeight: '200px' }}></canvas>
              </div>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-700">Total Investment</span>
                <span className="text-2xl font-bold text-blue-600">{totalInvestment.toLocaleString()} MAD</span>
              </div>
            </div>
          </div>
          
          {/* Right Side - Financial Returns */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Financial Returns</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Annual Savings</p>
                <p className="text-2xl font-bold text-green-600">{Math.round(annualSavings).toLocaleString()} MAD</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Payback Period</p>
                <p className="text-2xl font-bold text-orange-600">{paybackPeriod.toFixed(1)} years</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">ROI (25 years)</p>
                <p className="text-2xl font-bold text-blue-600">{((total25YearSavings / totalInvestment) * 100).toFixed(0)}%</p>
              </div>
            </div>
            <div className="border-t pt-3 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-700">Total 25 Year Savings</span>
                <span className="text-2xl font-bold text-green-600">{Math.round(total25YearSavings).toLocaleString()} MAD</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Return on Investment Chart */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Return on Investment</h3>
        <div style={{ height: '300px' }}>
          <canvas ref={roiChartRef}></canvas>
        </div>
      </div>
      
      {/* Performance Metrics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500 shadow">
            <Zap className="w-8 h-8 text-orange-600 mb-2" />
            <p className="text-sm text-gray-600">System Capacity</p>
            <p className="text-2xl font-bold text-gray-800">{estimation.system_capacity?.toFixed(2)} kW</p>
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
            <p className="text-2xl font-bold text-gray-800">{estimation.capacity_factor ? (estimation.capacity_factor * 100).toFixed(1) : 'N/A'}%</p>
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
            <p className="text-2xl font-bold text-gray-800">{estimation.annual_production_per_kw?.toFixed(0) || 'N/A'} kWh</p>
          </div>
        </div>
      </div>
      
      {/* Monthly Production Chart */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Monthly Energy Production</h2>
        <div style={{ height: '350px' }}>
          <canvas ref={monthlyChartRef}></canvas>
        </div>
      </div>
      
      {/* Comparison and Lifetime Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">SYSTEM LOSS DIAGRAM</h2>
        <div id="waterfallChart" style={{ height: '600px' }}></div>
      </div>
      
      {/* Notes */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Important Notes</h3>
            <div className="mt-2 text-sm text-blue-700 space-y-1">
              <p>• All calculations are estimates based on typical conditions and may vary</p>
              <p>• Actual production depends on weather, shading, and system maintenance</p>
              <p>• Financial returns assume current energy rates and no significant rate changes</p>
              <p>• System performance degrades approximately 0.5% per year</p>
            </div>
          </div>
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
