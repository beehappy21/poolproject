<?php

namespace App\Orchid\Screens\Member;

use App\Models\Member;
use App\Models\MemberProfileRecord;
use App\Models\MemberUserRecord;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Fields\Select;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Alert;
use Orchid\Support\Facades\Layout;

class MemberEditScreen extends Screen
{
    public $member;

    public function query(Member $member): iterable
    {
        $this->member = Member::findOrFail($member->id);

        return [
            'member' => [
                'member_id' => $this->member->id,
                'member_code' => $this->member->member_code,
                'referral_code' => $this->member->referral_code,
                'full_name' => $this->member->full_name,
                'email' => $this->member->email,
                'phone' => $this->member->phone,
                'joined_date' => optional($this->member->joined_date)->format('Y-m-d'),
                'sponsor_code' => $this->member->sponsor_code,
                'upline_code' => $this->member->upline_code,
                'national_id' => $this->member->national_id,
                'side' => strtoupper((string) ($this->member->side ?? '')),
                'rank_code' => $this->member->rank_code,
                'honor_title' => $this->member->honor_title,
                'mobile_center' => $this->member->mobile_center,
                'status' => $this->member->status,
            ],
        ];
    }

    public function name(): ?string
    {
        return 'Edit Member';
    }

    public function commandBar(): iterable
    {
        return [
            Link::make('Back to Members')
                ->icon('bs.arrow-left')
                ->route('platform.member.list'),
            Button::make('Update Member')
                ->icon('bs.check2-circle')
                ->method('update'),
        ];
    }

    public function layout(): iterable
    {
        return [
            Layout::rows([
                Input::make('member.member_code')
                    ->title('Member code:')
                    ->readonly(),
                Input::make('member.referral_code')
                    ->title('Referral code:')
                    ->readonly(),
                Input::make('member.full_name')
                    ->title('Full name:')
                    ->required(),
                Input::make('member.email')
                    ->title('Email:')
                    ->type('email'),
                Input::make('member.phone')
                    ->title('Phone:'),
                Input::make('member.joined_date')
                    ->title('Joined date:')
                    ->type('date'),
                Input::make('member.sponsor_code')
                    ->title('Sponsor code:')
                    ->readonly(),
                Input::make('member.upline_code')
                    ->title('Upline code:'),
                Input::make('member.national_id')
                    ->title('National ID:'),
                Select::make('member.side')
                    ->title('Side:')
                    ->options([
                        '' => '-',
                        'LEFT' => 'LEFT',
                        'RIGHT' => 'RIGHT',
                    ]),
                Input::make('member.rank_code')
                    ->title('Rank code:'),
                Input::make('member.honor_title')
                    ->title('Honor title:'),
                Input::make('member.mobile_center')
                    ->title('Mobile center:'),
                Input::make('member.status')
                    ->title('Status:')
                    ->readonly(),
            ])->title('Member profile'),
        ];
    }

    public function update(Request $request)
    {
        $memberId = (int) $this->member->id;
        $validated = $this->validatedData($request, $memberId);

        $user = MemberUserRecord::query()->findOrFail($memberId);
        $user->fill([
            'name' => $validated['full_name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
        ])->save();

        $profile = MemberProfileRecord::query()->firstOrNew([
            'userId' => $memberId,
        ]);

        $profile->fill([
            'nationalId' => $validated['national_id'],
            'uplineUserId' => $validated['upline_user_id'],
            'placementSide' => $validated['placement_side'],
            'rankCode' => $validated['rank_code'],
            'honorTitle' => $validated['honor_title'],
            'mobileCenterCode' => $validated['mobile_center'],
            'joinedAtOverride' => $validated['joined_at_override'],
        ])->save();

        Alert::info('You have successfully updated the member profile.');

        return redirect()->route('platform.member.edit', $memberId);
    }

    private function validatedData(Request $request, int $memberId): array
    {
        $validated = $request->validate([
            'member.full_name' => ['required', 'string', 'max:255'],
            'member.email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('poolproject.User', 'email')->ignore($memberId, 'id'),
            ],
            'member.phone' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('poolproject.User', 'phone')->ignore($memberId, 'id'),
            ],
            'member.joined_date' => ['nullable', 'date'],
            'member.upline_code' => ['nullable', 'string', 'max:50'],
            'member.national_id' => [
                'nullable',
                'string',
                'max:30',
                Rule::unique('poolproject.MemberProfile', 'nationalId')->ignore($memberId, 'userId'),
            ],
            'member.side' => ['nullable', 'in:LEFT,RIGHT'],
            'member.rank_code' => ['nullable', 'string', 'max:50'],
            'member.honor_title' => ['nullable', 'string', 'max:100'],
            'member.mobile_center' => ['nullable', 'string', 'max:100'],
        ]);

        $data = $validated['member'];
        $uplineCode = trim((string) ($data['upline_code'] ?? ''));
        $uplineUserId = null;

        if ($uplineCode !== '') {
            $upline = MemberUserRecord::query()
                ->where('memberCode', $uplineCode)
                ->first();

            if (!$upline) {
                $upline = MemberUserRecord::query()
                    ->where('referralCode', $uplineCode)
                    ->first();
            }

            if (!$upline) {
                abort(422, 'Upline code not found.');
            }

            $uplineUserId = (int) $upline->id;
        }

        return [
            'full_name' => $data['full_name'],
            'email' => $data['email'] ?: null,
            'phone' => $data['phone'] ?: null,
            'joined_at_override' => $data['joined_date'] ?: null,
            'upline_user_id' => $uplineUserId,
            'national_id' => $data['national_id'] ?: null,
            'placement_side' => $data['side'] ?: null,
            'rank_code' => $data['rank_code'] ?: null,
            'honor_title' => $data['honor_title'] ?: null,
            'mobile_center' => $data['mobile_center'] ?: null,
        ];
    }
}
