@extends('../site/layouts.app')
@section('page_title', ('My Solar Projects'))

@push('styles')
    <style>
        .project-card {
            transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .project-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        .energy-badge {
            position: absolute;
            top: 10px;
            right: 10px;
        }
    </style>
@endpush

@section('content')
    <div class="container mx-auto px-4 py-8">
        <div class="bg-white shadow rounded-lg p-6">
            <h1 class="text-2xl font-bold mb-6 text-center">My Solar Projects</h1>

            @if (session('success'))
                <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
                    <span class="block sm:inline">{{ session('success') }}</span>
                </div>
            @endif

            @if (session('error'))
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                    <strong class="font-bold">Error!</strong>
                    <span class="block sm:inline">{{ session('error') }}</span>
                </div>
            @endif

            @if (isset($message))
                <div class="text-center py-8">
                    <div class="mb-4">
                        <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" 
                                d="M19.629 9.655l-1.092-6.545c-.144-.861-.93-1.465-1.802-1.384l-15.013 1.394c-.832.077-1.47.767-1.47 1.603V21c0 .827.673 1.5 1.5 1.5h16.5c.827 0 1.5-.673 1.5-1.5v-9.5" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" 
                                d="M14.5 10.5l-3 3m0 0l-3-3m3 3V1" />
                        </svg>
                    </div>
                    <p class="text-gray-600 text-lg">{{ $message }}</p>
                    <div class="mt-6">
                        <a href="{{ route('estimation.index') }}" class="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition duration-150 ease-in-out">
                            Create New Estimation
                        </a>
                    </div>
                </div>
            @else
                <div class="mb-6 flex justify-between items-center">
                    <h2 class="text-lg font-medium text-gray-700">Your solar estimations</h2>
                    <a href="{{ route('estimation.index') }}" class="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition duration-150 ease-in-out">
                        + New Estimation
                    </a>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    @foreach ($estimations as $estimation)
                        <div class="project-card bg-white border rounded-lg shadow-sm overflow-hidden relative">
                            <div class="p-4">
                                <div class="energy-badge px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                                    {{ number_format($estimation->energy_annual, 0) }} kWh/year
                                </div>
                                
                                <h3 class="font-bold text-lg mb-2">
                                    {{ $estimation->city ?? 'Location' }}
                                    @if($estimation->state)
                                        , {{ $estimation->state }}
                                    @endif
                                </h3>
                                
                                <div class="text-sm text-gray-600 mb-3">
                                    <div class="flex items-center mb-1">
                                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                        </svg>
                                        {{ $estimation->street ?? 'Address not specified' }}
                                    </div>
                                    <div class="flex items-center mb-1">
                                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                        </svg>
                                        {{ number_format($estimation->system_capacity, 2) }} kW System
                                    </div>
                                    <div class="flex items-center">
                                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        {{ $estimation->created_at->format('M d, Y') }}
                                    </div>
                                </div>
                                
                                <div class="mt-4 grid grid-cols-2 gap-2">
                                    <div class="bg-gray-50 p-2 rounded">
                                        <div class="text-xs text-gray-500">Annual Usage</div>
                                        <div class="font-semibold">{{ number_format($estimation->annual_usage_kwh) }} kWh</div>
                                    </div>
                                    <div class="bg-gray-50 p-2 rounded">
                                        <div class="text-xs text-gray-500">Capacity Factor</div>
                                        <div class="font-semibold">{{ number_format($estimation->capacity_factor, 1) }}%</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="border-t mt-2 px-4 py-3 bg-gray-50 flex justify-between">
                                <span class="text-sm font-medium text-gray-700">
                                    Status: 
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        {{ ucfirst($estimation->status) }}
                                    </span>
                                </span>
                                <a href="{{ route('estimation.details', $estimation->id) }}" 
                                   class="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    View Details
                                </a>
                            </div>
                        </div>
                    @endforeach
                </div>
            @endif
        </div>
    </div>
@endsection

@push('scripts')
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Any JavaScript functionality can be added here
            console.log('My projects page loaded');
        });
    </script>
@endpush