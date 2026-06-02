import mongoose from "mongoose";

/**
 * Hosthell only needs to read the `company` reference off the IP stock so it
 * can resolve the right Virtualizor panels for an order. The full schema
 * lives in OceanLinux; the rest of the fields are typed loosely to avoid
 * coupling the two apps' migration cycles.
 */
const ipStockSchema = new mongoose.Schema(
  {
    name: { type: String },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
  },
  { strict: false, collection: "ipstocks" }
);

export default mongoose.models.IPStock || mongoose.model("IPStock", ipStockSchema);
