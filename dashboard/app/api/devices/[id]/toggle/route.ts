import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * PRD B-03: Endpoint POST /api/devices/{id}/toggle
 * Menangkap instruksi override saklar relay dari pengguna (ON/OFF) ke MySQL
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const deviceId = parseInt(id, 10);

    if (isNaN(deviceId)) {
      return NextResponse.json(
        { success: false, error: 'ID perangkat tidak valid.' },
        { status: 400 }
      );
    }

    const device = await db.getDevice(deviceId);
    if (!device) {
      return NextResponse.json(
        { success: false, error: `Perangkat dengan ID ${deviceId} tidak ditemukan.` },
        { status: 404 }
      );
    }

    let nextStatus = !device.relay_status;

    try {
      const body = await request.json();
      if (typeof body.relay_status === 'boolean') {
        nextStatus = body.relay_status;
      }
    } catch {
      // Body is optional
    }

    const updatedDevice = await db.updateRelay(deviceId, nextStatus);

    return NextResponse.json({
      success: true,
      message: nextStatus
        ? 'Relay diaktifkan (Listrik dialirkan).'
        : 'Relay diputus (Listrik dimatikan).',
      data: {
        device: updatedDevice,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengubah status relay di MySQL.' },
      { status: 500 }
    );
  }
}
