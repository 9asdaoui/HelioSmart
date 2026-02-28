<!DOCTYPE html>
<html lang="en">

<head>
    <!-- Meta tags for proper HTML5 document structure and responsive design -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Solar Estimation Tool</title>

    <!-- Tailwind CSS CDN for utility-first styling -->
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* Import Inter font from Google Fonts for modern typography */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        /* Global body styles with gradient background */
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #f0f9ff 0%, #e1f5fe 100%);
            min-height: 100vh;
        }

        /* Step card styling with shadow and hover effects */
        .step-card {
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
            transition: all 0.3s ease;
        }

        /* Active step card gets elevated shadow and transforms */
        .step-card.active {
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
            transform: translateY(-5px);
        }

        /* Step indicator circles in progress bar */
        .step-indicator {
            transition: all 0.3s ease;
        }

        /* Completed step indicator styling */
        .step-indicator.completed {
            background-color: #22c55e;
        }

        /* Active step indicator styling */
        .step-indicator.active {
            background-color: #3b82f6;
        }

        /* Progress bar container */
        .progress-bar {
            height: 4px;
            background-color: #e2e8f0;
            position: relative;
            margin: 0 auto;
            border-radius: 4px;
        }

        /* Progress bar fill animation */
        .progress-bar-fill {
            height: 100%;
            background-color: #3b82f6;
            border-radius: 4px;
            transition: width 0.3s ease;
        }

        /* Button hover effects */
        .btn-next,
        .btn-prev,
        .btn-submit {
            transition: all 0.2s ease;
        }

        .btn-next:hover,
        .btn-submit:hover {
            background-color: #2563eb;
        }

        .btn-prev:hover {
            background-color: #f1f5f9;
        }

        .slider-container {
            position: relative;
            width: 100%;
            padding: 1rem 0;
        }

        .slider {
            -webkit-appearance: none;
            width: 100%;
            height: 8px;
            border-radius: 4px;
            background: #e2e8f0;
            outline: none;
        }

        .slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
            border: 2px solid white;
        }

        .slider::-moz-range-thumb {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
            border: 2px solid white;
        }

        .slider-value {
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #3b82f6;
            color: white;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 0.875rem;
            font-weight: 500;
            white-space: nowrap;
            transition: left 0.2s ease;
        }

        /* Enhanced slider value for Step 4 */
        .slider-value.bg-white {
            position: relative;
            top: 0;
            left: 0;
            transform: none;
            background-color: white;
            color: #2563eb;
            font-weight: 600;
            font-size: 1.25rem;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }

        .slider-value::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border-width: 5px;
            border-style: solid;
            border-color: #3b82f6 transparent transparent transparent;
        }

        .slider-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            color: #64748b;
            font-size: 0.75rem;
        }

        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #cbd5e1;
            transition: .4s;
            border-radius: 24px;
        }

        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }

        input:checked+.toggle-slider {
            background-color: #3b82f6;
        }

        input:checked+.toggle-slider:before {
            transform: translateX(26px);
        }

        .chart-container {
            position: relative;
            height: 200px;
            margin-top: 2.5rem;
            padding-bottom: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .chart-inner {
            position: relative;
            width: 100%;
            height: 100%;
        }

        .chart-bar {
            position: absolute;
            bottom: 30px;
            width: 7%;
            background-color: #3b82f6;
            border-radius: 4px 4px 0 0;
            transition: height 0.5s ease;
        }

        .chart-label {
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.75rem;
            color: #64748b;
            white-space: nowrap;
        }

        .chart-value {
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.75rem;
            color: #3b82f6;
            font-weight: 500;
        }

        .consumption-profile {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 1rem;
        }

        .profile-option {
            flex: 1 0 calc(33.333% - 8px);
            min-width: 120px;
            padding: 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .profile-option:hover {
            border-color: #bfdbfe;
            background-color: #f0f7ff;
        }

        .profile-option.selected {
            border-color: #3b82f6;
            background-color: #eff6ff;
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
        }

        .profile-option:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .profile-icon {
            font-size: 1.5rem;
            margin-bottom: 8px;
        }

        .profile-label {
            font-size: 0.875rem;
            font-weight: 500;
            color: #334155;
        }

        .profile-description {
            font-size: 0.75rem;
            color: #64748b;
            margin-top: 4px;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .animate-fade-in {
            animation: fadeIn 0.3s ease forwards;
        }

        .monthly-input {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
        }

        .input-group {
            margin-bottom: 12px;
        }

        .input-group label {
            display: block;
            font-size: 0.875rem;
            color: #64748b;
            margin-bottom: 4px;
        }

        .input-group input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 0.875rem;
            transition: border-color 0.2s ease;
        }

        .input-group input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .input-group input::-webkit-outer-spin-button,
        .input-group input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }

        .input-group input[type=number] {
            -moz-appearance: textfield;
        }

        .input-prefix {
            position: relative;
        }

        .input-prefix input {
            padding-left: 24px;
        }

        .input-prefix::before {
            content: "$";
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #64748b;
            font-size: 0.875rem;
        }

        .map-container {
            position: relative;
            overflow: hidden;
            border-radius: 0.5rem;
            aspect-ratio: 1/1;
        }

        .map-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        }

        .map-target-box {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60%;
            height: 60%;
            border: 3px dashed #3b82f6;
            border-radius: 8px;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
        }

        .map-target-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background-color: rgba(59, 130, 246, 0.6);
            border: 2px solid white;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
        }

        .map-instructions {
            position: absolute;
            top: 16px;
            left: 16px;
            right: 16px;
            background-color: rgba(255, 255, 255, 0.9);
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            z-index: 10;
            pointer-events: none;
        }

        .satellite-map {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'%3E%3Crect width='600' height='600' fill='%23b0bec5'/%3E%3Cpath d='M0 0h600v600H0z' fill='%23546e7a' fill-opacity='.2'/%3E%3Cpath fill='%23263238' fill-opacity='.05' d='M0 0h600v600H0z'/%3E%3Cpath fill='%23fff' fill-opacity='.05' d='M0 0h600v600H0z'/%3E%3Cpath d='M150 150h300v300H150z' fill='%23263238' fill-opacity='.1'/%3E%3Cpath d='M200 200h200v200H200z' fill='%23263238' fill-opacity='.1'/%3E%3Cpath d='M250 250h100v100H250z' fill='%23263238' fill-opacity='.1'/%3E%3Cpath d='M275 275h50v50h-50z' fill='%23263238' fill-opacity='.1'/%3E%3Cpath d='M0 0h600v600H0z' fill='url(%23a)' fill-opacity='.1'/%3E%3Cdefs%3E%3CradialGradient id='a' cx='300' cy='300' r='300' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23fff'/%3E%3Cstop offset='1' stop-color='%23fff' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3C/svg%3E");
            background-size: cover;
            background-position: center;
            width: 100%;
            height: 100%;
        }

        .instruction-image {
            aspect-ratio: 1/1;
            background-color: #f8fafc;
            border-radius: 0.5rem;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 1.5rem;
        }

        .roof-map-container {
            position: relative;
            overflow: hidden;
            border-radius: 0.5rem;
            min-width: 300px;
            max-width: 450px;
            width: 100%;
            height: auto;
            min-height: 300px;
            max-height: 450px;
            aspect-ratio: 1/1;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            margin: 0 auto;
        }

        /* Mobile responsive adjustments for roof map */
        @media (max-width: 768px) {
            .roof-map-container {
                min-width: 280px;
                max-width: 350px;
                min-height: 280px;
                max-height: 350px;
            }
        }

        @media (max-width: 480px) {
            .roof-map-container {
                min-width: 250px;
                max-width: 300px;
                min-height: 250px;
                max-height: 300px;
            }
        }

        .roof-map {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'%3E%3Crect width='600' height='600' fill='%23b0bec5'/%3E%3Cpath d='M0 0h600v600H0z' fill='%23546e7a' fill-opacity='.2'/%3E%3Cpath fill='%23263238' fill-opacity='.05' d='M0 0h600v600H0z'/%3E%3Cpath fill='%23fff' fill-opacity='.05' d='M0 0h600v600H0z'/%3E%3Cpath d='M150 150h300v300H150z' fill='%23455a64' fill-opacity='.3'/%3E%3Cpath d='M200 200h200v200H200z' fill='%23455a64' fill-opacity='.2'/%3E%3Cpath d='M250 250h100v100H250z' fill='%23455a64' fill-opacity='.1'/%3E%3Cpath d='M0 0h600v600H0z' fill='url(%23a)' fill-opacity='.1'/%3E%3Cdefs%3E%3CradialGradient id='a' cx='300' cy='300' r='300' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23fff'/%3E%3Cstop offset='1' stop-color='%23fff' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3C/svg%3E");
            background-size: cover;
            background-position: center;
            width: 100%;
            height: 100%;
            position: relative;
            cursor: pointer;
        }

        .solar-point {
            position: absolute;
            width: 24px;
            height: 24px;
            background-color: rgba(59, 130, 246, 0.8);
            border: 2px solid white;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .solar-point:hover {
            background-color: rgba(37, 99, 235, 0.9);
            transform: translate(-50%, -50%) scale(1.1);
        }

        .solar-point::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 8px;
            height: 8px;
            background-color: white;
            border-radius: 50%;
        }

        .obstacle-point {
            position: absolute;
            width: 24px;
            height: 24px;
            background-color: rgba(220, 38, 38, 0.8);
            border: 2px solid white;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.2);
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .obstacle-point:hover {
            background-color: rgba(185, 28, 28, 0.9);
            transform: translate(-50%, -50%) scale(1.1);
        }

        .obstacle-point::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 8px;
            height: 8px;
            background-color: white;
            border-radius: 50%;
        }

        .solar-point-display {
            position: absolute;
            width: 20px;
            height: 20px;
            background-color: rgba(59, 130, 246, 0.5);
            border: 1px solid white;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
        }

        /* Satellite solar points - styled for real satellite imagery */
        .satellite-solar-point {
            position: absolute;
            width: 16px;
            height: 16px;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            border: 2px solid white;
            border-radius: 50%;
            cursor: pointer;
            z-index: 10;
            box-shadow:
                0 2px 4px rgba(0, 0, 0, 0.3),
                0 0 0 4px rgba(59, 130, 246, 0.2);
            transition: all 0.2s ease;
        }

        .satellite-solar-point:hover {
            background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
            box-shadow:
                0 4px 8px rgba(0, 0, 0, 0.4),
                0 0 0 6px rgba(59, 130, 246, 0.3);
        }

        .satellite-solar-point::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 6px;
            height: 6px;
            background-color: white;
            border-radius: 50%;
        }

        .point-counter {
            background-color: rgba(255, 255, 255, 0.95);
            border-radius: 8px;
            padding: 8px 16px;
            font-weight: 600;
            color: #1e40af;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
        }

        .obstacle-counter {
            color: #dc2626;
        }

        .obstacle-title {
            color: #b91c1c !important;
        }

        .obstacle-step {
            border-left-color: #dc2626;
        }

        .obstacle-step.active {
            background-color: #fef2f2;
            border-left-color: #b91c1c;
        }

        .obstacle-number {
            background-color: #fee2e2;
            color: #b91c1c;
        }

        .instruction-step {
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 12px;
            background-color: #f8fafc;
            border-left: 4px solid #3b82f6;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
        }

        .instruction-step.active {
            background-color: #eff6ff;
            border-left-color: #2563eb;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .instruction-number {
            background-color: #dbeafe;
            color: #2563eb;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            margin-right: 12px;
            flex-shrink: 0;
        }

        .instruction-text {
            font-size: 0.9rem;
            color: #334155;
        }

        .instructions-container {
            background-color: white;
            border-radius: 0.75rem;
            padding: 1.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            height: 100%;
        }

        .instruction-title {
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 1.25rem;
            display: flex;
            align-items: center;
            font-size: 1.1rem;
        }

        .chart-axis {
            position: absolute;
            left: 0;
            bottom: 30px;
            width: 100%;
            height: 1px;
            background-color: #cbd5e1;
        }

        .chart-container::before {
            content: '';
            position: absolute;
            left: 0;
            bottom: 30px;
            width: 100%;
            height: 200px;
            background: linear-gradient(to top, rgba(243, 244, 246, 0.1) 0%, rgba(243, 244, 246, 0) 100%);
            pointer-events: none;
            z-index: -1;
        }

        @media (max-width: 768px) {
            .layout-grid {
                grid-template-columns: 1fr;
            }

            .monthly-input {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        @media (max-width: 480px) {
            .monthly-input {
                grid-template-columns: 1fr;
            }

            .stories-selector,
            .tilt-options {
                flex-wrap: wrap;
            }

            .story-option,
            .tilt-option {
                flex: 1 0 calc(50% - 4px);
                margin-bottom: 8px;
            }
        }

        .chart-column {
            display: flex;
            flex-direction: column;
            justify-content: center;
            height: 100%;
        }

        /* Provider card styles */
        .provider-card {
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            padding: 16px;
            transition: all 0.2s ease;
            cursor: pointer;
            display: flex;
            align-items: center;
            margin-bottom: 12px;
        }

        .provider-card:hover {
            border-color: #bfdbfe;
            background-color: #f8fafc;
        }

        .provider-card.selected {
            border-color: #3b82f6;
            background-color: #eff6ff;
        }

        .provider-logo {
            width: 60px;
            height: 60px;
            background-color: #f1f5f9;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 16px;
            flex-shrink: 0;
        }

        .provider-info {
            flex-grow: 1;
        }

        .provider-name {
            font-weight: 600;
            color: #334155;
            margin-bottom: 4px;
        }

        .provider-details {
            font-size: 0.875rem;
            color: #64748b;
        }

        .provider-rate {
            font-weight: 500;
            color: #0f766e;
        }

        .region-selector {
            margin-bottom: 20px;
        }

        .region-selector select {
            width: 100%;
            padding: 10px 16px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 0.875rem;
            transition: all 0.2s ease;
            background-color: white;
        }

        .region-selector select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Roof type and building styles */
        .roof-option {
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            padding: 16px;
            transition: all 0.2s ease;
            cursor: pointer;
            text-align: center;
        }

        .roof-option:hover {
            border-color: #bfdbfe;
            background-color: #f8fafc;
        }

        .roof-option.selected {
            border-color: #3b82f6;
            background-color: #eff6ff;
        }

        .roof-icon {
            width: 100px;
            height: 100px;
            margin: 0 auto 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .roof-icon svg {
            width: 100%;
            height: 100%;
        }

        .roof-name {
            font-weight: 600;
            color: #334155;
            margin-bottom: 4px;
        }

        .roof-description {
            font-size: 0.875rem;
            color: #64748b;
        }

        .stories-selector {
            display: flex;
            gap: 8px;
            margin-top: 16px;
        }

        .story-option {
            flex: 1;
            padding: 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .story-option:hover {
            border-color: #bfdbfe;
            background-color: #f8fafc;
        }

        .story-option.selected {
            border-color: #3b82f6;
            background-color: #eff6ff;
        }

        .story-custom.selected {
            border-color: #3b82f6;
            background-color: #eff6ff;
        }

        #customStoriesInput {
            transition: all 0.3s ease;
        }

        #customStoriesNumber {
            transition: all 0.2s ease;
        }

        #customStoriesNumber:focus {
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .story-number {
            font-weight: 600;
            color: #334155;
            font-size: 1.125rem;
        }

        .story-label {
            font-size: 0.75rem;
            color: #64748b;
            margin-top: 4px;
        }

        .tilt-options {
            display: flex;
            gap: 8px;
            margin-top: 16px;
        }

        .tilt-option {
            flex: 1;
            padding: 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .tilt-option:hover {
            border-color: #bfdbfe;
            background-color: #f8fafc;
        }

        .tilt-option.selected {
            border-color: #3b82f6;
            background-color: #eff6ff;
        }

        .tilt-value {
            font-weight: 600;
            color: #334155;
            font-size: 1.125rem;
        }

        .tilt-label {
            font-size: 0.75rem;
            color: #64748b;
            margin-top: 4px;
        }

        .custom-provider-card {
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            padding: 16px;
            transition: all 0.2s ease;
            cursor: pointer;
            display: flex;
            align-items: center;
            margin-top: 16px;
            background-color: #f8fafc;
        }

        .custom-provider-card:hover {
            border-color: #bfdbfe;
            background-color: #f0f7ff;
        }

        .custom-provider-card.selected {
            border-color: #3b82f6;
            background-color: #eff6ff;
        }

        .custom-provider-logo {
            width: 60px;
            height: 60px;
            background-color: #e2e8f0;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 16px;
            flex-shrink: 0;
        }

        .custom-rate-container {
            margin-top: 16px;
            padding: 16px;
            border-radius: 8px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            display: none;
        }

        .custom-rate-container.visible {
            display: block;
            animation: fadeIn 0.3s ease forwards;
        }

        .address-input {
            margin-bottom: 16px;
        }

        .address-input input {
            width: 100%;
            padding: 10px 16px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 0.875rem;
            transition: border-color 0.2s ease;
        }

        .address-input input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .map-container {
            width: 100%;
            height: 250px;
            background-color: #f1f5f9;
            border-radius: 8px;
            margin-bottom: 16px;
            overflow: hidden;
            position: relative;
        }

        .map-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #64748b;
        }

        .map-placeholder svg {
            margin-bottom: 8px;
        }

        /* Location page specific styles */
        .location-option {
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            padding: 16px;
            transition: all 0.2s ease;
            cursor: pointer;
            margin-bottom: 12px;
        }

        .location-option:hover {
            border-color: #bfdbfe;
            background-color: #f8fafc;
        }

        .location-option.selected {
            border-color: #3b82f6;
            background-color: #eff6ff;
        }

        .location-option-header {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }

        .location-option-icon {
            width: 40px;
            height: 40px;
            background-color: #f1f5f9;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            flex-shrink: 0;
        }

        .location-option-title {
            font-weight: 600;
            color: #334155;
        }

        .location-option-description {
            font-size: 0.875rem;
            color: #64748b;
            margin-left: 52px;
        }

        .search-container {
            position: relative;
            margin-bottom: 24px;
        }

        .search-container input {
            width: 100%;
            padding: 12px 16px 12px 42px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 0.875rem;
            transition: all 0.2s ease;
            background-color: white;
        }

        .search-container input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
        }

        .or-divider {
            display: flex;
            align-items: center;
            margin: 24px 0;
            color: #64748b;
        }

        .or-divider::before,
        .or-divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background-color: #e2e8f0;
        }

        .or-divider span {
            padding: 0 16px;
            font-size: 0.875rem;
        }

        /* Solar Results Animations */
        .solar-results-container {
            animation: slideInUp 0.8s ease-out;
        }

        .solar-animation {
            position: relative;
        }

        .sun-icon {
            animation: spin 20s linear infinite;
        }

        .energy-rays {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 120px;
            height: 120px;
            background: radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, transparent 70%);
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
        }

        .metric-card {
            animation: fadeInScale 0.6s ease-out forwards;
            opacity: 0;
            transform: translateY(20px) scale(0.95);
        }

        .metric-card:nth-child(1) {
            animation-delay: 0.2s;
        }

        .metric-card:nth-child(2) {
            animation-delay: 0.4s;
        }

        .metric-card:nth-child(3) {
            animation-delay: 0.6s;
        }

        .savings-bar {
            width: 40px;
            background: linear-gradient(to top, #10b981, #34d399);
            border-radius: 4px 4px 0 0;
            transition: height 0.8s ease-out;
            opacity: 0;
        }

        .bar-group {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes spin {
            from {
                transform: rotate(0deg);
            }

            to {
                transform: rotate(360deg);
            }
        }

        @keyframes pulse {

            0%,
            100% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 0.3;
            }

            50% {
                transform: translate(-50%, -50%) scale(1.1);
                opacity: 0.6;
            }
        }

        @keyframes fadeInScale {
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        @keyframes capture-pulse {

            0%,
            100% {
                border-color: #10b981;
                box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2), inset 0 0 20px rgba(16, 185, 129, 0.1);
            }

            50% {
                border-color: #059669;
                box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.4), inset 0 0 25px rgba(16, 185, 129, 0.2);
            }
        }

        .counter {
            font-variant-numeric: tabular-nums;
        }
    </style>
</head>
<!-- Main body with padding for mobile and desktop responsiveness -->

<body class="p-4 md:p-8">
    <!-- Main container with centered layout and maximum width -->
    <div class="max-w-4xl mx-auto">
        <!-- Header section with tool title and description -->
        <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">Solar Energy Estimation Tool</h1>
            <p class="text-gray-600">Find out how much you could save with solar energy</p>
        </div>

        <!-- Progress bar showing 6 steps total with indicators and connecting lines -->
        <div class="flex justify-between items-center mb-8 px-2">
            <div class="flex items-center w-full">
                <!-- Step 1 indicator (starts as active) -->
                <div
                    class="step-indicator active rounded-full h-8 w-8 flex items-center justify-center text-white font-medium">
                    1</div>
                <div class="flex-1 h-1 mx-2">
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width: 0%"></div>
                    </div>
                </div>
                <!-- Step 2 indicator -->
                <div
                    class="step-indicator bg-gray-300 rounded-full h-8 w-8 flex items-center justify-center text-white font-medium">
                    2</div>
                <div class="flex-1 h-1 mx-2">
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width: 0%"></div>
                    </div>
                </div>
                <!-- Step 3 indicator -->
                <div
                    class="step-indicator bg-gray-300 rounded-full h-8 w-8 flex items-center justify-center text-white font-medium">
                    3</div>
                <div class="flex-1 h-1 mx-2">
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width: 0%"></div>
                    </div>
                </div>
                <!-- Step 4 indicator -->
                <div
                    class="step-indicator bg-gray-300 rounded-full h-8 w-8 flex items-center justify-center text-white font-medium">
                    4</div>
                <div class="flex-1 h-1 mx-2">
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width: 0%"></div>
                    </div>
                </div>
                <!-- Step 5 indicator -->
                <div
                    class="step-indicator bg-gray-300 rounded-full h-8 w-8 flex items-center justify-center text-white font-medium">
                    5</div>
                <div class="flex-1 h-1 mx-2">
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width: 0%"></div>
                    </div>
                </div>
                <!-- Step 6 indicator (final step) -->
                <div
                    class="step-indicator bg-gray-300 rounded-full h-8 w-8 flex items-center justify-center text-white font-medium">
                    6</div>
            </div>
        </div>

        <!-- Container for all form step cards -->
        <div class="relative">
            <!-- STEP 1: Property Location - Address input and map positioning -->
            <div id="step1" class="step-card active bg-white rounded-xl p-6 md:p-8 mb-6">
                <!-- Hidden form fields for address data (like in old form) -->
                <input type="hidden" name="street" id="street">
                <input type="hidden" name="city" id="city">
                <input type="hidden" name="state" id="state">
                <input type="hidden" name="zip_code" id="zip_code">
                <input type="hidden" name="country" id="country">
                <input type="hidden" name="latitude" id="latitude">
                <input type="hidden" name="longitude" id="longitude">
                <!-- Hidden fields for map scale and zoom data -->
                <input type="hidden" name="scale_meters_per_pixel" id="scale_meters_per_pixel">
                <input type="hidden" name="zoom_level" id="zoom_level">

                <h2 class="text-2xl font-bold text-gray-800 mb-6">Enter your Property Location</h2>

                <!-- Address input section removed as per user request -->

                <!-- Map positioning section for accurate property location -->
                <div class="mb-6">
                    <!-- Move search bar and current location button to top of card -->
                    <div class="mb-6 flex flex-col gap-2">
                        <div class="flex gap-2 items-center">
                            <div class="flex-1 relative">
                                <input type="text" id="searchInput" placeholder="Search for an address..."
                                    class="w-full p-3 border rounded-lg pl-10 form-input">
                            </div>
                            <button type="button" id="getCurrentLocationBtn"
                                class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors duration-200 align-middle"
                                style="border: none; min-height: 48px;">
                                <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Use Current Location
                            </button>
                        </div>
                    </div>
                    <div class="flex flex-row gap-6">
                        <!-- Google Map integration -->
                        <div class="w-3/5 relative flex flex-col justify-center">
                            <div id="map"
                                style="height: 384px; width: 100%; border-radius: 8px; border: 1px solid #ddd;"></div>
                            <div class="capture-cadre"
                                style="position: absolute; top: 50%; left: 50%; width: 200px; height: 200px; border: 3px solid #10b981; background: rgba(16, 185, 129, 0.1); transform: translate(-50%, -50%); pointer-events: none; border-radius: 8px; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2), inset 0 0 20px rgba(16, 185, 129, 0.1); animation: capture-pulse 2s ease-in-out infinite;">
                                <span
                                    style="position: absolute; top: -35px; left: 50%; transform: translateX(-50%); background: #10b981; color: white; padding: 6px 12px; border-radius: 4px; font-size: 14px; font-weight: 500; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 1002;">Fit
                                    your roof inside the frame</span>
                            </div>
                            <!-- Map Controls -->
                            <div class="mt-3 flex flex-wrap gap-3">
                                <div id="locationStatus" class="text-sm text-gray-600 flex items-center"></div>
                            </div>
                        </div>
                        <!-- Example and Instructions Panel -->
                        <div class="w-2/5 space-y-4 flex flex-col justify-center">
                            <!-- Visual Example with Static Image -->
                            <div class="bg-white border rounded-lg shadow-sm p-4">
                                <h3 class="font-semibold text-lg mb-2 text-gray-800 flex items-center justify-center">
                                    <span
                                        class="inline-block bg-green-100 text-green-700 rounded-full px-3 py-1 text-xs font-semibold mr-2">Example</span>
                                    Perfect Roof Capture
                                </h3>
                                <!-- Static image example -->
                                <div class="flex flex-col items-center mb-2">
                                    <div class="inline-block border-2 border-green-400 rounded-lg overflow-hidden shadow-sm bg-gray-50 p-2"
                                        style="box-shadow: 0 2px 8px rgba(16,185,129,0.08);">
                                        <img src="/public/datta-able/images/image.png" alt="Roof positioning example"
                                            class="w-64 h-64 object-cover rounded-md transition-transform duration-200 hover:scale-105"
                                            style="box-shadow: 0 1px 4px rgba(16,185,129,0.10);"
                                            onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI1NiAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjggNjRMMTkyIDEyOEgxNjBWMTkySDk2VjEyOEg2NEwxMjggNjRaIiBmaWxsPSIjNjM2NjZGIi8+Cjx0ZXh0IHg9IjEyOCIgeT0iMjIwIiBmaWxsPSIjNjM2NjZGIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Um9vZiBFeGFtcGxlPC90ZXh0Pgo8L3N2Zz4K'; this.onerror=null;">
                                    </div>
                                    <!-- Success indicator -->
                                    <div class="mt-1">
                                        <span class="text-xs text-green-600 font-medium flex items-center gap-1">
                                            <svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor"
                                                viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                    d="M5 13l4 4L19 7" />
                                            </svg>

                                        </span>
                                    </div>
                                </div>
                                <!-- Simple tip -->
                                <div
                                    class="text-center p-2 bg-blue-50 rounded text-xs text-blue-700 font-medium shadow-sm">
                                    <span class="inline-block align-middle">Position your roof like this example, then
                                        click <span class="font-semibold text-blue-600">"Next"</span></span>
                                </div>
                            </div>

                            <!-- Hidden address summary for JavaScript functionality (not displayed to user) -->
                            <div id="addressSummary" style="display: none;"></div>
                            <div id="addressPanel" style="display: none;"></div>
                        </div>
                    </div>
                </div>

                <!-- Navigation: Next button to proceed to Step 2 -->
                <div class="flex justify-end">
                    <button class="btn-next bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"
                        onclick="nextStep(1)">Next</button>
                </div>
            </div>

            <!-- STEP 2: Solar Panel Placement - Interactive map for marking optimal solar panel locations -->
            <div id="step2" class="step-card bg-white rounded-xl p-6 md:p-8 mb-6 hidden">
                <h2 class="text-2xl font-bold text-gray-800 mb-6">Solar Panel Placement</h2>

                <div class="mb-6">
                    <!-- Header with point counter showing remaining placements -->
                    <div class="flex items-center justify-between mb-4">
                        <label class="block text-gray-700 font-medium">Mark Usable Roof Areas</label>
                        <span class="text-sm text-blue-600 font-medium" id="pointsRemaining">6 points remaining</span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Left panel: Step-by-step instructions for panel placement -->
                        <div class="instructions-container">
                            <h3 class="instruction-title">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20"
                                    fill="currentColor">
                                    <path fill-rule="evenodd"
                                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                        clip-rule="evenodd" />
                                </svg>
                                How to place solar panel points
                            </h3>

                            <!-- Interactive instruction steps that highlight as user progresses -->
                            <div class="instruction-step active" id="step1Instruction">
                                <div class="instruction-number">1</div>
                                <div class="instruction-text">Place points on flat, unshaded areas of your roof</div>
                            </div>

                            <div class="instruction-step" id="step2Instruction">
                                <div class="instruction-number">2</div>
                                <div class="instruction-text">Avoid placing points near chimneys, vents, or skylights
                                </div>
                            </div>

                            <div class="instruction-step" id="step3Instruction">
                                <div class="instruction-number">3</div>
                                <div class="instruction-text">South-facing roof sections (in Northern Hemisphere) are
                                    ideal</div>
                            </div>

                            <div class="instruction-step" id="step4Instruction">
                                <div class="instruction-number">4</div>
                                <div class="instruction-text">Distribute points evenly for maximum coverage</div>
                            </div>

                            <div class="instruction-step" id="step5Instruction">
                                <div class="instruction-number">5</div>
                                <div class="instruction-text">Click on a placed point to remove it if needed</div>
                            </div>

                            <!-- Additional usage hint for satellite image -->
                            <div class="mt-6 text-sm text-gray-500">
                                <p>Click on the satellite image to place up to 6 blue points on areas of your roof
                                    suitable for solar panels. Click on existing points to remove them.</p>
                            </div>
                        </div>

                        <!-- Right panel: Interactive roof map for point placement -->
                        <div class="roof-map-wrapper">
                            <!-- Satellite image indicator (non-intrusive) -->
                            <!-- Removed '📡 Live Satellite Capture' as requested -->

                            <!-- Live counter showing points placed vs total allowed (moved above image) -->
                            <div class="point-counter mb-3 text-center">
                                <span class="text-sm font-medium text-gray-700">Points placed: </span>
                                <span id="pointCounter" class="text-lg font-bold text-blue-600">0</span>
                                <span class="text-sm text-gray-500">/6</span>
                            </div>

                            <div class="roof-map-container border border-gray-300">
                                <div id="roofMap" class="roof-map"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Navigation: Previous and Next buttons -->
                <div class="flex justify-between mt-8">
                    <button class="btn-prev bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium"
                        onclick="prevStep(2)">Previous</button>
                    <button class="btn-next bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"
                        onclick="nextStep(2)">Next</button>
                </div>
            </div>

            <!-- STEP 3: Obstacle Marking - Identify areas where solar panels cannot be placed -->
            <div id="step3" class="step-card bg-white rounded-xl p-6 md:p-8 mb-6 hidden">
                <h2 class="text-2xl font-bold text-gray-800 mb-6">Mark Roof Obstacles</h2>

                <div class="mb-6">
                    <!-- Header with remaining obstacle point counter -->
                    <div class="flex items-center justify-between mb-4">
                        <label class="block text-gray-700 font-medium">Mark Areas Unsuitable for Solar Panels</label>
                        <span class="text-sm text-red-600 font-medium" id="obstaclePointsRemaining">6 points
                            remaining</span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Left panel: Obstacle identification instructions -->
                        <div class="instructions-container">
                            <h3 class="instruction-title obstacle-title">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20"
                                    fill="currentColor">
                                    <path fill-rule="evenodd"
                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                        clip-rule="evenodd" />
                                </svg>
                                How to mark obstacles
                            </h3>

                            <!-- Step-by-step obstacle identification guide -->
                            <div class="instruction-step obstacle-step active" id="obstacleStep1Instruction">
                                <div class="instruction-number obstacle-number">1</div>
                                <div class="instruction-text">Mark chimneys, vents, and skylights with red points</div>
                            </div>

                            <div class="instruction-step obstacle-step" id="obstacleStep2Instruction">
                                <div class="instruction-number obstacle-number">2</div>
                                <div class="instruction-text">Identify areas with heavy shade from trees or structures
                                </div>
                            </div>

                            <div class="instruction-step obstacle-step" id="obstacleStep3Instruction">
                                <div class="instruction-number obstacle-number">3</div>
                                <div class="instruction-text">Mark satellite dishes, antennas, or other roof fixtures
                                </div>
                            </div>

                            <div class="instruction-step obstacle-step" id="obstacleStep4Instruction">
                                <div class="instruction-number obstacle-number">4</div>
                                <div class="instruction-text">Indicate areas with excessive snow buildup in winter
                                </div>
                            </div>

                            <div class="instruction-step obstacle-step" id="obstacleStep5Instruction">
                                <div class="instruction-number obstacle-number">5</div>
                                <div class="instruction-text">Click on a placed point to remove it if needed</div>
                            </div>

                            <!-- Usage instructions for obstacle marking -->
                            <div class="mt-6 text-sm text-gray-500">
                                Click on the map to place up to 6 red points on areas of your roof that are unsuitable
                                for solar panels.
                            </div>

                            <!-- Information panel showing previously placed solar points (moved below map) -->
                        </div>

                        <!-- Right panel: Interactive roof map for obstacle marking -->
                        <div class="roof-map-wrapper">
                            <!-- Counter showing obstacles marked vs total allowed (moved above image) -->
                            <div class="point-counter obstacle-counter mb-3 text-center">
                                <span class="text-sm font-medium text-gray-700">Obstacles marked: </span>
                                <span id="obstaclePointCounter" class="text-lg font-bold text-red-600">0</span>
                                <span class="text-sm text-gray-500">/6</span>
                            </div>

                            <div class="roof-map-container border border-gray-300 mb-2">
                                <div id="obstacleRoofMap" class="roof-map"></div>
                            </div>
                            <div class="text-center text-blue-600 text-sm mb-8 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1 inline-block"
                                    viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd"
                                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                        clip-rule="evenodd" />
                                </svg>
                                Your previously marked solar panel locations are shown in blue
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Navigation: Previous and Next buttons -->
                <div class="flex justify-between mt-8">
                    <button class="btn-prev bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium"
                        onclick="prevStep(3)">Previous</button>
                    <button class="btn-next bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"
                        onclick="nextStep(3)">Next</button>
                </div>
            </div>

            <!-- STEP 4: Energy Consumption Details - Monthly bill and consumption analysis -->
            <!-- Step 4: Energy Usage (Replaced with page2 markup) -->
            <div id="step4" class="step-card bg-white rounded-xl p-6 md:p-8 mb-6 hidden">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold text-gray-800">What's your average monthly energy usage?</h2>
                    <div class="flex items-center">
                        <label class="toggle-switch">
                            <input type="checkbox" id="topMonthlyToggle">
                            <span class="toggle-slider"></span>
                        </label>
                        <span id="advancedLabel" class="ml-2 text-sm text-gray-700">Advanced</span>
                    </div>
                </div>
                <p class="text-sm text-gray-600 mb-8">This helps us estimate the size of solar system you'll need.</p>
                <!-- Simplified Energy Usage Input -->
                <div class="bg-blue-50 rounded-xl p-6 mb-8">
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-6"
                        id="billDisplaySection">
                        <div class="mb-4 md:mb-0">
                            <h3 class="text-lg font-medium text-gray-800 mb-1">Monthly Electricity Bill</h3>
                            <p class="text-sm text-gray-600">Drag the slider to set your average bill</p>
                        </div>
                        <div class="bg-white py-2 px-4 rounded-lg shadow-sm flex items-center">
                            <span class="text-2xl font-bold text-blue-600" id="billValue">$150</span>
                            <span class="text-gray-500 ml-1">/month</span>
                        </div>
                    </div>
                    <div id="simpleInputView">
                        <div class="slider-container mb-2">
                            <input type="range" min="50" max="500" value="150" class="slider"
                                id="billSlider">
                            <div class="slider-labels flex justify-between mt-2 text-sm text-gray-600">
                                <span>$50</span>
                                <span>$150</span>
                                <span>$300</span>
                                <span>$500+</span>
                            </div>
                        </div>
                        <input type="hidden" id="kwhInput" value="1071">
                    </div>
                    <div id="topMonthlyInputs" class="hidden animate-fade-in">
                        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                            <div class="input-group">
                                <label class="text-sm font-medium text-gray-700">January ($)</label>
                                <input type="number"
                                    class="top-month-cost w-full p-2 border border-gray-300 rounded-md" data-month="0"
                                    placeholder="0" onchange="updateCostChart()">
                            </div>
                            <div class="input-group">
                                <label class="text-sm font-medium text-gray-700">February ($)</label>
                                <input type="number"
                                    class="top-month-cost w-full p-2 border border-gray-300 rounded-md" data-month="1"
                                    placeholder="0" onchange="updateCostChart()">
                            </div>
                            <div class="input-group">
                                <label class="text-sm font-medium text-gray-700">March ($)</label>
                                <input type="number"
                                    class="top-month-cost w-full p-2 border border-gray-300 rounded-md" data-month="2"
                                    placeholder="0" onchange="updateCostChart()">
                            </div>
                            <div class="input-group">
                                <label class="text-sm font-medium text-gray-700">April ($)</label>
                                <input type="number"
                                    class="top-month-cost w-full p-2 border border-gray-300 rounded-md" data-month="3"
                                    placeholder="0" onchange="updateCostChart()">
                            </div>
                            <div class="input-group">
                                <label class="text-sm font-medium text-gray-700">May ($)</label>
                                <input type="number"
                                    class="top-month-cost w-full p-2 border border-gray-300 rounded-md" data-month="4"
                                    placeholder="0" onchange="updateCostChart()">
                            </div>
                            <div class="input-group">
                                <label class="text-sm font-medium text-gray-700">June ($)</label>
                                <input type="number"
                                    class="top-month-cost w-full p-2 border border-gray-300 rounded-md" data-month="5"
                                    placeholder="0" onchange="updateCostChart()">
                            </div>
                            <div class="input-group">
                                <label class="text-sm font-medium text-gray-700">July ($)</label>
                                <input type="number"
                                    class="top-month-cost w-full p-2 border border-gray-300 rounded-md" data-month="6"
                                    placeholder="0" onchange="updateCostChart()">
                            </div>
                            <div class="input-group">
                                <label class="text-sm font-medium text-gray-700">August ($)</label>
                                <input type="number"
                                    class="top-month-cost w-full p-2 border border-gray-300 rounded-md" data-month="7"
                                    placeholder="0" onchange="updateCostChart()">
                            </div>
                            <div class="input-group">
                                <label class="text-sm font-medium text-gray-700">September ($)</label>
                                <input type="number"
                                    class="top-month-cost w-full p-2 border border-gray-300 rounded-md" data-month="8"
                                    placeholder="0" onchange="updateCostChart()">
                            </div>
                            <div class="input-group">
                                <label class="text-sm font-medium text-gray-700">October ($)</label>
                                <input type="number"
                                    class="top-month-cost w-full p-2 border border-gray-300 rounded-md" data-month="9"
                                    placeholder="0" onchange="updateCostChart()">
                            </div>
                            <div class="input-group">
                                <label class="text-sm font-medium text-gray-700">November ($)</label>
                                <input type="number"
                                    class="top-month-cost w-full p-2 border border-gray-300 rounded-md"
                                    data-month="10" placeholder="0" onchange="updateCostChart()">
                            </div>
                            <div class="input-group">
                                <label class="text-sm font-medium text-gray-700">December ($)</label>
                                <input type="number"
                                    class="top-month-cost w-full p-2 border border-gray-300 rounded-md"
                                    data-month="11" placeholder="0" onchange="updateCostChart()">
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Energy Usage Pattern -->
                <div class="mb-8" id="consumptionProfilesSection">
                    <h3 class="text-lg font-medium text-gray-800 mb-4">When do you use the most electricity?</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="profile-card" data-profile="winter">
                            <div
                                class="bg-white rounded-xl p-5 border-2 border-transparent hover:border-blue-200 hover:bg-blue-50 transition-all cursor-pointer flex flex-col items-center text-center h-full">
                                <div class="profile-icon text-4xl mb-3">❄️</div>
                                <div class="profile-label font-medium text-gray-800 mb-2">Winter Months</div>
                                <div class="profile-description text-sm text-gray-600">Higher heating costs in cold
                                    months</div>
                                <div class="mt-4 w-full">
                                    <div class="flex justify-between items-end h-12">
                                        <div class="w-1/12 bg-blue-800 h-10 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-700 h-9 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-600 h-8 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-500 h-6 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-400 h-5 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-300 h-4 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-300 h-4 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-400 h-5 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-500 h-6 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-600 h-8 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-700 h-9 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-800 h-10 rounded-sm"></div>
                                    </div>
                                    <div class="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>J</span>
                                        <span>D</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="profile-card selected" data-profile="balanced">
                            <div
                                class="bg-white rounded-xl p-5 border-2 border-blue-500 bg-blue-50 hover:bg-blue-50 transition-all cursor-pointer flex flex-col items-center text-center h-full">
                                <div class="profile-icon text-4xl mb-3">⚖️</div>
                                <div class="profile-label font-medium text-gray-800 mb-2">Year-Round</div>
                                <div class="profile-description text-sm text-gray-600">Consistent usage throughout the
                                    year</div>
                                <div class="mt-4 w-full">
                                    <div class="flex justify-between items-end h-12">
                                        <div class="w-1/12 bg-blue-500 h-7 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-500 h-7 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-500 h-7 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-500 h-7 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-500 h-7 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-500 h-7 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-500 h-7 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-500 h-7 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-500 h-7 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-500 h-7 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-500 h-7 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-500 h-7 rounded-sm"></div>
                                    </div>
                                    <div class="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>J</span>
                                        <span>D</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="profile-card" data-profile="summer">
                            <div
                                class="bg-white rounded-xl p-5 border-2 border-transparent hover:border-blue-200 hover:bg-blue-50 transition-all cursor-pointer flex flex-col items-center text-center h-full">
                                <div class="profile-icon text-4xl mb-3">☀️</div>
                                <div class="profile-label font-medium text-gray-800 mb-2">Summer Months</div>
                                <div class="profile-description text-sm text-gray-600">Higher cooling costs in hot
                                    months</div>
                                <div class="mt-4 w-full">
                                    <div class="flex justify-between items-end h-12">
                                        <div class="w-1/12 bg-blue-300 h-4 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-300 h-5 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-400 h-6 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-500 h-7 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-600 h-8 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-700 h-9 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-800 h-10 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-800 h-10 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-700 h-8 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-500 h-6 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-400 h-5 rounded-sm"></div>
                                        <div class="w-1/12 bg-blue-300 h-4 rounded-sm"></div>
                                    </div>
                                    <div class="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>J</span>
                                        <span>D</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex justify-between mt-8">
                    <button
                        class="btn-prev bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                        onclick="prevStep(4)">Previous</button>
                    <button
                        class="btn-next bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                        onclick="nextStep(4)">Continue</button>
                </div>
            </div>

            <!-- STEP 5: Dynamic Utility List -->
            <div id="step5" class="step-card bg-white rounded-xl p-6 md:p-8 mb-6 hidden">
                <h2 class="text-xl font-semibold text-gray-800 mb-6">Select Your Energy Provider</h2>
                <p class="text-sm text-gray-600 mb-6">This helps us calculate your potential savings based on your
                    current electricity rates.</p>

                <div class="space-y-4 mb-8">
                    @if (isset($utilities) && count($utilities))
                        @foreach ($utilities as $utility)
                            <div class="provider-card" data-provider="{{ $utility->id }}">
                                <div class="provider-logo">
                                    @if ($utility->image_url)
                                        <img src="{{ asset($utility->image_url) }}" alt="{{ $utility->name }}"
                                            class="h-8 w-8 object-contain">
                                    @else
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-600"
                                            viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd"
                                                d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                                                clip-rule="evenodd" />
                                        </svg>
                                    @endif
                                </div>
                                <div class="provider-info">
                                    <div class="provider-name">{{ $utility->name }}</div>
                                </div>
                            </div>
                        @endforeach
                    @else
                        <div class="text-gray-500">No utilities available.</div>
                    @endif
                </div>

                <div class="flex justify-between mt-8">
                    <button class="btn-prev bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium"
                        onclick="prevStep(5)">Previous</button>
                    <button class="btn-next bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"
                        onclick="nextStep(5)">Next</button>
                </div>
            </div>

            <!-- STEP 6: Roof Type & Building Information - Final details for solar installation planning -->
            <div id="step6" class="step-card bg-white rounded-xl p-6 md:p-8 mb-6 hidden">
                <h2 class="text-xl font-semibold text-gray-800 mb-6">Roof Type & Building Information</h2>
                <p class="text-sm text-gray-600 mb-6">This information helps us determine the optimal solar panel
                    layout for your property.</p>

                <div class="mb-8">
                    <!-- Roof type selection - affects installation approach -->
                    <label class="block text-gray-700 font-medium mb-4">Select Your Roof Type</label>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Flat roof option -->
                        <div class="roof-option" data-roof="flat">
                            <div class="roof-icon">
                                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="10" y="30" width="80" height="10" fill="#3b82f6" />
                                    <rect x="10" y="40" width="80" height="40" fill="#93c5fd" />
                                </svg>
                            </div>
                            <div class="roof-name">Flat Roof</div>
                            <div class="roof-description">Horizontal or nearly horizontal roof surface</div>
                        </div>

                        <!-- Tilted roof option -->
                        <div class="roof-option" data-roof="tilted">
                            <div class="roof-icon">
                                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                    <polygon points="10,60 50,20 90,60 80,60 50,30 20,60" fill="#3b82f6" />
                                    <rect x="20" y="60" width="60" height="20" fill="#93c5fd" />
                                </svg>
                            </div>
                            <div class="roof-name">Tilted Roof</div>
                            <div class="roof-description">Angled roof with one or more slopes</div>
                        </div>
                    </div>
                </div>

                <!-- Roof tilt angle selection (conditionally displayed for tilted roofs) -->
                <div id="roofTiltSection" class="mb-8 hidden">
                    <label class="block text-gray-700 font-medium mb-4">Roof Tilt Angle</label>

                    <div class="tilt-options">
                        <!-- Tilt angle options from low to very steep -->
                        <div class="tilt-option" data-tilt="low">
                            <div class="tilt-value">Low</div>
                            <div class="tilt-label">0-15°</div>
                        </div>
                        <div class="tilt-option" data-tilt="medium">
                            <div class="tilt-value">Medium</div>
                            <div class="tilt-label">15-30°</div>
                        </div>
                        <div class="tilt-option" data-tilt="steep">
                            <div class="tilt-value">Steep</div>
                            <div class="tilt-label">30-45°</div>
                        </div>
                        <div class="tilt-option" data-tilt="very-steep">
                            <div class="tilt-value">Very Steep</div>
                            <div class="tilt-label">45°+</div>
                        </div>
                    </div>
                </div>

                <!-- Building height information for installation planning -->
                <div class="mb-8">
                    <label class="block text-gray-700 font-medium mb-4">Number of Stories</label>

                    <div class="stories-selector">
                        <!-- Story count options from 1 to 3 -->
                        <div class="story-option" data-stories="1">
                            <div class="story-number">1</div>
                            <div class="story-label">Single Story</div>
                        </div>
                        <div class="story-option" data-stories="2">
                            <div class="story-number">2</div>
                            <div class="story-label">Two Stories</div>
                        </div>
                        <div class="story-option" data-stories="3">
                            <div class="story-number">3</div>
                            <div class="story-label">Three Stories</div>
                        </div>
                        <!-- Custom input option for 4+ stories -->
                        <div class="story-option story-custom" id="customStoryOption" data-stories="custom">
                            <div class="story-number">4+</div>
                            <div class="story-label">Custom</div>
                        </div>
                    </div>
                    
                    <!-- Custom stories input field (hidden by default) -->
                    <div id="customStoriesInput" class="mt-4 hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Enter number of stories:</label>
                        <input 
                            type="number" 
                            id="customStoriesNumber" 
                            min="4" 
                            max="50" 
                            placeholder="Enter number (4-50)"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                        <p class="text-xs text-gray-500 mt-1">Enter the exact number of stories/floors in your building</p>
                    </div>
                </div>

                <!-- Final navigation: Previous and Submit buttons -->
                <div class="flex justify-between mt-8">
                    <button class="btn-prev bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium"
                        onclick="prevStep(6)">Previous</button>
                    <button
                        class="btn-submit bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"
                        onclick="submitForm()">Submit</button>
                </div>
            </div>


            <!-- Results/Success Message (shown after form submission) -->
            <div id="success" class="step-card bg-white rounded-xl p-6 md:p-8 mb-6 hidden"></div>
        </div>
    </div>

    <!-- JAVASCRIPT SECTION: Interactive functionality and form logic -->
    <script>
        /**
         * GLOBAL VARIABLES AND STATE MANAGEMENT
         * These variables track the current state of the multi-step form
         */

        // Form navigation state
        let currentStep = 1; // Current active step (1-6)
        let currentProfile = 'balanced'; // Selected energy consumption profile
        let selectedRoofType = ''; // Selected roof type (flat/tilted)
        let selectedRoofTilt = ''; // Selected roof tilt angle
        let selectedStories = ''; // Number of building stories
        let selectedLocation = ''; // Property location data
        let selectedProvider = null; // Selected energy provider

        // Solar point placement functionality variables
        let currentInstructionStep = 0; // Current instruction highlight
        const maxPoints = 6; // Maximum solar panel points allowed
        let placedPoints = []; // Array of placed solar points

        /**
         * NAVIGATION FUNCTIONS
         * Handle movement between form steps and progress tracking
         */

        /**
         * Move to the next step in the form
         * @param {number} step - Current step number
         */
        function nextStep(step) {
            // Special handling for Step 1 to Step 2: Capture location and satellite image
            if (step === 1) {
                // Show loading state on the next button
                const nextButton = document.querySelector('#step1 .btn-next');
                const originalText = nextButton.innerHTML;
                nextButton.disabled = true;
                nextButton.innerHTML = `
                    <svg class="animate-spin h-4 w-4 mr-2 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Capturing Location & Satellite Image...
                `;

                // First, capture the current location from the map center
                captureCurrentLocation().then(() => {
                    // Then capture the satellite image
                    return captureSatelliteImage();
                }).then(() => {
                    // Restore button state
                    nextButton.disabled = false;
                    nextButton.innerHTML = originalText;
                    proceedToNextStep(step);
                }).catch((error) => {
                    // Restore button state
                    nextButton.disabled = false;
                    nextButton.innerHTML = originalText;

                    // Show user-friendly error message
                    showNotification('Unable to capture satellite image. Using roof diagram instead.', 'warning');
                    proceedToNextStep(step);
                });
            } else {
                proceedToNextStep(step);
            }
        }

        /**
         * Proceed to the next step (common logic)
         * @param {number} step - Current step number
         */
        function proceedToNextStep(step) {
            // Hide current step card
            document.getElementById('step' + step).classList.add('hidden');
            document.getElementById('step' + step).classList.remove('active');

            // Show next step card
            currentStep = step + 1;
            document.getElementById('step' + currentStep).classList.remove('hidden');
            document.getElementById('step' + currentStep).classList.add('active');

            // Special handling when entering Step 2: Update roof map with captured image or SVG
            if (currentStep === 2) {
                setTimeout(() => {
                    updateRoofMapWithSatelliteImage();
                    // Initialize the appropriate point placement functionality
                    if (capturedSatelliteImage) {
                        // Use satellite image click handler
                        initRoofMapClickHandler();
                    } else {
                        // Use original SVG click handler
                        initRoofMap();
                    }
                }, 100);
            }

            // Special handling when entering Step 3: Initialize obstacle marking with captured image
            if (currentStep === 3) {
                setTimeout(() => {
                    // Reset obstacle points array before initializing
                    obstaclePoints = [];
                    initObstacleMarking();
                }, 100);
            }

            // Special handling when entering Step 6: Re-attach listeners for roof/story selection
            if (currentStep === 6) {
                setTimeout(() => {
                    attachStep6Listeners();
                }, 50);
            }

            // Update progress indicators and bars
            updateProgress();
            // Attach listeners for roof, tilt, and story selection in step 6
            function attachStep6Listeners() {
                // Roof type selection
                const roofOptions = document.querySelectorAll('#step6 .roof-option');
                roofOptions.forEach(option => {
                    option.onclick = function() {
                        roofOptions.forEach(opt => opt.classList.remove('selected'));
                        this.classList.add('selected');
                        selectedRoofType = this.dataset.roof;
                        // Show/hide roof tilt section based on roof type
                        const roofTiltSection = document.getElementById('roofTiltSection');
                        if (selectedRoofType === 'tilted') {
                            roofTiltSection.classList.remove('hidden');
                        } else {
                            roofTiltSection.classList.add('hidden');
                        }
                    };
                });

                // Tilt selection
                const tiltOptions = document.querySelectorAll('#step6 .tilt-option');
                tiltOptions.forEach(option => {
                    option.onclick = function() {
                        tiltOptions.forEach(opt => opt.classList.remove('selected'));
                        this.classList.add('selected');
                        selectedRoofTilt = this.dataset.tilt;
                    };
                });

                // Story selection
                const storyOptions = document.querySelectorAll('#step6 .story-option');
                const customStoriesInput = document.getElementById('customStoriesInput');
                const customStoriesNumber = document.getElementById('customStoriesNumber');
                
                storyOptions.forEach(option => {
                    option.onclick = function() {
                        storyOptions.forEach(opt => opt.classList.remove('selected'));
                        this.classList.add('selected');
                        
                        if (this.dataset.stories === 'custom') {
                            // Show custom input field
                            if (customStoriesInput) {
                                customStoriesInput.classList.remove('hidden');
                                customStoriesNumber.focus();
                            }
                            selectedStories = customStoriesNumber.value || '4'; // Default to 4 if no value
                        } else {
                            // Hide custom input field
                            if (customStoriesInput) {
                                customStoriesInput.classList.add('hidden');
                            }
                            selectedStories = this.dataset.stories;
                        }
                    };
                });
                
                // Handle custom stories number input
                if (customStoriesNumber) {
                    customStoriesNumber.addEventListener('input', function() {
                        const value = parseInt(this.value);
                        if (value >= 4) {
                            selectedStories = value.toString();
                        }
                    });
                    
                    // Ensure minimum value of 4
                    customStoriesNumber.addEventListener('blur', function() {
                        if (this.value && parseInt(this.value) < 4) {
                            this.value = 4;
                            selectedStories = '4';
                        }
                    });
                }
            }
        }

        /**
         * Move to the previous step in the form
         * @param {number} step - Current step number
         */
        function prevStep(step) {
            // Hide current step card
            document.getElementById('step' + step).classList.add('hidden');
            document.getElementById('step' + step).classList.remove('active');

            // Show previous step card
            currentStep = step - 1;
            document.getElementById('step' + currentStep).classList.remove('hidden');
            document.getElementById('step' + currentStep).classList.add('active');

            // Update progress indicators and bars
            updateProgress();
        }

        /**
         * Update the visual progress indicators and progress bars
         * Reflects current step position in the 6-step process
         */
        function updateProgress() {
            // Update step indicators (numbered circles)
            const indicators = document.querySelectorAll('.step-indicator');
            const progressBars = document.querySelectorAll('.progress-bar-fill');

            // Set visual state for each step indicator
            indicators.forEach((indicator, index) => {
                if (index < currentStep) {
                    // Completed steps: green background
                    indicator.classList.add('completed');
                    indicator.classList.remove('active');
                } else if (index === currentStep - 1) {
                    // Current step: blue background
                    indicator.classList.add('active');
                    indicator.classList.remove('completed');
                } else {
                    // Future steps: gray background
                    indicator.classList.remove('active', 'completed');
                    indicator.classList.add('bg-gray-300');
                }
            });

            // Update progress bars between indicators
            progressBars.forEach((bar, index) => {
                if (index < currentStep - 1) {
                    bar.style.width = '100%'; // Completed connections
                } else {
                    bar.style.width = '0%'; // Incomplete connections
                }
            });
        }

        /**
         * POINT COORDINATES COLLECTION
         * Collect all point coordinates in the required format for backend submission
         */
        function collectPointCoordinates() {
            // Collect solar panel points (roof points) from Step 2
            const roofPointPrompt = [];
            const roofPointLabel = [];

            if (placedPoints && placedPoints.length > 0) {
                placedPoints.forEach(point => {
                    // Round coordinates to integers for pixel precision
                    roofPointPrompt.push([Math.round(point.x), Math.round(point.y)]);
                    roofPointLabel.push(1); // All solar points are labeled as 1
                });
            }

            // Collect obstacle points from Step 3
            const obstaclePointPrompt = [];
            const obstaclePointLabel = [];

            if (obstaclePoints && obstaclePoints.length > 0) {
                obstaclePoints.forEach(point => {
                    // Round coordinates to integers for pixel precision
                    obstaclePointPrompt.push([Math.round(point.x), Math.round(point.y)]);
                    obstaclePointLabel.push(1); // All obstacle points are labeled as 1
                });
            }

            // Return in the exact format requested with coordinates divided by 2
            return {
                "roof_point_prompt": roofPointPrompt.map(point => [Math.round(point[0] / 2), Math.round(point[1] / 2)]),
                "roof_point_label": roofPointLabel,
                "obstacle_point_prompt": obstaclePointPrompt.map(point => [Math.round(point[0] / 2), Math.round(point[1] / 2)]),
                "obstacle_point_label": obstaclePointLabel
            };
        }

        /**
         * FORM SUBMISSION AND RESULTS CALCULATION
         * Process all collected data and display solar estimation results
         */
        function submitForm() {

            try {
                // Collect all form data
                const formData = collectAllFormData();

                // Collect point coordinates
                const pointData = collectPointCoordinates();

                // Combine all data for submission
                const submissionData = {
                    ...formData,
                    ...pointData
                };

                // Show submission animation
                showSubmissionAnimation();

                // Enhanced validation for address data
                const hasCoordinates = submissionData.address.latitude && submissionData.address.longitude;
                const hasSearchQuery = submissionData.address.search_query && submissionData.address.search_query.trim();

                if (!hasCoordinates) {

                    // Check if user has moved the map but not captured location
                    if (typeof map !== 'undefined' && map) {
                        const mapCenter = map.getCenter();
                        if (mapCenter) {
                            hideSubmissionAnimation();

                            // Show alert asking if user wants to use current map position
                            if (confirm('No location was captured yet. Would you like to use the current map position?')) {
                                // Get address from current map center
                                if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
                                    const geocoder = new google.maps.Geocoder();
                                    geocoder.geocode({
                                        location: mapCenter
                                    }, function(results, status) {
                                        if (status === 'OK' && results[0]) {
                                            processAddressComponents(results[0].address_components, mapCenter);

                                            // Resubmit with updated address data
                                            setTimeout(() => {
                                                submitForm();
                                            }, 100);
                                            return;
                                        } else {
                                            // Set coordinates only
                                            document.getElementById('latitude').value = mapCenter.lat();
                                            document.getElementById('longitude').value = mapCenter.lng();
                                            setTimeout(() => {
                                                submitForm();
                                            }, 100);
                                            return;
                                        }
                                    });
                                } else {
                                    // No geocoding available, just use coordinates
                                    document.getElementById('latitude').value = mapCenter.lat();
                                    document.getElementById('longitude').value = mapCenter.lng();
                                    setTimeout(() => {
                                        submitForm();
                                    }, 100);
                                    return;
                                }
                            } else {
                                return;
                            }
                        }
                    }

                    // Fallback: try geocoding from search input if available
                    if (hasSearchQuery) {
                        if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
                            const geocoder = new google.maps.Geocoder();
                            geocoder.geocode({
                                address: submissionData.address.search_query
                            }, function(results, status) {
                                if (status === 'OK' && results[0]) {
                                    const location = results[0].geometry.location;
                                    processAddressComponents(results[0].address_components, location);

                                    // Resubmit with updated address data
                                    setTimeout(() => {
                                        hideSubmissionAnimation();
                                        submitForm();
                                    }, 100);
                                    return;
                                } else {
                                    hideSubmissionAnimation();
                                    return;
                                }
                            });
                        } else {
                            hideSubmissionAnimation();
                            return;
                        }
                    } else {
                        // No search query and no coordinates
                        hideSubmissionAnimation();
                        return;
                    }
                } else {
                    // Address coordinates found, proceeding with submission
                }

                // Store the data globally for debugging
                window.solarFormData = submissionData;

                // Create and submit the actual HTML form to backend
                createAndSubmitForm(submissionData);

            } catch (error) {
                hideSubmissionAnimation();
            }
        }

        /**
         * Create and submit HTML form with all collected data
         */
        function createAndSubmitForm(submissionData) {
            // Create a hidden form
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '{{ route('solar.create-project') }}'; // Laravel route helper
            form.style.display = 'none';

            // Add CSRF token
            const csrfToken = document.querySelector('meta[name="csrf-token"]');
            if (csrfToken) {
                const csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = '_token';
                csrfInput.value = csrfToken.getAttribute('content');
                form.appendChild(csrfInput);
            }

            // Add all form data as hidden inputs
            addFormField(form, 'latitude', submissionData.address.latitude);
            addFormField(form, 'longitude', submissionData.address.longitude);
            addFormField(form, 'street', submissionData.address.street);
            addFormField(form, 'city', submissionData.address.city);
            addFormField(form, 'state', submissionData.address.state);
            addFormField(form, 'zip_code', submissionData.address.zip_code);
            addFormField(form, 'country', submissionData.address.country);
            addFormField(form, 'search_query', submissionData.address.search_query);
            addFormField(form, 'satellite_image', submissionData.address.satellite_image);

            // Map scale and positioning data
            addFormField(form, 'scale_meters_per_pixel', submissionData.address.scale_meters_per_pixel);
            addFormField(form, 'zoom_level', submissionData.address.zoom_level);
            addFormField(form, 'cadre_bounds', JSON.stringify(submissionData.address.cadre_bounds));
            addFormField(form, 'cadre_size_pixels', JSON.stringify(submissionData.address.cadre_size_pixels));
            addFormField(form, 'cadre_size_meters', JSON.stringify(submissionData.address.cadre_size_meters));

            // Energy data
            addFormField(form, 'monthly_bill', submissionData.energy.monthly_bill);
            addFormField(form, 'annual_kwh', submissionData.energy.annual_kwh);
            addFormField(form, 'usage_pattern', submissionData.energy.usage_pattern);
            addFormField(form, 'advanced_mode', submissionData.energy.advanced_mode);

            // Monthly costs if in advanced mode
            if (submissionData.energy.monthly_costs) {
                addFormField(form, 'monthly_costs', JSON.stringify(submissionData.energy.monthly_costs));
            }

            // Provider data
            addFormField(form, 'region', submissionData.provider.region);
            addFormField(form, 'provider', submissionData.provider.provider);
            addFormField(form, 'custom_rate', submissionData.provider.custom_rate);

            // Property data
            addFormField(form, 'roof_type', submissionData.property.roof_type);
            addFormField(form, 'roof_tilt', submissionData.property.roof_tilt);
            addFormField(form, 'building_stories', submissionData.property.building_stories);

            // Point data in the exact format you specified
            addFormField(form, 'roof_point_prompt', JSON.stringify(submissionData.roof_point_prompt));
            addFormField(form, 'roof_point_label', JSON.stringify(submissionData.roof_point_label));
            addFormField(form, 'obstacle_point_prompt', JSON.stringify(submissionData.obstacle_point_prompt));
            addFormField(form, 'obstacle_point_label', JSON.stringify(submissionData.obstacle_point_label));

            // Additional metadata
            addFormField(form, 'timestamp', submissionData.timestamp);
            addFormField(form, 'form_version', submissionData.form_version);

            // Add form to document and submit
            document.body.appendChild(form);
            form.submit();
        }

        /**
         * Helper function to add form fields
         */
        function addFormField(form, name, value) {
            // Always add address and map scale fields, even if empty
            const addressFields = ['latitude', 'longitude', 'street', 'city', 'state', 'zip_code', 'country',
                'search_query', 'scale_meters_per_pixel', 'zoom_level'
            ];

            if (addressFields.includes(name) || (value !== null && value !== undefined && value !== '')) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = name;
                input.value = value || ''; // Use empty string for null/undefined values
                form.appendChild(input);
            }
        }

        /**
         * Show submission animation
         */
        function showSubmissionAnimation() {
            // Hide the current step
            document.getElementById('step' + currentStep).classList.add('hidden');

            // Create and show animation
            const animationContainer = document.createElement('div');
            animationContainer.id = 'submissionAnimation';
            animationContainer.innerHTML = `
                <div class="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-green-100 bg-opacity-95 z-50">
                    <div class="text-center p-12 rounded-3xl shadow-2xl bg-white border-2 border-blue-200 relative overflow-hidden animate-fade-in">
                        <div class="absolute -top-16 -left-16 opacity-20 animate-spin-slow">
                            <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                                <circle cx="60" cy="60" r="55" stroke="#3b82f6" stroke-width="10" stroke-dasharray="60 40"/>
                            </svg>
                        </div>
                        <div class="absolute -bottom-16 -right-16 opacity-10 animate-pulse">
                            <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                                <circle cx="60" cy="60" r="55" stroke="#22c55e" stroke-width="10" stroke-dasharray="40 60"/>
                            </svg>
                        </div>
                        <div class="mb-8 flex justify-center relative z-10">
                            <div class="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                        </div>
                        <h2 class="text-4xl font-extrabold text-blue-800 mb-3 tracking-tight relative z-10 drop-shadow">
                            Processing Your Solar Assessment...
                        </h2>
                        <p class="text-gray-700 mb-6 text-xl relative z-10">
                            Please wait while we analyze your data and prepare your personalized solar report.
                        </p>
                        <div class="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <div class="flex items-center justify-center space-x-2">
                                <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                                <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                            </div>
                            <p class="text-sm text-blue-700 mt-2">Submitting your solar assessment data...</p>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(animationContainer);
        }

        /**
         * Hide submission animation (in case of error)
         */
        function hideSubmissionAnimation() {
            const animation = document.getElementById('submissionAnimation');
            if (animation) {
                animation.remove();
            }
            // Show the current step again
            document.getElementById('step' + currentStep).classList.remove('hidden');
        }

        /**
         * Collect all form data from all steps
         */
        function collectAllFormData() {
            const formData = {
                // Step 1: Location data
                address: getLocationData(),

                // Step 4: Energy usage data
                energy: getEnergyUsageData(),

                // Step 5: Energy provider data
                provider: getEnergyProviderData(),

                // Step 6: Property/building data
                property: getPropertyData(),

                // Additional metadata
                timestamp: new Date().toISOString(),
                form_version: '1.0'
            };

            return formData;
        }

        /**
         * Get location data from Step 1
         */
        function getLocationData() {
            // Get data from hidden form fields (like in old form)
            const streetField = document.getElementById('street');
            const cityField = document.getElementById('city');
            const stateField = document.getElementById('state');
            const zipField = document.getElementById('zip_code');
            const countryField = document.getElementById('country');
            const latField = document.getElementById('latitude');
            const lngField = document.getElementById('longitude');
            const scaleField = document.getElementById('scale_meters_per_pixel');
            const zoomField = document.getElementById('zoom_level');
            const searchInput = document.getElementById('searchInput');

            const latitude = latField ? parseFloat(latField.value) || null : null;
            const longitude = lngField ? parseFloat(lngField.value) || null : null;
            const scale = scaleField ? parseFloat(scaleField.value) || null : null;
            const zoom = zoomField ? parseFloat(zoomField.value) || null : null;

            // Calculate cadre bounds if we have coordinates and scale
            let cadreBounds = null;
            if (latitude && longitude && scale && typeof google !== 'undefined') {
                const center = new google.maps.LatLng(latitude, longitude);
                cadreBounds = calculateCadreBounds(center, scale);
            }

            const locationData = {
                search_query: searchInput ? searchInput.value : '',
                latitude: latitude,
                longitude: longitude,
                street: streetField ? streetField.value : '',
                city: cityField ? cityField.value : '',
                state: stateField ? stateField.value : '',
                zip_code: zipField ? zipField.value : '',
                country: countryField ? countryField.value : '',
                satellite_image: window.capturedSatelliteImage || null,
                // Map scale and positioning data
                scale_meters_per_pixel: scale,
                zoom_level: zoom,
                cadre_bounds: cadreBounds,
                cadre_size_pixels: {
                    width: 200,
                    height: 200
                },
                cadre_size_meters: scale ? {
                    width: 200 * scale,
                    height: 200 * scale
                } : null
            };

            return locationData;
        }

        /**
         * Get energy usage data from Step 4
         */
        function getEnergyUsageData() {
            const billSlider = document.getElementById('billSlider');
            const kwhInput = document.getElementById('kwhInput');
            const topMonthlyToggle = document.getElementById('topMonthlyToggle');

            const energyData = {
                monthly_bill: billSlider ? parseInt(billSlider.value) : 0,
                annual_kwh: kwhInput ? parseInt(kwhInput.value) : 0,
                usage_pattern: currentProfile || 'null',
                advanced_mode: topMonthlyToggle ? topMonthlyToggle.checked : false
            };

            // If advanced mode is enabled, collect monthly data
            if (energyData.advanced_mode) {
                const monthlyInputs = document.querySelectorAll('.top-month-cost');
                const monthlyData = [];
                monthlyInputs.forEach((input, index) => {
                    monthlyData.push({
                        month: index + 1,
                        cost: input.value ? parseFloat(input.value) : 0
                    });
                });
                energyData.monthly_costs = monthlyData;
            }

            return energyData;
        }

        /**
         * Get energy provider data from Step 5
         */
        function getEnergyProviderData() {
            const regionSelect = document.getElementById('regionSelect');
            const customRateInput = document.getElementById('customRateInput');

            // Get selected provider from global variable or find selected card
            let provider = selectedProvider || null;
            if (!provider) {
                const selectedCard = document.querySelector('.provider-card.selected');
                provider = selectedCard ? selectedCard.dataset.provider : null;
            }

            const providerData = {
                region: regionSelect ? regionSelect.value : 'null',
                provider: provider,
                custom_rate: customRateInput ? parseFloat(customRateInput.value) : null
            };

            return providerData;
        }

        /**
         * Get property data from Step 6
         */
        function getPropertyData() {
            const roofType = selectedRoofType || getSelectedRoofType();
            const roofTilt = selectedRoofTilt || getSelectedRoofTilt();
            const stories = selectedStories || getSelectedStories();

            const propertyData = {
                roof_type: roofType,
                roof_tilt: roofTilt,
                building_stories: stories
            };

            return propertyData;
        }

        /**
         * Helper functions to get selected values from UI
         */
        function getSelectedRoofType() {
            const selectedRoof = document.querySelector('.roof-option.selected');
            return selectedRoof ? selectedRoof.dataset.roof : null;
        }

        function getSelectedRoofTilt() {
            const selectedTilt = document.querySelector('.tilt-option.selected');
            return selectedTilt ? selectedTilt.dataset.tilt : null;
        }

        function getSelectedStories() {
            const selectedStory = document.querySelector('.story-option.selected');
            if (!selectedStory) return null;
            
            // If custom option is selected, get value from input field
            if (selectedStory.dataset.stories === 'custom') {
                const customInput = document.getElementById('customStoriesNumber');
                return customInput && customInput.value ? customInput.value : '4';
            }
            
            return selectedStory.dataset.stories;
        }

        /**
         * Show submission status to user (for error cases only)
         */
        function showSubmissionStatus(message, type) {
            if (type !== 'error') return; // Only show error messages

            // Remove any existing status
            const existingStatus = document.getElementById('submissionStatus');
            if (existingStatus) {
                existingStatus.remove();
            }

            // Create status element
            const statusDiv = document.createElement('div');
            statusDiv.id = 'submissionStatus';
            statusDiv.className =
                `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-md border-l-4 bg-red-100 border-red-500 text-red-700`;
            statusDiv.innerHTML = `
                <div class="flex items-center">
                    <span class="mr-2">❌</span>
                    <span>${message}</span>
                </div>
            `;

            document.body.appendChild(statusDiv);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (statusDiv && statusDiv.parentNode) {
                    statusDiv.remove();
                }
            }, 5000);
        }

        function animateCounter(element, target) {
            let current = 0;
            const increment = target / 50;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                element.textContent = target > 100 ? Math.floor(current).toLocaleString() : '$' + Math.floor(
                    current);
            }, 30);
        }

        /**
         * POINT DATA DISPLAY FUNCTION
         * Show the collected point coordinates in a modal for backend integration
         */
        function showPointData() {
            if (!window.solarFormData) {
                return;
            }

            const pointData = {
                roof_point_prompt: window.solarFormData.roof_point_prompt,
                roof_point_label: window.solarFormData.roof_point_label,
                obstacle_point_prompt: window.solarFormData.obstacle_point_prompt,
                obstacle_point_label: window.solarFormData.obstacle_point_label
            };

            // Create a modal to display the JSON data
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;

            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: white;
                padding: 2rem;
                border-radius: 12px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            `;

            modalContent.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="font-size: 1.5rem; font-weight: bold; color: #374151; margin: 0;">Point Coordinates Data</h3>
                    <button onclick="this.closest('[style*=\\"position: fixed\\"]').remove()" style="background: #f3f4f6; border: none; padding: 0.5rem; border-radius: 6px; cursor: pointer; font-size: 1.5rem; color: #6b7280;">&times;</button>
                </div>
                <p style="color: #6b7280; margin-bottom: 1rem;">Copy this JSON data for backend integration:</p>
                <textarea readonly style="width: 100%; height: 300px; padding: 1rem; border: 1px solid #d1d5db; border-radius: 6px; font-family: monospace; font-size: 14px; background: #f9fafb;">${JSON.stringify(pointData, null, 2)}</textarea>
                <div style="margin-top: 1rem; display: flex; gap: 1rem; justify-content: flex-end;">
                    <button onclick="navigator.clipboard.writeText('${JSON.stringify(pointData).replace(/'/g, "\\'")}')" style="background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 500;">Copy to Clipboard</button>
                    <button onclick="this.closest('[style*=\\"position: fixed\\"]').remove()" style="background: #6b7280; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 500;">Close</button>
                </div>
                <div style="margin-top: 1rem; padding: 1rem; background: #f0f9ff; border-radius: 6px; border-left: 4px solid #3b82f6;">
                    <p style="font-size: 14px; color: #1e40af; margin: 0;">
                        <strong>Summary:</strong> ${window.solarFormData.roof_point_prompt.length} solar panel points and ${window.solarFormData.obstacle_point_prompt.length} obstacle points collected.
                    </p>
                </div>
            `;

            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }

        // Initialize the page
        document.addEventListener('DOMContentLoaded', function() {
            updateProgress();

            // --- Step 4: New advanced toggle and profile logic (page2 markup) ---
            // let currentProfile = 'balanced'; // Use global variable only
            const topMonthlyToggle = document.getElementById('topMonthlyToggle');
            const simpleInputView = document.getElementById('simpleInputView');
            const topMonthlyInputs = document.getElementById('topMonthlyInputs');
            const consumptionProfilesSection = document.getElementById('consumptionProfilesSection');
            const billDisplaySection = document.getElementById('billDisplaySection');
            const advancedLabel = document.getElementById('advancedLabel');

            // Monthly bills input elements
            const monthlyBills = document.querySelectorAll('.top-month-cost');

            if (topMonthlyToggle && simpleInputView && topMonthlyInputs && consumptionProfilesSection &&
                advancedLabel) {
                topMonthlyToggle.addEventListener('change', function() {
                    if (this.checked) {
                        // Switch to advanced view
                        simpleInputView.classList.add('hidden');
                        billDisplaySection.classList.add('hidden');
                        topMonthlyInputs.classList.remove('hidden');
                        consumptionProfilesSection.classList.add('hidden');
                        advancedLabel.classList.add('text-blue-600');
                        advancedLabel.classList.add('font-semibold');
                    } else {
                        // Switch to simple view
                        simpleInputView.classList.remove('hidden');
                        billDisplaySection.classList.remove('hidden');
                        topMonthlyInputs.classList.add('hidden');
                        consumptionProfilesSection.classList.remove('hidden');
                        advancedLabel.classList.remove('text-blue-600');
                        advancedLabel.classList.remove('font-semibold');
                    }
                });
            }

            // Bill slider
            const billSlider = document.getElementById('billSlider');
            const billValue = document.getElementById('billValue');
            if (billSlider && billValue) {
                function updateSliderBackground(slider) {
                    const percent = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
                    slider.style.backgroundImage =
                        `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)`;
                }
                updateSliderBackground(billSlider);
                billSlider.addEventListener('input', function() {
                    billValue.textContent = '$' + this.value;
                    updateSliderBackground(this);
                });
            }

            // Consumption profile selection (new cards)
            const profileCards = document.querySelectorAll('.profile-card');
            profileCards.forEach(card => {
                card.addEventListener('click', function() {
                    profileCards.forEach(c => {
                        c.classList.remove('selected');
                        c.querySelector('div').classList.remove('border-blue-500',
                            'bg-blue-50');
                        c.querySelector('div').classList.add('border-transparent');
                    });
                    this.classList.add('selected');
                    this.querySelector('div').classList.remove('border-transparent');
                    this.querySelector('div').classList.add('border-blue-500', 'bg-blue-50');
                    currentProfile = this.dataset.profile;
                });
            });

            // Set default profile visually
            if (profileCards.length > 0) {
                profileCards.forEach(c => {
                    c.classList.remove('selected');
                    c.querySelector('div').classList.remove('border-blue-500', 'bg-blue-50');
                    c.querySelector('div').classList.add('border-transparent');
                });
                const balanced = document.querySelector('.profile-card[data-profile="balanced"]');
                if (balanced) {
                    balanced.classList.add('selected');
                    balanced.querySelector('div').classList.remove('border-transparent');
                    balanced.querySelector('div').classList.add('border-blue-500', 'bg-blue-50');
                }
                currentProfile = 'balanced';
            }

            // --- End Step 4 new logic ---


            // --- Step 5: Energy Provider Selection Logic ---
            const regionSelect = document.getElementById('regionSelect');
            const providerSection = document.getElementById('providerSection');
            const providerCards = document.querySelectorAll('.provider-card');
            const otherProviderCard = document.getElementById('otherProviderCard');
            const customRateInput = document.getElementById('customRateInput');
            const customRateSection = document.getElementById('customRateSection');

            // Helper: Show/hide providers by region
            function updateProvidersForRegion(region) {
                let anyVisible = false;
                providerCards.forEach(card => {
                    // If card has no data-region attribute, always show (for backward compatibility)
                    if (!card.hasAttribute('data-region') || card.dataset.region === region || card.dataset
                        .region === 'all') {
                        card.classList.remove('hidden');
                        anyVisible = true;
                    } else {
                        card.classList.add('hidden');
                    }
                });
                // If no cards are visible, show all as fallback
                if (!anyVisible) {
                    providerCards.forEach(card => card.classList.remove('hidden'));
                }
                // Deselect all providers
                providerCards.forEach(c => {
                    c.classList.remove('selected');
                    c.querySelector('div').classList.remove('border-blue-500', 'bg-blue-50');
                    c.querySelector('div').classList.add('border-gray-200');
                });
                // Select first visible provider by default
                const firstVisible = Array.from(providerCards).find(c => !c.classList.contains('hidden') && c !==
                    otherProviderCard);
                if (firstVisible) {
                    firstVisible.classList.add('selected');
                    firstVisible.querySelector('div').classList.remove('border-gray-200');
                    firstVisible.querySelector('div').classList.add('border-blue-500', 'bg-blue-50');
                    selectedProvider = firstVisible.dataset.provider;
                }
                // Hide custom rate section
                if (customRateSection) customRateSection.classList.add('hidden');
            }

            // Region select change
            if (regionSelect) {
                regionSelect.addEventListener('change', function() {
                    updateProvidersForRegion(this.value);
                });
                // Initialize on load
                updateProvidersForRegion(regionSelect.value);
            }

            // Provider card selection
            providerCards.forEach(card => {
                card.addEventListener('click', function() {
                    // Only allow visible cards to be selected
                    if (this.classList.contains('hidden')) return;
                    providerCards.forEach(c => {
                        c.classList.remove('selected');
                        c.querySelector('div').classList.remove('border-blue-500',
                            'bg-blue-50');
                        c.querySelector('div').classList.add('border-gray-200');
                    });
                    this.classList.add('selected');
                    this.querySelector('div').classList.remove('border-gray-200');
                    this.querySelector('div').classList.add('border-blue-500', 'bg-blue-50');
                    selectedProvider = this.dataset.provider;
                    // Show custom rate input if "other" selected
                    if (this === otherProviderCard && customRateSection) {
                        customRateSection.classList.remove('hidden');
                        if (customRateInput) customRateInput.focus();
                    } else if (customRateSection) {
                        customRateSection.classList.add('hidden');
                    }
                });
            });

            // If user clicks directly on custom rate input, select "other" card
            if (customRateInput && otherProviderCard) {
                customRateInput.addEventListener('focus', function() {
                    if (!otherProviderCard.classList.contains('selected')) {
                        otherProviderCard.click();
                    }
                });
            }
            // --- End Step 5 logic ---

            function updateChart() {
                let maxValue = 0;
                const values = [];

                // Check if we're in advanced mode (monthly inputs visible)
                const isAdvancedMode = advancedView && !advancedView.classList.contains('hidden');

                if (isAdvancedMode) {
                    // Use values from monthly inputs
                    monthlyBills.forEach((input, index) => {
                        const value = parseFloat(input.value) || 0;
                        values.push(value);
                        if (value > maxValue) maxValue = value;
                    });
                } else {
                    // Use slider value with current profile
                    const sliderValue = billSlider ? parseFloat(billSlider.value) : 150;
                    const profileValues = getMonthlyValuesForProfile(currentProfile, sliderValue);
                    values.splice(0, values.length, ...profileValues);
                    maxValue = Math.max(...profileValues);
                }

                // Ensure we have a reasonable max value for scaling
                if (maxValue === 0) maxValue = 100;

                // Update chart bars
                chartBars.forEach((bar, index) => {
                    const value = values[index] || 0;
                    const height = maxValue > 0 ? (value / maxValue) * 80 : 0; // Scale to max 80%
                    bar.style.height = Math.max(height, 2) + '%'; // Minimum 2% height

                    const valueElement = bar.querySelector('.chart-value');
                    if (valueElement) {
                        valueElement.textContent = value > 0 ? '$' + Math.round(value) : '$0';
                    }
                });
            }

            function getMonthlyValuesForProfile(profile, baseValue) {
                switch (profile) {
                    case 'balanced':
                        return Array(12).fill(baseValue);
                    case 'summer':
                        return [
                            baseValue * 0.7, baseValue * 0.7, baseValue * 0.8,
                            baseValue * 0.9, baseValue * 1.1, baseValue * 1.3,
                            baseValue * 1.5, baseValue * 1.4, baseValue * 1.1,
                            baseValue * 0.9, baseValue * 0.7, baseValue * 0.6
                        ];
                    case 'winter':
                        return [
                            baseValue * 1.5, baseValue * 1.4, baseValue * 1.2,
                            baseValue * 0.9, baseValue * 0.7, baseValue * 0.6,
                            baseValue * 0.6, baseValue * 0.7, baseValue * 0.8,
                            baseValue * 1.0, baseValue * 1.2, baseValue * 1.4
                        ];
                    case 'spring-fall':
                        return [
                            baseValue * 0.8, baseValue * 0.9, baseValue * 1.3,
                            baseValue * 1.4, baseValue * 1.2, baseValue * 0.8,
                            baseValue * 0.7, baseValue * 0.7, baseValue * 1.1,
                            baseValue * 1.3, baseValue * 1.2, baseValue * 0.8
                        ];
                    case 'variable':
                        return [
                            baseValue * 0.9, baseValue * 1.2, baseValue * 0.8,
                            baseValue * 1.1, baseValue * 0.7, baseValue * 1.3,
                            baseValue * 1.4, baseValue * 0.6, baseValue * 1.0,
                            baseValue * 1.2, baseValue * 0.8, baseValue * 1.0
                        ];
                    case 'low-usage':
                        return [
                            baseValue * 0.6, baseValue * 0.6, baseValue * 0.5,
                            baseValue * 0.5, baseValue * 0.4, baseValue * 0.4,
                            baseValue * 0.5, baseValue * 0.5, baseValue * 0.4,
                            baseValue * 0.5, baseValue * 0.5, baseValue * 0.6
                        ];
                    default:
                        return Array(12).fill(baseValue);
                }
            }

            function updateSliderValue() {
                if (billSlider) {
                    const value = parseFloat(billSlider.value);

                    // Update all slider value displays
                    if (billValue) billValue.textContent = '$' + value;
                    if (sliderValue) {
                        sliderValue.textContent = '$' + value;
                        // Position the value indicator
                        const percent = (value - billSlider.min) / (billSlider.max - billSlider.min);
                        const sliderWidth = billSlider.offsetWidth;
                        const thumbWidth = 24;
                        const maxLeft = sliderWidth - thumbWidth;
                        const left = Math.min(maxLeft, percent * sliderWidth);
                        sliderValue.style.left = left + 'px';
                    }
                    if (estimatedBill) estimatedBill.textContent = '$' + value;

                    // Update estimated consumption
                    if (estimatedConsumption) {
                        const annualConsumption = (value * 12 * 8).toLocaleString();
                        estimatedConsumption.textContent = annualConsumption + ' kWh';
                    }

                    // Sync inputs with new slider value if in advanced mode
                    syncInputsWithProfile();

                    // Update chart when slider changes
                    updateChart();
                }
            }

            // Step 4: Advanced toggle for energy bill input
            const advancedToggle = document.getElementById('advancedToggle');
            const simpleView = document.getElementById('simpleView');
            const advancedView = document.getElementById('advancedView');

            function syncInputsWithProfile() {
                if (advancedView && !advancedView.classList.contains('hidden')) {
                    // Fill inputs with current profile values
                    const currentSliderValue = billSlider ? parseFloat(billSlider.value) : 150;
                    const profileValues = getMonthlyValuesForProfile(currentProfile, currentSliderValue);
                    monthlyBills.forEach((input, index) => {
                        input.value = Math.round(profileValues[index]);
                    });
                }
            }

            if (advancedToggle && simpleView && advancedView) {
                advancedToggle.addEventListener('change', function() {
                    if (this.checked) {
                        simpleView.classList.add('hidden');
                        advancedView.classList.remove('hidden');
                        syncInputsWithProfile();
                        updateChart();
                    } else {
                        simpleView.classList.remove('hidden');
                        advancedView.classList.add('hidden');
                        updateChart();
                    }
                });
            }

            monthlyBills.forEach(input => {
                input.addEventListener('input', updateChart);
            });

            // Step 4: Fill with average button
            const fillAverageBtn = document.getElementById('fillAverage');
            if (fillAverageBtn) {
                fillAverageBtn.addEventListener('click', function() {
                    const currentSliderValue = billSlider ? parseFloat(billSlider.value) : 150;
                    monthlyBills.forEach(input => {
                        input.value = currentSliderValue;
                    });
                    updateChart();
                });
            }


            if (billSlider) {
                billSlider.addEventListener('input', updateSliderValue);
                // Initialize the slider display
                updateSliderValue();
            }

            // Consumption profile selection
            const profileOptions = document.querySelectorAll('.profile-option');
            profileOptions.forEach(option => {
                option.addEventListener('click', function() {
                    profileOptions.forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');
                    currentProfile = this.dataset.profile;

                    // Sync inputs with new profile if in advanced mode
                    syncInputsWithProfile();

                    // Update chart when profile changes
                    updateChart();
                });
            });

            // Initialize with balanced profile selected
            if (profileOptions.length > 0) {
                profileOptions[0].classList.add('selected');
                currentProfile = 'balanced';
                // Initialize slider value display and chart
                updateSliderValue();
                updateChart();
            }

            // Size slider
            const sizeSlider = document.getElementById('sizeSlider');
            const sizeValue = document.getElementById('sizeValue');

            if (sizeSlider && sizeValue) {
                sizeSlider.addEventListener('input', function() {
                    sizeValue.textContent = this.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

                    // Position the value indicator
                    const percent = (this.value - this.min) / (this.max - this.min);
                    const thumbOffset = percent * (this.offsetWidth - 24); // 24px is thumb width
                    sizeValue.style.left = (thumbOffset + 12) + 'px'; // 12px is half thumb width
                });
            }

            // Monthly usage toggle (for older step compatibility)
            const monthlyToggle = document.getElementById('monthlyToggle');
            const monthlyInputs = document.getElementById('monthlyInputs');
            const monthlyChart = document.getElementById('monthlyChart');

            if (monthlyToggle && monthlyInputs && monthlyChart) {
                monthlyToggle.addEventListener('change', function() {
                    if (this.checked) {
                        monthlyInputs.classList.remove('hidden');
                        monthlyChart.classList.add('hidden');
                    } else {
                        monthlyInputs.classList.add('hidden');
                        monthlyChart.classList.remove('hidden');
                    }
                });
            }

            // Monthly input updates chart (for older step compatibility)
            const monthInputs = document.querySelectorAll('.month-input');

            monthInputs.forEach(input => {
                input.addEventListener('input', function() {
                    const month = parseInt(this.dataset.month);
                    const value = this.value || 0;

                    // Update chart bar
                    if (chartBars[month]) {
                        const height = Math.min(Math.max(value / 10, 10),
                            100); // Scale value between 10% and 100%
                        chartBars[month].style.height = height + '%';
                        chartBars[month].querySelector('.chart-value').textContent = value;
                    }
                });
            });

            // Roof type selection
            const roofOptions = document.querySelectorAll('.roof-option');
            roofOptions.forEach(option => {
                option.addEventListener('click', function() {
                    roofOptions.forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedRoofType = this.dataset.roof;

                    // Show/hide roof tilt section based on roof type
                    const roofTiltSection = document.getElementById('roofTiltSection');
                    if (selectedRoofType === 'tilted') {
                        roofTiltSection.classList.remove('hidden');
                    } else {
                        roofTiltSection.classList.add('hidden');
                    }
                });
            });

            // Roof tilt selection
            const tiltOptions = document.querySelectorAll('.tilt-option');
            tiltOptions.forEach(option => {
                option.addEventListener('click', function() {
                    tiltOptions.forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedRoofTilt = this.dataset.tilt;
                });
            });

            // Stories selection
            const storyOptions = document.querySelectorAll('.story-option');
            const customStoriesInput = document.getElementById('customStoriesInput');
            const customStoriesNumber = document.getElementById('customStoriesNumber');
            
            storyOptions.forEach(option => {
                option.addEventListener('click', function() {
                    storyOptions.forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');
                    
                    if (this.dataset.stories === 'custom') {
                        // Show custom input field
                        if (customStoriesInput) {
                            customStoriesInput.classList.remove('hidden');
                            customStoriesNumber.focus();
                        }
                        selectedStories = customStoriesNumber.value || '4';
                    } else {
                        // Hide custom input field
                        if (customStoriesInput) {
                            customStoriesInput.classList.add('hidden');
                        }
                        selectedStories = this.dataset.stories;
                    }
                });
            });
            
            // Handle custom stories number input
            if (customStoriesNumber) {
                customStoriesNumber.addEventListener('input', function() {
                    const value = parseInt(this.value);
                    if (value >= 4) {
                        selectedStories = value.toString();
                    }
                });
                
                // Ensure minimum value of 4
                customStoriesNumber.addEventListener('blur', function() {
                    if (this.value && parseInt(this.value) < 4) {
                        this.value = 4;
                        selectedStories = '4';
                    }
                });
            }

            // Location options
            const locationOptions = document.querySelectorAll('.location-option');
            locationOptions.forEach(option => {
                option.addEventListener('click', function() {
                    locationOptions.forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedLocation = this.dataset.location;

                    // Show/hide manual address form
                    const manualAddressForm = document.getElementById('manualAddressForm');
                    if (selectedLocation === 'manual') {
                        manualAddressForm.classList.remove('hidden');
                        // Update map placeholder
                        document.querySelector('.map-placeholder').innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            <p>Enter your address to see the map</p>
                        `;
                    } else {
                        manualAddressForm.classList.add('hidden');
                        // Update map placeholder for current location
                        document.querySelector('.map-placeholder').innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p>Detecting your current location...</p>
                        `;

                        // Simulate location detection
                        setTimeout(() => {
                            document.querySelector('.map-placeholder').innerHTML = `
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <p class="text-green-600 font-medium">Location detected successfully!</p>
                            `;
                        }, 1500);
                    }
                });
            });

            // Address search input
            const addressSearch = document.getElementById('addressSearch');
            if (addressSearch) {
                addressSearch.addEventListener('input', function() {
                    if (this.value.length > 5) {
                        // Show a dropdown with suggestions (simulated)
                        const suggestions = [
                            '123 Main St, Anytown, CA 12345',
                            '456 Oak Ave, Somewhere, CA 12345',
                            '789 Pine Rd, Nowhere, CA 12345'
                        ];

                        // In a real app, you would create a dropdown with these suggestions
                    }
                });
            }

            // Property type radio buttons
            const propertyTypeRadios = document.querySelectorAll('input[name="propertyType"]');
            propertyTypeRadios.forEach(radio => {
                radio.addEventListener('change', function() {
                    document.querySelectorAll('.property-type-option').forEach(option => {
                        option.classList.remove('bg-blue-50', 'border-blue-200');
                    });

                    if (this.checked) {
                        this.closest('.property-type-option').classList.add('bg-blue-50',
                            'border-blue-200');
                    }
                });
            });

            // Shading condition radio buttons
            const shadingRadios = document.querySelectorAll('input[name="shading"]');
            shadingRadios.forEach(radio => {
                radio.addEventListener('change', function() {
                    document.querySelectorAll('.shading-option').forEach(option => {
                        option.classList.remove('bg-blue-50', 'border-blue-200');
                    });

                    if (this.checked) {
                        this.closest('.shading-option').classList.add('bg-blue-50',
                            'border-blue-200');
                    }
                });
            });

            // Set default selections
            if (document.querySelector('.profile-option[data-profile="balanced"]')) {
                document.querySelector('.profile-option[data-profile="balanced"]').classList.add('selected');
            }

            if (document.querySelector('.location-option[data-location="current"]')) {
                document.querySelector('.location-option[data-location="current"]').click();
            }

            if (roofOptions.length > 0) {
                roofOptions[0].click();
            }

            if (tiltOptions.length > 0) {
                tiltOptions[0].click();
            }

            if (storyOptions.length > 0) {
                storyOptions[0].click();
            }

            // Set initial property type and shading options
            if (document.getElementById('residential')) {
                document.getElementById('residential').closest('.property-type-option').classList.add('bg-blue-50',
                    'border-blue-200');
            }

            if (document.getElementById('minimal')) {
                document.getElementById('minimal').closest('.shading-option').classList.add('bg-blue-50',
                    'border-blue-200');
            }

            // Location button functionality
            const getCurrentLocationBtn = document.getElementById('getCurrentLocation');
            if (getCurrentLocationBtn) {
                getCurrentLocationBtn.addEventListener('click', function() {
                    // In a real implementation, this would use the Geolocation API
                    // For this demo, we'll just show a notification

                    const button = this;
                    const originalText = button.innerHTML;

                    button.innerHTML = `
                        <svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Locating...
                    `;

                    setTimeout(function() {
                        button.innerHTML = originalText;

                        // Create a notification
                        const notification = document.createElement('div');
                        notification.className =
                            'fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md z-50';
                        notification.innerHTML = `
                            <div class="flex items-center">
                                <svg class="h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <p>Location detected successfully!</p>
                            </div>
                        `;

                        document.body.appendChild(notification);

                        // Remove the notification after 3 seconds
                        setTimeout(function() {
                            if (document.body.contains(notification)) {
                                document.body.removeChild(notification);
                            }
                        }, 3000);

                        // Update the map (in a real implementation)
                        // Here we just add a subtle animation to simulate map movement
                        const map = document.querySelector('.satellite-map');
                        if (map) {
                            map.style.transition = 'transform 0.5s ease';
                            map.style.transform = 'scale(1.02)';

                            setTimeout(function() {
                                map.style.transform = 'scale(1)';
                            }, 500);
                        }

                    }, 1500);
                });
            }

            // Initialize roof map when page loads
            initializeRoofMapSVG();
            initRoofMap();
            updatePointsUI();

            // Note: Obstacle marking functionality will be initialized when entering Step 3

            // Initialize Step 4 chart with default values
            if (typeof updateChart === 'function') {
                setTimeout(function() {
                    // Select default profile if not already selected
                    const balancedProfile = document.querySelector(
                        '.profile-option[data-profile="balanced"]');
                    if (balancedProfile && !balancedProfile.classList.contains('selected')) {
                        balancedProfile.click();
                    }
                    // Ensure slider value is properly set and positioned
                    if (billSlider && sliderValue) {
                        updateSliderValue();
                    }
                    // Initialize chart
                    updateChart();
                }, 100);
            }
        });

        // Solar point placement functionality
        function initRoofMap() {
            const roofMap = document.getElementById('roofMap');
            if (!roofMap) return;

            roofMap.addEventListener('click', function(e) {
                // Get click position relative to the map
                const rect = roofMap.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                // Check if we clicked on an existing point
                const clickedPointIndex = placedPoints.findIndex(point => {
                    const dx = point.x - x;
                    const dy = point.y - y;
                    return Math.sqrt(dx * dx + dy * dy) < 15; // 15px radius for clicking on a point
                });

                if (clickedPointIndex !== -1) {
                    // Remove the clicked point
                    const pointElement = document.getElementById('point-' + clickedPointIndex);
                    if (pointElement) {
                        pointElement.remove();
                    }
                    placedPoints.splice(clickedPointIndex, 1);
                    updatePointsUI();

                    // Rename remaining points to maintain consecutive IDs
                    document.querySelectorAll('.solar-point').forEach((point, index) => {
                        point.id = 'point-' + index;
                    });
                } else if (placedPoints.length < maxPoints) {
                    // Add a new point
                    const pointId = placedPoints.length;
                    const point = {
                        x,
                        y,
                        id: pointId
                    };
                    placedPoints.push(point);

                    const pointElement = document.createElement('div');
                    pointElement.className = 'solar-point';
                    pointElement.id = 'point-' + pointId;
                    pointElement.style.left = x + 'px';
                    pointElement.style.top = y + 'px';
                    roofMap.appendChild(pointElement);

                    updatePointsUI();
                }
            });
        }

        /**
         * Initialize click handler for the roof map with captured satellite image
         * This handles point placement on the actual satellite image instead of SVG
         */
        function initRoofMapClickHandler() {
            const roofMap = document.getElementById('roofMap');
            if (!roofMap) return;

            // Remove any existing event listeners by cloning the element
            const newRoofMap = roofMap.cloneNode(true);
            roofMap.parentNode.replaceChild(newRoofMap, roofMap);

            // Add new event listener for the captured satellite image
            newRoofMap.addEventListener('click', function(e) {
                // Get click position relative to the image
                const rect = newRoofMap.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                // Check if we clicked on an existing point
                const clickedPointIndex = placedPoints.findIndex(point => {
                    const dx = point.x - x;
                    const dy = point.y - y;
                    return Math.sqrt(dx * dx + dy * dy) < 15; // 15px radius for clicking on a point
                });

                if (clickedPointIndex !== -1) {
                    // Remove the clicked point
                    const pointElement = document.getElementById('satellite-point-' + clickedPointIndex);
                    if (pointElement) {
                        pointElement.remove();
                    }
                    placedPoints.splice(clickedPointIndex, 1);
                    updatePointsUI();

                    // Rename remaining points to maintain consecutive IDs
                    newRoofMap.querySelectorAll('.satellite-solar-point').forEach((point, index) => {
                        point.id = 'satellite-point-' + index;
                    });
                } else if (placedPoints.length < maxPoints) {
                    // Add a new point on the satellite image
                    const pointId = placedPoints.length;
                    const point = {
                        x,
                        y,
                        id: pointId
                    };
                    placedPoints.push(point);

                    // Create a point element styled for satellite image
                    const pointElement = document.createElement('div');
                    pointElement.className = 'satellite-solar-point';
                    pointElement.id = 'satellite-point-' + pointId;
                    pointElement.style.cssText = `
                        position: absolute;
                        left: ${x - 8}px;
                        top: ${y - 8}px;
                        width: 16px;
                        height: 16px;
                        background: #3b82f6;
                        border: 2px solid white;
                        border-radius: 50%;
                        cursor: pointer;
                        z-index: 10;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        transform: scale(1);
                        transition: transform 0.2s ease;
                    `;

                    // Add hover effect
                    pointElement.addEventListener('mouseenter', function() {
                        this.style.transform = 'scale(1.2)';
                    });
                    pointElement.addEventListener('mouseleave', function() {
                        this.style.transform = 'scale(1)';
                    });

                    newRoofMap.appendChild(pointElement);
                    updatePointsUI();

                    // Add a subtle animation when point is placed
                    pointElement.style.transform = 'scale(0)';
                    setTimeout(() => {
                        pointElement.style.transform = 'scale(1)';
                    }, 50);
                }
            });
        }

        function updatePointsUI() {
            const pointCounter = document.getElementById('pointCounter');
            const pointsRemaining = document.getElementById('pointsRemaining');

            if (pointCounter) pointCounter.textContent = placedPoints.length;
            if (pointsRemaining) {
                pointsRemaining.textContent = (maxPoints - placedPoints.length) + ' points remaining';

                if (placedPoints.length >= maxPoints) {
                    pointsRemaining.classList.add('text-green-600');
                    pointsRemaining.classList.remove('text-blue-600');
                } else {
                    pointsRemaining.classList.add('text-blue-600');
                    pointsRemaining.classList.remove('text-green-600');
                }
            }
        }

        function highlightInstructionStep(index) {
            const instructionSteps = document.querySelectorAll('.instruction-step');

            instructionSteps.forEach((step, i) => {
                if (i === index) {
                    step.classList.add('active');
                } else {
                    step.classList.remove('active');
                }
            });

            currentInstructionStep = index;
        }

        function initializeRoofMapSVG() {
            const roofMap = document.getElementById('roofMap');
            if (!roofMap) return;

            const roofMapSvg = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%" preserveAspectRatio="none">
                    <defs>
                        <pattern id="roof-texture" patternUnits="userSpaceOnUse" width="20" height="20" patternTransform="rotate(45)">
                            <rect width="20" height="20" fill="#e2e8f0"/>
                            <line x1="0" y1="0" x2="20" y2="0" stroke="#cbd5e1" stroke-width="1"/>
                        </pattern>
                    </defs>
                    <rect width="600" height="600" fill="#e2e8f0"/>
                    <rect x="100" y="100" width="400" height="400" fill="url(#roof-texture)" stroke="#94a3b8" stroke-width="2"/>
                    <rect x="150" y="150" width="80" height="80" fill="#94a3b8" stroke="#64748b" stroke-width="2" rx="5" ry="5"/>
                    <circle cx="400" cy="200" r="40" fill="#94a3b8" stroke="#64748b" stroke-width="2"/>
                    <rect x="350" y="350" width="100" height="60" fill="#94a3b8" stroke="#64748b" stroke-width="2" rx="5" ry="5"/>
                </svg>
            `;

            roofMap.innerHTML = roofMapSvg;
        }

        // Obstacle marking functionality
        let obstaclePoints = [];
        let currentObstacleInstructionStep = 0;
        const maxObstaclePoints = 6;

        // Variable to track if obstacle marking has been initialized
        let obstacleMarkingInitialized = false;

        function initObstacleMarking() {
            const obstacleRoofMap = document.getElementById('obstacleRoofMap');
            if (!obstacleRoofMap) return;

            // Reset obstacle points when initializing
            obstaclePoints = [];

            // Remove any existing event listeners by cloning and replacing the element
            const newObstacleRoofMap = obstacleRoofMap.cloneNode(false);
            obstacleRoofMap.parentNode.replaceChild(newObstacleRoofMap, obstacleRoofMap);

            // Use the captured satellite image from Step 1, or fallback to SVG
            if (window.capturedSatelliteImage || capturedSatelliteImage) {
                // Create an image element with the captured satellite data
                const img = document.createElement('img');
                img.src = window.capturedSatelliteImage || capturedSatelliteImage;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '8px';
                newObstacleRoofMap.innerHTML = '';
                newObstacleRoofMap.appendChild(img);
            } else {
                // Fallback to SVG if no captured image is available
                const roofMapSvg = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%" preserveAspectRatio="none">
                        <defs>
                            <pattern id="roof-texture-obstacle" patternUnits="userSpaceOnUse" width="20" height="20" patternTransform="rotate(45)">
                                <rect width="20" height="20" fill="#e2e8f0"/>
                                <line x1="0" y1="0" x2="20" y2="0" stroke="#cbd5e1" stroke-width="1"/>
                            </pattern>
                        </defs>
                        <rect width="600" height="600" fill="#e2e8f0"/>
                        <rect x="100" y="100" width="400" height="400" fill="url(#roof-texture-obstacle)" stroke="#94a3b8" stroke-width="2"/>
                        <rect x="150" y="150" width="80" height="80" fill="#94a3b8" stroke="#64748b" stroke-width="2" rx="5" ry="5"/>
                        <circle cx="400" cy="200" r="40" fill="#94a3b8" stroke="#64748b" stroke-width="2"/>
                        <rect x="350" y="350" width="100" height="60" fill="#94a3b8" stroke="#64748b" stroke-width="2" rx="5" ry="5"/>
                    </svg>
                `;
                newObstacleRoofMap.innerHTML = roofMapSvg;
            }

            // Display previously placed solar points from Step 2 as blue placeholders
            if (placedPoints && placedPoints.length > 0) {
                placedPoints.forEach((point, index) => {
                    const pointElement = document.createElement('div');
                    pointElement.className = 'solar-point-display';
                    pointElement.style.left = point.x + 'px';
                    pointElement.style.top = point.y + 'px';
                    pointElement.style.pointerEvents = 'none'; // Make them non-clickable
                    newObstacleRoofMap.appendChild(pointElement);
                });
            }

            // Add click event listener for obstacle placement
            newObstacleRoofMap.addEventListener('click', function(e) {
                // Get the current element (in case it was replaced)
                const currentObstacleRoofMap = document.getElementById('obstacleRoofMap');
                if (!currentObstacleRoofMap) {
                    return;
                }

                const rect = currentObstacleRoofMap.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                // Check if we clicked on an existing obstacle point
                const clickedPointIndex = obstaclePoints.findIndex(point => {
                    const dx = point.x - x;
                    const dy = point.y - y;
                    return Math.sqrt(dx * dx + dy * dy) < 15;
                });

                if (clickedPointIndex !== -1) {
                    // Remove the clicked point
                    highlightObstacleInstructionStep(4);
                    const pointElement = document.getElementById('obstacle-' + clickedPointIndex);
                    if (pointElement) {
                        pointElement.remove();
                    }
                    obstaclePoints.splice(clickedPointIndex, 1);
                    updateObstaclePointsUI();

                    // Rename remaining points
                    document.querySelectorAll('.obstacle-point').forEach((point, index) => {
                        point.id = 'obstacle-' + index;
                    });
                } else if (obstaclePoints.length < maxObstaclePoints) {
                    // Add a new obstacle point
                    if (obstaclePoints.length === 0) {
                        highlightObstacleInstructionStep(0);
                    } else if (obstaclePoints.length === 1) {
                        highlightObstacleInstructionStep(1);
                    } else if (obstaclePoints.length === 2) {
                        highlightObstacleInstructionStep(2);
                    } else {
                        highlightObstacleInstructionStep(3);
                    }

                    const pointId = obstaclePoints.length;
                    const point = {
                        x,
                        y,
                        id: pointId
                    };
                    obstaclePoints.push(point);

                    const pointElement = document.createElement('div');
                    pointElement.className = 'obstacle-point';
                    pointElement.id = 'obstacle-' + pointId;
                    pointElement.style.left = x + 'px';
                    pointElement.style.top = y + 'px';
                    pointElement.style.position = 'absolute';
                    pointElement.style.zIndex = '10';
                    currentObstacleRoofMap.appendChild(pointElement);

                    // Add pulse animation
                    pointElement.animate([{
                            transform: 'translate(-50%, -50%) scale(0.5)',
                            opacity: 0.7
                        },
                        {
                            transform: 'translate(-50%, -50%) scale(1.2)',
                            opacity: 1
                        },
                        {
                            transform: 'translate(-50%, -50%) scale(1)',
                            opacity: 1
                        }
                    ], {
                        duration: 500,
                        easing: 'ease-out'
                    });

                    updateObstaclePointsUI();
                } else {
                    showMaxObstaclePointsMessage();
                }
            });

            updateObstaclePointsUI();
            obstacleMarkingInitialized = true;
        }

        function updateObstaclePointsUI() {
            const pointCounter = document.getElementById('obstaclePointCounter');
            const pointsRemaining = document.getElementById('obstaclePointsRemaining');

            if (pointCounter) pointCounter.textContent = obstaclePoints.length;
            if (pointsRemaining) {
                pointsRemaining.textContent = (maxObstaclePoints - obstaclePoints.length) + ' points remaining';

                if (obstaclePoints.length >= maxObstaclePoints) {
                    pointsRemaining.classList.add('text-green-600');
                    pointsRemaining.classList.remove('text-red-600');
                } else {
                    pointsRemaining.classList.add('text-red-600');
                    pointsRemaining.classList.remove('text-green-600');
                }
            }
        }

        function highlightObstacleInstructionStep(index) {
            const instructionSteps = document.querySelectorAll('.obstacle-step');

            instructionSteps.forEach((step, i) => {
                if (i === index) {
                    step.classList.add('active');
                } else {
                    step.classList.remove('active');
                }
            });

            currentObstacleInstructionStep = index;
        }

        function showMaxObstaclePointsMessage() {
            const message = document.createElement('div');
            message.className =
                'fixed top-4 right-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-md z-50';
            message.innerHTML = `
                <div class="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p>Maximum of 6 obstacle points reached. Remove a point to place a new one.</p>
                </div>
            `;

            document.body.appendChild(message);

            // Remove message after 3 seconds
            setTimeout(function() {
                if (document.body.contains(message)) {
                    document.body.removeChild(message);
                }
            }, 3000);
        }

        /**
         * END OF JAVASCRIPT FUNCTIONALITY
         * 
         * This Solar Estimation Tool provides a complete 6-step interactive form for:
         * 1. Property Location - Address input and map positioning
         * 2. Solar Panel Placement - Interactive roof mapping with point placement
         * 3. Obstacle Marking - Identification of unsuitable roof areas
         * 4. Energy Consumption - Bill analysis and consumption profiling
         * 5. Property Details - Basic property information
         * 6. Roof Type & Building Info - Roof specifications and building details
         * 
         * Key Features:
         * - Responsive design with mobile support
         * - Interactive maps for solar panel and obstacle placement
         * - Real-time calculations and visual feedback
         * - Animated progress indicators and transitions
         * - Comprehensive results with savings estimates
         * - Accessibility-friendly interface with clear instructions
         * 
         * The tool collects all necessary data for solar installation planning
         * and provides users with estimated savings and environmental impact.
         */
    </script>
    <!-- Google Maps API and map logic -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script async defer
        src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBWF4GwzK9NQfaHWgXzpyYzzOZUSsxt824&libraries=places&callback=initMap">
    </script>
    <script>
        // Global variables for Google Maps and satellite image capture
        let map;
        let geocoder;
        let currentMarker;
        let mapCenter = {
            lat: 34.0433,
            lng: -4.9998
        };
        let capturedSatelliteImage = null; // Store the captured satellite image data URL

        // Make initMap globally accessible for Google Maps API callback
        window.initMap = function() {
            map = new google.maps.Map(document.getElementById('map'), {
                zoom: 18,
                center: mapCenter,
                mapTypeId: 'satellite',
                disableDefaultUI: false,
                zoomControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                mapTypeControl: false,
                scaleControl: true,
                scrollwheel: true,
                gestureHandling: 'greedy' // Allows zooming without Ctrl key
            });
            geocoder = new google.maps.Geocoder();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                const autocomplete = new google.maps.places.Autocomplete(searchInput);
                autocomplete.bindTo('bounds', map);
                autocomplete.addListener('place_changed', function() {
                    const place = autocomplete.getPlace();
                    if (!place.geometry || !place.geometry.location) {
                        return;
                    }
                    if (place.geometry.viewport) {
                        map.fitBounds(place.geometry.viewport);
                    } else {
                        map.setCenter(place.geometry.location);
                        map.setZoom(18);
                    }
                    processAddressComponents(place.address_components, place.geometry.location);
                    const locationStatus = document.getElementById('locationStatus');
                    if (locationStatus) {
                        locationStatus.innerHTML =
                            '<span class="text-green-600">✓ Location found from search</span>';
                    }
                });

                // Add fallback geocoding when user presses Enter or input loses focus
                function performFallbackGeocoding() {
                    const query = searchInput.value.trim();
                    const latField = document.getElementById('latitude');
                    // Only perform geocoding if query exists and no coordinates are set
                    if (query && (!latField || !latField.value)) {
                        geocoder.geocode({
                            address: query
                        }, function(results, status) {
                            if (status === 'OK' && results[0]) {
                                const location = results[0].geometry.location;
                                map.setCenter(location);
                                map.setZoom(18);
                                processAddressComponents(results[0].address_components, location);
                                const locationStatus = document.getElementById('locationStatus');
                                if (locationStatus) {
                                    locationStatus.innerHTML =
                                        '<span class="text-green-600">✓ Location found from geocoding</span>';
                                }
                            }
                        });
                    }
                }

                searchInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        performFallbackGeocoding();
                    }
                });

                searchInput.addEventListener('blur', function() {
                    // Small delay to allow autocomplete to trigger first
                    setTimeout(performFallbackGeocoding, 500);
                });
            }
            map.addListener('center_changed', updateMapInfo);
            map.addListener('zoom_changed', updateMapInfo);
            initializeMapControls();
            updateMapInfo();
        }

        function initializeMapControls() {
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

                                // Get address from current location using reverse geocoding
                                geocoder.geocode({
                                    location: currentLocation
                                }, function(results, status) {
                                    if (status === 'OK' && results[0]) {
                                        processAddressComponents(results[0].address_components,
                                            currentLocation);
                                    }
                                });

                                getCurrentLocationBtn.innerHTML =
                                    '<svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg> Current Location';
                                getCurrentLocationBtn.disabled = false;
                                const locationStatus = document.getElementById('locationStatus');
                                if (locationStatus) {
                                    locationStatus.innerHTML =
                                        '<span class="text-green-600">✓ Current location loaded</span>';
                                }
                            },
                            function(error) {
                                getCurrentLocationBtn.innerHTML =
                                    '<svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg> Current Location';
                                getCurrentLocationBtn.disabled = false;
                                const locationStatus = document.getElementById('locationStatus');
                                if (locationStatus) {
                                    locationStatus.innerHTML =
                                        '<span class="text-red-600">❌ Location access denied</span>';
                                }
                            }
                        );
                    } else {
                        const locationStatus = document.getElementById('locationStatus');
                        if (locationStatus) {
                            locationStatus.innerHTML =
                                '<span class="text-red-600">❌ Geolocation not supported</span>';
                        }
                    }
                });
            }
        }

        // Capture current location from map center (replaces the Select Location button functionality)
        function captureCurrentLocation() {
            return new Promise((resolve, reject) => {
                try {
                    if (!map) {
                        throw new Error('Map is not initialized');
                    }
                    if (!geocoder) {
                        throw new Error('Geocoder is not initialized');
                    }

                    const center = map.getCenter();
                    const locationStatus = document.getElementById('locationStatus');

                    if (locationStatus) {
                        locationStatus.innerHTML = '<span class="text-blue-600">🔄 Capturing location...</span>';
                    }

                    // Get address from the current center
                    geocoder.geocode({
                        location: center
                    }, function(results, status) {
                        if (status === 'OK' && results[0]) {
                            processAddressComponents(results[0].address_components, center);
                            if (locationStatus) {
                                locationStatus.innerHTML =
                                    '<span class="text-green-600">✓ Location captured successfully</span>';
                            }
                            resolve();
                        } else {
                            // Even if reverse geocoding fails, we still have coordinates
                            document.getElementById('latitude').value = center.lat();
                            document.getElementById('longitude').value = center.lng();
                            updateMapInfo(); // Update scale and zoom info

                            if (locationStatus) {
                                locationStatus.innerHTML =
                                    '<span class="text-yellow-600">⚠ Location captured (address not found)</span>';
                            }
                            resolve();
                        }
                    });
                } catch (error) {
                    reject(error);
                }
            });
        }

        function processAddressComponents(addressComponents, location) {
            // Initialize address data object (same as old form)
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

            // Process each component (same logic as old form + enhanced for international support)
            addressComponents.forEach(component => {
                const types = component.types;
                if (types.includes('street_number')) componentMap.street_number = component.long_name;
                if (types.includes('route')) componentMap.route = component.long_name;

                // City alternatives for better international support
                if (types.includes('locality')) addressData.city = component.long_name;
                else if (types.includes('sublocality')) addressData.city = component.long_name;
                else if (types.includes('administrative_area_level_2') && !addressData.city) addressData.city =
                    component.long_name;

                // State alternatives
                if (types.includes('administrative_area_level_1')) addressData.state = component.long_name;

                // Postal code alternatives
                if (types.includes('postal_code')) addressData.zip_code = component.long_name;
                else if (types.includes('postal_code_prefix') && !addressData.zip_code) addressData.zip_code =
                    component.long_name;

                // Country
                if (types.includes('country')) addressData.country = component.long_name;
            });

            // Combine street number and route for the street address
            addressData.street = [componentMap.street_number, componentMap.route].filter(Boolean).join(' ');

            // Update the hidden form fields (exactly like old form)
            document.getElementById('street').value = addressData.street;
            document.getElementById('city').value = addressData.city;
            document.getElementById('state').value = addressData.state;
            document.getElementById('zip_code').value = addressData.zip_code;
            document.getElementById('country').value = addressData.country;
            document.getElementById('latitude').value = addressData.latitude;
            document.getElementById('longitude').value = addressData.longitude;

            // Update map scale information
            updateMapInfo();

            // Update address summary display
            updateAddressSummary(addressData);
        }

        function updateAddressSummary(addressData) {
            const addressSummary = document.getElementById('addressSummary');
            const addressPanel = document.getElementById('addressPanel');
            const searchInput = document.getElementById('searchInput');

            if (addressSummary) {
                const addressParts = [addressData.street, addressData.city, addressData.state, addressData.zip_code,
                    addressData.country
                ].filter(Boolean);
                const fullAddress = addressParts.join(', ');

                // Update the search input with the full address (for consistency)
                if (searchInput && fullAddress) {
                    searchInput.value = fullAddress;
                }

                // Store the address data in the hidden element for form submission (but don't display the panel)
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

                // Keep the panel hidden - user won't see the address card
            }
        }

        /**
         * Capture exactly the 200x200px area inside the green capture frame
         * Uses HTML5 Canvas to crop the visible map to just the green box area
         * @returns {Promise} Promise that resolves when the green box area is captured
         */
        /**
         * Capture the area inside the green capture frame using Google Maps Static API
         * This method is reliable and gets clean satellite imagery without overlays
         * @returns {Promise} Promise that resolves when the area is captured
         */
        async function captureSatelliteImage() {
            const mapDiv = document.getElementById('map');
            const captureFrame = document.querySelector('.capture-cadre');

            if (!mapDiv || !captureFrame) {
                throw new Error('Map or capture frame not found');
            }

            try {
                // Get frame position and map details
                const mapRect = mapDiv.getBoundingClientRect();
                const frameRect = captureFrame.getBoundingClientRect();

                // Calculate the geographic area that corresponds to the green frame
                const mapBounds = map.getBounds();
                const ne = mapBounds.getNorthEast();
                const sw = mapBounds.getSouthWest();

                // Calculate degrees per pixel
                const latDegreesPerPixel = (ne.lat() - sw.lat()) / mapDiv.offsetHeight;
                const lngDegreesPerPixel = (ne.lng() - sw.lng()) / mapDiv.offsetWidth;

                // Calculate the center of the green frame in geographic coordinates
                const frameX = frameRect.left - mapRect.left;
                const frameY = frameRect.top - mapRect.top;
                const frameCenterPixelX = frameX + 100; // 200px/2 = 100px
                const frameCenterPixelY = frameY + 100;

                // Convert to geographic coordinates relative to map center
                const mapCenterPixelX = mapDiv.offsetWidth / 2;
                const mapCenterPixelY = mapDiv.offsetHeight / 2;

                const deltaPixelX = frameCenterPixelX - mapCenterPixelX;
                const deltaPixelY = frameCenterPixelY - mapCenterPixelY;

                const mapCenter = map.getCenter();
                const frameCenterLat = mapCenter.lat() - (deltaPixelY * latDegreesPerPixel);
                const frameCenterLng = mapCenter.lng() + (deltaPixelX * lngDegreesPerPixel);

                // Calculate the exact zoom level needed for Static API to match current scale
                // We need to account for the fact that Static API might render slightly differently
                const currentZoom = map.getZoom();

                // Calculate the geographic bounds of the 200x200 pixel green frame
                const frameLatSpan = 200 * latDegreesPerPixel;
                const frameLngSpan = 200 * lngDegreesPerPixel;

                // Get API key
                const apiKey = 'AIzaSyBWF4GwzK9NQfaHWgXzpyYzzOZUSsxt824';

                // Try to get a clean image by requesting slightly larger and cropping
                // This helps avoid attribution bar while maintaining exact scale
                const requestSize = 240; // Request slightly larger

                // Create Static Maps API URL requesting clean satellite image
                const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?` +
                    `center=${frameCenterLat},${frameCenterLng}&` +
                    `zoom=${currentZoom}&` +
                    `size=${requestSize}x${requestSize}&` +
                    `maptype=satellite&` +
                    `scale=1&` +
                    `format=png&` +
                    `style=feature:all|element:labels|visibility:off&` +
                    `style=feature:administrative|element:labels|visibility:off&` +
                    `style=feature:poi|element:labels|visibility:off&` +
                    `style=feature:road|element:labels|visibility:off&` +
                    `style=feature:transit|element:labels|visibility:off&` +
                    `key=${apiKey}`;

                // Load the image and extract the exact center area
                const imageDataUrl = await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';

                    img.onload = function() {
                        // Create canvas for the final 200x200 image
                        const canvas = document.createElement('canvas');
                        canvas.width = 200;
                        canvas.height = 200;
                        const ctx = canvas.getContext('2d');

                        // Enable high quality rendering
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';

                        // Extract the center 200x200 area from the larger image
                        // This removes any attribution while maintaining exact scale
                        const cropSize = 200;
                        const sourceX = (img.width - cropSize) / 2;
                        const sourceY = (img.height - cropSize) / 2;

                        // Draw the exact center area without any scaling
                        ctx.drawImage(
                            img,
                            sourceX, sourceY, cropSize, cropSize, // Source: exact center crop
                            0, 0, 200, 200 // Destination: full canvas
                        );

                        const dataURL = canvas.toDataURL('image/png', 1.0);
                        resolve(dataURL);
                    };

                    img.onerror = function() {
                        reject(new Error('Failed to load satellite image from Static API'));
                    };

                    img.src = staticMapUrl;
                });

                // Store globally for use in other steps
                capturedSatelliteImage = imageDataUrl;
                window.capturedSatelliteImage = imageDataUrl;

                showNotification('Satellite image captured successfully! 📡', 'success');

                return imageDataUrl;

            } catch (error) {
                showNotification('Unable to capture satellite image. Using roof diagram instead.', 'warning');
                throw error;
            }
        }

        /**
         * Update the roof map in Step 2 with the captured satellite image
         * Replaces the SVG with the actual satellite image for more accurate point placement
         * Falls back to SVG if no satellite image is available
         */
        function updateRoofMapWithSatelliteImage() {
            const roofMap = document.getElementById('roofMap');
            if (!roofMap) return;

            if (capturedSatelliteImage) {
                // Use captured satellite image
                roofMap.innerHTML = '';

                // Create an image element with the captured satellite data
                const img = document.createElement('img');
                img.src = capturedSatelliteImage;
                img.alt = 'Captured roof satellite view';
                img.style.cssText = `
                    width: 100%;
                    height: 100%;
                    min-width: 300px;
                    min-height: 300px;
                    max-width: 400px;
                    max-height: 400px;
                    object-fit: contain;
                    border-radius: 8px;
                    cursor: crosshair;
                    user-select: none;
                    display: block;
                    margin: 0 auto;
                    border: 2px solid #10b981;
                    image-rendering: -webkit-optimize-contrast;
                    image-rendering: crisp-edges;
                `;

                roofMap.appendChild(img);

                // Update the roof map container styling for larger sizing
                roofMap.style.cssText = `
                    position: relative;
                    width: 100%;
                    min-width: 300px;
                    max-width: 400px;
                    height: auto;
                    min-height: 300px;
                    max-height: 400px;
                    border: 2px solid #10b981;
                    border-radius: 8px;
                    overflow: hidden;
                    background: #f3f4f6;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    aspect-ratio: 1;
                `;
            } else {
                // Fallback to original SVG roof map
                initializeRoofMapSVG();

                // Update instruction text to reflect fallback mode
                const instructionElement = document.querySelector('#step2 .mt-6.text-sm.text-gray-500');
                if (instructionElement) {
                    instructionElement.innerHTML = `
                        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
                            <div class="flex items-center mb-1">
                                <svg class="w-4 h-4 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                </svg>
                                <span class="text-yellow-700 font-medium text-sm">Using Roof Diagram</span>
                            </div>
                            <p class="text-yellow-600 text-xs">Satellite image unavailable. Using generic roof layout for placement.</p>
                        </div>
                        <p>Click on the roof diagram to place up to 6 blue points on areas suitable for solar panels. Click on existing points to remove them.</p>
                    `;
                }
            }
        }

        /**
         * Show a notification message to the user
         * @param {string} message - The message to display
         * @param {string} type - Type of notification ('success', 'warning', 'error')
         */
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            const colors = {
                success: 'bg-green-100 border-green-500 text-green-700',
                warning: 'bg-yellow-100 border-yellow-500 text-yellow-700',
                error: 'bg-red-100 border-red-500 text-red-700',
                info: 'bg-blue-100 border-blue-500 text-blue-700'
            };

            const icons = {
                success: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>`,
                warning: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>`,
                error: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>`,
                info: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`
            };

            notification.className =
                `fixed bottom-4 right-4 ${colors[type]} border-l-4 p-4 rounded shadow-md z-50 max-w-md`;
            notification.innerHTML = `
                <div class="flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        ${icons[type]}
                    </svg>
                    <p class="text-sm">${message}</p>
                </div>
            `;

            document.body.appendChild(notification);

            // Auto-remove after 4 seconds
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.style.transition = 'opacity 0.3s ease';
                    notification.style.opacity = '0';
                    setTimeout(() => {
                        if (document.body.contains(notification)) {
                            document.body.removeChild(notification);
                        }
                    }, 300);
                }
            }, 4000);
        }

        function updateMapInfo() {
            const center = map.getCenter();
            const zoom = map.getZoom();
            const scale = calculateScale(zoom, center.lat());

            // Update hidden fields with current map data
            document.getElementById('zoom_level').value = zoom;
            document.getElementById('scale_meters_per_pixel').value = scale;
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

        // Calculate real-world bounds of the cadre (200x200px frame)
        function calculateCadreBounds(center, scale) {
            const cadreWidthMeters = 200 * scale; // 200 pixels * scale
            const cadreHeightMeters = 200 * scale; // 200 pixels * scale

            // Convert meters to degrees (approximate)
            const metersPerDegreeLat = 111320; // meters per degree latitude
            const metersPerDegreeLng = 111320 * Math.cos(center.lat() * Math.PI / 180); // adjusted for longitude

            const halfWidthDegrees = cadreWidthMeters / 2 / metersPerDegreeLng;
            const halfHeightDegrees = cadreHeightMeters / 2 / metersPerDegreeLat;

            return {
                north: center.lat() + halfHeightDegrees,
                south: center.lat() - halfHeightDegrees,
                east: center.lng() + halfWidthDegrees,
                west: center.lng() - halfWidthDegrees,
                width_meters: cadreWidthMeters,
                height_meters: cadreHeightMeters
            };
        }
    </script>
</body>

</html>
