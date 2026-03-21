import { Body, Controller, Get, Post } from "@nestjs/common";

import {
  optionalString,
  requireIsoDateTimeString,
  requireNonEmptyString,
} from "./http/request.util";
import { readRuntimeCollection, writeRuntimeCollection } from "./runtime/admin-runtime.util";

type ContentItem = {
  contentId: string;
  key: string;
  placement: string;
  title: string;
  audience: string;
  summary: string | null;
  body: string | null;
  startAt: string | null;
  endAt: string | null;
  status: "draft";
  createdAt: string;
};

const CONTENT_FILE = "admin-content-items.json";

@Controller("content")
export class ContentController {
  @Get()
  listContent() {
    return readRuntimeCollection<ContentItem[]>(CONTENT_FILE, []);
  }

  @Post()
  createContent(@Body() body: Record<string, unknown>) {
    const items = readRuntimeCollection<ContentItem[]>(CONTENT_FILE, []);
    const now = new Date().toISOString();
    const item: ContentItem = {
      contentId: `${Date.now()}`,
      key: requireNonEmptyString(body.key, "key"),
      placement: requireNonEmptyString(body.placement, "placement"),
      title: requireNonEmptyString(body.title, "title"),
      audience: requireNonEmptyString(body.audience, "audience"),
      summary: optionalString(body.summary) ?? null,
      body: optionalString(body.body) ?? null,
      startAt: optionalString(body.startAt)
        ? requireIsoDateTimeString(body.startAt, "startAt")
        : null,
      endAt: optionalString(body.endAt)
        ? requireIsoDateTimeString(body.endAt, "endAt")
        : null,
      status: "draft",
      createdAt: now,
    };

    writeRuntimeCollection(CONTENT_FILE, [item, ...items].slice(0, 50));
    return item;
  }
}
