/**
 * Consumer Target Characteristics Engine
 * CircuitFlow Platform
 */

function processConsumerProfile(profileType = 'outdoor_sports', customOverrides = {}) {
  const profiles = {
    children: {
      profileName: 'Children / Educational',
      ipRating: 'IP54 (Spill & Dust Resistant)',
      dropTestRating: '2.0 Meter Drop Resistant',
      materialRequirements: ['Biocompatible ABS', 'Hypoallergenic Silicone Sleeve', 'Non-toxic paint'],
      fastenerSecurity: 'Tamper-proof Torx T6 Screws (Child Safety Standard)',
      operatingTempRange_C: '-10 to +40',
      minWallThickness_mm: 2.5
    },
    outdoor_sports: {
      profileName: 'Extreme Outdoor / Ruggedized',
      ipRating: 'IP68 (Submersible Waterproof)',
      dropTestRating: '3.0 Meter Military Drop Spec (MIL-STD-810H)',
      materialRequirements: ['Polycarbonate Body', 'TPU Rubber Overmolding', 'Corrosion-Resistant Anodized Bezel'],
      fastenerSecurity: 'Stainless Steel M2.5 Threaded Inserts + O-Ring Gaskets',
      operatingTempRange_C: '-20 to +65',
      minWallThickness_mm: 3.0
    },
    industrial_tech: {
      profileName: 'Industrial Field Technician',
      ipRating: 'IP65 (Dust-Tight & Water Jet Resistant)',
      dropTestRating: '1.5 Meter Drop Resistant',
      materialRequirements: ['Flame Retardant ABS/PC (UL94-V0)', 'Chemical Resistant Gaskets'],
      fastenerSecurity: 'Captive Stainless Steel Screws',
      operatingTempRange_C: '-40 to +85',
      minWallThickness_mm: 2.8
    },
    healthcare: {
      profileName: 'Medical / Patient Wearable',
      ipRating: 'IP67 (Submersible & Disinfectant Washdown Safe)',
      dropTestRating: '1.2 Meter Drop Resistant',
      materialRequirements: ['Medical Grade ISO 10993 Biocompatible Polymer', 'Skin-Safe Hypoallergenic TPU'],
      fastenerSecurity: 'Ultrasonic Welded Seamless Housing',
      operatingTempRange_C: '+10 to +45',
      minWallThickness_mm: 2.0
    }
  };

  const selected = profiles[profileType] || profiles.outdoor_sports;

  return {
    ...selected,
    ...customOverrides,
    derivedSpecs: {
      requiresGasketSeal: selected.ipRating.includes('IP67') || selected.ipRating.includes('IP68'),
      requiresOvermolding: selected.materialRequirements.some(m => m.includes('Overmolding') || m.includes('TPU')),
      recommendedMaterial: selected.materialRequirements[0]
    }
  };
}

module.exports = {
  processConsumerProfile
};
