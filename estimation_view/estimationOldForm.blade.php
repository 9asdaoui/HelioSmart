@extends('../site/layouts.app')
@section('page_title', __('Solar Energy Estimation'))

@push('styles')
    <style>
        #map {
            height: 520px;
            width: 100%;
            margin-bottom: 15px;
            border-radius: 8px;
            border: 1px solid #ddd;
        }

        .capture-cadre {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 300px;
            height: 300px;
            border: 3px solid #10b981;
            background: transparent;
            transform: translate(-50%, -50%);
            pointer-events: none;
        }

        .map-mask {
            position: absolute;
            top: 62px;
            border-radius: 8px;
            left: 0;
            width: 100%;
            height: 81.3%;
            background-color: rgba(0, 0, 0, 0.3);
            pointer-events: none;
            -webkit-mask: radial-gradient(circle at center,
                    transparent 170px,
                    black 100px);
            mask: radial-gradient(circle at center,
                    transparent 10px,
                    black 200px);
        }

        .capture-cadre::before {
            content: 'Fit your roof in this frame';
            position: absolute;
            top: -35px;
            left: 50%;
            transform: translateX(-50%);
            background: #10b981;
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            white-space: nowrap;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            z-index: 1002;
        }

        /* Enhanced styling */
        .form-section {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            background-color: white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .form-section h2 {
            position: relative;
            padding-bottom: 0.75rem;
            margin-bottom: 1.25rem;
        }

        .form-section h2::after {
            content: '';
            position: absolute;
            left: 0;
            bottom: 0;
            width: 50px;
            height: 3px;
            background-color: #10b981;
        }

        .form-input {
            transition: border-color 0.15s ease-in-out;
        }

        .form-input:focus {
            border-color: #10b981;
            box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
        }

        .section-number {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            background-color: #10b981;
            color: white;
            border-radius: 50%;
            margin-right: 0.5rem;
            font-weight: 600;
            font-size: 0.9rem;
        }

        .input-group-label {
            font-weight: 500;
            color: #374151;
            margin-bottom: 0.5rem;
        }

        .submit-button {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            transition: all 0.3s ease;
        }

        .submit-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        #input_type_selector {
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2310b981'%3e%3cpath d='M7 10l5 5 5-5H7z'/%3e%3c/svg%3e");
            background-position: right 0.75rem center;
            background-repeat: no-repeat;
            background-size: 1rem;
            padding-right: 2.5rem;
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
        }

        .monthly-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
        }

        /* Custom Coverage Slider Styling */
        #coverage_percentage {
            -webkit-appearance: none;
            appearance: none;
            height: 8px;
            background: linear-gradient(to right, #e5e7eb 0%, #e5e7eb 100%);
            border-radius: 5px;
            outline: none;
            position: relative;
        }

        /* Webkit browsers (Chrome, Safari, Edge) */
        #coverage_percentage::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            background: #10b981; /* Green thumb */
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        /* Firefox */
        #coverage_percentage::-moz-range-thumb {
            width: 20px;
            height: 20px;
            background: #10b981; /* Green thumb */
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        /* Dynamic background update will be handled by JavaScript */

        /* Roof Type Selection Styling */
        .roof-type-option {
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            background: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            width: 160px;
            height: 140px;
            position: relative;
        }

        .roof-type-option:hover {
            border-color: #f97316;
            box-shadow: 0 2px 8px rgba(249, 115, 22, 0.1);
        }

        .roof-type-option.selected {
            border-color: #f97316;
            background-color: #fed7aa;
            box-shadow: 0 2px 8px rgba(249, 115, 22, 0.15);
        }

        .roof-type-option img {
            width: 120px;
            height: 90px;
            object-fit: contain;
        }

        .roof-type-option .roof-type-label {
            font-weight: 500;
            color: #374151;
            font-size: 11px;
            text-align: center;
            line-height: 1.2;
        }

        .roof-type-option.selected .roof-type-label {
            color: #9a3412;
            font-weight: 600;
        }

        .roof-tilt-container {
            display: none;
            padding: 16px;
            background-color: #f9fafb;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }

        .roof-tilt-container.show {
            display: block;
            animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>
@endpush

@section('content')
    <div class="container mx-auto px-4 py-8 max-w-5xl">
        <div class="bg-gradient-to-b from-green-50 to-white shadow-lg rounded-lg p-6">
            <h1 class="text-3xl font-bold mb-6 text-center text-gray-800">Solar Energy Estimation</h1>

            @if (session('error'))
                <div class="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded relative mb-4">
                    <strong class="font-bold">Error!</strong>
                    <span class="block sm:inline">{{ session('error') }}</span>
                </div>
            @endif

            @if ($errors->any())
                <div class="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded relative mb-4">
                    <strong class="font-bold">Please correct the following errors:</strong>
                    <ul class="mt-2 list-disc list-inside">
                        @foreach ($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                </div>
            @endif

            <form id="solarEstimationForm" action="{{ route('solar.create-project') }}" method="POST" class="space-y-6">
                @csrf

                <input type="hidden" name="latitude" id="form_latitude">
                <input type="hidden" name="longitude" id="form_longitude">
                <input type="hidden" name="annual_usage" id="form_annual_usage">
                <input type="hidden" name="building_floors" id="form_building_floors" value="1">

                <!-- Property Information Section -->
                <div class="form-section">
                    <h2 class="text-xl font-semibold">
                        <span class="section-number">1</span>Select Your Property Location
                    </h2>

                    <div class="flex flex-col lg:flex-row gap-6">
                        <!-- Map -->
                        <div class="w-full lg:w-2/3 relative">
                            <div class="mb-3 relative flex gap-2">
                                <div class="flex-1 relative">
                                    <input type="text" id="searchInput" placeholder="Search for an address..."
                                        class="w-full p-3 border rounded-lg pl-10 form-input">
                                </div>
                                <button type="button" id="getCurrentLocationBtn"
                                    style="padding: 12px 16px; background-color: #f97316; color: black; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 500; transition: background-color 0.2s;"
                                    onmouseover="this.style.backgroundColor='#ea580c'"
                                    onmouseout="this.style.backgroundColor='#f97316'">
                                    <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    </svg>
                                    Current Location
                                </button>
                            </div>
                            <div id="map"></div>
                            <div class="map-mask"></div>
                            <div class="capture-cadre"></div>
                            <!-- Map Controls -->
                            <div class="mt-3 flex flex-wrap gap-3">
                                <button type="button" id="getLocationBtn"
                                    style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; background-color: #f97316; color: black; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; font-weight: 500; transition: background-color 0.2s;"
                                    onmouseover="this.style.backgroundColor='#ea580c'"
                                    onmouseout="this.style.backgroundColor='#f97316'">
                                    <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Select Location
                                </button>
                                <div id="locationStatus" class="flex items-center text-sm text-gray-600">
                                    <span>📍 Position your roof in the green frame and click to select location</span>
                                </div>
                            </div>
                        </div>

                        <!-- Example and Instructions Panel -->
                        <div class="w-full lg:w-1/3 space-y-4">
                            <!-- Visual Example with Static Image -->
                            <div class="bg-white border rounded-lg shadow-sm p-4">
                                <h3 class="font-semibold text-lg mb-3 text-gray-800">
                                    Perfect Roof Capture
                                </h3>
                                
                                <!-- Static image example -->
                                <div class="text-center mb-3">
                                    <div class="inline-block border-4 border-green-500 rounded-lg overflow-hidden shadow-md">
                                        <img src="{{ asset('public/datta-able/images/image.png') }}" 
                                             alt="Roof positioning example" 
                                             class="max-w-full h-auto" 
                                             style="max-width: 400px;">
                                    </div>
                                    
                                    <!-- Success indicator -->
                                    <div class="mt-2">
                                        <span class="text-xs text-green-600 font-medium">✓ Roof positioned correctly in frame</span>
                                    </div>
                                </div>

                                <!-- Simple tip -->
                                <div class="text-center p-2 bg-blue-50 rounded text-xs text-blue-700">
                                    Position your roof like this example, then click "Select Location"
                                </div>
                            </div>

                            <!-- Address Information Panel - Always visible but hidden content -->
                            <div id="addressPanel" class="hidden bg-white border rounded-lg shadow-sm p-4">
                                <h3 class="font-medium text-lg mb-3 text-gray-700 flex items-center">
                                    <span class="text-green-600 mr-2">📍</span>
                                    Detected Location
                                </h3>

                                <!-- Address Fields (Hidden) -->
                                <div class="space-y-2 text-sm">
                                    <input type="hidden" id="street" name="address[street]">
                                    <input type="hidden" id="city" name="address[city]">
                                    <input type="hidden" id="state" name="address[state]">
                                    <input type="hidden" id="zip_code" name="address[zip_code]">
                                    <input type="hidden" id="country" name="address[country]">
                                    <input type="hidden" id="latitude" name="address[latitude]">
                                    <input type="hidden" id="longitude" name="address[longitude]">
                                    
                                    <!-- Display only summary -->
                                    <div id="addressSummary" class="p-3 bg-gray-50 rounded-lg">
                                        <p class="text-gray-600">Location will be displayed here after capture</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Energy Usage Section - ENHANCED VERSION -->
                <div class="form-section">
                    <h2 class="text-xl font-semibold">
                        <span class="section-number">2</span>Your Energy Usage
                    </h2>

                    <!-- Usage Input Type Dropdown -->
                    <div class="mb-6">
                        <label for="input_type_selector" class="input-group-label">How would you like to provide your
                            energy information?</label>
                        <select id="input_type_selector" name="input_type_selector"
                            class="w-full p-3 border rounded-lg form-input bg-white mb-4 wight- ">
                            <option value="annual_usage">Annual Usage (kWh)</option>
                            <option value="annual_cost">Annual Cost (DH)</option>
                            <option value="monthly_usage">Monthly Usage (kWh)</option>
                            <option value="monthly_cost">Monthly Cost (DH)</option>
                        </select>
                    </div>

                    <!-- Annual Usage Input (Default) -->
                    <div id="annual_usage_container" class="mb-6">
                        <div class="bg-green-50 p-4 rounded-lg">
                            <label for="annual_usage" class="input-group-label">Annual Energy Usage (kWh)</label>
                            <input type="number" name="energy_usage[annual_usage_kwh]" id="annual_usage" min="0"
                                value="{{ old('annual_usage') ?? old('energy_usage.annual_usage_kwh') }}"
                                class="w-full p-3 border rounded-lg form-input @error('annual_usage') border-red-500 @enderror"
                                placeholder="Enter your annual electricity usage in kilowatt-hours">
                            @error('annual_usage')
                                <p class="text-red-500 text-sm mt-1">{{ $message }}</p>
                            @enderror
                        </div>
                    </div>

                    <!-- Annual Cost Input (Hidden by Default) -->
                    <div id="annual_cost_container" class="mb-6 hidden">
                        <div class="bg-green-50 p-4 rounded-lg">
                            <label for="annual_cost" class="input-group-label">Annual Energy Bill (DH)</label>
                            <input type="number" name="energy_usage[annual_cost]" id="annual_cost" min="0"
                                value="{{ old('annual_cost') ?? old('energy_usage.annual_cost') }}"
                                class="w-full p-3 border rounded-lg form-input"
                                placeholder="Enter your annual electricity bill total in Dirhams">
                        </div>
                    </div>

                    <!-- Monthly Usage Input (Hidden by Default) -->
                    <div id="monthly_usage_container" class="mb-6 hidden">
                        <div class="bg-green-50 p-4 rounded-lg">
                            <label class="input-group-label mb-3">Monthly Energy Usage (kWh)</label>
                            <div class="monthly-grid">
                                <div>
                                    <label for="january_usage" class="block text-sm mb-1 text-gray-600">January</label>
                                    <input type="number" name="energy_usage[monthly_usage][january]" id="january_usage"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="kWh">
                                </div>
                                <div>
                                    <label for="february_usage" class="block text-sm mb-1 text-gray-600">February</label>
                                    <input type="number" name="energy_usage[monthly_usage][february]"
                                        id="february_usage" min="0" class="w-full p-2.5 border rounded form-input"
                                        placeholder="kWh">
                                </div>
                                <div>
                                    <label for="march_usage" class="block text-sm mb-1 text-gray-600">March</label>
                                    <input type="number" name="energy_usage[monthly_usage][march]" id="march_usage"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="kWh">
                                </div>
                                <div>
                                    <label for="april_usage" class="block text-sm mb-1 text-gray-600">April</label>
                                    <input type="number" name="energy_usage[monthly_usage][april]" id="april_usage"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="kWh">
                                </div>
                                <div>
                                    <label for="may_usage" class="block text-sm mb-1 text-gray-600">May</label>
                                    <input type="number" name="energy_usage[monthly_usage][may]" id="may_usage"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="kWh">
                                </div>
                                <div>
                                    <label for="june_usage" class="block text-sm mb-1 text-gray-600">June</label>
                                    <input type="number" name="energy_usage[monthly_usage][june]" id="june_usage"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="kWh">
                                </div>
                                <div>
                                    <label for="july_usage" class="block text-sm mb-1 text-gray-600">July</label>
                                    <input type="number" name="energy_usage[monthly_usage][july]" id="july_usage"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="kWh">
                                </div>
                                <div>
                                    <label for="august_usage" class="block text-sm mb-1 text-gray-600">August</label>
                                    <input type="number" name="energy_usage[monthly_usage][august]" id="august_usage"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="kWh">
                                </div>
                                <div>
                                    <label for="september_usage"
                                        class="block text-sm mb-1 text-gray-600">September</label>
                                    <input type="number" name="energy_usage[monthly_usage][september]"
                                        id="september_usage" min="0"
                                        class="w-full p-2.5 border rounded form-input" placeholder="kWh">
                                </div>
                                <div>
                                    <label for="october_usage" class="block text-sm mb-1 text-gray-600">October</label>
                                    <input type="number" name="energy_usage[monthly_usage][october]" id="october_usage"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="kWh">
                                </div>
                                <div>
                                    <label for="november_usage" class="block text-sm mb-1 text-gray-600">November</label>
                                    <input type="number" name="energy_usage[monthly_usage][november]"
                                        id="november_usage" min="0" class="w-full p-2.5 border rounded form-input"
                                        placeholder="kWh">
                                </div>
                                <div>
                                    <label for="december_usage" class="block text-sm mb-1 text-gray-600">December</label>
                                    <input type="number" name="energy_usage[monthly_usage][december]"
                                        id="december_usage" min="0" class="w-full p-2.5 border rounded form-input"
                                        placeholder="kWh">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Monthly Cost Input (Hidden by Default) -->
                    <div id="monthly_cost_container" class="mb-6 hidden">
                        <div class="bg-green-50 p-4 rounded-lg">
                            <label class="input-group-label mb-3">Monthly Energy Bill (DH)</label>
                            <div class="monthly-grid">
                                <div>
                                    <label for="january_cost" class="block text-sm mb-1 text-gray-600">January</label>
                                    <input type="number" name="energy_usage[monthly_cost][january]" id="january_cost"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="DH">
                                </div>
                                <div>
                                    <label for="february_cost" class="block text-sm mb-1 text-gray-600">February</label>
                                    <input type="number" name="energy_usage[monthly_cost][february]" id="february_cost"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="DH">
                                </div>
                                <div>
                                    <label for="march_cost" class="block text-sm mb-1 text-gray-600">March</label>
                                    <input type="number" name="energy_usage[monthly_cost][march]" id="march_cost"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="DH">
                                </div>
                                <div>
                                    <label for="april_cost" class="block text-sm mb-1 text-gray-600">April</label>
                                    <input type="number" name="energy_usage[monthly_cost][april]" id="april_cost"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="DH">
                                </div>
                                <div>
                                    <label for="may_cost" class="block text-sm mb-1 text-gray-600">May</label>
                                    <input type="number" name="energy_usage[monthly_cost][may]" id="may_cost"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="DH">
                                </div>
                                <div>
                                    <label for="june_cost" class="block text-sm mb-1 text-gray-600">June</label>
                                    <input type="number" name="energy_usage[monthly_cost][june]" id="june_cost"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="DH">
                                </div>
                                <div>
                                    <label for="july_cost" class="block text-sm mb-1 text-gray-600">July</label>
                                    <input type="number" name="energy_usage[monthly_cost][july]" id="july_cost"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="DH">
                                </div>
                                <div>
                                    <label for="august_cost" class="block text-sm mb-1 text-gray-600">August</label>
                                    <input type="number" name="energy_usage[monthly_cost][august]" id="august_cost"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="DH">
                                </div>
                                <div>
                                    <label for="september_cost" class="block text-sm mb-1 text-gray-600">September</label>
                                    <input type="number" name="energy_usage[monthly_cost][september]"
                                        id="september_cost" min="0" class="w-full p-2.5 border rounded form-input"
                                        placeholder="DH">
                                </div>
                                <div>
                                    <label for="october_cost" class="block text-sm mb-1 text-gray-600">October</label>
                                    <input type="number" name="energy_usage[monthly_cost][october]" id="october_cost"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="DH">
                                </div>
                                <div>
                                    <label for="november_cost" class="block text-sm mb-1 text-gray-600">November</label>
                                    <input type="number" name="energy_usage[monthly_cost][november]" id="november_cost"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="DH">
                                </div>
                                <div>
                                    <label for="december_cost" class="block text-sm mb-1 text-gray-600">December</label>
                                    <input type="number" name="energy_usage[monthly_cost][december]" id="december_cost"
                                        min="0" class="w-full p-2.5 border rounded form-input" placeholder="DH">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Always visible controls -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <!-- Coverage Percentage Selection -->
                        <div class="bg-white p-4 rounded-lg border border-gray-200">
                            <label class="input-group-label">Coverage Target: <span id="coverage_value"
                                    class="text-green-600 font-semibold">80</span>%</label>
                            <div class="flex items-center gap-2 mt-2">
                                <span class="text-sm text-gray-500">50%</span>
                                <input type="range" name="energy_usage[coverage_percentage]" id="coverage_percentage"
                                    min="50" max="100" step="10" value="80"
                                    class="w-full accent-green-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">
                                <span class="text-sm text-gray-500">100%</span>
                            </div>
                            <p class="text-xs text-gray-500 mt-3">How much of your energy needs should the solar system
                                cover</p>

                            <script>
                                // Update the displayed value and background when the slider changes
                                document.addEventListener('DOMContentLoaded', function() {
                                    const slider = document.getElementById('coverage_percentage');
                                    const valueDisplay = document.getElementById('coverage_value');
                                    
                                    function updateSlider() {
                                        const value = slider.value;
                                        const min = slider.min;
                                        const max = slider.max;
                                        
                                        // Update displayed value
                                        valueDisplay.textContent = value;
                                        
                                        // Calculate percentage for gradient
                                        const percentage = ((value - min) / (max - min)) * 100;
                                        
                                        // Create gradient: orange from 0% to current position, gray after
                                        const gradient = `linear-gradient(to right, 
                                            #f97316 0%, 
                                            #f97316 ${percentage}%, 
                                            #e5e7eb ${percentage}%, 
                                            #e5e7eb 100%)`;
                                        
                                        slider.style.background = gradient;
                                    }
                                    
                                    // Update on input
                                    slider.addEventListener('input', updateSlider);
                                    
                                    // Initialize
                                    updateSlider();
                                });
                            </script>
                        </div>

                        <div class="bg-white p-4 rounded-lg border border-gray-200">
                            <label for="utility_company" class="input-group-label">Utility Company</label>
                            <input type="text" name="energy_usage[utility_company]" id="utility_company"
                                class="w-full p-3 border rounded-lg form-input mt-2"
                                placeholder="Your electricity provider">
                        </div>
                    </div>

                    <!-- Hidden input to track which option was selected -->
                    <input type="hidden" name="selected_input_type" id="selected_input_type" value="annual_usage">
                </div>

                <!-- System Design Section -->
                <div class="form-section">
                    <h2 class="text-xl font-semibold">
                        <span class="section-number">3</span>Building Information
                    </h2>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- Left Column: Roof Type Selection -->
                        <div class="bg-white p-4 rounded-lg border border-gray-200">
                            <label class="input-group-label mb-4 block">Roof Type</label>
                            <div class="flex justify-center gap-4">
                                <!-- Sloped Roof Option -->
                                <div class="roof-type-option" data-roof-type="sloped" onclick="selectRoofType('sloped')">
                                    <img src="{{ asset('public/datta-able/images/roof-open-gable.png') }}" alt="Sloped Roof">
                                    <span class="roof-type-label">Sloped Roof</span>
                                </div>
                                
                                <!-- Flat Roof Option -->
                                <div class="roof-type-option" data-roof-type="flat" onclick="selectRoofType('flat')">
                                    <img src="{{ asset('public/datta-able/images/roof-flat.png') }}" alt="Flat Roof">
                                    <span class="roof-type-label">Flat Roof</span>
                                </div>
                            </div>
                            
                            <!-- Hidden input for roof type -->
                            <input type="hidden" name="building_info[roof_type]" id="roof_type" value="">
                        </div>

                        <!-- Right Column: Roof Tilt and Number of Floors -->
                        <div class="space-y-4">
                            <!-- Roof Tilt Input (shown only for sloped roof) -->
                            <div id="roofTiltContainer" class="roof-tilt-container">
                                <label for="roof_tilt" class="input-group-label">Roof Tilt (Degrees)</label>
                                <input type="number" name="building_info[roof_tilt]" id="roof_tilt" 
                                    min="0" max="90" step="1" 
                                    class="w-full p-3 border rounded-lg form-input mt-2" 
                                    placeholder="Enter roof tilt angle (e.g., 30)">
                                <p class="text-xs text-gray-500 mt-2">Typical residential roofs have a tilt between 15-45 degrees</p>
                            </div>

                            <!-- Number of Floors -->
                            <div class="bg-white p-4 rounded-lg border border-gray-200">
                                <label for="building_floors" class="input-group-label">Number of Floors</label>
                                <input type="number" name="building_info[floors]" id="building_floors" min="1"
                                    value="{{ old('building_floors') ?? '1' }}"
                                    class="w-full p-3 border rounded-lg form-input mt-2 @error('building_floors') border-red-500 @enderror"
                                    placeholder="How many floors does your building have?">
                                @error('building_floors')
                                    <p class="text-red-500 text-sm mt-1">{{ $message }}</p>
                                @enderror
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Form Actions -->
                <div class="text-center py-6">
                    <button type="submit" id="submitForm"
                        class="px-8 py-3 bg-green-600 text-white text-lg rounded-lg hover:bg-green-700 submit-button shadow-md">
                        Get My Solar Estimate
                    </button>
                </div>

                <!-- Form Status -->
                <div id="formStatus" class="hidden mt-4 p-4 text-center rounded-lg"></div>
            </form>
        </div>
    </div>
@endsection

@push('scripts')
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script async defer
        src="https://maps.googleapis.com/maps/api/js?key={{ env('GOOGLE_MAPS_API_KEY') }}&libraries=places&callback=initMap">
    </script>

    <script>
        let map;
        let geocoder;
        let currentMarker;
        let mapCenter = {
            lat: 34.0433,
            lng: -4.9998
        };
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize form handling
            initializeFormHandling();
        });

        // Initialize Google Map
        function initMap() {
            // Initialize map
            map = new google.maps.Map(document.getElementById('map'), {
                zoom: 18,
                center: mapCenter,
                mapTypeId: 'satellite',
                disableDefaultUI: false,
                zoomControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                mapTypeControl: false,
                scaleControl: true
            });

            // Initialize geocoder
            geocoder = new google.maps.Geocoder();
            // Initialize search box
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                const autocomplete = new google.maps.places.Autocomplete(searchInput);
                autocomplete.bindTo('bounds', map);

                autocomplete.addListener('place_changed', function() {
                    const place = autocomplete.getPlace();

                    if (!place.geometry || !place.geometry.location) {
                        showStatus('No details available for this location', 'warning');
                        return;
                    }

                    // Center map on the selected place
                    if (place.geometry.viewport) {
                        map.fitBounds(place.geometry.viewport);
                    } else {
                        map.setCenter(place.geometry.location);
                        map.setZoom(18);
                    }

                    // Process the address components
                    processAddressComponents(place.address_components, place.geometry.location);

                    // Update location status
                    const locationStatus = document.getElementById('locationStatus');
                    if (locationStatus) {
                        locationStatus.innerHTML = '<span class="text-green-600">✓ Location found from search</span>';
                    }

                    showStatus('Location found!', 'success');
                });
            }

            // Add map event listeners
            map.addListener('center_changed', updateMapInfo);
            map.addListener('zoom_changed', updateMapInfo);

            // Initialize map controls
            initializeMapControls();

            // Update initial map info
            updateMapInfo();
        }

        function initializeMapControls() {
            // Get UI elements
            const getLocationBtn = document.getElementById('getLocationBtn');
            const addressPanel = document.getElementById('addressPanel');

            // Get Location button
            if (getLocationBtn) {
                getLocationBtn.addEventListener('click', function() {
                    // Get the current center of the map (where the cadre is positioned)
                    const center = map.getCenter();

                    // Show loading status
                    showStatus('Retrieving address information...', 'info');

                    // Get address from the current center
                    getAddressFromLocation(center);
                });
            }

            // Current Location button
            const getCurrentLocationBtn = document.getElementById('getCurrentLocationBtn');
            if (getCurrentLocationBtn) {
                getCurrentLocationBtn.addEventListener('click', function() {
                    if ("geolocation" in navigator) {
                        getCurrentLocationBtn.textContent = 'Getting Location...';
                        getCurrentLocationBtn.disabled = true;
                        
                        navigator.geolocation.getCurrentPosition(
                            function(position) {
                                const lat = position.coords.latitude;
                                const lng = position.coords.longitude;
                                const currentLocation = new google.maps.LatLng(lat, lng);
                                
                                map.setCenter(currentLocation);
                                map.setZoom(18);
                                
                                getCurrentLocationBtn.innerHTML = '<svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg> Current Location';
                                getCurrentLocationBtn.disabled = false;
                                
                                const locationStatus = document.getElementById('locationStatus');
                                if (locationStatus) {
                                    locationStatus.innerHTML = '<span class="text-green-600">✓ Current location loaded</span>';
                                }
                            },
                            function(error) {
                                getCurrentLocationBtn.innerHTML = '<svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg> Current Location';
                                getCurrentLocationBtn.disabled = false;
                                
                                const locationStatus = document.getElementById('locationStatus');
                                if (locationStatus) {
                                    locationStatus.innerHTML = '<span class="text-red-600">❌ Location access denied</span>';
                                }
                            }
                        );
                    } else {
                        const locationStatus = document.getElementById('locationStatus');
                        if (locationStatus) {
                            locationStatus.innerHTML = '<span class="text-red-600">❌ Geolocation not supported</span>';
                        }
                    }
                });
            }

            // Get address details from coordinates
            function getAddressFromLocation(location) {
                // Update location status
                const locationStatus = document.getElementById('locationStatus');
                if (locationStatus) {
                    locationStatus.innerHTML = '<span class="text-blue-600">🔄 Getting address information...</span>';
                }

                geocoder.geocode({
                    location: location
                }, function(results, status) {
                    if (status === 'OK' && results[0]) {
                        // Process the address components - now calling the global function
                        processAddressComponents(results[0].address_components, location);

                        showStatus('Address information retrieved successfully', 'success');
                        
                        // Update location status
                        if (locationStatus) {
                            locationStatus.innerHTML = '<span class="text-green-600">✓ Location captured successfully</span>';
                        }
                    } else {
                        console.error('Geocoding failed:', status);
                        showStatus('Could not retrieve address information', 'error');

                        // Still show the panel with coordinates only
                        document.getElementById('latitude').value = location.lat();
                        document.getElementById('longitude').value = location.lng();
                        
                        // Update address summary with coordinates only
                        updateAddressSummary({
                            street: '',
                            city: '',
                            state: '',
                            zip_code: '',
                            country: '',
                            latitude: location.lat(),
                            longitude: location.lng()
                        });

                        // Update location status
                        if (locationStatus) {
                            locationStatus.innerHTML = '<span class="text-yellow-600">⚠ Location captured (address not found)</span>';
                        }
                    }
                });
            }
        }
        // Process address components from geocoding result
        function processAddressComponents(addressComponents, location) {
            // Initialize address data object
            const addressData = {
                street: '',
                city: '',
                state: '',
                zip_code: '',
                country: '',
                latitude: location.lat(),
                longitude: location.lng()
            };

            // Map to store address components by type
            const componentMap = {};

            // Process each component
            addressComponents.forEach(component => {
                const types = component.types;

                if (types.includes('street_number')) {
                    componentMap.street_number = component.long_name;
                }
                if (types.includes('route')) {
                    componentMap.route = component.long_name;
                }
                if (types.includes('locality')) {
                    addressData.city = component.long_name;
                }
                if (types.includes('administrative_area_level_1')) {
                    addressData.state = component.long_name;
                }
                if (types.includes('postal_code')) {
                    addressData.zip_code = component.long_name;
                }
                if (types.includes('country')) {
                    addressData.country = component.long_name;
                }
            });

            // Combine street number and route for the street address
            addressData.street = [
                componentMap.street_number,
                componentMap.route
            ].filter(Boolean).join(' ');

            // Update the hidden form fields
            document.getElementById('street').value = addressData.street;
            document.getElementById('city').value = addressData.city;
            document.getElementById('state').value = addressData.state;
            document.getElementById('zip_code').value = addressData.zip_code;
            document.getElementById('country').value = addressData.country;
            document.getElementById('latitude').value = addressData.latitude;
            document.getElementById('longitude').value = addressData.longitude;

            // Update the address summary display
            updateAddressSummary(addressData);
        }

        // Update address summary display
        function updateAddressSummary(addressData) {
            const addressSummary = document.getElementById('addressSummary');
            const addressPanel = document.getElementById('addressPanel');
            
            if (addressSummary && addressPanel) {
                // Create readable address string
                const addressParts = [
                    addressData.street,
                    addressData.city,
                    addressData.state,
                    addressData.zip_code,
                    addressData.country
                ].filter(Boolean);

                const fullAddress = addressParts.join(', ');
                
                addressSummary.innerHTML = `
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="font-medium text-gray-700">Address:</span>
                            <span class="text-green-600">✓ Captured</span>
                        </div>
                        <p class="text-gray-600 text-sm">${fullAddress}</p>
                        <div class="text-xs text-gray-500 pt-2 border-t">
                            <div>Coordinates: ${addressData.latitude.toFixed(6)}, ${addressData.longitude.toFixed(6)}</div>
                        </div>
                    </div>
                `;
                
                // Show the address panel
                addressPanel.classList.remove('hidden');
            }
        }
        // Get full address data object
        function getAddressData() {
            const addressData = {
                street: document.getElementById('street').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                zip_code: document.getElementById('zip_code').value,
                country: document.getElementById('country').value,
                latitude: parseFloat(document.getElementById('latitude').value || 0),
                longitude: parseFloat(document.getElementById('longitude').value || 0)
            };

            return addressData;
        }
        // Update map information display
        function updateMapInfo() {
            const center = map.getCenter();
            const zoom = map.getZoom();
            const scale = calculateScale(zoom, center.lat());
        }

        // Calculate scale (meters per pixel) based on zoom level and latitude
        function calculateScale(zoom, latitude) {
            // Earth's circumference at equator in meters
            const earthCircumference = 40075016.686;

            // Adjust for latitude
            const latitudeAdjustment = Math.cos(latitude * Math.PI / 180);

            // Calculate meters per pixel
            const metersPerPixel = (earthCircumference * latitudeAdjustment) / Math.pow(2, zoom + 8);

            return metersPerPixel;
        }

        // Calculate real-world bounds of the cadre
        function calculateCadreBounds(center, scale) {
            const cadreWidthMeters = 300 * scale; // 300 pixels * scale
            const cadreHeightMeters = 300 * scale; // 300 pixels * scale

            // Convert meter offsets to lat/lng offsets
            const latOffset = cadreHeightMeters / 111320; // Approximate meters per degree latitude
            const lngOffset = cadreWidthMeters / (111320 * Math.cos(center.lat() * Math.PI / 180));

            return {
                north: center.lat() + latOffset / 2,
                south: center.lat() - latOffset / 2,
                east: center.lng() + lngOffset / 2,
                west: center.lng() - lngOffset / 2
            };
        }

        // Usage type toggle functionality using dropdown
        function setupUsageToggle() {
            const inputTypeSelector = document.getElementById('input_type_selector');

            const annualUsageContainer = document.getElementById('annual_usage_container');
            const annualCostContainer = document.getElementById('annual_cost_container');
            const monthlyUsageContainer = document.getElementById('monthly_usage_container');
            const monthlyCostContainer = document.getElementById('monthly_cost_container');

            const selectedInputType = document.getElementById('selected_input_type');

            // Function to hide all containers
            function hideAllContainers() {
                annualUsageContainer.classList.add('hidden');
                annualCostContainer.classList.add('hidden');
                monthlyUsageContainer.classList.add('hidden');
                monthlyCostContainer.classList.add('hidden');
            }

            // Function to show container based on selection
            function updateInputContainer(value) {
                hideAllContainers();
                selectedInputType.value = value;

                switch (value) {
                    case 'annual_usage':
                        annualUsageContainer.classList.remove('hidden');
                        break;
                    case 'annual_cost':
                        annualCostContainer.classList.remove('hidden');
                        break;
                    case 'monthly_usage':
                        monthlyUsageContainer.classList.remove('hidden');
                        break;
                    case 'monthly_cost':
                        monthlyCostContainer.classList.remove('hidden');
                        break;
                }
            }

            // Set up change event for dropdown
            inputTypeSelector.addEventListener('change', function() {
                updateInputContainer(this.value);
            });

            // Initialize with default value
            updateInputContainer(inputTypeSelector.value);
        }

        // Form handling function
        function initializeFormHandling() {
            const form = document.getElementById('solarEstimationForm');

            if (form) {
                // Set up usage toggle functionality
                setupUsageToggle();

                form.addEventListener('submit', async function(e) {
                    e.preventDefault();

                    try {
                        showStatus('Processing your solar estimation request...', 'info');

                        // Get the selected input type
                        const selectedInputType = document.getElementById('selected_input_type').value;

                        // Calculate annual usage based on selected input type
                        let annualUsageKwh = 0;
                        let inputData = {};
                        let isMonthly = false;
                        let electricityRate = 1.5; // DH per kWh - adjust as needed

                        switch (selectedInputType) {
                            case 'annual_usage':
                                annualUsageKwh = parseFloat(document.getElementById('annual_usage').value) || 0;
                                inputData.annual_usage_kwh = annualUsageKwh;
                                break;

                            case 'annual_cost':
                                const annualCostValue = parseFloat(document.getElementById('annual_cost')
                                    .value) || 0;
                                // Convert cost to kWh using average electricity rate
                                annualUsageKwh = annualCostValue / electricityRate;
                                inputData.annual_cost = annualCostValue;
                                inputData.annual_usage_kwh = annualUsageKwh;
                                break;

                            case 'monthly_usage':
                                isMonthly = true;
                                const monthlyUsageValues = {};
                                const months = ['january', 'february', 'march', 'april', 'may', 'june',
                                    'july', 'august', 'september', 'october', 'november', 'december'
                                ];

                                months.forEach(month => {
                                    const value = parseFloat(document.getElementById(`${month}_usage`)
                                        .value) || 0;
                                    monthlyUsageValues[month] = value;
                                    annualUsageKwh += value;
                                });

                                inputData.monthly_usage = monthlyUsageValues;
                                inputData.annual_usage_kwh = annualUsageKwh;
                                break;

                            case 'monthly_cost':
                                isMonthly = true;
                                const monthlyCostValues = {};
                                let totalAnnualCost = 0;

                                ['january', 'february', 'march', 'april', 'may', 'june',
                                    'july', 'august', 'september', 'october', 'november', 'december'
                                ].forEach(month => {
                                    const cost = parseFloat(document.getElementById(`${month}_cost`)
                                        .value) || 0;
                                    monthlyCostValues[month] = cost;
                                    totalAnnualCost += cost;
                                });

                                annualUsageKwh = totalAnnualCost / electricityRate;
                                inputData.monthly_cost = monthlyCostValues;
                                inputData.annual_cost = totalAnnualCost;
                                inputData.annual_usage_kwh = annualUsageKwh;
                                break;
                        }

                        // Validate annual usage
                        if (!annualUsageKwh) {
                            showStatus('Please enter your energy usage or cost', 'warning');
                            return;
                        }

                        // Get coverage percentage and utility company
                        const coveragePercentage = document.getElementById('coverage_percentage').value;
                        const utilityCompany = document.getElementById('utility_company')?.value || '';

                        // 1. Get address data
                        const addressData = getAddressData();

                        // Validate that we have coordinates
                        if (!addressData.latitude || !addressData.longitude) {
                            showStatus('Please get location information first', 'warning');
                            return;
                        }

                        // Set the values in hidden fields
                        document.getElementById('form_latitude').value = addressData.latitude;
                        document.getElementById('form_longitude').value = addressData.longitude;
                        document.getElementById('form_annual_usage').value = annualUsageKwh;
                        document.getElementById('form_building_floors').value = document.getElementById(
                            'building_floors')?.value || '1';

                        // Add roof type and tilt data
                        const roofType = document.getElementById('roof_type').value;
                        const roofTilt = document.getElementById('roof_tilt').value;
                        
                        // Validate roof type selection
                        if (!roofType) {
                            showStatus('Please select a roof type', 'error');
                            return;
                        }
                        
                        // Validate roof tilt if sloped roof is selected
                        if (roofType === 'sloped' && (!roofTilt || roofTilt < 0 || roofTilt > 90)) {
                            showStatus('Please enter a valid roof tilt angle (0-90 degrees)', 'error');
                            return;
                        }

                        // Add roof type as hidden field
                        if (!document.getElementById('form_roof_type')) {
                            const roofTypeInput = document.createElement('input');
                            roofTypeInput.type = 'hidden';
                            roofTypeInput.id = 'form_roof_type';
                            roofTypeInput.name = 'roof_type';
                            roofTypeInput.value = roofType;
                            form.appendChild(roofTypeInput);
                        } else {
                            document.getElementById('form_roof_type').value = roofType;
                        }

                        // Add roof tilt as hidden field (only if sloped)
                        if (roofType === 'sloped') {
                            if (!document.getElementById('form_roof_tilt')) {
                                const roofTiltInput = document.createElement('input');
                                roofTiltInput.type = 'hidden';
                                roofTiltInput.id = 'form_roof_tilt';
                                roofTiltInput.name = 'roof_tilt';
                                roofTiltInput.value = roofTilt;
                                form.appendChild(roofTiltInput);
                            } else {
                                document.getElementById('form_roof_tilt').value = roofTilt;
                            }
                        } else {
                            // Remove roof tilt field if flat roof
                            const existingTiltInput = document.getElementById('form_roof_tilt');
                            if (existingTiltInput) {
                                existingTiltInput.remove();
                            }
                        }

                        // Add coverage percentage as hidden field
                        if (!document.getElementById('form_coverage_percentage')) {
                            const coverageInput = document.createElement('input');
                            coverageInput.type = 'hidden';
                            coverageInput.id = 'form_coverage_percentage';
                            coverageInput.name = 'coverage_percentage';
                            coverageInput.value = coveragePercentage;
                            form.appendChild(coverageInput);
                        } else {
                            document.getElementById('form_coverage_percentage').value = coveragePercentage;
                        }

                        // Add utility company as hidden field
                        if (!document.getElementById('form_utility_company')) {
                            const utilityInput = document.createElement('input');
                            utilityInput.type = 'hidden';
                            utilityInput.id = 'form_utility_company';
                            utilityInput.name = 'utility_company';
                            utilityInput.value = utilityCompany;
                            form.appendChild(utilityInput);
                        } else {
                            document.getElementById('form_utility_company').value = utilityCompany;
                        }

                        // Add selected input type as hidden field
                        if (!document.getElementById('form_input_type')) {
                            const inputTypeField = document.createElement('input');
                            inputTypeField.type = 'hidden';
                            inputTypeField.id = 'form_input_type';
                            inputTypeField.name = 'input_type';
                            inputTypeField.value = selectedInputType;
                            form.appendChild(inputTypeField);
                        } else {
                            document.getElementById('form_input_type').value = selectedInputType;
                        }

                        // Add input data as JSON
                        if (!document.getElementById('form_input_data')) {
                            const inputDataField = document.createElement('input');
                            inputDataField.type = 'hidden';
                            inputDataField.id = 'form_input_data';
                            inputDataField.name = 'input_data';
                            inputDataField.value = JSON.stringify(inputData);
                            form.appendChild(inputDataField);
                        } else {
                            document.getElementById('form_input_data').value = JSON.stringify(inputData);
                        }

                        // Add is_monthly flag
                        if (!document.getElementById('form_is_monthly')) {
                            const isMonthlyField = document.createElement('input');
                            isMonthlyField.type = 'hidden';
                            isMonthlyField.id = 'form_is_monthly';
                            isMonthlyField.name = 'is_monthly';
                            isMonthlyField.value = isMonthly ? '1' : '0';
                            form.appendChild(isMonthlyField);
                        } else {
                            document.getElementById('form_is_monthly').value = isMonthly ? '1' : '0';
                        }

                        // 2. Capture the roof image
                        const mapElement = document.getElementById('map');
                        const canvas = await html2canvas(mapElement, {
                            useCORS: true,
                            allowTaint: true,
                            scale: 1
                        });

                        // Get map center and dimensions
                        const center = map.getCenter();
                        const zoom = map.getZoom();
                        const scale = calculateScale(zoom, center.lat());

                        // Extract the cadre area
                        const cadreCanvas = document.createElement('canvas');
                        cadreCanvas.width = 300;
                        cadreCanvas.height = 300;

                        const ctx = cadreCanvas.getContext('2d');

                        // Calculate source position (center of original canvas)
                        const sourceX = (canvas.width / 2) - 150; // Center minus half cadre width
                        const sourceY = (canvas.height / 2) - 150; // Center minus half cadre height

                        // Draw the extracted area
                        ctx.drawImage(
                            canvas,
                            sourceX, sourceY, 300, 300, // Source rectangle
                            0, 0, 300, 300 // Destination rectangle
                        );

                        // Convert to data URL
                        const roofImageDataUrl = cadreCanvas.toDataURL('image/png');

                        // Calculate cadre bounds in real-world coordinates
                        const cadreBounds = calculateCadreBounds(center, scale);

                        // 3. Collect form data
                        const formData = {
                            customer: {
                                first_name: document.getElementById('first_name')?.value || '',
                                last_name: document.getElementById('last_name')?.value || '',
                                email: document.getElementById('email')?.value || ''
                            },
                            address: addressData,
                            energy_usage: {
                                annual_usage_kwh: annualUsageKwh,
                                utility_company: utilityCompany,
                                coverage_percentage: coveragePercentage,
                                energy_usage_type: selectedInputType,
                                energy_usage_data: inputData
                            },
                            building_info: {
                                floors: document.getElementById('building_floors')?.value || '1',
                                roof_type: document.getElementById('roof_type')?.value || '',
                                roof_tilt: document.getElementById('roof_tilt')?.value || null
                            },
                            roof_capture: {
                                image_data_url: roofImageDataUrl,
                                center_lat: center.lat(),
                                center_lng: center.lng(),
                                zoom_level: zoom,
                                scale_meters_per_pixel: scale,
                                cadre_bounds: cadreBounds,
                                cadre_size_pixels: {
                                    width: 300,
                                    height: 300
                                },
                                cadre_size_meters: {
                                    width: 300 * scale,
                                    height: 300 * scale
                                },
                                timestamp: new Date().toISOString()
                            }
                        };

                        // 4. Create hidden field for sending data to the backend
                        const formDataInput = document.createElement('input');
                        formDataInput.type = 'hidden';
                        formDataInput.name = 'estimation_data';
                        formDataInput.value = JSON.stringify(formData);
                        form.appendChild(formDataInput);

                        // 5. Submit the form to the backend
                        form.submit();

                    } catch (error) {
                        console.error('Error processing form:', error);
                        showStatus('An error occurred while processing your request', 'error');
                    }
                });
            }
        }

        // Roof Type Selection Function
        function selectRoofType(type) {
            // Remove selected class from all options
            document.querySelectorAll('.roof-type-option').forEach(option => {
                option.classList.remove('selected');
            });
            
            // Add selected class to clicked option
            document.querySelector(`[data-roof-type="${type}"]`).classList.add('selected');
            
            // Set the hidden input value
            document.getElementById('roof_type').value = type;
            
            // Show/hide roof tilt input based on selection
            const roofTiltContainer = document.getElementById('roofTiltContainer');
            if (type === 'sloped') {
                roofTiltContainer.classList.add('show');
                document.getElementById('roof_tilt').required = true;
            } else {
                roofTiltContainer.classList.remove('show');
                document.getElementById('roof_tilt').required = false;
                document.getElementById('roof_tilt').value = '';
            }
        }

        // Utility functions
        function showStatus(message, type) {
            const status = document.getElementById('formStatus');
            if (!status) return;

            const typeClasses = {
                info: 'bg-blue-100 border-l-4 border-blue-500 text-blue-700',
                warning: 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700',
                error: 'bg-red-100 border-l-4 border-red-500 text-red-700',
                success: 'bg-green-100 border-l-4 border-green-500 text-green-700'
            };

            status.className = `mt-4 p-4 ${typeClasses[type] || typeClasses.info} rounded-lg text-center`;
            status.textContent = message;
            status.classList.remove('hidden');

            // Auto-hide after 5 seconds
            setTimeout(() => {
                status.classList.add('hidden');
            }, 5000);
        }
    </script>
@endpush
