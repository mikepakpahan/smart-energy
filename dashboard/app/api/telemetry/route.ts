// app/api/telemetry/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { classifyAppliance } from "@/lib/nilm";

const telemetrySchema = z.object({
    device_id: z.string().min(1, "device_id wajib diisi"),
    voltage: z.number().nonnegative("voltage tidak boleh negatif"),
    power: z.number().nonnegative("power tidak boleh negatif"),
});

export async function POST(request: NextRequest) {
    try {
        // 1. Parse & validasi
        const body = await request.json();
        const parsed = telemetrySchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Validasi gagal",
                    details: z.flattenError(parsed.error).fieldErrors,
                },
                { status: 400 }
            );
        }

        const { device_id, voltage, power } = parsed.data;

        // 2. Upsert device
        const device = await prisma.device.upsert({
            where: { deviceId: device_id },
            update: {},
            create: {
                deviceId: device_id,
                name: `Device ${device_id}`,
                maxPowerLimit: 500,
                relayStatus: true,
            },
        });

        // 3. Tentukan status relay
        // Logika Overload: jika daya melampaui batas aman, relay wajib trip (cut-off) dan update DB
        const isOverload = power > device.maxPowerLimit;
        let relayStatus = device.relayStatus;

        if (isOverload) {
            relayStatus = false;
            if (device.relayStatus) {
                // Update ke DB agar status terkini tercatat sebagai OFF/trip
                await prisma.device.update({
                    where: { deviceId: device.deviceId },
                    data: { relayStatus: false },
                });
            }
        }

        // 4. Klasifikasi NILM
        const appliance = classifyAppliance(power);

        // 5. Simpan telemetri
        const telemetry = await prisma.telemetry.create({
            data: {
                deviceId: device.deviceId,
                voltage,
                power,
                relayStatus,
                appliance,
            },
        });

        // 6. Response ke ESP32
        return NextResponse.json(
            {
                success: true,
                telemetry_id: telemetry.id,
                relay_status: relayStatus,
                is_overload: isOverload,
                appliance,
                max_power_limit: device.maxPowerLimit,
                timestamp: telemetry.createdAt.toISOString(),
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("[POST /api/telemetry]", error);

        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { error: "Body request bukan JSON yang valid" },
                { status: 400 }
            );
        }

        const errorMessage =
            process.env.NODE_ENV !== "production" && error instanceof Error
                ? error.message
                : "Terjadi kesalahan pada server";

        return NextResponse.json(
            { error: "Terjadi kesalahan pada server", details: errorMessage },
            { status: 500 }
        );
    }
}