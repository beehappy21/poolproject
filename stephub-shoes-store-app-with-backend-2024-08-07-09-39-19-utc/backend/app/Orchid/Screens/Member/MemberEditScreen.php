<?php

namespace App\Orchid\Screens\Member;

use App\Models\Member;
use App\Models\MemberProfileRecord;
use App\Models\MemberUserRecord;
use App\Models\WalletRecord;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Fields\Select;
use Orchid\Screen\Screen;
use Orchid\Support\Color;
use Orchid\Support\Facades\Alert;
use Orchid\Support\Facades\Layout;
use App\Support\BaoAdminApiClient;

class MemberEditScreen extends Screen
{
    public ?Member $memberRecord = null;
    /** @var array<string, string> */
    public array $walletSummary = [];

    public function query(Member $member): iterable
    {
        $this->memberRecord = Member::member003()
            ->with(['memberProfile', 'sponsor'])
            ->findOrFail($member->id);

        $walletSummary = [
            'approvedBalance' => '0',
            'heldBalance' => '0',
            'withdrawableBalance' => '0',
            'shoppingBalance' => '0',
            'discountBalance' => '0',
            'firmBalance' => '0',
            'negativeOffsetBalance' => '0',
        ];

        $walletRecord = WalletRecord::query()
            ->where('userId', $this->memberRecord->id)
            ->first();

        if ($walletRecord !== null) {
            $walletSummary = array_merge($walletSummary, [
                'approvedBalance' => (string) ($walletRecord->approvedBalance ?? '0'),
                'heldBalance' => (string) ($walletRecord->heldBalance ?? '0'),
                'withdrawableBalance' => (string) ($walletRecord->withdrawableBalance ?? '0'),
                'shoppingBalance' => (string) ($walletRecord->shoppingBalance ?? '0'),
                'discountBalance' => (string) ($walletRecord->discountBalance ?? '0'),
                'firmBalance' => (string) ($walletRecord->firmBalance ?? '0'),
                'negativeOffsetBalance' => (string) ($walletRecord->negativeOffsetBalance ?? '0'),
            ]);
        }

        $this->walletSummary = array_map(
            static fn ($value) => is_scalar($value) ? (string) $value : '0',
            $walletSummary,
        );

        return [
            'member' => [
                'member_id' => $this->memberRecord->id,
                'member_code' => $this->memberRecord->member_code,
                'referral_code' => $this->memberRecord->referral_code,
                'full_name' => $this->memberRecord->full_name,
                'email' => $this->memberRecord->email,
                'phone' => $this->memberRecord->phone,
                'joined_date' => optional($this->memberRecord->joined_date)->format('Y-m-d'),
                'sponsor_code' => $this->memberRecord->sponsor_code,
                'upline_code' => $this->memberRecord->upline_code,
                'national_id' => $this->memberRecord->national_id,
                'side' => strtoupper((string) ($this->memberRecord->side ?? '')),
                'rank_code' => $this->memberRecord->rank_code,
                'honor_title' => $this->memberRecord->honor_title,
                'mobile_center' => $this->memberRecord->mobile_center,
                'status' => $this->memberRecord->status,
            ],
            'walletSummary' => $this->walletSummary,
        ];
    }

    public function name(): ?string
    {
        return 'Edit Member';
    }

    public function commandBar(): iterable
    {
        $member = $this->requireMemberRecord();
        $memberId = (int) $member->id;
        $isActive = strtoupper((string) $member->status) === 'ACTIVE';

        return [
            Link::make('Back to Members')
                ->icon('bs.arrow-left')
                ->route('platform.member.list'),
            Button::make('Update Member')
                ->icon('bs.check2-circle')
                ->method('update'),
            Button::make('ล็อคบัญชี')
                ->icon('bs.lock-fill')
                ->type(Color::DANGER)
                ->confirm('ยืนยันการล็อคบัญชีสมาชิกนี้? หลังจากล็อคแล้ว สมาชิกจะเข้า app ไม่ได้')
                ->method('lockAccount', ['member' => $memberId])
                ->canSee($isActive),
            Button::make('ใช้งาน')
                ->icon('bs.unlock-fill')
                ->type(Color::SUCCESS)
                ->confirm('ยืนยันการเปิดใช้งานบัญชีสมาชิกนี้อีกครั้ง?')
                ->method('activateAccount', ['member' => $memberId])
                ->canSee(! $isActive),
            Button::make('รีเซ็ตรหัสผ่าน')
                ->icon('bs.key-fill')
                ->type(Color::WARNING)
                ->confirm('ยืนยันการรีเซ็ตรหัสผ่านเป็นเลขบัตรประชาชน 6 ตัวท้าย?')
                ->method('resetPassword', ['member' => $memberId]),
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
            Layout::legend('walletSummary', [
                \Orchid\Screen\Sight::make('firmBalance', 'Firm balance:')
                    ->render(fn () => number_format((float) ($this->walletSummary['firmBalance'] ?? '0'), 2)),
                \Orchid\Screen\Sight::make('withdrawableBalance', 'Withdrawable balance:')
                    ->render(fn () => number_format((float) ($this->walletSummary['withdrawableBalance'] ?? '0'), 2)),
                \Orchid\Screen\Sight::make('shoppingBalance', 'Shopping balance:')
                    ->render(fn () => number_format((float) ($this->walletSummary['shoppingBalance'] ?? '0'), 2)),
                \Orchid\Screen\Sight::make('discountBalance', 'Discount balance:')
                    ->render(fn () => number_format((float) ($this->walletSummary['discountBalance'] ?? '0'), 2)),
                \Orchid\Screen\Sight::make('approvedBalance', 'Approved balance:')
                    ->render(fn () => number_format((float) ($this->walletSummary['approvedBalance'] ?? '0'), 2)),
                \Orchid\Screen\Sight::make('heldBalance', 'Held balance:')
                    ->render(fn () => number_format((float) ($this->walletSummary['heldBalance'] ?? '0'), 2)),
                \Orchid\Screen\Sight::make('negativeOffsetBalance', 'Negative offset balance:')
                    ->render(fn () => number_format((float) ($this->walletSummary['negativeOffsetBalance'] ?? '0'), 2)),
            ])->title('Wallet summary'),
        ];
    }

    public function update(Request $request)
    {
        $memberId = (int) $this->requireMemberRecord()->id;
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

    public function lockAccount(): \Illuminate\Http\RedirectResponse
    {
        $memberId = (int) $this->requireMemberRecord()->id;

        MemberUserRecord::query()
            ->whereKey($memberId)
            ->update(['status' => 'LOCKED']);

        Alert::warning('ล็อคบัญชีสมาชิกแล้ว');

        return redirect()->route('platform.member.edit', $memberId);
    }

    public function activateAccount(): \Illuminate\Http\RedirectResponse
    {
        $memberId = (int) $this->requireMemberRecord()->id;

        MemberUserRecord::query()
            ->whereKey($memberId)
            ->update(['status' => 'ACTIVE']);

        Alert::info('เปิดใช้งานบัญชีสมาชิกแล้ว');

        return redirect()->route('platform.member.edit', $memberId);
    }

    public function resetPassword(BaoAdminApiClient $apiClient): \Illuminate\Http\RedirectResponse
    {
        $member = $this->requireMemberRecord();
        $memberId = (int) $member->id;
        $nationalId = preg_replace('/\D+/', '', (string) ($member->national_id ?? ''));

        if ($nationalId === null || strlen($nationalId) < 6) {
            Alert::error('ไม่พบเลขบัตรประชาชนอย่างน้อย 6 หลักสำหรับสมาชิกคนนี้');

            return redirect()->route('platform.member.edit', $memberId);
        }

        $newPassword = substr($nationalId, -6);

        try {
            $apiClient->request('POST', sprintf('/members/%d/reset-password', $memberId), [
                'newPassword' => $newPassword,
            ]);
        } catch (\Throwable $exception) {
            Alert::error($exception->getMessage());

            return redirect()->route('platform.member.edit', $memberId);
        }

        Alert::info(sprintf('รีเซ็ตรหัสผ่านแล้วเป็น %s', $newPassword));

        return redirect()->route('platform.member.edit', $memberId);
    }

    private function requireMemberRecord(): Member
    {
        if ($this->memberRecord instanceof Member) {
            return $this->memberRecord;
        }

        $routeMember = request()->route('member');
        $memberId = $routeMember instanceof Member ? (int) $routeMember->id : (int) $routeMember;

        if ($memberId <= 0) {
            abort(404, 'Member not found.');
        }

        $this->memberRecord = Member::member003()
            ->with(['memberProfile', 'sponsor'])
            ->findOrFail($memberId);

        return $this->memberRecord;
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
            ],
            'member.joined_date' => ['nullable', 'date'],
            'member.upline_code' => ['nullable', 'string', 'max:50'],
            'member.national_id' => [
                'nullable',
                'string',
                'max:30',
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
