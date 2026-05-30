<?php

namespace App\Orchid\Screens\Member;

use App\Models\Member;
use App\Models\MemberUserRecord;
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
        $selectedMemberCode = strtoupper(trim((string) $request->query('selected_member_code', '')));
        $memberCodeSearch = trim((string) $request->query('member_code_search', ''));
        $nameSearch = trim((string) $request->query('name_search', ''));
        preg_match('/TH\d+/i', $memberCodeSearch, $memberCodeMatch);
        $exactMemberCode = strtoupper($memberCodeMatch[0] ?? '');
        if ($selectedMemberCode !== '' && preg_match('/^TH\d+$/i', $selectedMemberCode) === 1) {
            $exactMemberCode = $selectedMemberCode;
        }
        $hasMemberCodeSearch = mb_strlen($memberCodeSearch) >= 2;
        $hasNameSearch = mb_strlen($nameSearch) >= 2;
        $hasSearch = $hasMemberCodeSearch || $hasNameSearch;
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

        if ($selectedMemberCode !== '' && preg_match('/^TH\d+$/i', $selectedMemberCode) === 1) {
            $members->where('memberCode', $selectedMemberCode);
        } elseif ($hasMemberCodeSearch) {
            $prefixLike = $memberCodeSearch . '%';
            $containsLike = '%' . $memberCodeSearch . '%';
            if ($exactMemberCode !== '') {
                $matchedUplineUserIds = MemberUserRecord::query()
                    ->where('memberCode', $exactMemberCode)
                    ->pluck('id');

                $members->where(function ($query) use ($exactMemberCode, $matchedUplineUserIds) {
                    $query
                        ->where('memberCode', $exactMemberCode)
                        ->orWhereHas('sponsor', function ($sponsorQuery) use ($exactMemberCode) {
                            $sponsorQuery->where('memberCode', $exactMemberCode);
                        });

                    if ($matchedUplineUserIds->isNotEmpty()) {
                        $query->orWhereHas('memberProfile', function ($profileQuery) use ($matchedUplineUserIds) {
                            $profileQuery->whereIn('uplineUserId', $matchedUplineUserIds);
                        });
                    }
                });
            } else {
                $matchedUplineUserIds = MemberUserRecord::query()
                    ->where('memberCode', 'ilike', $containsLike)
                    ->pluck('id');

                $members->where(function ($query) use ($prefixLike, $containsLike, $matchedUplineUserIds) {
                    $query
                        ->where('memberCode', 'ilike', $containsLike)
                        ->orWhere('email', 'ilike', $containsLike)
                        ->orWhere('phone', 'ilike', $containsLike)
                        ->orWhereHas('sponsor', function ($sponsorQuery) use ($containsLike) {
                            $sponsorQuery->where('memberCode', 'ilike', $containsLike);
                        })
                        ->orWhereHas('memberProfile', function ($profileQuery) use ($prefixLike, $containsLike) {
                            $profileQuery
                                ->where('nationalId', 'ilike', $containsLike)
                                ->orWhere('rankCode', 'ilike', $prefixLike)
                                ->orWhere('mobileCenterCode', 'ilike', $prefixLike);
                        });

                    if ($matchedUplineUserIds->isNotEmpty()) {
                        $query->orWhereHas('memberProfile', function ($profileQuery) use ($matchedUplineUserIds) {
                            $profileQuery->whereIn('uplineUserId', $matchedUplineUserIds);
                        });
                    }
                });
            }
        }

        if ($hasNameSearch) {
            $containsLike = '%' . $nameSearch . '%';

            $members->where(function ($query) use ($containsLike) {
                $query
                    ->where('name', 'ilike', $containsLike)
                    ->orWhereHas('memberProfile', function ($profileQuery) use ($containsLike) {
                        $profileQuery->where('honorTitle', 'ilike', $containsLike);
                    });
            });
        }

        $memberSearchSuggestions = collect();

        if ($hasMemberCodeSearch) {
            $prefixLike = $memberCodeSearch . '%';
            $containsLike = '%' . $memberCodeSearch . '%';
            $memberSearchSuggestions = Member::member003()
                ->select('User.*')
                ->where(function ($query) use ($prefixLike, $containsLike) {
                    $query
                        ->where('memberCode', 'ilike', $containsLike)
                        ->orWhere('name', 'ilike', $containsLike)
                        ->orWhere('email', 'ilike', $containsLike)
                        ->orWhere('phone', 'ilike', $containsLike);
                })
                ->orderByRaw('CASE WHEN "User"."memberCode" ILIKE ? THEN 0 ELSE 1 END', [$prefixLike])
                ->orderBy('memberCode')
                ->limit(8)
                ->get();
        }

        return [
            'memberCodeSearch' => $memberCodeSearch,
            'nameSearch' => $nameSearch,
            'selectedMemberCode' => $selectedMemberCode,
            'memberSearchOptions' => Member::member003()
                ->select('id', 'memberCode', 'name')
                ->orderBy('memberCode')
                ->get(),
            'memberSearchSuggestions' => $memberSearchSuggestions,
            'members' => ($hasSearch ? $members->simplePaginate(20) : $members->paginate(20))
                ->appends([
                    'selected_member_code' => $selectedMemberCode,
                    'member_code_search' => $memberCodeSearch,
                    'name_search' => $nameSearch,
                ]),
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
