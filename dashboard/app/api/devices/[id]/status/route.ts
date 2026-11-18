// dashboard/app/api/devices/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const RANGE_MS: Record<string, number> = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
};

// Batas aman jumlah titik agar payload tidak membengkak
const MAX_POINTS = 600;

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const { searchParams } = new URL(req.url);
        const range = searchParams.get("range") ?? "15m";
        const rangeMs = RANGE_MS[range] ?? RANGE_MS["15m"];
        const since = new Date(Date.now() - rangeMs);

        const device = await prisma.device.findUnique({
            where: { deviceId: id },
            include: {
                telemetries: {
                    where: { createdAt: { gte: since } },
                    orderBy: { createdAt: "asc" },
                    take: MAX_POINTS,
                },
            },
        });

        if (!device) {
            return NextResponse.json(
                { success: false, error: "Device not found" },
                { status: 404 }
            );
        }

        const history = device.telemetries ?? [];
        const latestTelemetry =
            history.length > 0 ? history[history.length - 1] : null;

        return NextResponse.json({
            success: true,
            range,
            device: {
                deviceId: device.deviceId,
                name: device.name,
                maxPowerLimit: device.maxPowerLimit,
                relayStatus: device.relayStatus,
                latestTelemetry,
                history,
            },
        });
    } catch (err) {
        console.error("GET /api/devices/[id]/status error:", err);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}