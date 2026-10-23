/**
 * CircuitFlow Localized Consumer User Guide & Safety Manual Engine
 * Generates region-specific, multi-language consumer user guides, safety warnings,
 * regulatory compliance notices, and packaging insert layouts.
 */

const LOCALIZATION_DICTIONARY = {
  en: {
    title: "Quick Start & Safety Manual",
    unboxing: "Package Contents",
    quickStart: "Quick Start Guide",
    step1: "1. Unbox device and inspect for physical damage.",
    step2: "2. Charge completely using the provided USB-C cable before initial use.",
    step3: "3. Power on by holding the power button for 3 seconds.",
    step4: "4. Pair with the CircuitFlow Mobile App via Bluetooth Low Energy.",
    safety: "Important Safety Instructions",
    regulatory: "Regulatory & Compliance Notices",
    batteryWarning: "CAUTION: Risk of explosion if battery is replaced by an incorrect type. Dispose of used batteries according to local instructions.",
    waterWarningIP68: "Water Resistant (IP68): Suitable for immersion up to 1.5m for 30 minutes. Do not submerge in salt water or high-velocity water.",
    waterWarningIP65: "Splash Proof (IP65): Protects against low-pressure water jets. Do not submerge in water.",
    recycling: "WEEE Directive: Do not dispose of this product with household waste. Return to an authorized e-waste collection center.",
    warranty: "Limited Warranty: 1-Year manufacturer warranty covering material defects."
  },
  es: {
    title: "Guía de Inicio Rápido y Manual de Seguridad",
    unboxing: "Contenido del Paquete",
    quickStart: "Guía de Inicio Rápido",
    step1: "1. Desembale el dispositivo e inspecciónelo para detectar daños físicos.",
    step2: "2. Cárguelo por completo utilizando el cable USB-C suministrado antes del primer uso.",
    step3: "3. Enciéndalo manteniendo presionado el botón de encendido durante 3 segundos.",
    step4: "4. Empareje con la aplicación CircuitFlow a través de Bluetooth Low Energy.",
    safety: "Instrucciones de Seguridad Importantes",
    regulatory: "Avisos Regulatorios y de Cumplimiento",
    batteryWarning: "PRECAUCIÓN: Riesgo de explosión si la batería se reemplaza por un tipo incorrecto. Deseche las baterías usadas según las instrucciones locales.",
    waterWarningIP68: "Resistente al Agua (IP68): Apto para inmersión hasta 1.5 m durante 30 minutos. No sumergir en agua salada o agua a alta presión.",
    waterWarningIP65: "Resistente a Salpicaduras (IP65): Protege contra chorros de agua de baja presión. No sumergir en agua.",
    recycling: "Directiva RAEES: No deseche este producto con la basura doméstica. Llévelo a un centro de recolección de residuos electrónicos autorizado.",
    warranty: "Garantía Limitada: Garantía del fabricante de 1 año que cubre defectos de material."
  },
  fr: {
    title: "Guide de Démarrage Rapide et Manuel de Sécurité",
    unboxing: "Contenu del'Emballage",
    quickStart: "Guide de Démarrage Rapide",
    step1: "1. Déballez l'appareil et vérifiez qu'il n'est pas endommagé.",
    step2: "2. Chargez complètement à l'aide du câble USB-C fourni avant la première utilisation.",
    step3: "3. Allumez en maintenant le bouton d'alimentation enfoncé pendant 3 secondes.",
    step4: "4. Associez-le à l'application CircuitFlow via Bluetooth Low Energy.",
    safety: "Consignes de Sécurité Importantes",
    regulatory: "Avis de Conformité et Réglementation",
    batteryWarning: "ATTENTION: Risque d'explosion si la batterie est remplacée par un type incorrect. Éliminez les batteries usagées conformément aux instructions locales.",
    waterWarningIP68: "Résistant à l'Eau (IP68): Adapté à une immersion jusqu'à 1,5 m pendant 30 minutes. Ne pas immerger dans l'eau salée.",
    waterWarningIP65: "Résistant aux Éclaboussures (IP65): Protège contre les jets d'eau à basse pression. Ne pas immerger.",
    recycling: "Directive DEEE: Ne pas jeter ce produit avec les ordures ménagères. Rapportez-le à un centre de collecte agréé.",
    warranty: "Garantie Limitée: Garantie constructeur de 1 ans couvrant les défauts de fabrication."
  },
  de: {
    title: "Kurzanleitung & Sicherheitshandbuch",
    unboxing: "Packungsinhalt",
    quickStart: "Schnellstart-Anleitung",
    step1: "1. Packen Sie das Gerät aus und prüfen Sie es auf Beschädigungen.",
    step2: "2. Laden Sie das Gerät vor der ersten Verwendung mit dem mitgelieferten USB-C-Kabel vollständig auf.",
    step3: "3. Schalten Sie das Gerät ein, indem Sie die Ein-/Aus-Taste 3 Sekunden lang gedrückt halten.",
    step4: "4. Koppeln Sie das Gerät über Bluetooth Low Energy mit der CircuitFlow App.",
    safety: "Wichtige Sicherheitshinweise",
    regulatory: "Regulierungs- und Konformitätshinweise",
    batteryWarning: "ACHTUNG: Explosionsgefahr bei unsachgemäßem Austausch der Batterie. Entsorgen Sie verbrauchte Batterien gemäß den örtlichen Anweisungen.",
    waterWarningIP68: "Wasserdicht (IP68): Geeignet für Eintauchen bis 1,5 m für 30 Minuten. Nicht in Salz- oder Hochdruckwasser eintauchen.",
    waterWarningIP65: "Spritzwassergeschützt (IP65): Schutz vor Strahlwasser aus beliebigem Winkel. Nicht unter Wasser tauchen.",
    recycling: "WEEE-Richtlinie: Entsorgen Sie dieses Produkt nicht im Hausmüll. Geben Sie es bei einer autorisierten Sammelstelle ab.",
    warranty: "Eingeschränkte Garantie: 1 Jahr Herstellergarantie auf Materialfehler."
  },
  ja: {
    title: "クイックスタート＆セーフティマニュアル",
    unboxing: "同梱品一覧",
    quickStart: "クイックスタートガイド",
    step1: "1. 製品を開封し、外観に破損がないか確認してください。",
    step2: "2. 初めてご使用になる前に、付属のUSB-Cケーブルで満充電してください。",
    step3: "3. 電源ボタンを3秒間長押しして電源を入れます。",
    step4: "4. CircuitFlowアプリとBluetooth Low Energyでペアリングします。",
    safety: "安全上のご注意",
    regulatory: "規制およびコンプライアンス情報",
    batteryWarning: "警告: 指定以外のバッテリーを使用すると爆発の危険があります。使用済みのバッテリーは自治体の指示に従って廃棄してください。",
    waterWarningIP68: "防水仕様 (IP68): 水深1.5mで最大30分間の水没に耐えます。海水や高圧水流には浸さないでください。",
    waterWarningIP65: "防滴仕様 (IP65): あらゆる方向からの噴流水による有害な影響を受けません。水中に沈めないでください。",
    recycling: "リサイクル指示: 家電リサイクル法に従い、適切な回収窓口へお出しください。",
    warranty: "製品保証: 1年間のメーカー製品保証が付帯しています。"
  },
  zh: {
    title: "快速入门与安全指南",
    unboxing: "包装清单",
    quickStart: "快速入门指南",
    step1: "1. 打开包装并检查设备外观是否完好。",
    step2: "2. 首次使用前，请使用随附的 USB-C 线缆充满电。",
    step3: "3. 长按电源键 3 秒钟开机。",
    step4: "4. 通过低功耗蓝牙 (BLE) 与 CircuitFlow 移动应用配对。",
    safety: "重要安全说明",
    regulatory: "合规与认证信息",
    batteryWarning: "注意: 如果更换的电池类型不正确，可能会有爆炸风险。请按照当地说明处理废旧电池。",
    waterWarningIP68: "防水级别 (IP68): 适用于最深 1.5 米浸水 30 分钟。请勿浸泡在海水或高压水流中。",
    waterWarningIP65: "防溅级别 (IP65): 可抵御低压喷水。请勿浸入水中。",
    recycling: "环保与回收: 请勿将本产品作为生活垃圾处理，请送至指定的电子废弃物回收点。",
    warranty: "有限保修: 提供 1 年原厂材料缺陷质保。"
  }
};

const REGIONAL_COMPLIANCE = {
  US: {
    regionName: "United States / North America",
    standards: ["FCC Part 15 Class B", "UL 62368-1 Safety", "RoHS compliant", "California Prop 65 Notice"],
    marks: ["FCC Logo", "cULus Listed Mark"],
    fccNotice: "This device complies with Part 15 of the FCC Rules. Operation is subject to the condition that this device does not cause harmful interference."
  },
  EU: {
    regionName: "European Union / EEA",
    standards: ["CE RED 2014/53/EU", "EN 62368-1", "RoHS 2011/65/EU", "WEEE 2012/19/EU"],
    marks: ["CE Mark", "WEEE Trash Can Logo"],
    euRepresentative: "EU Authorized Representative: CircuitFlow EU B.V., Amsterdam, Netherlands."
  },
  JP: {
    regionName: "Japan",
    standards: ["MIC Radio Law Technical Conformity (Giteki)", "PSE Denan Law"],
    marks: ["MIC Giteki Mark [R 210-123456]", "PSE Circular Mark"],
    jpNotice: "本製品は電波法に基づく技術基準適合証明を取得しています。"
  },
  CN: {
    regionName: "China",
    standards: ["SRRC Radio Approval", "CCC China Compulsory Certificate", "China RoHS"],
    marks: ["CCC Mark", "SRRC CMIIT ID Mark", "EFUP 10-Year Environment Logo"],
    cnNotice: "本设备包含型号核准代码为 CMIIT ID: 2024DP1234 的无线电发射模块。"
  },
  LATAM: {
    regionName: "Latin America",
    standards: ["NOM / Anatel / Subtel Certification compliant"],
    marks: ["Anatel Mark (Brazil)", "NOM Mark (Mexico)"],
    latamNotice: "Este equipamento obedece aos limites de exposição à radiação de radiofrequência da Anatel/NOM."
  }
};

/**
 * Synthesizes a localized consumer guide and compliance leaflet.
 */
function generateUserGuide({
  productName = "CircuitFlow Smart Device",
  consumerProfile = "extreme-outdoor",
  region = "US",
  language = "en",
  ipRating = "IP68",
  batteryCapacity = "1200 mAh Li-Po"
}) {
  const dict = LOCALIZATION_DICTIONARY[language] || LOCALIZATION_DICTIONARY.en;
  const regionalInfo = REGIONAL_COMPLIANCE[region] || REGIONAL_COMPLIANCE.US;

  const packageContents = [
    `${productName} Hardware Unit`,
    "Braided USB-C Charging & Data Cable (1.0m)",
    "Quick Start & Safety Manual Leaflet",
    consumerProfile === "extreme-outdoor" ? "Rugged Carabiner & Lanyard Clip" : "Ergonomic Silicone Wristband Attachment"
  ];

  const waterNotice = ipRating === "IP68" ? dict.waterWarningIP68 : dict.waterWarningIP65;

  const safetyList = [
    dict.batteryWarning,
    waterNotice,
    `Operating Temperature Range: -20°C to +60°C.`,
    `Power Input Specification: 5V DC, 1.0A Max (Li-Po Cell: ${batteryCapacity}).`
  ];

  const packagingInsertLayout = {
    dimensions: "100mm x 140mm (Folded 4-panel insert)",
    paperWeight: "120 GSM FSC-Certified Matte Recycled Paper",
    printedLanguages: [language.toUpperCase(), "EN"],
    barcodeFormat: "EAN-13 / UPC-A",
    complianceIconGrid: regionalInfo.marks
  };

  return {
    productName,
    region,
    language,
    localizedTitle: `${productName} - ${dict.title}`,
    unboxingSection: {
      header: dict.unboxing,
      items: packageContents
    },
    quickStartSection: {
      header: dict.quickStart,
      steps: [dict.step1, dict.step2, dict.step3, dict.step4]
    },
    safetySection: {
      header: dict.safety,
      warnings: safetyList
    },
    regulatorySection: {
      header: dict.regulatory,
      regionName: regionalInfo.regionName,
      applicableStandards: regionalInfo.standards,
      requiredCertificationMarks: regionalInfo.marks,
      legalDisclaimer: regionalInfo.fccNotice || regionalInfo.euRepresentative || regionalInfo.jpNotice || regionalInfo.cnNotice || regionalInfo.latamNotice,
      recyclingInstruction: dict.recycling
    },
    warrantySection: {
      warrantyText: dict.warranty
    },
    packagingInsertLayout
  };
}

module.exports = {
  generateUserGuide,
  LOCALIZATION_DICTIONARY,
  REGIONAL_COMPLIANCE
};
