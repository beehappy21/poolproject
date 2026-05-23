<?php

declare(strict_types=1);

namespace App\Orchid\Layouts\User;

use Orchid\Screen\Field;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Layouts\Rows;

class UserEditLayout extends Rows
{
    /**
     * The screen's layout elements.
     *
     * @return Field[]
     */
    public function fields(): array
    {
        $showUsernameField = (bool) ($this->query->get('showUsernameField') ?? false);
        $canManageCredentials = (bool) ($this->query->get('canManageCredentials') ?? false);

        return [
            Input::make('user.name')
                ->type('text')
                ->max(255)
                ->required()
                ->title(__('Name'))
                ->placeholder(__('Name')),

            Input::make('user.username')
                ->type('text')
                ->max(255)
                ->title(__('Username'))
                ->placeholder(__('Username'))
                ->help(__('Used for BAO admin identity management.'))
                ->canSee($showUsernameField && $canManageCredentials),

            Input::make('user.email')
                ->type('email')
                ->required()
                ->title(__('Email'))
                ->placeholder(__('Email')),
        ];
    }
}
