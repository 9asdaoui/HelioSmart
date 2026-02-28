@extends('../site/layouts.app')

@section('page_title', __('Solar Energy Estimation Tool'))

@section('content')
<!-- Hero Section -->
<section style="
    background: linear-gradient(135deg, #fff5f2 0%, #ffede8 100%);
    background-image: url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23f97316\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');
    padding: 5rem 0;
">
    <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto text-center">
            <h2 class="text-4xl md:text-5xl font-bold text-orange-900 mb-6">Solar Energy Estimation Tool</h2>
            <p class="text-xl text-orange-800 mb-10">Calculate your potential solar energy production and savings with our advanced estimation tool.</p>
            <button id="startEstimation" 
                style="
                    background-color: #f97316;
                    color: white;
                    font-weight: bold;
                    padding: 0.75rem 2rem;
                    border-radius: 0.5rem;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    transform: scale(1);
                    transition: all 0.3s ease;
                    border: none;
                    cursor: pointer;
                    outline: none;
                "
                onmouseover="this.style.backgroundColor='#ea580c'; this.style.transform='scale(1.05)'; this.style.boxShadow='0 20px 25px -5px rgba(0, 0, 0, 0.1)';"
                onmouseout="this.style.backgroundColor='#f97316'; this.style.transform='scale(1)'; this.style.boxShadow='0 10px 15px -3px rgba(0, 0, 0, 0.1)';"
                onfocus="this.style.outline='2px solid #f97316'; this.style.outlineOffset='2px';"
                onblur="this.style.outline='none';">
                Start New Estimation
            </button>
        </div>
    </div>
</section>

<!-- About the Tool -->
<section style="background-color: white; padding: 4rem 0;">
    <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto">
            <h3 class="text-3xl font-bold text-orange-900 mb-8 text-center">About Our Solar Estimation System</h3>
            <div style="
                background-color: #fff7ed;
                padding: 2rem;
                border-radius: 0.75rem;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            ">
                <p class="text-lg text-gray-700 mb-6">
                    Our solar estimation tool provides accurate calculations of potential solar energy production based on your location, roof specifications, and local weather patterns. Using advanced algorithms and satellite data, we help you determine:
                </p>
                <ul class="space-y-4 mb-6">
                    <li class="flex items-start">
                        <svg class="h-6 w-6 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span class="text-gray-700">Optimal solar panel placement and configuration</span>
                    </li>
                    <li class="flex items-start">
                        <svg class="h-6 w-6 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span class="text-gray-700">Estimated energy production in kWh per year</span>
                    </li>
                    <li class="flex items-start">
                        <svg class="h-6 w-6 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span class="text-gray-700">Potential cost savings on electricity bills</span>
                    </li>
                    <li class="flex items-start">
                        <svg class="h-6 w-6 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span class="text-gray-700">Return on investment and payback period</span>
                    </li>
                    <li class="flex items-start">
                        <svg class="h-6 w-6 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span class="text-gray-700">Environmental impact and carbon footprint reduction</span>
                    </li>
                </ul>
                <p class="text-lg text-gray-700">
                    Make informed decisions about your solar investment with our comprehensive, easy-to-understand reports.
                </p>
            </div>
        </div>
    </div>
</section>

<!-- How It Works -->
<section style="background-color: #fff7ed; padding: 4rem 0;">
    <div class="container mx-auto px-4">
        <h3 class="text-3xl font-bold text-orange-900 mb-12 text-center">How It Works</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <!-- Step 1 -->
            <div style="
                background-color: white;
                border-radius: 0.75rem;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                padding: 1.5rem;
                transition: all 0.3s ease;
                transform: translateY(0);
            "
            onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(0, 0, 0, 0.1)';">
                <div style="
                    background-color: #fed7aa;
                    border-radius: 50%;
                    width: 4rem;
                    height: 4rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                ">
                    <span class="text-2xl font-bold text-orange-600">1</span>
                </div>
                <h4 class="text-xl font-semibold text-orange-900 mb-4 text-center">Enter Your Details</h4>
                <p class="text-gray-600 text-center">
                    Provide your location, roof specifications, and current electricity usage to get started.
                </p>
            </div>
            
            <!-- Step 2 -->
            <div style="
                background-color: white;
                border-radius: 0.75rem;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                padding: 1.5rem;
                transition: all 0.3s ease;
                transform: translateY(0);
            "
            onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(0, 0, 0, 0.1)';">
                <div style="
                    background-color: #fed7aa;
                    border-radius: 50%;
                    width: 4rem;
                    height: 4rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                ">
                    <span class="text-2xl font-bold text-orange-600">2</span>
                </div>
                <h4 class="text-xl font-semibold text-orange-900 mb-4 text-center">Analysis</h4>
                <p class="text-gray-600 text-center">
                    Our system analyzes solar potential using satellite imagery, weather data, and advanced algorithms.
                </p>
            </div>
            
            <!-- Step 3 -->
            <div style="
                background-color: white;
                border-radius: 0.75rem;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                padding: 1.5rem;
                transition: all 0.3s ease;
                transform: translateY(0);
            "
            onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(0, 0, 0, 0.1)';">
                <div style="
                    background-color: #fed7aa;
                    border-radius: 50%;
                    width: 4rem;
                    height: 4rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                ">
                    <span class="text-2xl font-bold text-orange-600">3</span>
                </div>
                <h4 class="text-xl font-semibold text-orange-900 mb-4 text-center">Get Your Report</h4>
                <p class="text-gray-600 text-center">
                    Receive a detailed report with energy production estimates, cost savings, and ROI calculations.
                </p>
            </div>
        </div>
    </div>
</section>

<!-- Previous Estimations -->
<section style="padding: 4rem 0; background-color: white;">
    <div class="container mx-auto px-4">
        <div class="max-w-6xl mx-auto">
            <h3 class="text-3xl font-bold text-orange-900 mb-8 text-center">Your Previous Estimations</h3>
            
            @if($estimations->count() > 0)
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    @foreach($estimations as $estimation)
                        <div style="
                            background-color: white;
                            border-radius: 0.75rem;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                            overflow: hidden;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            transform: translateY(0);
                        "
                        onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(0, 0, 0, 0.1)';"
                        onclick="viewEstimationDetails({{ $estimation->id }})">
                            
                            <div style="background-color: #ea580c; height: 0.5rem;"></div>
                            
                            <div style="padding: 1.5rem;">
                                <div class="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 class="text-lg font-semibold text-orange-900">
                                            {{ $estimation->city }}, {{ $estimation->state }}
                                        </h4>
                                        <p class="text-gray-500 text-sm">
                                            {{ $estimation->created_at->format('M d, Y') }}
                                        </p>
                                    </div>
                                    <div style="
                                        background-color: {{ $estimation->status === 'completed' ? '#fef3c7' : '#fee2e2' }};
                                        color: {{ $estimation->status === 'completed' ? '#92400e' : '#dc2626' }};
                                        font-size: 0.75rem;
                                        font-weight: 500;
                                        padding: 0.25rem 0.625rem;
                                        border-radius: 9999px;
                                    ">
                                        {{ ucfirst($estimation->status ?? 'Pending') }}
                                    </div>
                                </div>
                                
                                <div class="space-y-3">
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Annual Production:</span>
                                        <span class="font-medium text-gray-900">
                                            {{ number_format($estimation->energy_annual ?? 0, 0) }} kWh
                                        </span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">System Size:</span>
                                        <span class="font-medium text-gray-900">
                                            {{ number_format($estimation->system_capacity ?? 0, 1) }} kW
                                        </span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Panel Count:</span>
                                        <span class="font-medium text-gray-900">
                                            {{ $estimation->panel_count ?? 'N/A' }} panels
                                        </span>
                                    </div>
                                    @if($estimation->annual_cost && $estimation->energy_annual)
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Est. Savings:</span>
                                            <span class="font-medium text-green-600">
                                                ${{ number_format(($estimation->energy_annual * ($estimation->annual_cost / $estimation->annual_usage_kwh)) ?? 0, 0) }}/year
                                            </span>
                                        </div>
                                    @endif
                                </div>
                                
                                <div class="mt-6 flex justify-end">
                                    <button style="
                                        color: #ea580c;
                                        font-size: 0.875rem;
                                        font-weight: 500;
                                        display: flex;
                                        align-items: center;
                                        background: none;
                                        border: none;
                                        cursor: pointer;
                                        transition: color 0.3s ease;
                                    "
                                    onmouseover="this.style.color='#c2410c';"
                                    onmouseout="this.style.color='#ea580c';">
                                        View Details
                                        <svg class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    @endforeach
                </div>

                <!-- Pagination -->
                @if($estimations->hasPages())
                    <div class="mt-8 flex justify-center">
                        {{ $estimations->links() }}
                    </div>
                @endif
            @else
                <div style="
                    text-align: center;
                    padding: 3rem;
                    background-color: #f9fafb;
                    border-radius: 0.75rem;
                    border: 2px dashed #d1d5db;
                ">
                    <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h4 class="text-lg font-semibold text-gray-700 mb-2">No estimations yet</h4>
                    <p class="text-gray-500 mb-4">Start your first solar estimation to see your results here.</p>
                    <button onclick="document.getElementById('startEstimation').click()" style="
                        background-color: #f97316;
                        color: white;
                        font-weight: 500;
                        padding: 0.5rem 1rem;
                        border-radius: 0.375rem;
                        border: none;
                        cursor: pointer;
                        transition: background-color 0.3s ease;
                    "
                    onmouseover="this.style.backgroundColor='#ea580c';"
                    onmouseout="this.style.backgroundColor='#f97316';">
                        Get Started
                    </button>
                </div>
            @endif
        </div>
    </div>
</section>
@endsection

@push('scripts')
<script>
    // Start new estimation
    document.getElementById('startEstimation').addEventListener('click', function() {
        // Redirect to estimation form or open modal
        window.location.href = '{{ route("estimation.create") }}'; // Adjust route as needed
    });

    // View estimation details
    function viewEstimationDetails(estimationId) {
        // Redirect to estimation details page
        window.location.href = '/estimation/' + estimationId; // Adjust route as needed
    }

    // Add smooth scrolling for internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
</script>
@endpush