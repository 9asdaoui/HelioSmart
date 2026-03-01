Understanding the "Time of Use" (ToU) Hybrid Model
In Morocco, the ONEE (Office National de l'Electricité) and local distributors (like Lydec or Amendis) often use tiered pricing.
The Concept: Electricity costs more during "Peak Hours" (usually evening) and less during "Off-Peak" (late night).
The Hybrid Approach: Since solar only produces during the day, a Hybrid Model calculates the ROI by combining Solar + Battery Storage + Grid.
The AI's Role: Your system shouldn't just say "you save 1000 DH." It should say: "By installing a 5kW battery, you can store the midday sun and use it during the 6 PM - 9 PM peak tariff, increasing your ROI by 25%."
2. Technical Pipeline: The Vision Stack
To calculate roof polygons and detect obstacles, you need a multi-stage AI approach.
Step A: Roof Segmentation & Polygon Extraction
You need to isolate the roof from the ground and turn it into a mathematical shape.
Top Model Choice: Mask R-CNN or Segment Anything Model (SAM) by Meta.
Why: SAM is incredible at "Zero-Shot" segmentation. You can feed it a satellite crop, and it will perfectly outline the roof boundary.
Next Step: Use OpenCV to convert the mask into a simplified polygon. This allows you to calculate the total area in square meters (
) using the image's Ground Sample Distance (GSD).
Step B: Obstacle Detection (The "Moroccan Roof" Problem)
You must subtract "no-go zones" like chimneys, satellite dishes, and laundry areas.
Top Model Choice: YOLOv8 (You Only Look Once) or YOLOv10.
Functionality: Train a custom YOLO model on a dataset of Moroccan rooftops. It can detect "bounding boxes" around obstacles.
Refinement: Use PointRend to get precise edges of these obstacles so you can "subtract" them from your main roof polygon.
Step C: Shading & Orientation Analysis
The Model: DeepLabV3+ or a specialized Height Estimation Model (if using stereo-imagery).
Logic: Even if a spot is empty, if it's north of a high wall (parapet), it will be in the shade. You need code to calculate "Shadow Casting" based on the wall height and the sun's angle in cities like Casablanca or Marrakech at different times of the year.
3. Step-by-Step Technical Workflow
Input: User enters an address 
 Fetch High-Res Satellite Image (Google Maps Static API or Mapbox).
Segmentation: SAM outlines the roof.
Obstacle Mapping: YOLOv8 identifies dishes, vents, and walls.
Usable Area Calculation:

(Note: Moroccan law often requires a 0.5m - 1m walkway around the edge for maintenance).
Panel Fitting (The Tiling Algorithm): This is a geometric optimization problem (not just AI). Use a Rectangle Packing Algorithm to see how many standard panels (e.g., 
) fit into the irregular polygon.
Energy Yield: Use the PVLib Python library to cross-reference the coordinates with Morocco's historical solar irradiation data (GHI).

###################################################

The "Low-Work" Technical Stack
You do not need to fine-tune YOLO from scratch. Instead, use a combination of pre-trained models and commercial APIs that have already done the hard work.
For Roof Outlining: Use Segment Anything Model (SAM 2.1). It is "zero-shot," meaning it already knows what a roof looks like globally. You just give it a point or box on a satellite image, and it returns a precise mask.
For Obstacles (Satellite dishes, vents): Instead of training YOLO, use a pre-trained YOLOv8 or YOLOv11 model from repositories like Roboflow Universe. Search for "solar obstacle" or "rooftop objects" datasets—thousands of developers have already labeled these for you.
The "Cheat Code" (Google Solar API): Check the Google Maps Solar API. It provides pre-calculated building insights, including roof size, slope, and even shading masks. If it covers your target Moroccan cities (like Casablanca or Rabat), you can skip 90% of the AI work and just call their API for a few cents per request. 
ijasret
ijasret
 +5
2. "Time of Use" (ToU) + Hybrid Model: Explained Simply
In Morocco, the cost of electricity changes based on the clock. A "Hybrid" model is the secret to making your app profitable for users.
The Problem: Solar only works during the day. But in Morocco, "Heures de Pointe" (Peak Hours) usually happen in the evening when the sun is down.
The Hybrid Solution: You calculate a system that includes a Battery.
Daytime: Solar powers the house + charges the battery.
Peak Hours (Evening): The system automatically switches to the battery instead of the expensive grid.
Your Code's Job: Don't just calculate "total energy." Calculate "Hourly Savings." Show the user: "You saved 200 DH today because you didn't use the grid during the 7 PM peak." 
3. Step-by-Step "Easy" Implementation
Image Fetch: Use Mapbox or Google Static Maps API to get a top-down view of the address.
The Mask: Run the image through SAM to get the roof polygon.
The Math (Polygon to 
):
Get the "Scale" of your image (how many meters per pixel).

.
Panel Fitting: Use a simple Python library like shapely.
Create a "grid" of rectangles (solar panels).
Subtract the areas where your obstacle detector found a satellite dish.
Count how many rectangles fit inside the remaining roof shape.
Financial Forecast: Use NREL's PVWatts API. You send it the location and system size; it sends back exactly how many kilowatt-hours (
) that roof will produce in Morocco. 
ijasret
ijasret
 +1
4. Taking it to the "Next Level" (With Minimal Effort)
To make it "Moroccan-Ready" without extra AI work:
The "Loi 82-21" Report: Add a button that generates a PDF "Technical File." Moroccan law (82-21) requires specific documentation for self-production. Automating this paperwork for the user is a massive value-add.
WhatsApp Integration: In Morocco, people prefer WhatsApp over apps. Use the Twilio WhatsApp API so a user can just "Send Location" and your bot replies with: "Your roof can hold 12 panels and save you 850 DH/month."
Bank Financing Link: Add a "Check Loan Eligibility" button that links to "Green Credit" pages of Moroccan banks like Credit Agricole du Maroc or BMCE.
