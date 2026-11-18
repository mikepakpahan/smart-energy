import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const toggleSchema = z.object({
    relay_status: z.boolean(),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const parsed = toggleSchema.safeParse(body);

        let newStatus: boolean;

        if (parsed.success) {
            newStatus = parsed.data.relay_status;
        } else {
            const current = await prisma.device.findUnique({
                where: { deviceId: id },
                select: { relayStatus: true },
            });
            if (!current) {
                return NextResponse.json(
                    { error: "Device tidak ditemukan" },
                    { status: 404 }
                );
            }
            newStatus = !current.relayStatus;
        }

        const updatedDevice = await prisma.device.update({
            where: { deviceId: id },
            data: { relayStatus: newStatus },
        });

        return NextResponse.json({
            success: true,
            message: `Relay berhasil diubah ke ${newStatus ? "ON" : "OFF"}`,
            device_id: updatedDevice.deviceId,
            relay_status: updatedDevice.relayStatus,
        });
    } catch (error) {
        console.error("[POST /api/devices/[id]/toggle]", error);
        return NextResponse.json(
            {
                error: "Gagal mengubah status relay",
                details:
                    process.env.NODE_ENV !== "production" && error instanceof Error
                        ? error.message
                        : undefined,
            },
            { status: 500 }
        );
    }
}

