import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ServerActionRequest from "@/models/serverActionRequestModel";

export async function GET(request: NextRequest) {
  try {
    const orderId = request.cookies.get("panel_session")?.value;
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();

    const latestRequest = await ServerActionRequest.findOne({
      orderId,
    })
      .sort({ requestedAt: -1 })
      .lean();

    if (!latestRequest) {
      return NextResponse.json({ success: true, hasRequest: false });
    }

    return NextResponse.json({
      success: true,
      hasRequest: true,
      request: latestRequest,
    });
  } catch (error: any) {
    console.error("[PANEL-REQUEST-STATUS] Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
