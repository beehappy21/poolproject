<?php

namespace App\Orchid\Screens\Member;

use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Screen;
use Orchid\Screen\TD;
use Orchid\Support\Facades\Layout;

class MemberListScreen extends Screen
{
    public function query(Request $request): iterable
    {
        $search = trim((string) $request->query('search', ''));
        $members = Member::member003()
            ->select('User.*')
            ->selectSub(
                DB::connection('poolproject')
                    ->table('MatrixCycle')
                    ->selectRaw('COALESCE("personalCarryPv", 0)')
                    ->whereColumn('MatrixCycle.userId', 'User.id')
                    ->orderByDesc('cycleNo')
                    ->limit(1),
                'pv_hold'
            )
            ->with(['memberProfile', 'sponsor'])
            ->orderBy('id');

        if ($search !== '') {
            $members->where(function ($query) use ($search) {
                $like = '%' . $search . '%';
                $query
                    ->where('memberCode', 'ilike', $like)
                    ->orWhere('name', 'ilike', $like)
                    ->orWhere('email', 'ilike', $like)
                    ->orWhere('phone', 'ilike', $like)
                    ->orWhereHas('sponsor', function ($sponsorQuery) use ($like) {
                        $sponsorQuery->where('memberCode', 'ilike', $like);
                    })
                    ->orWhereHas('memberProfile', function ($profileQuery) use ($like) {
                        $profileQuery
                            ->where('nationalId', 'ilike', $like)
                            ->orWhere('rankCode', 'ilike', $like)
                            ->orWhere('honorTitle', 'ilike', $like)
                            ->orWhere('mobileCenterCode', 'ilike', $like);
                    });
            });
        }

        return [
            'search' => $search,
            'members' => $members->paginate(20)->appends(['search' => $search]),
        ];
    }

    public function name(): ?string
    {
        return 'Members';
    }

    public function description(): ?string
    {
        return 'Spreadsheet-style member table based on member003.xlsx';
    }

    public function commandBar(): iterable
    {
        return [];
    }

    public function layout(): iterable
    {
        return [
            Layout::view('member.search-bar'),
            Layout::table('members', [
                TD::make('seq_no', 'ลำดับที่')
                    ->sort()
                    ->cantHide()
                    ->width('90px'),

                TD::make('member_code', 'รหัสสมาชิก')
                    ->sort()
                    ->cantHide()
                    ->filter(Input::make())
                    ->render(function (Member $member) {
                        return Link::make((string) $member->member_code)
                            ->route('platform.member.edit', $member->id);
                    }),

                TD::make('joined_date', 'วันที่สมัคร')
                    ->sort()
                    ->cantHide()
                    ->render(fn (Member $member) => optional($member->joined_date)->format('Y-m-d') ?: '-'),

                TD::make('sponsor_code', 'รหัสผู้แนะนำ')
                    ->sort()
                    ->filter(Input::make())
                    ->render(fn (Member $member) => $member->sponsor_code ?: '-'),

                TD::make('upline_code', 'อัพไลน์')
                    ->render(fn (Member $member) => $member->upline_code ?: '-'),

                TD::make('national_id', 'เลขบัตรประชาชน')
                    ->render(fn (Member $member) => $member->national_id ?: '-'),

                TD::make('side', 'ด้าน')
                    ->render(fn (Member $member) => $member->side ?: '-'),

                TD::make('full_name', 'ชื่อธุรกิจ')
                    ->sort()
                    ->filter(Input::make())
                    ->render(fn (Member $member) => e($member->full_name ?: '-')),

                TD::make('pv_hold', 'PV HOLD')
                    ->render(function (Member $member) {
                        $pvHold = $member->pv_hold;

                        if ($pvHold === null || $pvHold === '') {
                            return '0.00';
                        }

                        return number_format((float) $pvHold, 2);
                    }),

                TD::make('rank_code', 'ตำแหน่ง')
                    ->render(fn (Member $member) => $member->rank_code ?: '-'),

                TD::make('honor_title', 'เกียรติยศ')
                    ->render(fn (Member $member) => $member->honor_title ?: '-'),

                TD::make('mobile_center', 'โมบายเซ็นเตอร์')
                    ->render(fn (Member $member) => $member->mobile_center ?: '-'),

                TD::make('email', 'อีเมล')
                    ->filter(Input::make())
                    ->render(fn (Member $member) => $member->email ?: '-'),

                TD::make('phone', 'มือถือ')
                    ->filter(Input::make())
                    ->render(fn (Member $member) => $member->phone ?: '-'),

                TD::make('status', 'สถานะ')
                    ->sort()
                    ->render(fn (Member $member) => e($member->status ?: '-')),

                TD::make('actions', 'ดำเนินการ')
                    ->cantHide()
                    ->align(TD::ALIGN_CENTER)
                    ->render(function (Member $member) {
                        return Link::make('View')
                            ->icon('bs.eye')
                            ->route('platform.member.edit', $member->id);
                    }),
            ]),
        ];
    }
}
