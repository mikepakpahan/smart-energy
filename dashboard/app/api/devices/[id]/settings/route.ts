// dashboard/app/api/devices/[id]/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MIN_LIMIT = 50;
const MAX_LIMIT = 5000;

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const body = await req.json().catch(() => ({}));
        const data: { name?: string; maxPowerLimit?: number } = {};

        // Validasi nama (opsional, tapi kalau dikirim harus non-empty)
        if (body?.name !== undefined) {
            if (typeof body.name !== "string" || body.name.trim().length === 0) {
                return NextResponse.json(
                    { success: false, error: "Nama perangkat tidak boleh kosong" },
                    { status: 400 }
                );
            }
            if (body.name.trim().length > 80) {
                return NextResponse.json(
                    { success: false, error: "Nama maksimal 80 karakter" },
                    { status: 400 }
                );
            }
            data.name = body.name.trim();
        }

        // Validasi batas daya
        if (body?.maxPowerLimit !== undefined) {
            const limit = Number(body.maxPowerLimit);
            if (!Number.isFinite(limit) || limit < MIN_LIMIT || limit > MAX_LIMIT) {
                return NextResponse.json(
                    {
                        success: false,
                        error: `Batas daya harus antara ${MIN_LIMIT} - ${MAX_LIMIT} W`,
                    },
                    { status: 400 }
                );
            }
            data.maxPowerLimit = Math.round(limit);
        }

        if (Object.keys(data).length === 0) {
            return NextResponse.json(
                { success: false, error: "Tidak ada field yang diupdate" },
                { status: 400 }
            );
        }

        const updated = await prisma.device.update({
            where: { deviceId: id },
            data,
        });

        return NextResponse.json({
            success: true,
            device: {
                deviceId: updated.deviceId,
                name: updated.name,
                maxPowerLimit: updated.maxPowerLimit,
                relayStatus: updated.relayStatus,
            },
        });
    } catch (err: any) {
        // Prisma P2025 = record not found
        if (err?.code === "P2025") {
            return NextResponse.json(
                { success: false, error: "Device not found" },
                { status: 404 }
            );
        }
        console.error("PATCH /api/devices/[id]/settings error:", err);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}