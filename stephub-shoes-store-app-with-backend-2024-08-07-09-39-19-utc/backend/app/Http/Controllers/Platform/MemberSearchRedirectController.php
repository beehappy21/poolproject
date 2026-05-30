<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\Member;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class MemberSearchRedirectController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $selectedMemberCode = strtoupper(trim((string) $request->query('selected_member_code', '')));
        $memberCodeSearch = trim((string) $request->query('member_code_search', ''));
        $nameSearch = trim((string) $request->query('name_search', ''));

        preg_match('/TH\d+/i', $memberCodeSearch, $memberCodeMatch);
        $exactMemberCode = strtoupper($memberCodeMatch[0] ?? '');

        if ($selectedMemberCode !== '' && preg_match('/^TH\d+$/i', $selectedMemberCode) === 1) {
            $exactMemberCode = $selectedMemberCode;
        }

        if ($exactMemberCode !== '') {
            $member = Member::member003()
                ->where('memberCode', $exactMemberCode)
                ->first();

            if ($member) {
                return redirect()->route('platform.member.edit', $member->id);
            }
        }

        return redirect()->route('platform.member.list', [
            'selected_member_code' => $selectedMemberCode,
            'member_code_search' => $memberCodeSearch,
            'name_search' => $nameSearch,
        ]);
    }
}
