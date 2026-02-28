@extends('../site/layouts.app')
@section('page_title', __('Solar Project Details'))

@push('styles')
<style>
    .details-card {
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .details-card:h                                         <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                                    </svg>                        <div class="system-icon mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                                    </svg>
                                </div>{
        transform: translateY(-5px);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    }
    
    .chart-container {
        position: relative;
        height: 350px;
        margin-bottom: 1.5rem;
    }
    
    .metric-card {
        transition: all 0.3s ease;
    }
    
    .metric-card.environmental {
        border-left: 4px solid #10b981;
    }
    
    .metric-card.system {
        border-left: 4px solid #f59e0b;
    }
    
    .metric-card:hover {
        transform: scale(1.02);
    }
    
    .environmental-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        color: #10b981;
    }
    
    .system-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        color: #f59e0b;
    }
    
    .download-btn {
        position: relative;
        overflow: hidden;
    }
    
    .download-btn:after {
        content: "";
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: 0.3s;
    }
    
    .download-btn:hover:after {
        left: 100%;
    }
    
    @media print {
        .no-print {
            display: none !important;
        }
        
        body {
            font-size: 12pt;
        }
        
        .container {
            width: 100%;
            max-width: 100%;
        }
    }
</style>
@endpush

@section('content')
<div class="container mx-auto px-4 py-8">
    <div class="bg-white shadow rounded-lg p-6">
        <!-- Header with Project Details -->
        <div class="flex flex-wrap justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <div>
                <h1 class="text-2xl font-bold text-gray-800">{{ __('Solar Energy Project Details') }}</h1>
                <p class="text-gray-600">{{ __('Project ID') }}: #{{ $estimation->id }}</p>
                <p class="text-gray-600">{{ __('Created on') }}: {{ $estimation->created_at->format('F j, Y') }}</p>
            </div>
            <div style="display: flex; column-gap: 0.75rem;" class="no-print">
                <button onclick="window.print()" style="background-color: #2563eb; color: white; padding: 0.5rem 1rem; border-radius: 0.375rem; display: flex; align-items: center; transition: background-color 0.2s;">
                    <svg xmlns="http://www.w3.org/2000/svg" style="height: 1.25rem; width: 1.25rem; margin-right: 0.5rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
                    </svg>
                    {{ __('Print Report') }}
                </button>
                <button id="downloadPdf" style="background-color: #059669; color: white; padding: 0.5rem 1rem; border-radius: 0.375rem; display: flex; align-items: center; position: relative; overflow: hidden; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#047857'" onmouseout="this.style.backgroundColor='#059669'">
                    <svg xmlns="http://www.w3.org/2000/svg" style="height: 1.25rem; width: 1.25rem; margin-right: 0.5rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {{ __('Download PDF') }}
                </button>
            </div>
        </div>

        <!-- Main Project Overview Section -->
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
            <!-- Left Side - Location Details & Roof Image (2/5 width) -->
            <div class="lg:col-span-2 flex">

                <!-- Location Details -->
                <div class="bg-white p-6 rounded-lg shadow border border-gray-200 w-full flex flex-col">
                    <h3 class="text-lg font-semibold text-orange-600 mb-4">{{ __('Location Details') }}</h3>
                    <div class="relative mb-6">
                        @if(isset($roofImageUrl) && $roofImageUrl)
                            <img src="{{ $roofImageUrl }}" 
                                 alt="Roof Analysis" 
                                 class="rounded-lg border-4 border-orange-500 object-cover" 
                                 style="width: 400px; height: 400px;"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="bg-gray-100 rounded-lg border-4 border-orange-500 items-center justify-center hidden" style="display: none; width: 400px; height: 400px;">
                                <div class="text-center">
                                    <svg class="w-16 h-16 mx-auto text-orange-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"/>
                                    </svg>
                                    <p class="text-orange-600 font-medium">{{ __('Image Loading Error') }}</p>
                                    <p class="text-gray-500 text-sm">{{ __('Unable to load roof image') }}</p>
                                </div>
                            </div>
                        @else
                            <div class="w-full h-64 bg-gray-100 rounded-lg border-4 border-orange-500 flex items-center justify-center">
                                <div class="text-center">
                                    <svg class="w-16 h-16 mx-auto text-orange-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                    <p class="text-orange-600 font-medium">{{ __('No Roof Image Available') }}</p>
                                    <p class="text-gray-500 text-sm">{{ __('Roof analysis image not provided') }}</p>
                                </div>
                            </div>
                        @endif
                    </div>
                    <div class="space-y-3 flex-grow">
                        <div class="flex justify-between">
                            <span class="text-gray-600">{{ __('Address') }}:</span>
                            <span class="font-medium text-gray-800">{{ $estimation->street }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">{{ __('City/State') }}:</span>
                            <span class="font-medium text-gray-800">{{ $estimation->city }}, {{ $estimation->state }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">{{ __('Roof Type') }}:</span>
                            <span class="font-medium text-gray-800">{{ $roofType ?? 'N/A' }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">{{ __('Electricity Rate') }}:</span>
                            <span class="font-medium text-gray-800">{{ isset($electricityRate) ? number_format($electricityRate, 2) . ' dh/kWh' : 'N/A' }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">{{ __('Utility') }}:</span>
                            <span class="font-medium text-gray-800">{{ $estimation->utility->name ?? 'N/A' }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Side - System Overview (3/5 width) -->
            <div class="lg:col-span-3 space-y-6">
                <!-- System Size Cards -->
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold text-orange-600">{{ __('System Size') }}</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="metric-card system bg-white p-4 rounded-lg shadow flex items-center justify-between">
                            <div class="flex flex-col items-start">
                                <div class="system-icon mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                                    </svg>
                                </div>
                                <h3 class="text-lg font-medium text-orange-800">{{ __('System Capacity') }}</h3>
                            </div>
                            <div class="text-right">
                                <p class="text-2xl font-bold text-orange-600">{{ number_format($estimation->system_capacity, 2) }} kW</p>
                            </div>
                        </div>
                        <div class="metric-card system bg-white p-4 rounded-lg shadow flex items-center justify-between">
                            <div class="flex flex-col items-start">
                                <div class="system-icon mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                    </svg>
                                </div>
                                <h3 class="text-lg font-medium text-orange-800">{{ __('Annual Production') }}</h3>
                            </div>
                            <div class="text-right">
                                <p class="text-2xl font-bold text-orange-600">{{ number_format($estimation->energy_annual) }} kWh</p>
                                <p class="text-orange-500 text-sm">{{ __('per year') }}</p>
                            </div>
                        </div>
                        <div class="metric-card system bg-white p-4 rounded-lg shadow flex items-center justify-between">
                            <div class="flex flex-col items-start">
                                <div class="system-icon mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                    </svg>
                                </div>
                                <h3 class="text-lg font-medium text-orange-800">{{ __('Avg Production/month') }}</h3>
                            </div>
                            <div class="text-right">
                                <p class="text-2xl font-bold text-orange-600">{{ number_format($estimation->energy_annual / 12, 0) }} kWh</p>
                                <p class="text-orange-500 text-sm">{{ __('per month') }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- System Overview Details -->
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold text-orange-600">{{ __('System Overview') }}</h3>
                    
                    <!-- Panel Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="metric-card system bg-white p-4 rounded-lg shadow flex items-center justify-between">
                            <div class="flex flex-col items-start">
                                <div class="system-icon mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4l-2 16h14l-2-16M10 9v6M14 9v6"/>
                                    </svg>
                                </div>
                                <h3 class="text-lg font-medium text-orange-800">{{ __('Panel Count') }}</h3>
                            </div>
                            <div class="text-right">
                                <p class="text-2xl font-bold text-orange-600">{{ $estimation->panel_count }}</p>
                            </div>
                        </div>
                        <div class="metric-card system bg-white p-4 rounded-lg shadow flex items-center justify-between">
                            <div class="flex flex-col items-start">
                                <div class="system-icon mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                                    </svg>
                                </div>
                                <h3 class="text-lg font-medium text-orange-800">{{ __('Panel Capacity') }}</h3>
                            </div>
                            <div class="text-right">
                                <p class="text-2xl font-bold text-orange-600">{{ $panelWattage ?? 'N/A' }} W</p>
                            </div>
                        </div>
                        <div class="metric-card system bg-white p-4 rounded-lg shadow flex items-center justify-between">
                            <div class="flex flex-col items-start">
                                <div class="system-icon mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                                    </svg>
                                </div>
                                <h3 class="text-lg font-medium text-orange-800">{{ __('Panel Brand') }}</h3>
                            </div>
                            <div class="text-right">
                                <p class="text-2xl font-bold text-orange-600">{{ $panelBrand ?? 'N/A' }}</p>
                                <p class="text-orange-500 text-sm">{{ $panelEfficiency ?? '20' }}% {{ __('efficiency') }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Inverter Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="metric-card system bg-white p-4 rounded-lg shadow flex items-center justify-between">
                            <div class="flex flex-col items-start">
                                <div class="system-icon mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 4a4 4 0 00-4 4v8a4 4 0 004 4h8a4 4 0 004-4V8a4 4 0 00-4-4H8zM10 12v-2m4 2v-2m-2 4h.01"/>
                                    </svg>
                                </div>
                                <h3 class="text-lg font-medium text-orange-800">{{ __('Inverter Count') }}</h3>
                            </div>
                            <div class="text-right">
                                <p class="text-2xl font-bold text-orange-600">{{ $inverterCount ?? 'N/A' }}</p>
                                @if(isset($inverterDesign['configuration_type']))
                                    <p class="text-orange-500 text-sm">{{ str_replace('_', ' ', ucwords($inverterDesign['configuration_type'], '_')) }}</p>
                                @endif
                            </div>
                        </div>
                        <div class="metric-card system bg-white p-4 rounded-lg shadow flex items-center justify-between">
                            <div class="flex flex-col items-start">
                                <div class="system-icon mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                    </svg>
                                </div>
                                <h3 class="text-lg font-medium text-orange-800">{{ __('Total AC Capacity') }}</h3>
                            </div>
                            <div class="text-right">
                                <p class="text-2xl font-bold text-orange-600">{{ number_format($systemAcCapacity ?? $estimation->system_capacity, 2) }} kW</p>
                                <p class="text-orange-500 text-sm">DC/AC: {{ number_format($dcAcRatio ?? 1.0, 2) }}</p>
                            </div>
                        </div>
                        <div class="metric-card system bg-white p-4 rounded-lg shadow flex items-center justify-between">
                            <div class="flex flex-col items-start">
                                <div class="system-icon mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                                    </svg>
                                </div>
                                <h3 class="text-lg font-medium text-orange-800">{{ __('Inverter Brand') }}</h3>
                            </div>
                            <div class="text-right">
                                <p class="text-2xl font-bold text-orange-600">{{ $inverterBrand ?? 'N/A' }}</p>
                                <p class="text-orange-500 text-sm">{{ $inverterWarranty ?? '10' }} {{ __('years warranty') }}</p>
                            </div>
                        </div>
                    </div>
                </div>                        <!-- Environmental Impact -->
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold text-green-600">{{ __('Environmental impact') }}</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="metric-card environmental bg-white p-4 rounded-lg shadow text-center">
                            <div class="environmental-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 class="text-lg font-medium text-gray-800">{{ __('CO₂ Reduction') }}</h3>
                            <p class="text-2xl font-bold text-green-600">{{ isset($co2Reduction) ? number_format($co2Reduction) . ' ' . __('kg') : 'N/A' }}</p>
                            <p class="text-gray-500 text-sm">{{ __('per year') }}</p>
                        </div>
                        <div class="metric-card environmental bg-white p-4 rounded-lg shadow text-center">
                            <div class="environmental-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                                </svg>
                            </div>
                            <h3 class="text-lg font-medium text-gray-800">{{ __('Trees Equivalent') }}</h3>
                            <p class="text-2xl font-bold text-green-600">{{ isset($treesEquivalent) ? number_format($treesEquivalent) : 'N/A' }}</p>
                            <p class="text-gray-500 text-sm">{{ __('per year') }}</p>
                        </div>
                        <div class="metric-card environmental bg-white p-4 rounded-lg shadow text-center">
                            <div class="environmental-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <h3 class="text-lg font-medium text-gray-800">{{ __('Water Saved') }}</h3>
                            <p class="text-2xl font-bold text-green-600">{{ isset($waterSaved) ? number_format($waterSaved) . ' ' . __('L') : 'N/A' }}</p>
                            <p class="text-gray-500 text-sm">{{ __('in electricity production') }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Financial Overview Section -->
        <div class="mb-8">
            <h2 class="text-xl font-bold text-gray-800 mb-4">{{ __('Financial Overview') }}</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; min-height: 500px;">
                <!-- Left Side - Investment Breakdown with Cards and Pie Chart -->
                <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
                    <h3 style="font-size: 1.125rem; font-weight: 600; color: #374151; margin-bottom: 1.5rem;">{{ __('Investment Breakdown') }}</h3>
                    
                    <!-- Cost Cards and Pie Chart Layout -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                        <!-- Cost Cards -->
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            <!-- System Cost Card -->
                            <div style="background: white; padding: 1.25rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border-left: 4px solid #10b981; display: flex; align-items: center; min-height: 80px;">
                                <div style="margin-right: 1rem;">
                                    <svg xmlns="http://www.w3.org/2000/svg" style="height: 1.5rem; width: 1.5rem; color: #10b981;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                </div>
                                <div>
                                    <h4 style="font-size: 0.875rem; font-weight: 600; color: #10b981; margin: 0;">{{ __('System Cost') }}</h4>
                                    <p style="font-size: 1.125rem; font-weight: 700; color: #10b981; margin: 0;">{{ isset($systemCost) ? number_format($systemCost) . ' ' . ($currencySymbol ?? 'MAD') : 'N/A' }}</p>
                                </div>
                            </div>

                            <!-- Installation Cost Card -->
                            <div style="background: white; padding: 1.25rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border-left: 4px solid #3b82f6; display: flex; align-items: center; min-height: 80px;">
                                <div style="margin-right: 1rem;">
                                    <svg xmlns="http://www.w3.org/2000/svg" style="height: 1.5rem; width: 1.5rem; color: #3b82f6;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
                                    </svg>
                                </div>
                                <div>
                                    <h4 style="font-size: 0.875rem; font-weight: 600; color: #3b82f6; margin: 0;">{{ __('Installation Cost') }}</h4>
                                    <p style="font-size: 1.125rem; font-weight: 700; color: #3b82f6; margin: 0;">{{ isset($installationCost) ? number_format($installationCost) . ' ' . ($currencySymbol ?? 'MAD') : 'N/A' }}</p>
                                </div>
                            </div>

                            <!-- Consulting Fees Card -->
                            <div style="background: white; padding: 1.25rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border-left: 4px solid #f59e0b; display: flex; align-items: center; min-height: 80px;">
                                <div style="margin-right: 1rem;">
                                    <svg xmlns="http://www.w3.org/2000/svg" style="height: 1.5rem; width: 1.5rem; color: #f59e0b;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                    </svg>
                                </div>
                                <div>
                                    <h4 style="font-size: 0.875rem; font-weight: 600; color: #f59e0b; margin: 0;">{{ __('Consulting Fees') }}</h4>
                                    <p style="font-size: 1.125rem; font-weight: 700; color: #f59e0b; margin: 0;">{{ isset($consultationFees) ? number_format($consultationFees) . ' ' . ($currencySymbol ?? 'MAD') : 'N/A' }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Pie Chart with Legend -->
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                            <!-- Legend -->
                            <div style="margin-bottom: 1.5rem; font-size: 0.875rem;">
                                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                    <div style="display: flex; align-items: center;">
                                        <div style="width: 1rem; height: 1rem; background: #10b981; margin-right: 0.75rem; border-radius: 2px;"></div>
                                        <span style="color: #374151; font-weight: 500;">{{ __('Panels &amp; Equipment') }}</span>
                                    </div>
                                    <div style="display: flex; align-items: center;">
                                        <div style="width: 1rem; height: 1rem; background: #3b82f6; margin-right: 0.75rem; border-radius: 2px;"></div>
                                        <span style="color: #374151; font-weight: 500;">{{ __('Installation Labor') }}</span>
                                    </div>
                                    <div style="display: flex; align-items: center;">
                                        <div style="width: 1rem; height: 1rem; background: #f59e0b; margin-right: 0.75rem; border-radius: 2px;"></div>
                                        <span style="color: #374151; font-weight: 500;">{{ __('Permits &amp; Fees') }}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Pie Chart -->
                            <div style="position: relative; width: 220px; height: 220px;">
                                <canvas id="financialOverviewChart"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Total Investment -->
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #f97316; color: white; border-radius: 0.5rem;">
                            <span style="font-size: 1.125rem; font-weight: 700;">{{ __('Total Investment') }}:</span>
                            <span style="font-size: 1.25rem; font-weight: 700;">{{ isset($totalInvestment) ? number_format($totalInvestment) . ' ' . ($currencySymbol ?? 'MAD') : 'N/A' }}</span>
                        </div>
                    </div>
                </div>

                <!-- Right Side - Financial Metrics -->
                <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
                    <h3 style="font-size: 1.125rem; font-weight: 600; color: #374151; margin-bottom: 1.5rem;">{{ __('Financial Returns') }}</h3>
                    
                    <!-- Financial Metrics Cards -->
                    <div style="display: flex; flex-direction: column; gap: 1.6rem; margin-bottom: 1.5rem;">
                        <div style="padding: 1rem; border: 1px solid #99f6e4; border-radius: 0.5rem; background: #f0fdfa;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #0f766e; font-weight: 500;">{{ __('Payback Period') }}:</span>
                                <span style="color: #134e4a; font-weight: 700; font-size: 1.125rem;">{{ isset($paybackPeriod) ? number_format($paybackPeriod, 1) . ' ' . __('years') : 'N/A' }}</span>
                            </div>
                        </div>
                        
                        <div style="padding: 1rem; border: 1px solid #99f6e4; border-radius: 0.5rem; background: #f0fdfa;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #0f766e; font-weight: 500;">{{ __('Avg Monthly Savings') }}:</span>
                                <span style="color: #134e4a; font-weight: 700; font-size: 1.125rem;">{{ isset($annualSavings) ? number_format($annualSavings / 12) . ' ' . ($currencySymbol ?? 'MAD') . '/' . __('month') : 'N/A' }}</span>
                            </div>
                        </div>
                        
                        <div style="padding: 1rem; border: 1px solid #99f6e4; border-radius: 0.5rem; background: #f0fdfa;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #0f766e; font-weight: 500;">{{ __('Annual Savings') }}:</span>
                                <span style="color: #134e4a; font-weight: 700; font-size: 1.125rem;">{{ isset($annualSavings) ? number_format($annualSavings) . ' ' . ($currencySymbol ?? 'MAD') . '/' . __('year') : 'N/A' }}</span>
                            </div>
                        </div>
                        
                        <div style="padding: 1rem; border: 1px solid #99f6e4; border-radius: 0.5rem; background: #f0fdfa;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #0f766e; font-weight: 500;">{{ __('ROI (25 Years)') }}:</span>
                                <span style="color: #134e4a; font-weight: 700; font-size: 1.125rem;">{{ isset($roi) ? number_format($roi, 1) . '%' : 'N/A' }}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Total 25 Year Savings -->
                    <div style="padding-top: 1rem; border-top: 1px solid #e5e7eb;">
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #0d9488; color: white; border-radius: 0.5rem;">
                            <span style="font-size: 1.125rem; font-weight: 700;">{{ __('Total 25 Year Savings') }}:</span>
                            <span style="font-size: 1.25rem; font-weight: 700;">{{ isset($lifetimeSavings) ? number_format($lifetimeSavings) . ' ' . ($currencySymbol ?? 'MAD') : 'N/A' }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Bill of Materials -->
        <div class="mb-8">
            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Bill of Materials</h3>
                
                <table class="w-full border border-gray-300">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left">Component</th>
                            <th class="px-4 py-3 text-left">Description</th>
                            <th class="px-4 py-3 text-center">Qty</th>
                            <th class="px-4 py-3 text-right">Price</th>
                            <th class="px-4 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="border-b">
                            <td class="px-4 py-3">Solar Panels</td>
                            <td class="px-4 py-3">High efficiency panels</td>
                            <td class="px-4 py-3 text-center">{{ $panelCount ?? 'N/A' }}</td>
                            <td class="px-4 py-3 text-right">{{ $panelPrice ? number_format($panelPrice) . ' MAD' : 'N/A' }}</td>
                            <td class="px-4 py-3 text-right">{{ $panelCost ? number_format($panelCost) . ' MAD' : 'N/A' }}</td>
                        </tr>
                        <tr class="border-b">
                            <td class="px-4 py-3">Inverters</td>
                            <td class="px-4 py-3">DC to AC converters</td>
                            <td class="px-4 py-3 text-center">{{ $inverterCount ?? 'N/A' }}</td>
                            <td class="px-4 py-3 text-right">{{ $inverterPrice ? number_format($inverterPrice) . ' MAD' : 'N/A' }}</td>
                            <td class="px-4 py-3 text-right">{{ $inverterCost ? number_format($inverterCost) . ' MAD' : 'N/A' }}</td>
                        </tr>
                        <tr class="border-b">
                            <td class="px-4 py-3">Installation</td>
                            <td class="px-4 py-3">Professional installation service</td>
                            <td class="px-4 py-3 text-center">1</td>
                            <td class="px-4 py-3 text-right">{{ $installationCost ? number_format($installationCost) . ' MAD' : 'N/A' }}</td>
                            <td class="px-4 py-3 text-right">{{ $installationCost ? number_format($installationCost) . ' MAD' : 'N/A' }}</td>
                        </tr>
                    </tbody>
                    <tfoot class="bg-gray-50">
                        <tr>
                            <td colspan="4" class="px-4 py-3 text-right font-bold">Total Investment:</td>
                            <td class="px-4 py-3 text-right font-bold">{{ $totalInvestment ? number_format($totalInvestment) . ' MAD' : 'N/A' }}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <!-- Return on Investment Chart -->
        <div class="mb-8">
            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-lg font-semibold text-gray-700 mb-4">{{ __('Return on Investment') }}</h3>
                <div id="roiChartContainer" class="h-64">
                    <canvas id="roiChart"></canvas>
                </div>
            </div>
        </div>

        <!-- Performance Metrics -->
        <div class="mb-8">
            <h2 class="text-xl font-bold text-gray-800 mb-4">{{ __('Performance Metrics') }}</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                <!-- System Capacity -->
                <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); border-left: 4px solid #f97316;">
                    <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                        <div style="color: #f97316; margin-right: 1rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" style="height: 2rem; width: 2rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                        </div>
                        <div>
                            <h4 style="font-size: 1.5rem; font-weight: 700; color: #f97316; margin: 0;">{{ isset($systemCapacity) ? number_format($systemCapacity, 2) . ' kW' : 'N/A' }}</h4>
                            <p style="font-size: 0.875rem; color: #6b7280; margin: 0;">{{ __('System Capacity') }}</p>
                        </div>
                    </div>
                </div>

                <!-- Annual Production -->
                <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); border-left: 4px solid #f97316;">
                    <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                        <div style="color: #f97316; margin-right: 1rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" style="height: 2rem; width: 2rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                        </div>
                        <div>
                            <h4 style="font-size: 1.5rem; font-weight: 700; color: #f97316; margin: 0;">{{ isset($annualProduction) ? number_format($annualProduction) . ' kWh' : 'N/A' }}</h4>
                            <p style="font-size: 0.875rem; color: #6b7280; margin: 0;">{{ __('Annual Production') }}</p>
                            <p style="font-size: 0.75rem; color: #9ca3af; margin: 0;">{{ __('per year') }}</p>
                        </div>
                    </div>
                </div>

                <!-- Avg Production/Month -->
                <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); border-left: 4px solid #f97316;">
                    <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                        <div style="color: #f97316; margin-right: 1rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" style="height: 2rem; width: 2rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                        </div>
                        <div>
                            <h4 style="font-size: 1.5rem; font-weight: 700; color: #f97316; margin: 0;">{{ isset($annualProduction) ? number_format($annualProduction / 12) . ' kWh' : 'N/A' }}</h4>
                            <p style="font-size: 0.875rem; color: #6b7280; margin: 0;">{{ __('Avg Production/Month') }}</p>
                            <p style="font-size: 0.75rem; color: #9ca3af; margin: 0;">{{ __('per month') }}</p>
                        </div>
                    </div>
                </div>

                <!-- Capacity Factor -->
                <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); border-left: 4px solid #f97316;">
                    <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                        <div style="color: #f97316; margin-right: 1rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" style="height: 2rem; width: 2rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                        </div>
                        <div>
                            <h4 style="font-size: 1.5rem; font-weight: 700; color: #f97316; margin: 0;">{{ isset($capacityFactor) ? number_format($capacityFactor, 0) . ' %' : 'N/A' }}</h4>
                            <p style="font-size: 0.875rem; color: #6b7280; margin: 0;">{{ __('Capacity Factor') }}</p>
                        </div>
                    </div>
                </div>

                <!-- Panel Count -->
                <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); border-left: 4px solid #f97316;">
                    <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                        <div style="color: #f97316; margin-right: 1rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" style="height: 2rem; width: 2rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                        </div>
                        <div>
                            <h4 style="font-size: 1.5rem; font-weight: 700; color: #f97316; margin: 0;">{{ $estimation->panel_count ?? 'N/A' }}</h4>
                            <p style="font-size: 0.875rem; color: #6b7280; margin: 0;">{{ __('Panel Count') }}</p>
                        </div>
                    </div>
                </div>

                <!-- Panel Capacity -->
                <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); border-left: 4px solid #f97316;">
                    <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                        <div style="color: #f97316; margin-right: 1rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" style="height: 2rem; width: 2rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                        </div>
                        <div>
                            <h4 style="font-size: 1.5rem; font-weight: 700; color: #f97316; margin: 0;">{{ isset($estimation->panel->wattage) ? $estimation->panel->wattage . ' W' : 'N/A' }}</h4>
                            <p style="font-size: 0.875rem; color: #6b7280; margin: 0;">{{ __('Panel Capacity') }}</p>
                            <p style="font-size: 0.75rem; color: #9ca3af; margin: 0;">{{ __('per panel') }}</p>
                        </div>
                    </div>
                </div>

                <!-- Azimuth -->
                <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); border-left: 4px solid #f97316;">
                    <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                        <div style="color: #f97316; margin-right: 1rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" style="height: 2rem; width: 2rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                        </div>
                        <div>
                            <h4 style="font-size: 1.5rem; font-weight: 700; color: #f97316; margin: 0;">{{ isset($azimuth) ? number_format($azimuth, 2) . '°' : 'N/A' }}</h4>
                            <p style="font-size: 0.875rem; color: #6b7280; margin: 0;">{{ __('Azimuth') }}</p>
                        </div>
                    </div>
                </div>

                <!-- Installation Angle (Tilt) -->
                <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); border-left: 4px solid #f97316;">
                    <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                        <div style="color: #f97316; margin-right: 1rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" style="height: 2rem; width: 2rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                        </div>
                        <div>
                            <h4 style="font-size: 1.5rem; font-weight: 700; color: #f97316; margin: 0;">{{ isset($tilt) ? number_format($tilt, 2) . '°' : 'N/A' }}</h4>
                            <p style="font-size: 0.875rem; color: #6b7280; margin: 0;">{{ __('Installation Angle (Tilt)') }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Monthly Production Chart -->
        <div class="mb-8">
            <h2 class="text-xl font-bold text-gray-800 mb-4">{{ __('Monthly Energy Production') }}</h2>
            <div class="bg-white p-4 rounded-lg shadow chart-container">
                <canvas id="monthlyProductionChart"></canvas>
            </div>
        </div>

        <!-- System Details and Technical Specifications -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-lg font-semibold text-gray-700 mb-4">{{ __('System Configuration') }}</h3>
                <table class="w-full">
                    <tbody>
                        <tr class="border-b border-gray-200">
                            <td class="py-2 text-gray-600">{{ __('Panel Brand') }}:</td>
                            <td class="py-2 font-medium">{{ $panelBrand ?? 'N/A' }}</td>
                        </tr>
                        <tr class="border-b border-gray-200">
                            <td class="py-2 text-gray-600">{{ __('Panel Wattage') }}:</td>
                            <td class="py-2 font-medium">{{ $panelWattage ? $panelWattage . ' W' : 'N/A' }}</td>
                        </tr>
                        <tr class="border-b border-gray-200">
                            <td class="py-2 text-gray-600">{{ __('Panel Efficiency') }}:</td>
                            <td class="py-2 font-medium">{{ $panelEfficiency ? $panelEfficiency . '%' : 'N/A' }}</td>
                        </tr>
                        <tr class="border-b border-gray-200">
                            <td class="py-2 text-gray-600">{{ __('Panel Count') }}:</td>
                            <td class="py-2 font-medium">{{ $estimation->panel_count ?? $panelCount ?? 'N/A' }}</td>
                        </tr>
                        <tr class="border-b border-gray-200">
                            <td class="py-2 text-gray-600">{{ __('Inverter Brand') }}:</td>
                            <td class="py-2 font-medium">{{ $inverterBrand ?? 'N/A' }}</td>
                        </tr>
                        <tr class="border-b border-gray-200">
                            <td class="py-2 text-gray-600">{{ __('Inverter Model') }}:</td>
                            <td class="py-2 font-medium">{{ $inverterModel ?? 'N/A' }}</td>
                        </tr>
                        <tr class="border-b border-gray-200">
                            <td class="py-2 text-gray-600">{{ __('Inverter Count') }}:</td>
                            <td class="py-2 font-medium">{{ $inverterCount ?? 'N/A' }}</td>
                        </tr>
                        <tr class="border-b border-gray-200">
                            <td class="py-2 text-gray-600">{{ __('Roof Type') }}:</td>
                            <td class="py-2 font-medium">{{ $roofType ?? 'N/A' }}</td>
                        </tr>
                        <tr>
                            <td class="py-2 text-gray-600">{{ __('Tilt/Azimuth') }}:</td>
                            <td class="py-2 font-medium">{{ isset($estimation->tilt) && isset($estimation->azimuth) ? $estimation->tilt . '° / ' . $estimation->azimuth . '°' : 'N/A' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-lg font-semibold text-gray-700 mb-4">{{ __('Performance Metrics') }}</h3>
                <table class="w-full">
                    <tbody>
                        <tr class="border-b border-gray-200">
                            <td class="py-2 text-gray-600">{{ __('Avg. Solar Radiation') }}:</td>
                            <td class="py-2 font-medium">{{ isset($estimation->solrad_annual) ? number_format($estimation->solrad_annual, 2) . ' kWh/m²/day' : 'N/A' }}</td>
                        </tr>
                        <tr class="border-b border-gray-200">
                            <td class="py-2 text-gray-600">{{ __('Annual Production') }}:</td>
                            <td class="py-2 font-medium">{{ isset($estimation->energy_annual) ? number_format($estimation->energy_annual) . ' kWh' : 'N/A' }}</td>
                        </tr>
                        <tr class="border-b border-gray-200">
                            <td class="py-2 text-gray-600">{{ __('Capacity Factor') }}:</td>
                            <td class="py-2 font-medium">{{ isset($estimation->capacity_factor) ? number_format($estimation->capacity_factor, 1) . '%' : 'N/A' }}</td>
                        </tr>
                        <tr class="border-b border-gray-200">
                            <td class="py-2 text-gray-600">{{ __('System Losses') }}:</td>
                            <td class="py-2 font-medium">{{ isset($estimation->total_losses_percent) ? number_format($estimation->total_losses_percent, 1) . '%' : 'N/A' }}</td>
                        </tr>
                        <tr class="border-b border-gray-200">
                            <td class="py-2 text-gray-600">{{ __('Electricity Rate') }}:</td>
                            <td class="py-2 font-medium">{{ isset($electricityRate) ? number_format($electricityRate, 2) . ' ' . ($currencySymbol ?? 'N/A') . '/kWh' : 'N/A' }}</td>
                        </tr>
                        <tr>
                            <td class="py-2 text-gray-600">{{ __('Utility') }}:</td>
                            <td class="py-2 font-medium">{{ $estimation->utility->name ?? 'N/A' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Comparison and Lifetime Performance -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-lg font-semibold text-gray-700 mb-4">{{ __('Monthly Energy Comparison') }}</h3>
                <div class="chart-container" style="height: 300px;">
                    <canvas id="energyComparisonChart"></canvas>
                </div>
                <div class="text-sm text-gray-600 mt-3">
                    <p>{{ __('The chart compares your expected solar production with your current energy consumption pattern. Green areas indicate when your system produces more than you use.') }}</p>
                </div>
            </div>

            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-lg font-semibold text-gray-700 mb-4">{{ __('Lifetime Performance') }}</h3>
                <div class="chart-container" style="height: 300px;">
                    <canvas id="lifetimePerformanceChart"></canvas>
                </div>
                <div class="text-sm text-gray-600 mt-3">
                    <p>{{ __('This chart shows the projected system performance over 25 years, accounting for the standard 0.5% annual degradation rate of solar panels.') }}</p>
                </div>
            </div>
        </div>

        <!-- Detailed Inverter Configuration Section -->
        @if(!empty($inverterCombos) || !empty($stringingDetails))
        <div class="mb-8">
            <h2 class="text-xl font-bold text-gray-800 mb-4">{{ __('Inverter Configuration Details') }}</h2>
            
            @if(!empty($inverterCombos))
            <div class="bg-white p-6 rounded-lg shadow mb-6">
                <h3 class="text-lg font-semibold text-gray-700 mb-4">{{ __('Inverter Specifications') }}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    @foreach($inverterCombos as $index => $combo)
                    <div class="border rounded-lg p-4 bg-gray-50">
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <h4 class="font-semibold text-gray-800">{{ $combo['model'] }}</h4>
                                <p class="text-sm text-gray-600">{{ $combo['brand'] }}</p>
                            </div>
                            <span class="bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-1 rounded">
                                x{{ $combo['quantity'] }}
                            </span>
                        </div>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">{{ __('AC Power') }}:</span>
                                <span class="font-medium">{{ number_format($combo['ac_power_kw'], 2) }} kW</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">{{ __('DC Power') }}:</span>
                                <span class="font-medium">{{ number_format($combo['dc_power_kw'], 2) }} kW</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">{{ __('Efficiency') }}:</span>
                                <span class="font-medium">{{ $combo['efficiency'] }}%</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">{{ __('MPPT Ports') }}:</span>
                                <span class="font-medium">{{ $combo['mppt_ports'] }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">{{ __('Warranty') }}:</span>
                                <span class="font-medium">{{ $combo['warranty'] }} {{ __('years') }}</span>
                            </div>
                            <div class="flex justify-between border-t pt-2">
                                <span class="text-gray-600">{{ __('Total Cost') }}:</span>
                                <span class="font-semibold text-orange-600">{{ number_format($combo['total_price']) }} dh</span>
                            </div>
                        </div>
                    </div>
                    @endforeach
                </div>
            </div>
            @endif

            @if(!empty($stringingDetails))
            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-lg font-semibold text-gray-700 mb-4">{{ __('Stringing Configuration') }}</h3>
                <div class="space-y-6">
                    @foreach($stringingDetails as $index => $stringing)
                    <div class="border-l-4 border-orange-500 pl-4">
                        <div class="flex justify-between items-center mb-3">
                            <h4 class="font-semibold text-gray-800">
                                {{ $stringing['inverter_model'] }} (x{{ $stringing['inverter_qty'] }})
                            </h4>
                            <div class="text-sm text-gray-600">
                                <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
                                    {{ __('DC/AC Ratio') }}: {{ number_format($stringing['dc_ac_ratio'], 2) }}
                                </span>
                                <span class="bg-green-100 text-green-800 px-2 py-1 rounded">
                                    {{ $stringing['total_panels_used'] }} {{ __('panels') }}
                                </span>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div class="text-center p-3 bg-gray-50 rounded">
                                <div class="text-sm text-gray-600">{{ __('AC Power') }}</div>
                                <div class="text-lg font-semibold text-orange-600">{{ number_format($stringing['ac_power_kw'], 2) }} kW</div>
                            </div>
                            <div class="text-center p-3 bg-gray-50 rounded">
                                <div class="text-sm text-gray-600">{{ __('DC Power') }}</div>
                                <div class="text-lg font-semibold text-blue-600">{{ number_format($stringing['dc_power_kw'], 2) }} kW</div>
                            </div>
                            <div class="text-center p-3 bg-gray-50 rounded">
                                <div class="text-sm text-gray-600">{{ __('String Voltage') }}</div>
                                <div class="text-lg font-semibold text-green-600">{{ number_format($stringing['v_string_voc'], 1) }} V</div>
                            </div>
                            <div class="text-center p-3 bg-gray-50 rounded">
                                <div class="text-sm text-gray-600">{{ __('Total Strings') }}</div>
                                <div class="text-lg font-semibold text-purple-600">{{ count($stringing['strings']) }}</div>
                            </div>
                        </div>

                        @if(!empty($stringing['strings']))
                        <div class="bg-gray-50 p-4 rounded">
                            <h5 class="font-medium text-gray-700 mb-3">{{ __('String Details') }}:</h5>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                @foreach($stringing['strings'] as $stringIndex => $string)
                                <div class="flex justify-between items-center p-2 bg-white rounded border">
                                    <span class="text-sm font-medium">
                                        {{ __('MPPT') }} {{ $string['mppt'] }} - {{ __('String') }} {{ $stringIndex + 1 }}
                                    </span>
                                    <div class="text-sm text-gray-600">
                                        {{ $string['panels_per_string'] }} {{ __('panels') }}
                                        @if($string['n_strings'] > 1)
                                            × {{ $string['n_strings'] }} {{ __('strings') }}
                                        @endif
                                    </div>
                                </div>
                                @endforeach
                            </div>
                        </div>
                        @endif
                    </div>
                    @endforeach
                </div>
            </div>
            @endif
        </div>
        @endif

        <!-- System Loss Waterfall Diagram -->
        <div class="mb-8">
            <div class="bg-white p-6 rounded-lg shadow">
                <h2 class="text-xl font-bold text-gray-800 mb-4">{{ __('SYSTEM LOSS DIAGRAM') }}</h2>
                <div id="waterfallChart" style="height: 600px; margin: 20px 0;"></div>
            </div>
        </div>

        <!-- Notes and Disclaimers -->
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded">
            <div class="flex">
                <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clip-rule="evenodd" />
                    </svg>
                </div>
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-blue-800">{{ __('Important Notes') }}</h3>
                    <div class="mt-2 text-sm text-blue-700">
                        <ul class="list-disc pl-5 space-y-1">
                            <li>{{ __('All calculations are estimates based on available data and industry standards.') }}</li>
                            <li>{{ __('Actual production may vary based on weather conditions, shading, and system maintenance.') }}</li>
                            <li>{{ __('Financial projections assume a fixed electricity price and do not account for inflation.') }}</li>
                            <li>{{ __('Please consult with a certified solar installer for a detailed on-site assessment.') }}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <!-- Actions Footer -->
        <div class="flex justify-between items-center pt-4 border-t border-gray-200 no-print">
            <a href="{{ route('myproject') }}" class="text-blue-600 hover:underline flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {{ __('Back to Projects') }}
            </a>
            <div class="flex space-x-4">
                <a href="#" class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {{ __('Email Report') }}
                </a>
                <a href="{{ route('estimation.index') }}" class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {{ __('New Estimation') }}
                </a>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script src="https://code.highcharts.com/highcharts.js"></script>
<script src="https://code.highcharts.com/modules/waterfall.js"></script>
<script src="https://code.highcharts.com/modules/exporting.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@3.7.0/dist/chart.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        // Chart color configuration
        const chartColors = {
            primary: '#10b981',
            secondary: '#3b82f6',
            tertiary: '#f59e0b',
            quaternary: '#ef4444',
            gray: '#9ca3af',
            light: '#e5e7eb',
            dark: '#4b5563',
            gradientFrom: 'rgba(16, 185, 129, 0.8)',
            gradientTo: 'rgba(16, 185, 129, 0.1)'
        };

        // Monthly data from PHP (provided via controller)
        const monthlyData = @json($monthlyData);
        const months = monthlyData.map(data => data.month);
        const acValues = monthlyData.map(data => parseFloat(data.ac_output));
        const dcValues = monthlyData.map(data => parseFloat(data.dc_output));

        // Create monthly production chart
        const monthlyCtx = document.getElementById('monthlyProductionChart').getContext('2d');
        new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: '{{ __("AC Output (kWh)") }}',
                        backgroundColor: chartColors.primary,
                        data: acValues,
                        barPercentage: 0.7,
                        borderRadius: 4
                    },
                    {
                        label: '{{ __("DC Output (kWh)") }}',
                        backgroundColor: chartColors.secondary,
                        data: dcValues,
                        barPercentage: 0.7,
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
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += Number(context.raw).toLocaleString() + ' kWh';
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '{{ __("Energy (kWh)") }}'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });

        // Financial Overview Chart
        const financialOverviewCtx = document.getElementById('financialOverviewChart').getContext('2d');
        new Chart(financialOverviewCtx, {
            type: 'pie',
            data: {
                labels: ['{{ __("System Cost") }}', '{{ __("Installation Cost") }}', '{{ __("Consulting Fees") }}'],
                datasets: [{
                    data: [{{ $systemCost ?? 0 }}, {{ $installationCost ?? 0 }}, {{ $consultationFees ?? 0 }}],
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
                                const value = Number(context.raw).toLocaleString();
                                return context.label + ': ' + value + ' {{ $currencySymbol ?? "MAD" }}';
                            }
                        }
                    }
                }
            }
        });

        // ROI Chart - Cumulative savings over 25 years
        const years = Array.from({length: 26}, (_, i) => i);
        const cumulativeSavings = years.map(year => {
            if (year === 0) return -{{ $totalInvestment ?? 0 }};
            return -{{ $totalInvestment ?? 0 }} + (year * {{ $annualSavings ?? 0 }});
        });

        const roiCtx = document.getElementById('roiChart').getContext('2d');
        new Chart(roiCtx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: '{{ __("Net Savings") }}',
                    data: cumulativeSavings,
                    borderColor: chartColors.primary,
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) {
                            return;
                        }
                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, chartColors.gradientTo);
                        gradient.addColorStop(1, chartColors.gradientFrom);
                        return gradient;
                    },
                    fill: true,
                    pointBackgroundColor: chartColors.primary,
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
                            title: function(context) {
                                return '{{ __("Year") }} ' + context[0].label;
                            },
                            label: function(context) {
                                const value = Number(context.raw).toLocaleString();
                                return '{{ __("Net Savings") }}: ' + value + ' {{ $currencySymbol }}';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: '{{ __("Cumulative Savings") }} ({{ $currencySymbol }})'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '{{ __("Years") }}'
                        }
                    }
                }
            }
        });

        // Energy Comparison Chart (Solar vs. Consumption)
        const solarProduction = monthlyData.map(data => parseFloat(data.ac_output));
        const estimatedUsage = @json($monthlyConsumption ?? []);
        const netEnergy = solarProduction.map((value, index) => value - estimatedUsage[index]);

        const energyComparisonCtx = document.getElementById('energyComparisonChart').getContext('2d');
        new Chart(energyComparisonCtx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: '{{ __("Solar Production") }}',
                        data: solarProduction,
                        backgroundColor: chartColors.primary,
                        borderRadius: 4,
                        order: 2
                    },
                    {
                        label: '{{ __("Consumption") }}',
                        data: estimatedUsage,
                        backgroundColor: chartColors.tertiary,
                        borderRadius: 4,
                        order: 3
                    },
                    {
                        label: '{{ __("Net Energy") }}',
                        data: netEnergy,
                        type: 'line',
                        borderColor: chartColors.secondary,
                        backgroundColor: 'transparent',
                        pointBackgroundColor: chartColors.secondary,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: '{{ __("Energy (kWh)") }}'
                        }
                    }
                }
            }
        });

        // Lifetime Performance Chart
        const lifetimeYears = Array.from({length: 26}, (_, i) => i);
        const annualProduction = {{ $estimation->energy_annual }};
        const degradationRate = 0.005; // 0.5% per year
        
        const lifetimeProduction = lifetimeYears.map(year => {
            if (year === 0) return 0;
            return annualProduction * (1 - (degradationRate * (year - 1)));
        });

        const lifetimeEfficiency = lifetimeYears.map(year => {
            if (year === 0) return 100;
            return 100 * (1 - (degradationRate * year));
        });

        const lifetimeCtx = document.getElementById('lifetimePerformanceChart').getContext('2d');
        new Chart(lifetimeCtx, {
            type: 'line',
            data: {
                labels: lifetimeYears,
                datasets: [
                    {
                        label: '{{ __("Annual Production") }}',
                        data: lifetimeProduction,
                        borderColor: chartColors.primary,
                        backgroundColor: 'transparent',
                        yAxisID: 'y',
                        tension: 0.1
                    },
                    {
                        label: '{{ __("Panel Efficiency") }}',
                        data: lifetimeEfficiency,
                        borderColor: chartColors.tertiary,
                        backgroundColor: 'transparent',
                        yAxisID: 'y1',
                        tension: 0.1
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
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.datasetIndex === 0) {
                                    return label + Number(context.raw).toLocaleString() + ' kWh';
                                } else {
                                    return label + Number(context.raw).toLocaleString() + '%';
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '{{ __("Years") }}'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: '{{ __("Production (kWh)") }}'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: '{{ __("Efficiency (%)") }}'
                        },
                        grid: {
                            drawOnChartArea: false
                        },
                        min: 80,
                        max: 100
                    }
                }
            }
        });

        // System Loss Waterfall Chart using Highcharts
        Highcharts.chart('waterfallChart', {
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
                    'Global horizontal irradiance',
                    'Global irradiance on PV modules', 
                    'Shading irradiance loss',
                    'Reflection loss',
                    'Energy after PV conversion',
                    'Irradiance level loss',
                    'Temperature loss',
                    'Shading electrical loss',
                    'Module quality loss',
                    'Optimizer efficiency loss',
                    'DC Ohmic wiring loss',
                    'Energy after DC losses',
                    'Inverter efficiency loss',
                    'Inverter clipping loss',
                    'Exportable energy'
                ],
                labels: {
                    style: {
                        fontSize: '10px'
                    }
                }
            },
            yAxis: {
                title: {
                    text: null
                },
                gridLineWidth: 1,
                gridLineColor: 'rgba(0,0,0,0.1)',
                min: 0,
                max: 2200,
                tickInterval: 200
            },
            legend: {
                enabled: false
            },
            tooltip: {
                formatter: function() {
                    const point = this.point;
                    if (point.isTotal) {
                        return '<b>' + point.category + '</b><br/>' + point.displayValue;
                    } else {
                        return '<b>' + point.category + '</b><br/>' + point.percentage + ' (' + point.y.toFixed(2) + ')';
                    }
                }
            },
            plotOptions: {
                bar: {
                    stacking: 'normal',
                    dataLabels: {
                        enabled: true,
                        formatter: function() {
                            const point = this.point;
                            if (point.isTotal) {
                                return point.displayValue;
                            } else {
                                return point.percentage;
                            }
                        },
                        style: {
                            fontSize: '9px',
                            fontWeight: 'bold',
                            textOutline: 'none'
                        },
                        inside: false,
                        align: 'left',
                        x: 5
                    },
                    pointPadding: 0.1,
                    borderWidth: 1,
                    borderColor: '#ffffff'
                }
            },
            series: [
                {
                    name: 'Base',
                    data: [
                        {y: 0, color: 'transparent'},
                        {y: 2010, color: 'transparent'},
                        {y: 2095.8, color: 'transparent'},
                        {y: 2039.4, color: 'transparent'},
                        {y: 0, color: 'transparent'},
                        {y: 988.46, color: 'transparent'},
                        {y: 917.94, color: 'transparent'},
                        {y: 916.20, color: 'transparent'},
                        {y: 916.20, color: 'transparent'},
                        {y: 912.53, color: 'transparent'},
                        {y: 904.24, color: 'transparent'},
                        {y: 0, color: 'transparent'},
                        {y: 886.87, color: 'transparent'},
                        {y: 868.59, color: 'transparent'},
                        {y: 0, color: 'transparent'}
                    ],
                    enableMouseTracking: false,
                    showInLegend: false
                },
                {
                    name: 'Values',
                    data: [
                        {
                            y: 2010, 
                            color: '#3b82f6', 
                            isTotal: true, 
                            displayValue: '2.01 MWh/m²',
                            percentage: ''
                        },
                        {
                            y: 97.4, 
                            color: '#3b82f6', 
                            isTotal: false, 
                            displayValue: '',
                            percentage: '+4.84%'
                        },
                        {
                            y: 11.6, 
                            color: '#ef4444', 
                            isTotal: false, 
                            displayValue: '',
                            percentage: '-0.55%'
                        },
                        {
                            y: 56.4, 
                            color: '#ef4444', 
                            isTotal: false, 
                            displayValue: '',
                            percentage: '-2.69%'
                        },
                        {
                            y: 992.43, 
                            color: '#3b82f6', 
                            isTotal: true, 
                            displayValue: '992.43 MWh',
                            percentage: ''
                        },
                        {
                            y: 3.97, 
                            color: '#ef4444', 
                            isTotal: false, 
                            displayValue: '',
                            percentage: '-0.4%'
                        },
                        {
                            y: 70.52, 
                            color: '#ef4444', 
                            isTotal: false, 
                            displayValue: '',
                            percentage: '-7.13%'
                        },
                        {
                            y: 1.74, 
                            color: '#ef4444', 
                            isTotal: false, 
                            displayValue: '',
                            percentage: '-0.19%'
                        },
                        {
                            y: 1.74, 
                            color: '#3b82f6', 
                            isTotal: false, 
                            displayValue: '',
                            percentage: '+0.19%'
                        },
                        {
                            y: 5.41, 
                            color: '#ef4444', 
                            isTotal: false, 
                            displayValue: '',
                            percentage: '-0.59%'
                        },
                        {
                            y: 8.29, 
                            color: '#ef4444', 
                            isTotal: false, 
                            displayValue: '',
                            percentage: '-0.91%'
                        },
                        {
                            y: 904.24, 
                            color: '#3b82f6', 
                            isTotal: true, 
                            displayValue: '904.24 MWh',
                            percentage: ''
                        },
                        {
                            y: 17.37, 
                            color: '#ef4444', 
                            isTotal: false, 
                            displayValue: '',
                            percentage: '-1.92%'
                        },
                        {
                            y: 18.28, 
                            color: '#ef4444', 
                            isTotal: false, 
                            displayValue: '',
                            percentage: '-2.06%'
                        },
                        {
                            y: 868.59, 
                            color: '#3b82f6', 
                            isTotal: true, 
                            displayValue: '868.59 MWh',
                            percentage: ''
                        }
                    ]
                }
            ],
            exporting: {
                enabled: false
            },
            credits: {
                enabled: false
            }
        });

        // PDF Download functionality
        document.getElementById('downloadPdf').addEventListener('click', function() {
            const element = document.querySelector('.container');
            const opt = {
                margin: 10,
                filename: 'solar_project_report_{{ $estimation->id }}.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Hide elements we don't want in the PDF
            const noPrintElements = document.querySelectorAll('.no-print');
            noPrintElements.forEach(el => el.style.display = 'none');

            // Generate PDF
            html2pdf().from(element).set(opt).save().then(() => {
                // Show the elements again after PDF generation
                noPrintElements.forEach(el => el.style.display = '');
            });
        });
    });
</script>
@endpush