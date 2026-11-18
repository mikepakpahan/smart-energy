import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Endpoint Auto-Pruning & Storage Health:
 * GET: Mengambil statistik tabel telemetri dan status auto-pruning.
 * POST: Menjalankan pembersihan data mentah usang secara manual.
 */
export async function GET() {
  try {
    const health = await db.getStorageHealth();
    return NextResponse.json({
      success: true,
      data: health,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memuat status penyimpanan.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let days = 7;
    try {
      const body = await request.json();
      if (typeof body.retention_days === 'number') {
        days = body.retention_days;
      }
    } catch {
      // Body optional, default 7 hari
    }

    const result = await db.pruneOldTelemetries(days);
    const health = await db.getStorageHealth();

    return NextResponse.json({
      success: true,
      message:
        result.deletedRows > 0
          ? `Berhasil memangkas ${result.deletedRows} baris data telemetri yang lebih tua dari ${result.retentionDays} hari.`
          : `Database optimal dan bersih. Tidak ada data yang lebih tua dari ${result.retentionDays} hari.`,
      data: {
        prune_result: result,
        storage_health: health,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal menjalankan auto-pruning.' },
      { status: 500 }
    );
  }
}
