import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Simulator Endpoint:
 * Memungkinkan pengujian dashboard tanpa memerlukan ESP32 / Wokwi fisik.
 * Mendukung preset alat: 'standby', 'fan', 'tv', 'fridge', 'cooker', 'overload', atau custom power.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { device_id = 1, action, preset, custom_power } = body;

    if (action === 'reset') {
      await db.resetDemoData(Number(device_id));
      return NextResponse.json({
        success: true,
        message: 'Data riwayat simulasi di database MySQL berhasil direset ke status awal.',
      });
    }

    let power = 50.0;
    let voltage = 220.0 + (Math.random() * 2 - 1);

    if (typeof custom_power === 'number') {
      power = custom_power;
    } else {
      switch (preset) {
        case 'standby':
          power = +(0.8 + Math.random() * 1.0).toFixed(2);
          break;
        case 'charger':
          power = +(12.5 + Math.random() * 3).toFixed(2);
          break;
        case 'fan':
          power = +(48.0 + Math.random() * 6).toFixed(2);
          break;
        case 'tv':
          power = +(125.0 + Math.random() * 15).toFixed(2);
          break;
        case 'fridge':
          power = +(260.0 + Math.random() * 20).toFixed(2);
          break;
        case 'cooker':
          power = +(420.0 + Math.random() * 25).toFixed(2);
          break;
        case 'overload':
          power = +(650.0 + Math.random() * 80).toFixed(2);
          break;
        default:
          power = +(45.0 + Math.random() * 20).toFixed(2);
      }
    }

    const result = await db.addTelemetry({
      device_id: Number(device_id),
      voltage: +voltage.toFixed(2),
      power: +power.toFixed(2),
    });

    return NextResponse.json({
      success: true,
      message: `Simulasi terkirim ke MySQL: ${power}W (${result.telemetry.detected_appliance})`,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message },
      { status: 500 }
    );
  }
}
