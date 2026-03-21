import { Body, Controller, Get, Post } from "@nestjs/common";

import {
  optionalString,
  requireIsoDateTimeString,
  requireNonEmptyString,
} from "./http/request.util";
import { readRuntimeCollection, writeRuntimeCollection } from "./runtime/admin-runtime.util";

type ShippingJob = {
  shippingJobId: string;
  orderId: string;
  status: string;
  carrier: string | null;
  trackingNo: string | null;
  warehouse: string | null;
  dispatchAt: string | null;
  note: string | null;
  createdAt: string;
};

const SHIPPING_FILE = "admin-shipping-jobs.json";

@Controller("shipping")
export class ShippingController {
  @Get("jobs")
  listShippingJobs() {
    return readRuntimeCollection<ShippingJob[]>(SHIPPING_FILE, []);
  }

  @Post("jobs")
  createShippingJob(@Body() body: Record<string, unknown>) {
    const items = readRuntimeCollection<ShippingJob[]>(SHIPPING_FILE, []);
    const now = new Date().toISOString();
    const job: ShippingJob = {
      shippingJobId: `${Date.now()}`,
      orderId: requireNonEmptyString(body.orderId, "orderId"),
      status: requireNonEmptyString(body.status, "status"),
      carrier: optionalString(body.carrier) ?? null,
      trackingNo: optionalString(body.trackingNo) ?? null,
      warehouse: optionalString(body.warehouse) ?? null,
      dispatchAt: optionalString(body.dispatchAt)
        ? requireIsoDateTimeString(body.dispatchAt, "dispatchAt")
        : null,
      note: optionalString(body.note) ?? null,
      createdAt: now,
    };

    writeRuntimeCollection(SHIPPING_FILE, [job, ...items].slice(0, 50));
    return job;
  }
}
