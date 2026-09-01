// Inspection Checklist Definitions — 150-Point Standard Checklist

export interface InspectionItemDefinition {
  key: string;
  category: InspectionCategoryKey;
  label: string;
  defaultAction: 'none' | 'cleaning' | 'repair' | 'replacement' | 'artisan_dispatch';
}

export type InspectionCategoryKey =
  | 'exterior_entrance'
  | 'living_dining'
  | 'kitchen_pantry'
  | 'master_suite'
  | 'secondary_bedrooms'
  | 'bathrooms'
  | 'submetering_utilities'
  | 'plumbing_water'
  | 'security_safety'
  | 'handover_keys';

export interface InspectionCategoryDefinition {
  key: InspectionCategoryKey;
  title: string;
  icon: string;
  description: string;
  items: InspectionItemDefinition[];
}

export const INSPECTION_CATEGORIES: InspectionCategoryDefinition[] = [
  {
    key: 'exterior_entrance',
    title: '1. Exterior & Main Entrance',
    icon: 'DoorOpen',
    description: 'Compound gates, perimeter fencing, parking slots, and main entrance doors.',
    items: [
      { key: 'ext_main_gate', category: 'exterior_entrance', label: 'Motorized compound gate & motor chain', defaultAction: 'none' },
      { key: 'ext_gate_lock', category: 'exterior_entrance', label: 'Gate deadbolt & padlock brackets', defaultAction: 'none' },
      { key: 'ext_perimeter_wall', category: 'exterior_entrance', label: 'Perimeter wall plaster & paintwork', defaultAction: 'none' },
      { key: 'ext_electric_fence', category: 'exterior_entrance', label: 'Electric fence wires & warning signs', defaultAction: 'none' },
      { key: 'ext_driveway_paving', category: 'exterior_entrance', label: 'Driveway paving blocks & drainage kerbs', defaultAction: 'none' },
      { key: 'ext_parking_carport', category: 'exterior_entrance', label: 'Carport shade netting & metal frame', defaultAction: 'none' },
      { key: 'ext_security_post', category: 'exterior_entrance', label: 'Security guard house & light switches', defaultAction: 'none' },
      { key: 'ext_compound_lighting', category: 'exterior_entrance', label: 'Compound floodlights & photocell sensor', defaultAction: 'none' },
      { key: 'ext_main_door', category: 'exterior_entrance', label: 'Main front security door & cylinder lock', defaultAction: 'none' },
      { key: 'ext_doorbell_intercom', category: 'exterior_entrance', label: 'Doorbell & video intercom station', defaultAction: 'none' },
      { key: 'ext_porch_tiles', category: 'exterior_entrance', label: 'Entrance porch tiling & door mat trim', defaultAction: 'none' },
      { key: 'ext_refuse_area', category: 'exterior_entrance', label: 'Refuse bin storage area & drain', defaultAction: 'none' },
    ],
  },
  {
    key: 'living_dining',
    title: '2. Living & Dining Spaces',
    icon: 'Sofa',
    description: 'Living room, formal dining area, walls, lighting, ceiling fans and AC.',
    items: [
      { key: 'liv_entry_lock', category: 'living_dining', label: 'Entry door handle, lockset & keys', defaultAction: 'none' },
      { key: 'liv_ceiling_cornice', category: 'living_dining', label: 'POP ceiling, cornices & plaster board', defaultAction: 'none' },
      { key: 'liv_walls_paint', category: 'living_dining', label: 'Wall paint finish & skirting boards', defaultAction: 'none' },
      { key: 'liv_flooring_tiles', category: 'living_dining', label: 'Floor tiles, grout & threshold strips', defaultAction: 'none' },
      { key: 'liv_sliding_windows', category: 'living_dining', label: 'Glazed sliding windows & latches', defaultAction: 'none' },
      { key: 'liv_insect_nets', category: 'living_dining', label: 'Window mosquito netting & frames', defaultAction: 'none' },
      { key: 'liv_burglar_proof', category: 'living_dining', label: 'Window metal burglar-proofing bars', defaultAction: 'none' },
      { key: 'liv_curtain_rods', category: 'living_dining', label: 'Curtain rods & wall mounting brackets', defaultAction: 'none' },
      { key: 'liv_main_ac', category: 'living_dining', label: 'Split AC unit cooling & remote controller', defaultAction: 'none' },
      { key: 'liv_ceiling_fan', category: 'living_dining', label: 'Ceiling fan balance & wall regulator', defaultAction: 'none' },
      { key: 'liv_lighting_fixtures', category: 'living_dining', label: 'LED spotlights & main chandelier', defaultAction: 'none' },
      { key: 'liv_power_sockets', category: 'living_dining', label: '13A electrical socket outlets & faceplates', defaultAction: 'none' },
      { key: 'liv_tv_data_points', category: 'living_dining', label: 'TV coaxial & RJ45 internet data points', defaultAction: 'none' },
      { key: 'liv_dining_lighting', category: 'living_dining', label: 'Dining pendant lighting & switch', defaultAction: 'none' },
      { key: 'liv_dining_ac', category: 'living_dining', label: 'Dining area AC unit & airflow louvers', defaultAction: 'none' },
    ],
  },
  {
    key: 'kitchen_pantry',
    title: '3. Kitchen, Pantry & Laundry',
    icon: 'Utensils',
    description: 'Cabinetry, appliances, gas/electric connections, sink plumbing and drainage.',
    items: [
      { key: 'kitch_cabinets_upper', category: 'kitchen_pantry', label: 'Upper wall cabinets, hinges & doors', defaultAction: 'none' },
      { key: 'kitch_cabinets_lower', category: 'kitchen_pantry', label: 'Lower floor cabinets & slide-out drawers', defaultAction: 'none' },
      { key: 'kitch_countertop', category: 'kitchen_pantry', label: 'Granite/Quartz countertop & silicone seal', defaultAction: 'none' },
      { key: 'kitch_backsplash_tiles', category: 'kitchen_pantry', label: 'Tiled backsplash & electrical cutouts', defaultAction: 'none' },
      { key: 'kitch_sink_basin', category: 'kitchen_pantry', label: 'Stainless steel sink basin & strainer waste', defaultAction: 'none' },
      { key: 'kitch_mixer_tap', category: 'kitchen_pantry', label: 'Gooseneck mixer tap & water pressure', defaultAction: 'none' },
      { key: 'kitch_undersink_drain', category: 'kitchen_pantry', label: 'Under-sink P-trap & leak inspection', defaultAction: 'none' },
      { key: 'kitch_cooker_gas', category: 'kitchen_pantry', label: 'Gas hob/electric stove burners & ignition', defaultAction: 'none' },
      { key: 'kitch_extractor_hood', category: 'kitchen_pantry', label: 'Range extractor hood, filter & light', defaultAction: 'none' },
      { key: 'kitch_oven_grill', category: 'kitchen_pantry', label: 'Built-in oven, racks & temperature dial', defaultAction: 'none' },
      { key: 'kitch_microwave', category: 'kitchen_pantry', label: 'Microwave oven turntable & timer', defaultAction: 'none' },
      { key: 'kitch_refrigerator', category: 'kitchen_pantry', label: 'Double door fridge/freezer & ice maker', defaultAction: 'none' },
      { key: 'kitch_dishwasher', category: 'kitchen_pantry', label: 'Dishwasher spray arms & drain hose', defaultAction: 'none' },
      { key: 'kitch_washing_machine', category: 'kitchen_pantry', label: 'Washing machine inlet, drum & vibration', defaultAction: 'none' },
      { key: 'kitch_pantry_shelves', category: 'kitchen_pantry', label: 'Pantry room shelving & ventilation louvers', defaultAction: 'none' },
      { key: 'kitch_fire_blanket', category: 'kitchen_pantry', label: 'Kitchen fire blanket & 2kg CO2 extinguisher', defaultAction: 'none' },
      { key: 'kitch_gas_cylinder_bay', category: 'kitchen_pantry', label: 'External gas cylinder cage & copper pipe', defaultAction: 'none' },
    ],
  },
  {
    key: 'master_suite',
    title: '4. Master Bedroom Suite',
    icon: 'BedDouble',
    description: 'Master bedroom, walk-in closet, private balcony, AC, and doors.',
    items: [
      { key: 'mast_door_lock', category: 'master_suite', label: 'Master bedroom door, lock & key', defaultAction: 'none' },
      { key: 'mast_wardrobe_closet', category: 'master_suite', label: 'Walk-in wardrobe drawers, rails & mirrors', defaultAction: 'none' },
      { key: 'mast_walls_paint', category: 'master_suite', label: 'Bedroom wall paint & ceiling cornices', defaultAction: 'none' },
      { key: 'mast_floor_tiles', category: 'master_suite', label: 'Floor tiles/laminate wooden flooring', defaultAction: 'none' },
      { key: 'mast_windows_netting', category: 'master_suite', label: 'Glazed windows, latches & insect netting', defaultAction: 'none' },
      { key: 'mast_burglar_bars', category: 'master_suite', label: 'Window security bars & emergency latch', defaultAction: 'none' },
      { key: 'mast_ac_unit', category: 'master_suite', label: 'Master AC unit cooling & remote controller', defaultAction: 'none' },
      { key: 'mast_ceiling_fan', category: 'master_suite', label: 'Ceiling fan & dual light controller', defaultAction: 'none' },
      { key: 'mast_bedside_sockets', category: 'master_suite', label: 'Bedside reading switches & USB sockets', defaultAction: 'none' },
      { key: 'mast_balcony_door', category: 'master_suite', label: 'Balcony sliding door & lock mechanism', defaultAction: 'none' },
      { key: 'mast_balcony_railing', category: 'master_suite', label: 'Balcony safety railing & drain spout', defaultAction: 'none' },
    ],
  },
  {
    key: 'secondary_bedrooms',
    title: '5. Secondary Bedrooms (Guest / Kids)',
    icon: 'Bed',
    description: 'Guest bedrooms, children rooms, closets, windows and ventilation.',
    items: [
      { key: 'bed2_door_lock', category: 'secondary_bedrooms', label: 'Bedroom 2 door, lockset & keys', defaultAction: 'none' },
      { key: 'bed2_wardrobe', category: 'secondary_bedrooms', label: 'Bedroom 2 built-in wardrobe & shelving', defaultAction: 'none' },
      { key: 'bed2_windows_net', category: 'secondary_bedrooms', label: 'Bedroom 2 windows, latches & nets', defaultAction: 'none' },
      { key: 'bed2_ac_fan', category: 'secondary_bedrooms', label: 'Bedroom 2 AC unit & ceiling fan', defaultAction: 'none' },
      { key: 'bed2_sockets', category: 'secondary_bedrooms', label: 'Bedroom 2 sockets & light switches', defaultAction: 'none' },
      { key: 'bed3_door_lock', category: 'secondary_bedrooms', label: 'Bedroom 3 door, lockset & keys', defaultAction: 'none' },
      { key: 'bed3_wardrobe', category: 'secondary_bedrooms', label: 'Bedroom 3 built-in wardrobe & shelving', defaultAction: 'none' },
      { key: 'bed3_windows_net', category: 'secondary_bedrooms', label: 'Bedroom 3 windows & insect netting', defaultAction: 'none' },
      { key: 'bed3_ac_fan', category: 'secondary_bedrooms', label: 'Bedroom 3 AC unit & ceiling fan', defaultAction: 'none' },
      { key: 'bed3_sockets', category: 'secondary_bedrooms', label: 'Bedroom 3 sockets & light switches', defaultAction: 'none' },
      { key: 'boys_quarters_room', category: 'secondary_bedrooms', label: 'Staff / Boys quarters room door & window', defaultAction: 'none' },
    ],
  },
  {
    key: 'bathrooms',
    title: '6. Bathrooms & Guest Powder Room',
    icon: 'Bath',
    description: 'Toilets, showers, water heaters, vanities, faucets and floor drains.',
    items: [
      { key: 'bath_mast_toilet', category: 'bathrooms', label: 'Master toilet bowl, dual-flush & seat lid', defaultAction: 'none' },
      { key: 'bath_mast_cistern_valve', category: 'bathrooms', label: 'Master cistern inlet valve & angle valve', defaultAction: 'none' },
      { key: 'bath_mast_vanity_sink', category: 'bathrooms', label: 'Master washbasin, mixer tap & pop-up waste', defaultAction: 'none' },
      { key: 'bath_mast_mirror_cabinet', category: 'bathrooms', label: 'Master bathroom LED mirror & shaver point', defaultAction: 'none' },
      { key: 'bath_mast_shower_glass', category: 'bathrooms', label: 'Master frameless glass shower cubicle', defaultAction: 'none' },
      { key: 'bath_mast_shower_mixer', category: 'bathrooms', label: 'Master rainfall shower head & handheld wand', defaultAction: 'none' },
      { key: 'bath_mast_water_heater', category: 'bathrooms', label: 'Master 50L Ariston water heater & breaker', defaultAction: 'none' },
      { key: 'bath_mast_floor_drain', category: 'bathrooms', label: 'Master floor drain trap & water slope', defaultAction: 'none' },
      { key: 'bath_mast_extractor', category: 'bathrooms', label: 'Master bathroom ceiling exhaust fan', defaultAction: 'none' },
      { key: 'bath_bed2_toilet_flush', category: 'bathrooms', label: 'Bathroom 2 toilet & bidet spray shattaf', defaultAction: 'none' },
      { key: 'bath_bed2_shower_tap', category: 'bathrooms', label: 'Bathroom 2 shower mixer & curtain rod', defaultAction: 'none' },
      { key: 'bath_bed2_water_heater', category: 'bathrooms', label: 'Bathroom 2 water heater & isolator', defaultAction: 'none' },
      { key: 'bath_guest_powder_room', category: 'bathrooms', label: 'Guest powder room toilet & mini washbasin', defaultAction: 'none' },
    ],
  },
  {
    key: 'submetering_utilities',
    title: '7. Submetering & Electrical Infrastructure',
    icon: 'Gauge',
    description: 'ECG electricity meters, distribution panels, surge protectors and generator.',
    items: [
      { key: 'util_ecg_meter_seal', category: 'submetering_utilities', label: 'ECG meter tamper seal & casing condition', defaultAction: 'none' },
      { key: 'util_ecg_meter_display', category: 'submetering_utilities', label: 'ECG prepaid meter LCD readout & keypad', defaultAction: 'none' },
      { key: 'util_distribution_board', category: 'submetering_utilities', label: 'Main distribution board (MCBs & RCD trip)', defaultAction: 'none' },
      { key: 'util_surge_protector', category: 'submetering_utilities', label: 'Whole-house surge protector device (SPD)', defaultAction: 'none' },
      { key: 'util_earthing_rod', category: 'submetering_utilities', label: 'Earth grounding pit & lightning arrester', defaultAction: 'none' },
      { key: 'util_ats_changeover', category: 'submetering_utilities', label: 'Automatic Transfer Switch (ATS) changeover', defaultAction: 'none' },
      { key: 'util_generator_hours', category: 'submetering_utilities', label: 'Diesel generator hour meter reading', defaultAction: 'none' },
      { key: 'util_generator_oil_fuel', category: 'submetering_utilities', label: 'Generator fuel gauge & engine oil level', defaultAction: 'none' },
      { key: 'util_solar_inverter', category: 'submetering_utilities', label: 'Solar inverter panel, batteries & SOC %', defaultAction: 'none' },
    ],
  },
  {
    key: 'plumbing_water',
    title: '8. Plumbing, Polytanks & Borehole',
    icon: 'Droplet',
    description: 'GWCL mains, water reservoir tanks, booster pumps and drainage chambers.',
    items: [
      { key: 'plumb_gwcl_meter', category: 'plumbing_water', label: 'GWCL water meter index & stopcock valve', defaultAction: 'none' },
      { key: 'plumb_ground_sump_tank', category: 'plumbing_water', label: 'Ground water reservoir tank & float valve', defaultAction: 'none' },
      { key: 'plumb_overhead_polytank', category: 'plumbing_water', label: 'Overhead Polytank (Rambo 5000L) & overflow', defaultAction: 'none' },
      { key: 'plumb_booster_pump', category: 'plumbing_water', label: 'Automatic booster pressure pump & switch', defaultAction: 'none' },
      { key: 'plumb_filtration_system', category: 'plumbing_water', label: 'Whole-house sediment & carbon water filter', defaultAction: 'none' },
      { key: 'plumb_borehole_pump', category: 'plumbing_water', label: 'Borehole submersible pump & control box', defaultAction: 'none' },
      { key: 'plumb_manhole_inspection', category: 'plumbing_water', label: 'External manhole chambers & grease trap', defaultAction: 'none' },
      { key: 'plumb_septic_biodigester', category: 'plumbing_water', label: 'Septic tank / Biodigester soakaway', defaultAction: 'none' },
    ],
  },
  {
    key: 'security_safety',
    title: '9. Security, Fire & Safety Systems',
    icon: 'ShieldCheck',
    description: 'CCTV surveillance, smoke alarms, panic buttons and safety signage.',
    items: [
      { key: 'sec_cctv_cameras', category: 'security_safety', label: 'CCTV cameras lens cleanliness & angle', defaultAction: 'none' },
      { key: 'sec_nvr_recording', category: 'security_safety', label: 'NVR recorder & live video stream feed', defaultAction: 'none' },
      { key: 'sec_smoke_detectors', category: 'security_safety', label: 'Smoke & heat detectors battery test', defaultAction: 'none' },
      { key: 'sec_fire_extinguishers', category: 'security_safety', label: 'Dry powder fire extinguisher inspection date', defaultAction: 'none' },
      { key: 'sec_panic_buttons', category: 'security_safety', label: 'Emergency panic buttons / security link', defaultAction: 'none' },
      { key: 'sec_emergency_exit', category: 'security_safety', label: 'Secondary emergency escape stairs & doors', defaultAction: 'none' },
    ],
  },
  {
    key: 'handover_keys',
    title: '10. Keys, Access Remotes & Inventory Handover',
    icon: 'Key',
    description: 'Physical keys count, gate RFID cards, AC remotes, and meter cards.',
    items: [
      { key: 'key_gate_remote_1', category: 'handover_keys', label: 'Motorized Gate Remote #1 with battery', defaultAction: 'none' },
      { key: 'key_gate_remote_2', category: 'handover_keys', label: 'Motorized Gate Remote #2 with battery', defaultAction: 'none' },
      { key: 'key_front_door_keys', category: 'handover_keys', label: 'Front Entrance Door Master Keys (3 copies)', defaultAction: 'none' },
      { key: 'key_bedroom_keys_set', category: 'handover_keys', label: 'Interior Bedroom Keys Full Set tagged', defaultAction: 'none' },
      { key: 'key_ac_remotes_count', category: 'handover_keys', label: 'AC Remote Controllers (All rooms tested)', defaultAction: 'none' },
      { key: 'key_fan_remotes_count', category: 'handover_keys', label: 'Ceiling Fan Remote Controllers', defaultAction: 'none' },
      { key: 'key_ecg_card', category: 'handover_keys', label: 'ECG Smart Meter Card for recharge top-up', defaultAction: 'none' },
      { key: 'key_mailbox_key', category: 'handover_keys', label: 'Compound Mailbox / Letterbox Key', defaultAction: 'none' },
    ],
  },
];

export const TOTAL_INSPECTION_POINTS = INSPECTION_CATEGORIES.reduce(
  (sum, cat) => sum + cat.items.length,
  0
);
