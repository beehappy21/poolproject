<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use App\Support\AdminPermissions;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Orchid\Platform\Models\Role;

class EnsureStephubSuperadminSeeder extends Seeder
{
    public function run(): void
    {
        $superadminRole = Role::query()->updateOrCreate(
            ['slug' => AdminPermissions::SUPERADMIN_ROLE],
            [
                'name' => 'Super Admin',
                'permissions' => collect(AdminPermissions::all())
                    ->mapWithKeys(fn (string $permission): array => [$permission => true])
                    ->all(),
            ]
        );

        $superadmin = User::query()->updateOrCreate(
            ['email' => 'superadmin@blifehealthy.com'],
            [
                'name' => 'Super Admin',
                'username' => 'superadmin',
                'password' => Hash::make('472121'),
                'permissions' => collect(AdminPermissions::all())
                    ->mapWithKeys(fn (string $permission): array => [$permission => true])
                    ->all(),
            ]
        );

        $superadmin->replaceRoles([$superadminRole->id]);
    }
}
