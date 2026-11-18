import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * PRD B-01: Endpoint POST /api/telemetry
 * Menerima aliran data sensor (ESP32/PZEM-004T atau Simulator Wokwi)
 * Menjalankan klasifikasi AI NILM dan proteksi overload ke database MySQL
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { device_id = 1, voltage, power, current } = body;

    if (voltage === undefined || power === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parameter "voltage" dan "power" wajib diisi.',
        },
        { status: 400 }
      );
    }

    const numVoltage = Number(voltage);
    const numPower = Number(power);

    if (isNaN(numVoltage) || isNaN(numPower)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nilai voltage dan power harus berupa angka.',
        },
        { status: 400 }
      );
    }

    const result = await db.addTelemetry({
      device_id: Number(device_id),
      voltage: numVoltage,
      power: numPower,
      current: current !== undefined ? Number(current) : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        message: result.is_cutoff_triggered
          ? '⚠️ Overload terdeteksi! Proteksi Hard-Cutoff relay diaktifkan.'
          : 'Data telemetri berhasil direkam ke MySQL dan diproses NILM.',
        data: {
          telemetry: result.telemetry,
          device: result.device,
          action_required: result.is_cutoff_triggered ? 'RELAY_CUTOFF' : 'NONE',
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Gagal memproses data telemetri ke MySQL.',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceId = Number(searchParams.get('device_id') || 1);
    const limit = Number(searchParams.get('limit') || 30);

    const telemetries = await db.getRecentTelemetries(deviceId, limit);
    return NextResponse.json({
      success: true,
      count: telemetries.length,
      data: telemetries,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message },
      { status: 500 }
    );
  }
}
