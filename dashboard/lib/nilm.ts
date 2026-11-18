import { ApplianceProfile } from '@/types/energy';

export const APPLIANCE_PROFILES: ApplianceProfile[] = [
  {
    id: 'standby',
    name: 'Standby / Idle (Tanpa Beban)',
    category: 'Standby',
    minWatt: 0,
    maxWatt: 2.0,
    typicalWatt: 0.5,
    loadType: 'Campuran',
    description: 'Stopkontak aktif namun tidak ada perangkat yang menyala atau hanya sisa arus bocor kecil.',
  },
  {
    id: 'charger_led',
    name: 'Charger Ponsel / Lampu LED',
    category: 'Elektronik Rendah',
    minWatt: 2.1,
    maxWatt: 25.0,
    typicalWatt: 12.0,
    loadType: 'Elektronik / Switching',
    description: 'Adaptor daya switching atau lampu penerangan hemat energi dengan beban rendah stabil.',
  },
  {
    id: 'fan',
    name: 'Kipas Angin Standar',
    category: 'Motorik Induktif Kecil',
    minWatt: 25.1,
    maxWatt: 85.0,
    typicalWatt: 50.0,
    loadType: 'Induktif',
    description: 'Motor induksi fase tunggal kipas meja / berdiri (Kecepatan 1 hingga 3). Sesuai PRD B-04.',
  },
  {
    id: 'tv_pc',
    name: 'Smart TV LED / Monitor Desktop',
    category: 'Display & Komputasi',
    minWatt: 85.1,
    maxWatt: 200.0,
    typicalWatt: 130.0,
    loadType: 'Elektronik / Switching',
    description: 'Layar TV LED modern 43-55 inci atau workstation mini dengan catu daya konstan.',
  },
  {
    id: 'refrigerator',
    name: 'Kulkas (Kompresor Aktif)',
    category: 'Refrigerasi / Pendingin',
    minWatt: 200.1,
    maxWatt: 380.0,
    typicalWatt: 260.0,
    loadType: 'Induktif',
    description: 'Siklus termostat kompresor pendingin aktif dengan profil lonjakan arus start (inrush) sesaat.',
  },
  {
    id: 'dispenser_cooker',
    name: 'Dispenser Panas / Rice Cooker',
    category: 'Pemanas Termal Sedang',
    minWatt: 380.1,
    maxWatt: 500.0,
    typicalWatt: 420.0,
    loadType: 'Resistif',
    description: 'Elemen pemanas air atau mode memasak penanak nasi dengan faktor daya murni mendekati 1.0.',
  },
  {
    id: 'iron_heater',
    name: 'Setrika Listrik / Pemanas Berat (Beban Puncak)',
    category: 'Resistif Berat (Overload)',
    minWatt: 500.1,
    maxWatt: 1200.0,
    typicalWatt: 650.0,
    loadType: 'Resistif',
    description: 'Beban pemanas berdaya tinggi yang memicu peringatan overload dan proteksi cutoff stopkontak.',
  },
];

export interface NILMClassificationResult {
  detected_appliance: string;
  category: string;
  confidence: number;
  load_type: string;
  description: string;
  is_inrush: boolean;
}

/**
 * AI NILM Profiler Engine
 * Menganalisis daya aktif dan step change (delta P) untuk mengenali jenis alat listrik yang tersambung.
 */
export function classifyAppliance(
  power: number,
  previousPower: number = 0,
  isRelayOn: boolean = true
): NILMClassificationResult {
  // Jika relay mati, alat tidak mungkin menyala
  if (!isRelayOn) {
    return {
      detected_appliance: 'Sirkuit Terputus (Relay OFF)',
      category: 'Proteksi Aktif',
      confidence: 100,
      load_type: 'Resistif',
      description: 'Arus listrik dihentikan oleh pengguna atau sistem pengaman cutoff otomatis.',
      is_inrush: false,
    };
  }

  // Deteksi lonjakan transien (Inrush current) jika terjadi kenaikan mendadak > 150W
  const deltaPower = power - previousPower;
  const isInrush = deltaPower > 150 && power > 200;

  // Temukan profil yang cocok berdasarkan rentang daya
  const matched = APPLIANCE_PROFILES.find(
    (profile) => power >= profile.minWatt && power <= profile.maxWatt
  );

  if (matched) {
    // Hitung confidence berdasarkan kedekatan dengan typicalWatt
    const range = (matched.maxWatt - matched.minWatt) || 1;
    const distanceToTypical = Math.abs(power - matched.typicalWatt);
    const score = Math.max(78, Math.round(98 - (distanceToTypical / range) * 20));

    return {
      detected_appliance: matched.name,
      category: matched.category,
      confidence: score,
      load_type: matched.loadType,
      description: matched.description,
      is_inrush: isInrush,
    };
  }

  // Fallback untuk daya ekstrem
  if (power > 1200) {
    return {
      detected_appliance: 'Beban Ekstrem Tidak Dikenal',
      category: 'Bahaya Korsleting / Hubung Singkat',
      confidence: 99,
      load_type: 'Campuran',
      description: 'Lonjakan daya melebihi kapasitas standar instalasi rumah tangga. Segera putus arus listrik.',
      is_inrush: true,
    };
  }

  return {
    detected_appliance: 'Beban Belum Terpetakan',
    category: 'Transien Campuran',
    confidence: 65,
    load_type: 'Campuran',
    description: 'Daya fluktuatif belum cocok sempurna dengan tanda tangan profil yang terdaftar.',
    is_inrush: isInrush,
  };
}
