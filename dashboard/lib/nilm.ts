// lib/nilm.ts

export type AppliancePrediction =
    | "Standby/Off"
    | "Beban Rendah"
    | "Kipas Angin"
    | "Kulkas/TV"
    | "Setrika/Pemanas"
    | "Tidak Diketahui";

export function classifyAppliance(power: number): AppliancePrediction {
    if (power <= 15) return "Standby/Off";
    if (power > 15 && power < 40) return "Beban Rendah";
    if (power >= 40 && power <= 90) return "Kipas Angin";
    if (power > 90 && power <= 250) return "Kulkas/TV";
    if (power > 250) return "Setrika/Pemanas";
    return "Tidak Diketahui";
}
