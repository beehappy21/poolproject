<?php

namespace App\Orchid\Screens\Commission;

use App\Models\Member;
use App\Models\SpecialCommissionCycleGrantRecord;
use App\Support\BaoAdminApiClient;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Fields\Select;
use Orchid\Screen\Fields\TextArea;
use Orchid\Screen\Screen;
use Orchid\Screen\Sight;
use Orchid\Screen\TD;
use Orchid\Support\Facades\Alert;
use Orchid\Support\Facades\Layout;

class SpecialCommissionPrivilegeScreen extends Screen
{
    /** @var array<string, mixed>|null */
    private ?array $selectedMember = null;

    public function query(Request $request): iterable
    {
        $memberCode = strtoupper(trim((string) $request->query('member_code', '')));
        $search = strtoupper(trim((string) $request->query('search', $memberCode)));

        $selectedMemberRecord = null;
        if ($memberCode !== '') {
            $selectedMemberRecord = Member::member003()
                ->with(['memberProfile', 'sponsor'])
                ->where('memberCode', $memberCode)
                ->first();
        }

        $this->selectedMember = $selectedMemberRecord ? [
            'member_id' => (string) $selectedMemberRecord->id,
            'member_code' => (string) $selectedMemberRecord->member_code,
            'full_name' => (string) ($selectedMemberRecord->full_name ?: '-'),
            'status' => (string) ($selectedMemberRecord->status ?: '-'),
            'sponsor_code' => (string) ($selectedMemberRecord->sponsor_code ?: '-'),
            'upline_code' => (string) ($selectedMemberRecord->upline_code ?: '-'),
        ] : null;

        $grants = SpecialCommissionCycleGrantRecord::query()
            ->from('SpecialCommissionCycleGrant as grant')
            ->join('User as member_user', 'member_user.id', '=', 'grant.userId')
            ->leftJoin('MemberPackageCycle as cycle', 'cycle.id', '=', 'grant.memberPackageCycleId')
            ->select([
                'grant.id',
                'grant.createdAt',
                'grant.activatedAt',
                'grant.cycleNo',
                'grant.grantCode',
                'grant.grantedPv',
                'grant.purchaseBase',
                'grant.earningCap',
                'grant.reason',
                'grant.note',
                'grant.grantedByAdminName',
                'grant.grantedByAdminEmail',
                'member_user.memberCode as memberCode',
                'member_user.name as memberName',
                'cycle.isReceivable as cycleIsReceivable',
                'cycle.earningStatus as cycleEarningStatus',
                'cycle.status as cycleStatus',
            ])
            ->orderByDesc('grant.id');

        if ($search !== '') {
            $like = '%' . $search . '%';
            $grants->where(function ($query) use ($like) {
                $query
                    ->where('member_user.memberCode', 'ilike', $like)
                    ->orWhere('member_user.name', 'ilike', $like)
                    ->orWhere('grant.reason', 'ilike', $like)
                    ->orWhere('grant.grantedByAdminName', 'ilike', $like)
                    ->orWhere('grant.grantedByAdminEmail', 'ilike', $like);
            });
        }

        return [
            'grant' => [
                'member_code' => $memberCode,
                'grant_code' => 'SPECIAL_200_PV',
                'reason' => '',
                'note' => '',
            ],
            'search' => $search,
            'selectedMember' => $this->selectedMember,
            'grants' => $grants->paginate(20)->appends([
                'search' => $search,
                'member_code' => $memberCode,
            ]),
        ];
    }

    public function name(): ?string
    {
        return 'สิทธิ์พิเศษค่าคอม';
    }

    public function description(): ?string
    {
        return 'เปิดหรือปิดรอบรับคอมพิเศษของสมาชิกโดยไม่ต้องสร้างออเดอร์ พร้อมเก็บประวัติการ grant';
    }

    public function commandBar(): iterable
    {
        return [
            Link::make('กลับรายงานคอม')
                ->icon('bs.arrow-left')
                ->route('platform.commission.report'),
            Button::make('ให้สิทธิ์พิเศษ 1 รอบ')
                ->icon('bs.stars')
                ->method('grantPrivilege'),
            Button::make('ปิดรอบพิเศษล่าสุด')
                ->icon('bs.x-circle')
                ->method('closeLatestPrivilege')
                ->confirm('ยืนยันการปิดรอบพิเศษล่าสุดของสมาชิกนี้? การทำรายการนี้จะปิด cycle ล่าสุด แต่จะไม่ลบประวัติการ grant')
                ->canSee($this->selectedMember !== null),
        ];
    }

    public function layout(): iterable
    {
        $layouts = [
            Layout::rows([
                Input::make('grant.member_code')
                    ->title('รหัสสมาชิก')
                    ->placeholder('เช่น TH0000003')
                    ->required(),
                Select::make('grant.grant_code')
                    ->title('รูปแบบสิทธิ์พิเศษ')
                    ->options([
                        'SPECIAL_100_PV' => '100 PV / cap 5,000 / purchase base 650',
                        'SPECIAL_200_PV' => '200 PV / cap 10,000 / purchase base 1,000',
                    ])
                    ->required(),
                Input::make('grant.reason')
                    ->title('เหตุผล')
                    ->placeholder('เช่น โบนัสเปิดสิทธิ์รอบพิเศษ')
                    ->required(),
                TextArea::make('grant.note')
                    ->title('หมายเหตุเพิ่มเติม')
                    ->rows(3)
                    ->placeholder('ใส่รายละเอียดประกอบการให้สิทธิ์พิเศษ'),
            ])->title('Grant special commission cycle'),
        ];

        if ($this->selectedMember !== null) {
            $layouts[] = Layout::legend('selectedMember', [
                Sight::make('member_code', 'รหัสสมาชิก'),
                Sight::make('full_name', 'ชื่อ'),
                Sight::make('status', 'สถานะ'),
                Sight::make('sponsor_code', 'รหัสผู้แนะนำ'),
                Sight::make('upline_code', 'อัพไลน์'),
            ])->title('Member preview');
        }

        $layouts[] = Layout::table('grants', [
            TD::make('createdAt', 'เวลาที่ให้สิทธิ์')
                ->render(function ($row) {
                    if (empty($row->createdAt)) {
                        return '-';
                    }

                    return Carbon::parse($row->createdAt)->format('Y-m-d H:i');
                }),
            TD::make('memberCode', 'รหัสสมาชิก')
                ->render(fn ($row) => e((string) ($row->memberCode ?? '-'))),
            TD::make('memberName', 'ชื่อ')
                ->render(fn ($row) => e((string) ($row->memberName ?? '-'))),
            TD::make('grantCode', 'สิทธิ์')
                ->render(function ($row) {
                    return $row->grantCode === 'SPECIAL_100_PV'
                        ? '100 PV / cap 5,000'
                        : '200 PV / cap 10,000';
                }),
            TD::make('cycleNo', 'Cycle')
                ->render(fn ($row) => (string) $row->cycleNo),
            TD::make('earningCap', 'Cap')
                ->render(fn ($row) => number_format((float) $row->earningCap, 2)),
            TD::make('cycleStatus', 'สถานะรอบ')
                ->render(function ($row) {
                    $receivable = filter_var($row->cycleIsReceivable, FILTER_VALIDATE_BOOLEAN)
                        ? 'receivable'
                        : 'queued';

                    return trim((string) ($row->cycleStatus ?: '-') . ' / ' . (string) ($row->cycleEarningStatus ?: '-') . ' / ' . $receivable);
                }),
            TD::make('reason', 'เหตุผล')
                ->width('220px')
                ->render(fn ($row) => e((string) ($row->reason ?? '-'))),
            TD::make('grantedByAdminName', 'โดย')
                ->render(function ($row) {
                    $name = trim((string) ($row->grantedByAdminName ?? ''));
                    $email = trim((string) ($row->grantedByAdminEmail ?? ''));

                    if ($name !== '' && $email !== '') {
                        return e($name . ' (' . $email . ')');
                    }

                    return e($name !== '' ? $name : ($email !== '' ? $email : '-'));
                }),
        ])->title('ประวัติการให้สิทธิ์ล่าสุด');

        return $layouts;
    }

    public function grantPrivilege(Request $request, BaoAdminApiClient $apiClient)
    {
        $validated = $request->validate([
            'grant.member_code' => ['required', 'string'],
            'grant.grant_code' => ['required', 'in:SPECIAL_100_PV,SPECIAL_200_PV'],
            'grant.reason' => ['required', 'string', 'max:255'],
            'grant.note' => ['nullable', 'string'],
        ]);

        $memberCode = strtoupper(trim((string) data_get($validated, 'grant.member_code', '')));
        $member = Member::member003()
            ->where('memberCode', $memberCode)
            ->first();

        if (! $member) {
            Alert::error('ไม่พบสมาชิกจากรหัสที่กรอก');

            return redirect()->route('platform.commission.specialPrivilege', [
                'member_code' => $memberCode,
            ]);
        }

        $user = $request->user();

        try {
            $result = $apiClient->internalRequest('POST', '/internal/bao/members/special-commission-cycle', [
                'memberId' => (string) $member->id,
                'grantCode' => (string) data_get($validated, 'grant.grant_code'),
                'reason' => (string) data_get($validated, 'grant.reason'),
                'note' => (string) data_get($validated, 'grant.note', ''),
                'grantedByAdminName' => $user?->name,
                'grantedByAdminEmail' => $user?->email,
            ]);
        } catch (\Throwable $exception) {
            Alert::error($exception->getMessage());

            return redirect()->route('platform.commission.specialPrivilege', [
                'member_code' => $memberCode,
            ]);
        }

        $grantLabel = ($result['grantCode'] ?? '') === 'SPECIAL_100_PV'
            ? '100 PV / cap 5,000'
            : '200 PV / cap 10,000';

        Alert::info(sprintf(
            'ให้สิทธิ์พิเศษ %s กับ %s แล้ว เปิด cycle %s',
            $grantLabel,
            $result['memberCode'] ?? $memberCode,
            $result['cycleNo'] ?? '-'
        ));

        return redirect()->route('platform.commission.specialPrivilege', [
            'member_code' => $memberCode,
        ]);
    }

    public function closeLatestPrivilege(Request $request, BaoAdminApiClient $apiClient)
    {
        $validated = $request->validate([
            'grant.member_code' => ['required', 'string'],
        ]);

        $memberCode = strtoupper(trim((string) data_get($validated, 'grant.member_code', '')));
        $member = Member::member003()
            ->where('memberCode', $memberCode)
            ->first();

        if (! $member) {
            Alert::error('ไม่พบสมาชิกจากรหัสที่กรอก');

            return redirect()->route('platform.commission.specialPrivilege', [
                'member_code' => $memberCode,
            ]);
        }

        $user = $request->user();

        try {
            $result = $apiClient->internalRequest('POST', '/internal/bao/members/special-commission-cycle/close-latest', [
                'memberId' => (string) $member->id,
                'closedByAdminName' => $user?->name,
                'closedByAdminEmail' => $user?->email,
            ]);
        } catch (\Throwable $exception) {
            Alert::error($exception->getMessage());

            return redirect()->route('platform.commission.specialPrivilege', [
                'member_code' => $memberCode,
            ]);
        }

        $nextCycleText = ! empty($result['nextReceivableCycleNo'])
            ? ' รอบที่รับคอมต่อคือ cycle ' . $result['nextReceivableCycleNo']
            : ' ยังไม่มี cycle ที่รับคอมต่อทันที';

        Alert::info(sprintf(
            'ปิดรอบพิเศษล่าสุดของ %s แล้ว (cycle %s).%s',
            $result['memberCode'] ?? $memberCode,
            $result['cycleNo'] ?? '-',
            $nextCycleText
        ));

        return redirect()->route('platform.commission.specialPrivilege', [
            'member_code' => $memberCode,
        ]);
    }
}
