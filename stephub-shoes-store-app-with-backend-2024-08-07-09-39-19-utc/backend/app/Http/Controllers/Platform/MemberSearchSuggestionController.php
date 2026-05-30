<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\MemberUserRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MemberSearchSuggestionController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $field = $request->query('field', 'code');
        $keyword = trim((string) $request->query('q', ''));

        if (mb_strlen($keyword) < 2) {
            return response()->json([
                'data' => [],
            ]);
        }

        $members = Member::member003()
            ->select('User.*')
            ->with(['memberProfile', 'sponsor'])
            ->orderBy('id')
            ->limit(8);

        if ($field === 'name') {
            $containsLike = '%' . $keyword . '%';

            $members->where(function ($query) use ($containsLike) {
                $query
                    ->where('name', 'ilike', $containsLike)
                    ->orWhereHas('memberProfile', function ($profileQuery) use ($containsLike) {
                        $profileQuery->where('honorTitle', 'ilike', $containsLike);
                    });
            });
        } else {
            $prefixLike = $keyword . '%';
            $containsLike = '%' . $keyword . '%';
            $matchedUplineUserIds = MemberUserRecord::query()
                ->where('memberCode', 'ilike', $containsLike)
                ->pluck('id');

            $members
                ->where(function ($query) use ($prefixLike, $containsLike, $matchedUplineUserIds) {
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
                })
                ->orderByRaw('CASE WHEN "User"."memberCode" ILIKE ? THEN 0 ELSE 1 END', [$prefixLike]);
        }

        return response()->json([
            'data' => $members->get()->map(function (Member $member) {
                return [
                    'id' => $member->id,
                    'memberCode' => $member->member_code,
                    'name' => $member->full_name,
                    'label' => trim($member->member_code . ' · ' . $member->full_name),
                    'editUrl' => route('platform.member.edit', $member->id),
                ];
            })->values(),
        ]);
    }
}
