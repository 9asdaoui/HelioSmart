"""
Seed database with Moroccan solar market data
Prices in MAD (Moroccan Dirham)
"""

from app.core.database import SessionLocal
from app.models import Panel, Inverter, SolarConfiguration, Utility
from datetime import datetime

def seed_panels():
    """Add solar panels common in Moroccan market"""
    db = SessionLocal()
    
    panels_data = [
        {
            "name": "Jinko Solar Tiger Pro 550W",
            "product_id": "JKM550M-7RL4-V",
            "price": 1650.00,  # MAD
            "weight_kg": 27.5,
            "width_mm": 1134,
            "height_mm": 2278,
            "brand": "Jinko Solar",
            "warranty_years": 25,
            "type": "Monocrystalline",
            "panel_rated_power": 550,
            "maximum_operating_voltage_vmpp": 41.8,
            "maximum_operating_current_impp": 13.16,
            "open_circuit_voltage": 49.95,
            "short_circuit_current": 13.98,
            "module_efficiency": 21.2,
            "maximum_system_voltage": 1500,
            "maximum_series_fuse_rating": 25,
            "num_of_cells": 144,
            "wind_load_kg_per_m2": 2400,
            "snow_load_kg_per_m2": 5400,
            "operating_temperature_from": -40,
            "operating_temperature_to": 85,
            "temp_coefficient_of_pmax": -0.34,
            "temp_coefficient_of_voc": -0.27,
            "temp_coefficient_of_isc": 0.048,
            "nom_operating_cell_temp_noct": 45,
            "connector_type": "MC4",
            "score": 95,
            "status": "active"
        },
        {
            "name": "Canadian Solar HiKu6 540W",
            "product_id": "CS6R-540MS",
            "price": 1580.00,  # MAD
            "weight_kg": 26.8,
            "width_mm": 1134,
            "height_mm": 2278,
            "brand": "Canadian Solar",
            "warranty_years": 25,
            "type": "Monocrystalline",
            "panel_rated_power": 540,
            "maximum_operating_voltage_vmpp": 41.4,
            "maximum_operating_current_impp": 13.04,
            "open_circuit_voltage": 49.6,
            "short_circuit_current": 13.85,
            "module_efficiency": 20.9,
            "maximum_system_voltage": 1500,
            "maximum_series_fuse_rating": 25,
            "num_of_cells": 144,
            "wind_load_kg_per_m2": 2400,
            "snow_load_kg_per_m2": 5400,
            "operating_temperature_from": -40,
            "operating_temperature_to": 85,
            "temp_coefficient_of_pmax": -0.35,
            "temp_coefficient_of_voc": -0.26,
            "temp_coefficient_of_isc": 0.05,
            "nom_operating_cell_temp_noct": 45,
            "connector_type": "MC4",
            "score": 92,
            "status": "active"
        },
        {
            "name": "Longi Hi-MO 5 535W",
            "product_id": "LR5-72HIH-535M",
            "price": 1720.00,  # MAD
            "weight_kg": 27.2,
            "width_mm": 1134,
            "height_mm": 2278,
            "brand": "Longi",
            "warranty_years": 25,
            "type": "Monocrystalline",
            "panel_rated_power": 535,
            "maximum_operating_voltage_vmpp": 41.2,
            "maximum_operating_current_impp": 12.99,
            "open_circuit_voltage": 49.3,
            "short_circuit_current": 13.80,
            "module_efficiency": 20.7,
            "maximum_system_voltage": 1500,
            "maximum_series_fuse_rating": 25,
            "num_of_cells": 144,
            "wind_load_kg_per_m2": 2400,
            "snow_load_kg_per_m2": 5400,
            "operating_temperature_from": -40,
            "operating_temperature_to": 85,
            "temp_coefficient_of_pmax": -0.34,
            "temp_coefficient_of_voc": -0.26,
            "temp_coefficient_of_isc": 0.05,
            "nom_operating_cell_temp_noct": 45,
            "connector_type": "MC4",
            "score": 94,
            "status": "active"
        },
        {
            "name": "JA Solar JAM72S30 545W",
            "product_id": "JAM72S30-545/MR",
            "price": 1620.00,  # MAD
            "weight_kg": 27.0,
            "width_mm": 1134,
            "height_mm": 2278,
            "brand": "JA Solar",
            "warranty_years": 25,
            "type": "Monocrystalline",
            "panel_rated_power": 545,
            "maximum_operating_voltage_vmpp": 41.65,
            "maximum_operating_current_impp": 13.08,
            "open_circuit_voltage": 49.85,
            "short_circuit_current": 13.88,
            "module_efficiency": 21.1,
            "maximum_system_voltage": 1500,
            "maximum_series_fuse_rating": 25,
            "num_of_cells": 144,
            "wind_load_kg_per_m2": 2400,
            "snow_load_kg_per_m2": 5400,
            "operating_temperature_from": -40,
            "operating_temperature_to": 85,
            "temp_coefficient_of_pmax": -0.35,
            "temp_coefficient_of_voc": -0.27,
            "temp_coefficient_of_isc": 0.05,
            "nom_operating_cell_temp_noct": 45,
            "connector_type": "MC4",
            "score": 93,
            "status": "active"
        },
        {
            "name": "Trina Solar Vertex S 530W",
            "product_id": "TSM-530DE18M(II)",
            "price": 1550.00,  # MAD
            "weight_kg": 26.5,
            "width_mm": 1134,
            "height_mm": 2278,
            "brand": "Trina Solar",
            "warranty_years": 25,
            "type": "Monocrystalline",
            "panel_rated_power": 530,
            "maximum_operating_voltage_vmpp": 40.9,
            "maximum_operating_current_impp": 12.96,
            "open_circuit_voltage": 49.1,
            "short_circuit_current": 13.75,
            "module_efficiency": 20.5,
            "maximum_system_voltage": 1500,
            "maximum_series_fuse_rating": 25,
            "num_of_cells": 144,
            "wind_load_kg_per_m2": 2400,
            "snow_load_kg_per_m2": 5400,
            "operating_temperature_from": -40,
            "operating_temperature_to": 85,
            "temp_coefficient_of_pmax": -0.34,
            "temp_coefficient_of_voc": -0.26,
            "temp_coefficient_of_isc": 0.05,
            "nom_operating_cell_temp_noct": 45,
            "connector_type": "MC4",
            "score": 90,
            "status": "active"
        }
    ]
    
    for panel_data in panels_data:
        existing = db.query(Panel).filter(Panel.product_id == panel_data["product_id"]).first()
        if not existing:
            panel = Panel(**panel_data)
            db.add(panel)
            print(f"✓ Added panel: {panel_data['name']}")
        else:
            print(f"✗ Panel already exists: {panel_data['name']}")
    
    db.commit()
    print(f"\n✅ Added {len(panels_data)} panels to database")
    db.close()


def seed_inverters():
    """Add inverters common in Moroccan market"""
    db = SessionLocal()
    
    inverters_data = [
        {
            "name": "Huawei SUN2000-5KTL-L1",
            "product_id": "SUN2000-5KTL-L1",
            "price": 8500.00,  # MAD
            "brand": "Huawei",
            "warranty": 10,
            "nominal_ac_power_kw": 5.0,
            "max_dc_input_power": 6500,
            "mppt_min_voltage": 90,
            "mppt_max_voltage": 560,
            "max_dc_voltage": 600,
            "max_dc_current_mppt": 12.5,
            "no_of_mppt_ports": 2,
            "max_strings_per_mppt": 2,
            "efficiency_max": 98.4,
            "ac_output_voltage": 230,
            "phase_type": "Single Phase",
            "spd_included": True,
            "ip_rating": "IP65",
            "status": "active"
        },
        {
            "name": "Huawei SUN2000-8KTL-M1",
            "product_id": "SUN2000-8KTL-M1",
            "price": 12500.00,  # MAD
            "brand": "Huawei",
            "warranty": 10,
            "nominal_ac_power_kw": 8.0,
            "max_dc_input_power": 12000,
            "mppt_min_voltage": 140,
            "mppt_max_voltage": 980,
            "max_dc_voltage": 1100,
            "max_dc_current_mppt": 13.0,
            "no_of_mppt_ports": 2,
            "max_strings_per_mppt": 2,
            "efficiency_max": 98.6,
            "ac_output_voltage": 400,
            "phase_type": "Three Phase",
            "spd_included": True,
            "ip_rating": "IP65",
            "status": "active"
        },
        {
            "name": "Growatt MIN 3000TL-X",
            "product_id": "MIN-3000TL-X",
            "price": 6200.00,  # MAD
            "brand": "Growatt",
            "warranty": 10,
            "nominal_ac_power_kw": 3.0,
            "max_dc_input_power": 4500,
            "mppt_min_voltage": 50,
            "mppt_max_voltage": 550,
            "max_dc_voltage": 600,
            "max_dc_current_mppt": 13.0,
            "no_of_mppt_ports": 2,
            "max_strings_per_mppt": 1,
            "efficiency_max": 97.6,
            "ac_output_voltage": 230,
            "phase_type": "Single Phase",
            "spd_included": True,
            "ip_rating": "IP65",
            "status": "active"
        },
        {
            "name": "Growatt MID 15KTL3-X",
            "product_id": "MID-15KTL3-X",
            "price": 18500.00,  # MAD
            "brand": "Growatt",
            "warranty": 10,
            "nominal_ac_power_kw": 15.0,
            "max_dc_input_power": 22500,
            "mppt_min_voltage": 200,
            "mppt_max_voltage": 1000,
            "max_dc_voltage": 1100,
            "max_dc_current_mppt": 26.0,
            "no_of_mppt_ports": 2,
            "max_strings_per_mppt": 2,
            "efficiency_max": 98.5,
            "ac_output_voltage": 400,
            "phase_type": "Three Phase",
            "spd_included": True,
            "ip_rating": "IP65",
            "status": "active"
        },
        {
            "name": "Solis 5G 6KW Single Phase",
            "product_id": "S5-GR1P6K",
            "price": 9800.00,  # MAD
            "brand": "Solis",
            "warranty": 10,
            "nominal_ac_power_kw": 6.0,
            "max_dc_input_power": 9000,
            "mppt_min_voltage": 120,
            "mppt_max_voltage": 550,
            "max_dc_voltage": 600,
            "max_dc_current_mppt": 16.0,
            "no_of_mppt_ports": 2,
            "max_strings_per_mppt": 2,
            "efficiency_max": 97.8,
            "ac_output_voltage": 230,
            "phase_type": "Single Phase",
            "spd_included": True,
            "ip_rating": "IP65",
            "status": "active"
        },
        {
            "name": "SMA Sunny Tripower 10.0",
            "product_id": "STP10.0-3AV-40",
            "price": 16200.00,  # MAD
            "brand": "SMA",
            "warranty": 10,
            "nominal_ac_power_kw": 10.0,
            "max_dc_input_power": 15000,
            "mppt_min_voltage": 175,
            "mppt_max_voltage": 800,
            "max_dc_voltage": 1000,
            "max_dc_current_mppt": 33.0,
            "no_of_mppt_ports": 2,
            "max_strings_per_mppt": 2,
            "efficiency_max": 98.4,
            "ac_output_voltage": 400,
            "phase_type": "Three Phase",
            "spd_included": True,
            "ip_rating": "IP65",
            "status": "active"
        },
        {
            "name": "Fronius Primo 5.0-1",
            "product_id": "4,210,071",
            "price": 11500.00,  # MAD
            "brand": "Fronius",
            "warranty": 10,
            "nominal_ac_power_kw": 5.0,
            "max_dc_input_power": 7500,
            "mppt_min_voltage": 80,
            "mppt_max_voltage": 600,
            "max_dc_voltage": 1000,
            "max_dc_current_mppt": 18.0,
            "no_of_mppt_ports": 2,
            "max_strings_per_mppt": 2,
            "efficiency_max": 98.1,
            "ac_output_voltage": 230,
            "phase_type": "Single Phase",
            "spd_included": False,
            "ip_rating": "IP65",
            "status": "active"
        }
    ]
    
    for inverter_data in inverters_data:
        existing = db.query(Inverter).filter(Inverter.product_id == inverter_data["product_id"]).first()
        if not existing:
            inverter = Inverter(**inverter_data)
            db.add(inverter)
            print(f"✓ Added inverter: {inverter_data['name']}")
        else:
            print(f"✗ Inverter already exists: {inverter_data['name']}")
    
    db.commit()
    print(f"\n✅ Added {len(inverters_data)} inverters to database")
    db.close()


def seed_configurations():
    """Add solar configurations for Moroccan market"""
    db = SessionLocal()
    
    configs_data = [
        {
            "name": "Electricity Rate",
            "key": "electricity_rate",
            "value": "1.50",
            "description": "Average electricity rate in Morocco (MAD per kWh)"
        },
        {
            "name": "Solar Production Factor",
            "key": "solar_production_factor",
            "value": "1650",
            "description": "Average annual solar production per kW in Morocco (kWh/kW/year)"
        },
        {
            "name": "Optimal Tilt Angle",
            "key": "optimal_tilt_angle",
            "value": "32",
            "description": "Optimal tilt angle for Morocco (degrees)"
        },
        {
            "name": "Default Azimuth",
            "key": "default_azimuth",
            "value": "180",
            "description": "Default azimuth facing south (degrees)"
        },
        {
            "name": "Default System Losses",
            "key": "default_losses_percent",
            "value": "14",
            "description": "Default system losses percentage"
        },
        {
            "name": "Panels per kW",
            "key": "panels_per_kw",
            "value": "2.0",
            "description": "Average number of panels per kW (for 500W panels)"
        },
        {
            "name": "Installation Cost per Watt",
            "key": "installation_cost_per_watt",
            "value": "1.2",
            "description": "Installation cost in MAD per Watt"
        },
        {
            "name": "Mounting Structure Cost per Panel",
            "key": "mounting_cost_per_panel",
            "value": "250",
            "description": "Mounting structure cost per panel (MAD)"
        },
        {
            "name": "Cable Cost per Meter",
            "key": "cable_cost_per_meter",
            "value": "25",
            "description": "Electrical cable cost per meter (MAD)"
        },
        {
            "name": "Performance Ratio",
            "key": "performance_ratio",
            "value": "0.85",
            "description": "System performance ratio (0-1)"
        }
    ]
    
    for config_data in configs_data:
        existing = db.query(SolarConfiguration).filter(SolarConfiguration.key == config_data["key"]).first()
        if not existing:
            config = SolarConfiguration(**config_data)
            db.add(config)
            print(f"✓ Added config: {config_data['name']}")
        else:
            # Update existing
            existing.value = config_data["value"]
            existing.description = config_data["description"]
            print(f"↻ Updated config: {config_data['name']}")
    
    db.commit()
    print(f"\n✅ Added/Updated {len(configs_data)} configurations")
    db.close()


def seed_utilities():
    """Add Moroccan utility companies"""
    db = SessionLocal()
    
    utilities_data = [
        {
            "name": "ONEE - Office National de l'Electricité et de l'Eau",
            "state": "National",
            "city": "Casablanca",
            "country": "Morocco"
        },
        {
            "name": "Lydec",
            "state": "Casablanca-Settat",
            "city": "Casablanca",
            "country": "Morocco"
        },
        {
            "name": "Redal",
            "state": "Rabat-Salé-Kénitra",
            "city": "Rabat",
            "country": "Morocco"
        },
        {
            "name": "Amendis Tanger",
            "state": "Tanger-Tétouan-Al Hoceïma",
            "city": "Tanger",
            "country": "Morocco"
        },
        {
            "name": "Amendis Tétouan",
            "state": "Tanger-Tétouan-Al Hoceïma",
            "city": "Tétouan",
            "country": "Morocco"
        }
    ]
    
    for utility_data in utilities_data:
        existing = db.query(Utility).filter(Utility.name == utility_data["name"]).first()
        if not existing:
            utility = Utility(**utility_data)
            db.add(utility)
            print(f"✓ Added utility: {utility_data['name']}")
        else:
            print(f"✗ Utility already exists: {utility_data['name']}")
    
    db.commit()
    print(f"\n✅ Added {len(utilities_data)} utilities")
    db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("🇲🇦 Seeding Moroccan Solar Market Data")
    print("=" * 60)
    print()
    
    print("📦 Seeding Panels...")
    print("-" * 60)
    seed_panels()
    print()
    
    print("⚡ Seeding Inverters...")
    print("-" * 60)
    seed_inverters()
    print()
    
    print("⚙️  Seeding Configurations...")
    print("-" * 60)
    seed_configurations()
    print()
    
    print("🏢 Seeding Utilities...")
    print("-" * 60)
    seed_utilities()
    print()
    
    print("=" * 60)
    print("✅ Database seeding complete!")
    print("=" * 60)
    print()
    print("📊 Summary:")
    print("   • 5 Solar Panels (500-550W)")
    print("   • 7 Inverters (3-15kW)")
    print("   • 10 Configurations")
    print("   • 5 Moroccan Utilities")
    print()
    print("💰 All prices in MAD (Moroccan Dirham)")
    print()
