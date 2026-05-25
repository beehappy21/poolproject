<?php

declare(strict_types=1);

namespace App\Orchid\Screens\User;

use App\Models\User;
use App\Orchid\Layouts\Role\RolePermissionLayout;
use App\Orchid\Layouts\User\UserEditLayout;
use App\Orchid\Layouts\User\UserPasswordLayout;
use App\Orchid\Layouts\User\UserRoleLayout;
use App\Support\AdminPermissions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Orchid\Access\Impersonation;
use Orchid\Screen\Action;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Screen;
use Orchid\Support\Color;
use Orchid\Support\Facades\Layout;
use Orchid\Support\Facades\Toast;

class UserEditScreen extends Screen
{
    /**
     * @var User
     */
    public $user;

    /**
     * Fetch data to be displayed on the screen.
     *
     * @return array
     */
    public function query(User $user): iterable
    {
        $user->load(['roles']);

        return [
            'user' => $user,
            'permission' => $user->getStatusPermission(),
            'showUsernameField' => true,
            'canManageCredentials' => $this->canManageCredentials(),
        ];
    }

    /**
     * The name of the screen displayed in the header.
     */
    public function name(): ?string
    {
        return $this->user->exists ? 'Edit Admin' : 'Create Admin';
    }

    /**
     * Display header description.
     */
    public function description(): ?string
    {
        return 'Configure admin credentials, roles, and access permissions for BAO.';
    }

    public function permission(): ?iterable
    {
        return [
            'platform.systems.users',
        ];
    }

    /**
     * The screen's action buttons.
     *
     * @return Action[]
     */
    public function commandBar(): iterable
    {
        return [
            Button::make(__('Impersonate user'))
                ->icon('bg.box-arrow-in-right')
                ->confirm(__('You can revert to your original state by logging out.'))
                ->method('loginAs')
                ->canSee($this->user->exists && $this->user->id !== \request()->user()->id),

            Button::make(__('Remove'))
                ->icon('bs.trash3')
                ->confirm(__('Once the account is deleted, all of its resources and data will be permanently deleted. Before deleting your account, please download any data or information that you wish to retain.'))
                ->method('remove')
                ->canSee($this->user->exists),

            Button::make(__('Save'))
                ->icon('bs.check-circle')
                ->method('save'),
        ];
    }

    /**
     * @return \Orchid\Screen\Layout[]
     */
    public function layout(): iterable
    {
        $layouts = [

            Layout::block(UserEditLayout::class)
                ->title(__('Profile Information'))
                ->description(__('Update your account\'s profile information and email address.'))
                ->commands(
                    Button::make(__('Save'))
                        ->type(Color::BASIC)
                        ->icon('bs.check-circle')
                        ->canSee($this->user->exists)
                        ->method('save')
                ),

            Layout::block(UserRoleLayout::class)
                ->title(__('Roles'))
                ->description(__('A Role defines a set of tasks a user assigned the role is allowed to perform.'))
                ->commands(
                    Button::make(__('Save'))
                        ->type(Color::BASIC)
                        ->icon('bs.check-circle')
                        ->canSee($this->user->exists)
                        ->method('save')
                ),

            Layout::block(RolePermissionLayout::class)
                ->title(__('Permissions'))
                ->description(__('Allow the user to perform some actions that are not provided for by his roles'))
                ->commands(
                    Button::make(__('Save'))
                        ->type(Color::BASIC)
                        ->icon('bs.check-circle')
                        ->canSee($this->user->exists)
                        ->method('save')
                ),

        ];

        if ($this->canManageCredentials()) {
            array_splice($layouts, 1, 0, [
                Layout::block(UserPasswordLayout::class)
                    ->title(__('Password'))
                    ->description(__('Super admin can set the admin login password directly from this screen.'))
                    ->commands(
                        Button::make(__('Save'))
                            ->type(Color::BASIC)
                            ->icon('bs.check-circle')
                            ->canSee($this->user->exists)
                            ->method('save')
                    ),
            ]);
        }

        return $layouts;
    }

    /**
     * @return \Illuminate\Http\RedirectResponse
     */
    public function save(User $user, Request $request)
    {
        $canManageCredentials = $this->canManageCredentials();

        $rules = [
            'user.name' => ['required', 'string', 'max:255'],
            'user.email' => [
                'required',
                'email',
                'max:255',
                Rule::unique(User::class, 'email')->ignore($user),
            ],
        ];

        if ($canManageCredentials) {
            $rules['user.username'] = [
                'required',
                'string',
                'max:255',
                'regex:/^[A-Za-z0-9._-]+$/',
                Rule::unique(User::class, 'username')->ignore($user),
            ];
            $rules['user.password'] = $user->exists
                ? ['nullable', 'string', 'min:8']
                : ['required', 'string', 'min:8'];
        }

        $request->validate($rules);

        $permissions = collect($request->get('permissions'))
            ->map(fn ($value, $key) => [base64_decode($key) => $value])
            ->collapse()
            ->toArray();

        $user->when($canManageCredentials && $request->filled('user.password'), function (Builder $builder) use ($request) {
            $builder->getModel()->password = Hash::make($request->input('user.password'));
        });

        $userPayload = collect($request->input('user', []))
            ->only(['name', 'email'])
            ->when($canManageCredentials, fn ($collection) => $collection->merge([
                'username' => $request->input('user.username'),
            ]))
            ->toArray();

        $user
            ->fill($userPayload)
            ->forceFill(['permissions' => $permissions])
            ->save();

        $user->replaceRoles($request->input('user.roles'));

        Toast::info(__('User was saved.'));

        return redirect()->route('platform.systems.users');
    }

    /**
     * @throws \Exception
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function remove(User $user)
    {
        $user->delete();

        Toast::info(__('User was removed'));

        return redirect()->route('platform.systems.users');
    }

    /**
     * @return \Illuminate\Http\RedirectResponse
     */
    public function loginAs(User $user)
    {
        Impersonation::loginAs($user);

        Toast::info(__('You are now impersonating this user'));

        return redirect()->route(config('platform.index'));
    }

    private function canManageCredentials(): bool
    {
        $currentUser = request()->user();

        return $currentUser !== null && $currentUser->inRole(AdminPermissions::SUPERADMIN_ROLE);
    }
}
