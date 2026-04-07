<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::connection('poolproject')->statement(<<<'SQL'
            ALTER TABLE "ProductDetail"
            ADD COLUMN IF NOT EXISTS "salesChannelMode" VARCHAR(30) NOT NULL DEFAULT 'WAP_CATALOG'
        SQL);

        DB::connection('poolproject')->statement(<<<'SQL'
            UPDATE "ProductDetail"
            SET "salesChannelMode" = 'WAP_CATALOG'
            WHERE "salesChannelMode" IS NULL OR TRIM("salesChannelMode") = ''
        SQL);
    }

    public function down(): void
    {
        DB::connection('poolproject')->statement(<<<'SQL'
            ALTER TABLE "ProductDetail"
            DROP COLUMN IF EXISTS "salesChannelMode"
        SQL);
    }
};
