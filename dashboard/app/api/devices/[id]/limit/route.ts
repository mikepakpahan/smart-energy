import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const deviceId = parseInt(id, 10);
    const body = await request.json();
    const { max_power_limit } = body;

    if (!max_power_limit || isNaN(Number(max_power_limit)) || Number(max_power_limit) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Batas daya aman harus berupa angka positif.' },
        { status: 400 }
      );
    }

    const updated = db.updateMaxLimit(deviceId, Number(max_power_limit));
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Perangkat tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Batas daya aman berhasil diubah menjadi ${max_power_limit} Watt.`,
      data: { device: updated },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message },
      { status: 500 }
    );
  }
}
