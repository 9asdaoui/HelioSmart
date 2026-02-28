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
  
  // Mock data for charts (in production, this would come from backend)
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
      const systemCost = (estimation.system_capacity || 5) * 3000
      const installationCost = systemCost * 0.15
      const consultationFees = 500
      
      const ctx = financialChartRef.current.getContext('2d')
      new window.Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['System Cost', 'Installation Cost', 'Consulting Fees'],
          datasets: [{
            data: [systemCost, installationCost, consultationFees],
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
                  return context.label + ': $' + context.parsed.toLocaleString()
                }
              }
            }
          }
        }
      })
    }
    
    // ROI Chart
    if (roiChartRef.current) {
      const totalInvestment = (estimation.system_capacity || 5) * 3500
      const annualSavings = (estimation.annual_usage_kwh || 10000) * 0.15
      const years = Array.from({length: 26}, (_, i) => i)
      const cumulativeSavings = years.map(year => {
        if (year === 0) return -totalInvestment
        return -totalInvestment + (year * annualSavings)
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
                  return 'Net Savings: $' + Math.round(context.parsed.y).toLocaleString()
                }
              }
            }
          },
          scales: {
            y: {
              title: {
                display: true,
                text: 'Cumulative Savings ($)'
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
        xAxis: {
          categories: [
            'POA irradiance',
            'Soiling',
            'Shading',
            'IAM',
            'DC nominal energy (with losses)',
            'Inverter loss',
            'AC energy from inverter',
            'Consumptions from auxiliary circuits',
            'Exportable energy'
          ],
          labels: {
            style: {
              fontSize: '11px'
            }
          }
        },
        yAxis: {
          title: {
            text: null
          },
          min: 0,
          max: 2200,
          tickInterval: 200
        },
        legend: {
          enabled: false
        },
        tooltip: {
          formatter: function() {
            return '<b>' + this.x + '</b><br/>' +
              'Value: ' + Math.abs(this.y) + ' kWh'
          }
        },
        plotOptions: {
          bar: {
            dataLabels: {
              enabled: true,
              formatter: function() {
                return Math.abs(this.y)
              }
            }
          }
        },
        series: [
          {
            name: 'Base',
            data: [0, 1950, 1930, 1900, 1850, 1800, 1750, 1730, 0],
            color: 'transparent',
            showInLegend: false
          },
          {
            name: 'Losses/Production',
            data: [
              { y: 2000, color: '#4CAF50' },
              { y: -20, color: '#FF5722' },
              { y: -30, color: '#FF5722' },
              { y: -50, color: '#FF5722' },
              { y: -50, color: '#FFC107' },
              { y: -50, color: '#FF5722' },
              { y: -20, color: '#4CAF50' },
              { y: -20, color: '#FF5722' },
              { y: 1710, color: '#2196F3' }
            ],
            dataLabels: {
              enabled: true,
              formatter: function() {
                return Math.abs(this.y)
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
  
  const systemCost = (estimation.system_capacity || 5) * 3000
  const installationCost = systemCost * 0.15
  const consultationFees = 500
  const totalInvestment = systemCost + installationCost + consultationFees
  const annualSavings = (estimation.annual_usage_kwh || 10000) * 0.15
  const paybackPeriod = totalInvestment / annualSavings
  const total25YearSavings = (annualSavings * 25) - totalInvestment
  
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
                <p className="text-sm text-gray-600">Roof Area</p>
                <p className="text-2xl font-bold text-gray-800">{estimation.roof_area || 'N/A'}</p>
                <p className="text-xs text-gray-500">sq. meters</p>
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
            <p className="text-2xl font-bold text-gray-800">{estimation.system_capacity} kW</p>
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
            <p className="text-sm text-gray-600">Tilt Angle</p>
            <p className="text-2xl font-bold text-gray-800">{estimation.tilt}°</p>
          </div>
          <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500 shadow">
            <p className="text-sm text-gray-600">Azimuth</p>
            <p className="text-2xl font-bold text-gray-800">{estimation.azimuth}°</p>
          </div>
          <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500 shadow">
            <p className="text-sm text-gray-600">System Losses</p>
            <p className="text-2xl font-bold text-gray-800">{estimation.losses}%</p>
          </div>
          <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500 shadow">
            <p className="text-sm text-gray-600">Coverage</p>
            <p className="text-2xl font-bold text-gray-800">{estimation.coverage_percentage}%</p>
          </div>
          <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500 shadow">
            <p className="text-sm text-gray-600">Roof Area</p>
            <p className="text-2xl font-bold text-gray-800">{estimation.roof_area || 'N/A'} m²</p>
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
