import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * PRD B-02: Endpoint GET /api/devices/{id}/status
 * Mengambil riwayat time-series dan status relay terkini untuk dashboard web
 */
export async function GET(
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

    const device = db.getDevice(deviceId);
    if (!device) {
      return NextResponse.json(
        { success: false, error: `Perangkat dengan ID ${deviceId} tidak ditemukan.` },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Number(searchParams.get('limit') || 30);

    const history = db.getRecentTelemetries(deviceId, limit);
    const latest = history.length > 0 ? history[history.length - 1] : null;
    const stats = db.getStats(deviceId);

    const isOverload = latest ? latest.power > device.max_power_limit : false;

    return NextResponse.json({
      success: true,
      data: {
        device,
        latest_telemetry: latest,
        history,
        stats,
        alert: {
          is_overload: isOverload,
          message: isOverload
            ? `⚠️ PERINGATAN: Beban daya (${latest?.power}W) melampaui batas aman (${device.max_power_limit}W)!`
            : null,
          timestamp: latest?.recorded_at,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memuat status perangkat.' },
      { status: 500 }
    );
  }
}
