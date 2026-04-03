import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/orderModel";
import ServerActionRequest from "@/models/serverActionRequestModel";

export async function POST(request: NextRequest) {
  try {
    const orderId = request.cookies.get("panel_session")?.value;
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();

    const { action } = await request.json();
    if (!action) {
      return NextResponse.json(
        { success: false, error: "Action is required" },
        { status: 400 }
      );
    }

    const validActions = ["start", "stop", "restart", "format"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const existing = await ServerActionRequest.findOne({
      orderId: order._id,
      action,
      status: "pending",
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `A ${action} request is already pending for this order.` },
        { status: 409 }
      );
    }

    const actionRequest = await ServerActionRequest.create({
      orderId: order._id,
      userId: order.user,
      action,
      status: "pending",
      requestedAt: new Date(),
      orderSnapshot: {
        productName: order.productName,
        ipAddress: order.ipAddress,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        os: order.os,
        memory: order.memory,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${action} request submitted. An admin will review it shortly.`,
      request: actionRequest,
    });
  } catch (error: any) {
    console.error("[PANEL-REQUEST-ACTION] Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
