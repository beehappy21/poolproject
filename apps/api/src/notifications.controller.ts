import { Body, Controller, Get, Post } from "@nestjs/common";

import {
  optionalString,
  requireIsoDateTimeString,
  requireNonEmptyString,
} from "./http/request.util";
import { readRuntimeCollection, writeRuntimeCollection } from "./runtime/admin-runtime.util";

type NotificationItem = {
  notificationId: string;
  name: string;
  channel: string;
  audience: string;
  headline: string;
  message: string | null;
  ctaLabel: string | null;
  ctaRoute: string | null;
  scheduleAt: string | null;
  status: "queued_draft";
  createdAt: string;
};

const NOTIFICATIONS_FILE = "admin-notifications.json";

@Controller("notifications")
export class NotificationsController {
  @Get()
  listNotifications() {
    return readRuntimeCollection<NotificationItem[]>(NOTIFICATIONS_FILE, []);
  }

  @Post()
  createNotification(@Body() body: Record<string, unknown>) {
    const items = readRuntimeCollection<NotificationItem[]>(NOTIFICATIONS_FILE, []);
    const now = new Date().toISOString();
    const item: NotificationItem = {
      notificationId: `${Date.now()}`,
      name: requireNonEmptyString(body.name, "name"),
      channel: requireNonEmptyString(body.channel, "channel"),
      audience: requireNonEmptyString(body.audience, "audience"),
      headline: requireNonEmptyString(body.headline, "headline"),
      message: optionalString(body.message) ?? null,
      ctaLabel: optionalString(body.ctaLabel) ?? null,
      ctaRoute: optionalString(body.ctaRoute) ?? null,
      scheduleAt: optionalString(body.scheduleAt)
        ? requireIsoDateTimeString(body.scheduleAt, "scheduleAt")
        : null,
      status: "queued_draft",
      createdAt: now,
    };

    writeRuntimeCollection(NOTIFICATIONS_FILE, [item, ...items].slice(0, 50));
    return item;
  }
}
