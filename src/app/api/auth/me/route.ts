import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/orderModel";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("panel_session");

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();

    const order = await Order.findById(sessionCookie.value).select(
      "productName memory price ipAddress username password os expiryDate provider hostycareServiceId smartvpsServiceId slotIpPackageId provisioningStatus lastAction lastActionTime status panelUsername"
    );

    if (!order) {
      const response = NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 401 }
      );
      response.cookies.set("panel_session", "", { maxAge: 0, path: "/" });
      return response;
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("[PANEL-AUTH] Me error:", error.message);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
