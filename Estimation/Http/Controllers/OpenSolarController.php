<?php

namespace Modules\Estimation\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class OpenSolarController extends Controller
{
    private $apiBaseUrl = 'https://api.opensolar.com/api';
    private $bearerToken = 's_FHEK4M3JQGCRWDY4CJ6RRWRMTCI6M5DR';
    private $orgId = '177619';

    /**
     * Make API request to OpenSolar
     */
    private function makeApiRequest($endpoint, $method = 'GET', $data = null)
    {
        $url = $this->apiBaseUrl . $endpoint;

        Log::info('OpenSolar API Request', [
            'url' => $url,
            'method' => $method,
            'data' => $data
        ]);

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->bearerToken,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ]);

            if ($method === 'POST') {
                $response = $response->post($url, $data);
            } elseif ($method === 'PUT') {
                $response = $response->put($url, $data);
            } else {
                $response = $response->get($url);
            }

            Log::info('OpenSolar API Response', [
                'status' => $response->status(),
                'body' => $response->json()
            ]);

            if ($response->successful()) {
                return $response->json();
            } else {
                Log::error('OpenSolar API Error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);

                return [
                    'error' => true,
                    'message' => 'API request failed',
                    'details' => $response->json(),
                    'status' => $response->status()
                ];
            }
        } catch (\Exception $e) {
            Log::error('OpenSolar API Exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'error' => true,
                'message' => 'API request failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get roof types
     */
    public function getRoofTypes()
    {
        $result = $this->makeApiRequest('/roof_types/');
        return response()->json($result);
    }

    /**
     * Create new project with expanded data structure
     */
    public function createProject(Request $request)
    {

        // Validate the incoming estimation data from the form
        // $validator = Validator::make($request->all(), [
        //     'estimation_data' => 'required|json',
        // ]);

        // if ($validator->fails()) {
        //     return response()->json([
        //         'error' => true,
        //         'message' => 'Validation failed',
        //         'errors' => $validator->errors()
        //     ], 422);
        // }

        // try {
        //     // Parse the estimation data JSON
        //     $data = json_decode($request->input('estimation_data'), true);

        //     // Validate essential components of parsed data
        //     if (!isset($data['address'], $data['roof_capture'], $data['roof_capture']['image_data_url'])) {
        //         return response()->json([
        //             'error' => true,
        //             'message' => 'Missing required estimation data',
        //         ], 422);
        //     }

        // // Extract roof image from data URL
        // $roofImageDataUrl = $data['roof_capture']['image_data_url'];
        // $encodedImg = substr($roofImageDataUrl, strpos($roofImageDataUrl, ',') + 1);
        // $decodedImg = base64_decode($encodedImg);

        // // Create a temporary file for the image
        // $tempFile = tempnam(sys_get_temp_dir(), 'roof_image');
        // file_put_contents($tempFile, $decodedImg);

        // // Step 1: Send to API to get roof polygon
        // $response = Http::attach(
        //     'roof_image',
        //     file_get_contents($tempFile),
        //     'roof_image.png'
        // )->post('sam/api', [ // Replace with actual API endpoint when available
        //     'latitude' => $data['address']['latitude'],
        //     'longitude' => $data['address']['longitude'],
        //     'zoom_level' => $data['roof_capture']['zoom_level'],
        //     'scale_meters_per_pixel' => $data['roof_capture']['scale_meters_per_pixel'],
        // ]);
        // // Clean up temp file
        // unlink($tempFile);

        // if (!$response->successful()) {
        //     return response()->json([
        //         'error' => true,
        //         'message' => 'Failed to process roof image',
        //         'details' => $response->json() ?: $response->body()
        //     ], 500);
        // }

        // // Get roof polygon from response
        // $roofPolygon = [
        //     ['lat' => 34.000, 'lng' => -117.000],
        //     ['lat' => 34.000, 'lng' => -116.999],
        //     ['lat' => 33.999, 'lng' => -116.999],
        //     ['lat' => 33.999, 'lng' => -117.000]
        // ];

        // // here we need to send the polygon to panelplacement method and get a response

        // Log::info('Roof polygon retrieved successfully', [
        //     'polygon' => $roofPolygon
        // ]);

        // Step 2: Get user data for the project
        // $user = auth()->user();
        // $firstName = '';
        // $lastName = '';
        // $email = '';

        // if ($user) {
        //     // If user is logged in, use their details
        //     $nameParts = explode(' ', $user->name, 2);
        //     $firstName = $nameParts[0] ?? '';
        //     $lastName = $nameParts[1] ?? '';
        //     $email = $user->email;
        // } elseif (isset($data['customer']) && isset($data['customer']['first_name'])) {
        //     // Use customer data from form if available
        //     $firstName = $data['customer']['first_name'] ?? '';
        //     $lastName = $data['customer']['last_name'] ?? '';
        //     $email = $data['customer']['email'] ?? '';
        // } else {
        //     // Default values if no user data is available
        //     $firstName = 'Website';
        //     $lastName = 'Visitor';
        //     $email = 'no-reply@example.com';
        // }


        // // Step 3: Map data to OpenSolar API format
        // $projectData = [
        //     // Project identifier using timestamp and random string for uniqueness
        //     'identifier' => $firstName . ' ' . $lastName . ' ' . date('Y-m-d') . ' ' . substr(md5(rand()), 0, 6),

        //     // Default to residential
        //     'is_residential' => 1,

        //     // Customer notes and additional information
        //     'lead_source' => 'Website Estimation Tool',
        //     'notes' => $this->buildNotesFromData([
        //         'energy_usage' => $data['energy_usage'],
        //         'building_info' => $data['building_info'] ?? [],
        //     ]),

        //     // Property location
        //     'lat' => $data['address']['latitude'],
        //     'lon' => $data['address']['longitude'],
        //     'address' => $data['address']['street'],
        //     'locality' => $data['address']['city'],
        //     'state' => $data['address']['state'],
        //     'country_iso2' => $this->mapCountryToISO2($data['address']['country']),
        //     'zip' => $data['address']['zip_code'],

        //     // Technical details - default to single phase for residential
        //     'number_of_phases' => 1,

        //     // Default roof type if not specified
        //     'roof_type' => $this->mapRoofMaterialToUrl('asphalt'),

        //     // Energy usage data from form
        //     'usage_annual_or_guess' => $data['energy_usage']['annual_usage_kwh'] ?? null,

        //     // Add the roof polygon data from API response
        //     'roof_polygon' => $roofPolygon,



        //     // Map contact information
        //     'contacts_new' => [
        //         [
        //             'first_name' => $firstName,
        //             'family_name' => $lastName,
        //             'email' => $email,
        //         ]
        //     ],

        //     'modules' => [
        //         [
        //             'manufacturer_name' => 'LG Electronics',
        //             'model' => 'LG400N2W-A5',
        //             'quantity' => 25,
        //             'watts_stc' => 400
        //         ]
        //     ],

        //     // Static inverter data
        //     'inverters' => [
        //         [
        //             'manufacturer_name' => 'SolarEdge',
        //             'model' => 'SE10000H-US',
        //             'quantity' => 1
        //         ]
        //     ],

        //     // Static system specifications
        //     'auto_string' => true,
        //     'kw_stc' => 10.0,
        //     'module_quantity' => 25,
        //     'dc_optimizer_active' => true,
        //     'output_annual_kwh' => 14000,
        // ];

        // $existingContact = $this->findContactByEmail($email);

        // If contact exists, reference them instead of creating new
        // if ($existingContact) {
        //     $projectData['contacts'] = [
        //         $existingContact['url'] // Use the URL from the contact object
        //     ];
        //     // Remove the contacts_new field
        //     unset($projectData['contacts_new']);
        // }

        // $data = '{
        //             "project_id": "PROJECT_ID",
        //             "surfaces": [
        //             {
        //                 "name": "South Roof",
        //                 "polygon": [
        //                 {"lat": 34.000, "lng": -117.000},
        //                 {"lat": 34.000, "lng": -116.999},
        //                 {"lat": 33.999, "lng": -116.999},
        //                 {"lat": 33.999, "lng": -117.000}
        //                 ],
        //                 "azimuth": 180,
        //                 "tilt": 20,
        //                 "surface_type": "ROOF"
        //             }
        //             ],
        //             "pv_module_id": "MODULE_ID"
        //         }';
        // $systemdata = [
        //     'modules' => [
        //         [
        //             'manufacturer_name' => 'LG Electronics',
        //             'model' => 'LG400N2W-A5',
        //             'quantity' => 25,
        //             'watts_stc' => 400
        //         ]
        //     ],
        //     'inverters' => [
        //         [
        //             'manufacturer_name' => 'SolarEdge',
        //             'model' => 'SE10000H-US',
        //             'quantity' => 1
        //         ]
        //     ],
        //     'auto_string' => true,
        //     'kw_stc' => 10.0,
        //     'module_quantity' => 25,
        //     'dc_optimizer_active' => true,
        //     'output_annual_kwh' => 14000,
        // ]; // Static module/panel data


        //    $panelPlacement = $this->panelPlacement();

        // Clean up empty values
        //     $projectData = array_filter($projectData, function ($value) {
        //         return $value !== '' && $value !== null;
        //     });

        //     Log::info('Creating OpenSolar project with mapped data', $projectData);

        //     // Step 4: Send to OpenSolar API
        //     $result = $this->makeApiRequest("/orgs/{$this->orgId}/projects/", 'POST', $projectData);

        //     if (isset($result['error']) && $result['error']) {
        //         return response()->json([
        //             'error' => true,
        //             'message' => 'Failed to create project in OpenSolar',
        //             'details' => $result
        //         ], 500);
        //     }
        $systemDesignResult = $this->createSystemDesign();

        return response()->json([
            'data' => $systemDesignResult
        ]);
        //     // Return success with project data
        //     return response()->json([
        //         'success' => true,
        //         'message' => 'Solar project created successfully',
        //         'project' => $result
        //     ], 200);
        // } catch (\Exception $e) {
        //     Log::error('Error creating project', [
        //         'message' => $e->getMessage(),
        //         'trace' => $e->getTraceAsString()
        //     ]);

        //     return response()->json([
        //         'error' => true,
        //         'message' => 'An error occurred while creating your solar project',
        //         'details' => $e->getMessage()
        //     ], 500);
        // }
    }

    public function createSystemDesign()
    {
        // try {
        // Get the project ID from the created project
        $projectId = 7281479;

        if (!$projectId) {
            return [
                'error' => true,
                'message' => 'No project ID found'
            ];
        }

        // Simple system payload with static data
        $systemPayload = [
            'project_id' => $projectId,
            'surfaces' => [
                [
                    'name' => 'Main Roof',
                    'polygon' => [
                        ['lat' => 34.000, 'lng' => -117.000],
                        ['lat' => 34.000, 'lng' => -116.999],
                        ['lat' => 33.999, 'lng' => -116.999],
                        ['lat' => 33.999, 'lng' => -117.000]
                    ],
                    'azimuth' => 180,
                    'tilt' => 20,
                    'surface_type' => 'ROOF'
                ]
            ],
            'pv_module_id' => 'e8472baf-5e31-4038-8778-d99ce0439b9c',
            'auto_string' => true
        ];

        Log::info('Creating system design', $systemPayload);

        // Make API request to create system
        // $result = Http::withHeaders([
        //     'Authorization' => 'Bearer ' . $this->bearerToken,
        //     'Content-Type' => 'application/json',
        //     'Accept' => 'application/json',
        //     'X-Requested-With' => 'XMLHttpRequest',
        // ])->patch($this->apiBaseUrl . "/orgs/{$this->orgId}/projects/{$projectId}/systems/details", $systemPayload);

        // if ($result->successful()) {
        //     Log::info('System created successfully', $result->json());
        //     return $result->json();
        // } else {
        //     Log::error('Failed to create system', [
        //         'status' => $result->status(),
        //         'response' => $result->body()
        //     ]);
        //     return [
        //         'error' => true,
        //         'message' => 'Failed to create system',
        //         'details' => $result->body()
        //     ];
        // }
        // } catch (\Exception $e) {
        //     Log::error('Exception during system creation', [
        //         'message' => $e->getMessage()
        //     ]);

        //     return [
        //         'error' => true,
        //         'message' => 'Exception: ' . $e->getMessage()
        //     ];
        // }

        $payload = [
            'org_id' => (int)$this->orgId,    // Must be an integer
            'exp' => time() + 3600,           // 1 hour expiration
            'iat' => time(),                  // Issued at time
            'jti' => uniqid(),                // Unique identifier for this token
            'user_id' => 1234,                // A user ID - replace with a real one if available
            'scopes' => ['project:edit', 'system:edit'] // Add required scopes
        ];

        // Make sure you're using the correct secret key
        $osToken = JWT::encode($payload, 'jV-Lv0t4oTxkb8N09O2Pf64LXky6CkDTfik6j4FMj9w', 'HS256');

        return view('site.testsystemcreation', [
            'data' => $systemPayload,
            'osToken' => $osToken,
            'orgId' => (int)$this->orgId  // Make sure this is an integer
        ]);
    }
    public function getJwtToken()
    {
        $payload = [
            'org_id' => (int)$this->orgId,
            'exp' => time() + 3600,
            'iat' => time(),
            'jti' => uniqid(),
            'user_id' => 1234,
            'scopes' => ['project:edit', 'system:edit']
        ];

        $osToken = JWT::encode($payload, 'jV-Lv0t4oTxkb8N09O2Pf64LXky6CkDTfik6j4FMj9w', 'HS256');

        return response()->json([
            'token' => $osToken,
            'org_id' => (int)$this->orgId
        ]);
    }

    private function findContactByEmail($email)
    {
        // Get all contacts since the API doesn't properly filter
        $result = $this->makeApiRequest("/orgs/{$this->orgId}/contacts/");

        // If we have a valid array response
        if (is_array($result)) {
            // Manually filter to find the contact with matching email
            foreach ($result as $contact) {
                if (isset($contact['email']) && strtolower($contact['email']) === strtolower($email)) {
                    return $contact;
                }
            }
        }

        return null;
    }
    /**
     * Create a panel placement design via the OpenSolar API
     *
     * @param string|null $projectId The project ID (defaults to latest project if null)
     * @param array|null $surfaces Array of surface definitions (defaults to standard roof)
     * @param string|null $moduleId The PV module ID to use
     * @return array The API response
     */
    public function panelPlacement($projectId = 7214298, $surfaces = null, $moduleId = null)
    {

        try {
            // If project ID not provided, use the latest created project
            if (!$projectId) {
                $projects = $this->makeApiRequest("/orgs/{$this->orgId}/projects/");
                if (is_array($projects) && !empty($projects)) {
                    $projectId = $projects[0]['id'] ?? null;
                }
            }

            // If no project ID was found, return error
            if (!$projectId) {
                return [
                    'error' => true,
                    'message' => 'No project ID provided or found'
                ];
            }

            // Default surfaces if none provided
            if (!$surfaces) {
                $surfaces = [
                    [
                        'name' => 'Main Roof',
                        'polygon' => [
                            ['lat' => 34.04331837536283, 'lng' => -4.999822281138857],
                            ['lat' => 34.04331837536283, 'lng' => -4.999747981138857],
                            ['lat' => 34.04324307536283, 'lng' => -4.999747981138857],
                            ['lat' => 34.04324307536283, 'lng' => -4.999822281138857]
                        ],
                        'azimuth' => 180, // South facing
                        'tilt' => 20,     // 20 degree tilt
                        'surface_type' => 'ROOF'
                    ]
                ];
            }

            // Default module ID if none provided (use common PV module)
            if (!$moduleId) {
                $moduleId = 'e8472baf-5e31-4038-8778-d99ce0439b9c'; // Default module ID
            }

            // Build request payload
            $payload = [
                'project_id' => $projectId,
                "auto_string" => true,
                'surfaces' => $surfaces,
                'pv_module_id' => $moduleId
            ];

            Log::info('Creating panel placement design', $payload);

            // Make API request to systems endpoint using the correct path
            $result = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->bearerToken,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])->post($this->apiBaseUrl . "/orgs/{$this->orgId}/systems/", $payload);

            if ($result->successful()) {
                $response = $result->json();
                Log::info('Panel placement created successfully', [
                    'design_id' => $response['id'] ?? null,
                    'panel_count' => $response['panel_count'] ?? 0
                ]);
                return $response;
            } else {
                Log::error('Failed to create panel placement', [
                    'status' => $result->status(),
                    'response' => $result->body()
                ]);
                return [
                    'error' => true,
                    'message' => 'Failed to create panel placement',
                    'details' => $result->json() ?: $result->body(),
                    'status' => $result->status()
                ];
            }
        } catch (\Exception $e) {
            Log::error('Exception during panel placement creation', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return [
                'error' => true,
                'message' => 'Exception during panel placement creation: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Build detailed notes from additional data
     */
    private function buildNotesFromData($data)
    {
        $notes = [];

        // Add system design details
        if (isset($data['system_design'])) {
            $sd = $data['system_design'];
            $notes[] = "System Design:";
            $notes[] = "- System Size: " . ($sd['system_size_kw'] ?? 'N/A') . " kW";
            $notes[] = "- Panel Count: " . ($sd['panel_count'] ?? 'N/A');
            $notes[] = "- Panel Model: " . ($sd['panel_model'] ?? 'N/A') . " (" . ($sd['panel_wattage'] ?? 'N/A') . "W)";
            $notes[] = "- Inverter: " . ($sd['inverter_type'] ?? 'N/A') . " - " . ($sd['inverter_model'] ?? 'N/A');
            $notes[] = "- Mounting: " . ($sd['mounting_type'] ?? 'N/A');
        }

        // Add property details
        if (isset($data['property'])) {
            $prop = $data['property'];
            $notes[] = "\nProperty Details:";
            $notes[] = "- Roof Material: " . ($prop['roof_material'] ?? 'N/A');
            $notes[] = "- Roof Age: " . ($prop['roof_age'] ?? 'N/A') . " years";
            $notes[] = "- Building Stories: " . ($prop['building_stories'] ?? 'N/A');
            $notes[] = "- Square Footage: " . ($prop['square_footage'] ?? 'N/A') . " sq ft";
        }

        // Add energy usage
        if (isset($data['energy_usage'])) {
            $eu = $data['energy_usage'];
            $notes[] = "\nEnergy Usage:";
            $notes[] = "- Annual Usage: " . ($eu['annual_usage_kwh'] ?? 'N/A') . " kWh";
            $notes[] = "- Annual Cost: $" . ($eu['annual_cost'] ?? 'N/A');
            $notes[] = "- Utility Company: " . ($eu['utility_company'] ?? 'N/A');
            $notes[] = "- Meter Number: " . ($eu['meter_number'] ?? 'N/A');
        }

        // Add pricing info
        if (isset($data['pricing'])) {
            $p = $data['pricing'];
            $notes[] = "\nPricing:";
            $notes[] = "- Total Project Cost: $" . ($p['total_project_cost'] ?? 'N/A');
            $notes[] = "- Cost Per Watt: $" . ($p['cost_per_watt'] ?? 'N/A') . "/W";
        }

        // Add production estimates
        if (isset($data['production'])) {
            $prod = $data['production'];
            $notes[] = "\nProduction Estimates:";
            $notes[] = "- Annual Production: " . ($prod['annual_production_kwh'] ?? 'N/A') . " kWh";
            $notes[] = "- Annual Value: $" . ($prod['annual_production_value'] ?? 'N/A');
            $notes[] = "- Performance Ratio: " . ($prod['performance_ratio'] ?? 'N/A');
        }

        return implode("\n", $notes);
    }

    /**
     * Map country name to ISO2 code
     */
    private function mapCountryToISO2($country)
    {
        $countryMap = [
            'USA' => 'US',
            'United States' => 'US',
            'Canada' => 'CA',
            'Australia' => 'AU',
            'United Kingdom' => 'GB',
            'Morocco' => 'MA',
            'Maroc' => 'MA',
            // Add more countries as needed
        ];

        return $countryMap[$country] ?? substr($country, 0, 2);
    }

    /**
     * Map roof material to OpenSolar roof type URL
     * Based on the API response of available roof types
     */
    private function mapRoofMaterialToUrl($roofMaterial)
    {
        $roofMaterialMap = [
            'asphalt' => 'https://api.opensolar.com/api/roof_types/6/', // Composition / Asphalt Shingle
            'composition' => 'https://api.opensolar.com/api/roof_types/6/', // Composition / Asphalt Shingle
            'concrete' => 'https://api.opensolar.com/api/roof_types/20/', // Tile Concrete
            'flat concrete' => 'https://api.opensolar.com/api/roof_types/7/', // Flat Concrete
            'flat foam' => 'https://api.opensolar.com/api/roof_types/8/', // Flat Foam
            'metal' => 'https://api.opensolar.com/api/roof_types/14/', // Metal Standing Seam
            'metal standing seam' => 'https://api.opensolar.com/api/roof_types/14/', // Metal Standing Seam
            'metal shingle' => 'https://api.opensolar.com/api/roof_types/13/', // Metal Shingle
            'metal stone coated' => 'https://api.opensolar.com/api/roof_types/15/', // Metal Stone Coated
            'metal tin' => 'https://api.opensolar.com/api/roof_types/16/', // Metal Tin
            'membrane' => 'https://api.opensolar.com/api/roof_types/9/', // Membrane EPDM
            'membrane epdm' => 'https://api.opensolar.com/api/roof_types/9/', // Membrane EPDM
            'membrane pvc' => 'https://api.opensolar.com/api/roof_types/10/', // Membrane PVC
            'membrane tpo' => 'https://api.opensolar.com/api/roof_types/11/', // Membrane TPO
            'clay' => 'https://api.opensolar.com/api/roof_types/19/', // Tile Clay
            'tile clay' => 'https://api.opensolar.com/api/roof_types/19/', // Tile Clay
            'slate' => 'https://api.opensolar.com/api/roof_types/21/', // Tile Slate
            'tile slate' => 'https://api.opensolar.com/api/roof_types/21/', // Tile Slate
            'rolled asphalt' => 'https://api.opensolar.com/api/roof_types/25/', // Rolled Asphalt
            'tar and gravel' => 'https://api.opensolar.com/api/roof_types/17/', // Tar and Gravel / Bitumen
            'bitumen' => 'https://api.opensolar.com/api/roof_types/17/', // Tar and Gravel / Bitumen
            'thatched' => 'https://api.opensolar.com/api/roof_types/18/', // Thatched
            'trapezoidal' => 'https://api.opensolar.com/api/roof_types/26/', // Trapezoidal
            'kliplock' => 'https://api.opensolar.com/api/roof_types/24/', // Kliplock
        ];

        // Normalize input to lowercase for case-insensitive matching
        $normalizedMaterial = strtolower(trim($roofMaterial));

        // Return the mapped URL or default to "Other" if no match found
        return $roofMaterialMap[$normalizedMaterial] ?? 'https://api.opensolar.com/api/roof_types/23/';
    }

    /**
     * List all projects
     */
    public function listProjects()
    {
        $result = $this->makeApiRequest("/orgs/{$this->orgId}/projects/");

        // If it's an array response, return it directly for use in controllers
        if (is_array($result)) {
            return $result;
        }

        return response()->json($result);
    }

    /**
     * Get comprehensive project data from OpenSolar API
     */
    public function getProjectData($projectId)
    {
        try {
            // Prepare headers for API requests
            $headers = [
                'Authorization' => 'Bearer ' . $this->bearerToken,
                'Accept' => 'application/json',
                'Content-Type' => 'application/json'
            ];

            // 1. Get basic project information
            $projectData = Http::withHeaders($headers)
                ->get("{$this->apiBaseUrl}/orgs/{$this->orgId}/projects/{$projectId}/systems/details");
            // dd($projectData->body()); // Debugging line to inspect the project data
            // System Technical Specifications
            $systemSpecs = [];
            if (!empty($projectData['systems'][0])) {
                $system = $projectData['systems'][0];
                $systemSpecs = [
                    'size_kw' => $system['kw_stc'] ?? null,
                    'panel_count' => $system['module_quantity'] ?? null,
                    'annual_generation_kwh' => $system['output_annual_kwh'] ?? null,
                    'consumption_offset_percentage' => $system['consumption_offset_percentage'] ?? null,
                    'price_including_tax' => $system['price_including_tax'] ?? null,
                    'price_excluding_tax' => $system['price_excluding_tax'] ?? null,
                    'net_profit' => $system['net_profit'] ?? null,
                    'co2_tons_lifetime' => $system['co2_tons_lifetime'] ?? null,
                    'system_lifetime' => $system['system_lifetime'] ?? 25, // Default to 25 years if not specified
                    'uuid' => $system['uuid'] ?? null,
                    'system_id' => $system['id'] ?? null,
                    'module_details' => $this->extractModuleDetails($system['modules'] ?? []),
                ];
            }

            // Financial Data - get from available_customer_actions
            $totalPrice = null;
            $selectedSystemTitle = null;
            $selectedSystemSummary = null;
            if (isset($projectData['available_customer_actions'][0]['actions_available'][0])) {
                $action = $projectData['available_customer_actions'][0]['actions_available'][0];
                $totalPrice = $action['total_price_payable'] ?? null;
                $selectedSystemTitle = $action['selected_system_title'] ?? null;
                $selectedSystemSummary = $action['selected_system_summary'] ?? null;
            }

            // Financial Analysis - build from configuration and system data
            $financialAnalysis = [
                'system_price' => $totalPrice ?? ($systemSpecs['price_including_tax'] ?? null),
                'net_system_price' => $systemSpecs['price_excluding_tax'] ?? $totalPrice,
                'energy_cost_increase_rate' => $projectData['configuration']['utility_inflation_annual'] ?? 3.0,
                'discount_rate' => $projectData['configuration']['discount_rate'] ?? 6.75,
                'simulation_years' => $projectData['years_to_simulate'] ?? 20,
                'annual_production_kwh' => $systemSpecs['annual_generation_kwh'] ?? null,
                'consumption_offset_percentage' => $systemSpecs['consumption_offset_percentage'] ?? null,
            ];

            // Parse usage data
            $usageData = null;
            if (isset($projectData['usage']) && !empty($projectData['usage'])) {
                // Usage is stored as a JSON string in the response
                if (is_string($projectData['usage'])) {
                    $usageData = json_decode($projectData['usage'], true);
                } else {
                    $usageData = $projectData['usage'];
                }
            }

            // Extract monthly usage values
            $monthlyUsage = [];
            if ($usageData && isset($usageData['normalized']['monthly']) && is_array($usageData['normalized']['monthly'])) {
                $months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                foreach ($usageData['normalized']['monthly'] as $index => $value) {
                    if ($index < 12) {
                        $monthlyUsage[] = [
                            'month' => $months[$index],
                            'usage_kwh' => round($value, 2),
                        ];
                    }
                }
            }

            // Environmental Impact
            $environmentalImpact = [
                'co2_avoided_lifetime_tons' => $systemSpecs['co2_tons_lifetime'] ?? null,
            ];

            // Basic Info from contacts data
            $customerName = null;
            $customerEmail = null;
            if (isset($projectData['contacts_data'][0])) {
                $contact = $projectData['contacts_data'][0];
                $customerName = trim(($contact['first_name'] ?? '') . ' ' . ($contact['family_name'] ?? ''));
                $customerEmail = $contact['email'] ?? null;
            }

            // Assigned role information
            $preparedByName = $projectData['assigned_role_name'] ?? null;
            $preparedByEmail = $projectData['assigned_role_email'] ?? null;
            $preparedByPhone = $projectData['assigned_role_phone'] ?? null;

            // System image URL
            $systemImageUrl = null;
            if (isset($systemSpecs['uuid'])) {
                $systemImageUrl = "https://app.opensolar.com/projects/{$projectId}/systems/{$systemSpecs['uuid']}/view";
            }

            // Complete structured data
            $completeProposalData = [
                'basic_info' => [
                    'prepared_by' => [
                        'name' => $preparedByName,
                        'email' => $preparedByEmail,
                        'phone' => $preparedByPhone,
                    ],
                    'customer' => [
                        'name' => $customerName ?: 'None',
                        'email' => $customerEmail ?: 'None',
                    ],
                    'quote_number' => $projectData['id'] ?? null,
                    'title' => $projectData['title'] ?? null,
                    'identifier' => $projectData['identifier'] ?? null,
                    'location' => [
                        'address' => $projectData['address'] ?? null,
                        'city' => $projectData['locality'] ?? null,
                        'state' => $projectData['state'] ?? null,
                        'country' => $projectData['country_name'] ?? null,
                        'zip' => $projectData['zip'] ?? null,
                        'coordinates' => [
                            'latitude' => $projectData['lat'] ?? null,
                            'longitude' => $projectData['lon'] ?? null,
                        ]
                    ],
                    'created_date' => $projectData['created_date'] ?? null,
                    'modified_date' => $projectData['modified_date'] ?? null,
                ],
                'system_specs' => $systemSpecs,
                'system_details' => [
                    'title' => $selectedSystemTitle,
                    'summary' => $selectedSystemSummary,
                    'image_url' => $systemImageUrl,
                    'roof_type' => $projectData['roof_type_name'] ?? null,
                ],
                'financial_analysis' => $financialAnalysis,
                'usage_data' => [
                    'annual_usage_kwh' => $projectData['usage_annual_or_guess'] ?? null,
                    'monthly_usage' => $monthlyUsage,
                ],
                'environmental_impact' => $environmentalImpact,
                'configuration' => [
                    'performance_adjustment' => $projectData['configuration']['performance_adjustment'] ?? 100.0,
                    'utility_inflation' => $projectData['configuration']['utility_inflation_annual'] ?? 3.0,
                    'discount_rate' => $projectData['configuration']['discount_rate'] ?? 6.75,
                    'system_losses' => $this->calculateSystemLosses($projectData['configuration'] ?? []),
                ],
            ];

            // dd($completeProposalData); // Debugging line to inspect the complete proposal data
            return $completeProposalData;
        } catch (\Exception $e) {
            Log::error('Error fetching OpenSolar project data', [
                'project_id' => $projectId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Extract module details from system data
     */
    private function extractModuleDetails($modules)
    {
        $details = [];

        foreach ($modules as $module) {
            $details[] = [
                'manufacturer' => $module['manufacturer_name'] ?? null,
                'model' => $module['code'] ?? null,
                'quantity' => $module['quantity'] ?? 0,
            ];
        }

        return $details;
    }

    /**
     * Calculate system losses from configuration
     */
    private function calculateSystemLosses($configuration)
    {
        $losses = [
            'soiling' => $configuration['sam_string_soiling'] ?? null,
            'dc_wiring' => $configuration['sam_string_dc_wiring'] ?? null,
            'mismatch' => $configuration['sam_string_mismatch'] ?? null,
            'ac_wiring' => $configuration['sam_ac_wiring'] ?? null,
            'nameplate' => $configuration['sam_nameplate'] ?? null,
            'connections' => $configuration['sam_diodes_and_connections'] ?? null,
        ];

        // Calculate total losses (simplified addition)
        $totalLoss = array_sum($losses);

        return [
            'components' => $losses,
            'total' => $totalLoss
        ];
    }
}
