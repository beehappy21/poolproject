<?php

namespace App\Orchid\Screens\Wallet;

use App\Models\MemberUserRecord;
use App\Support\BaoAdminApiClient;
use Illuminate\Http\Request;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Fields\Select;
use Orchid\Screen\Fields\TextArea;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Alert;
use Orchid\Support\Facades\Layout;

class WalletManualTopupScreen extends Screen
{
    public function __construct(private readonly BaoAdminApiClient $apiClient)
    {
    }

    public function query(): iterable
    {
        return [
            'topup' => [
                'payment_method' => 'manual_bank',
            ],
        ];
    }

    public function name(): ?string
    {
        return 'เติม Wallet ให้สมาชิก';
    }

    public function description(): ?string
    {
        return 'แอดมินสามารถเพิ่มยอด shopping wallet ให้สมาชิกได้โดยตรง';
    }

    public function commandBar(): iterable
    {
        return [
            Link::make('ดูคำขอเติม Wallet')
                ->icon('bs.card-checklist')
                ->route('platform.wallet.topup.list'),
            Button::make('เติม Wallet')
                ->icon('bs.check2-circle')
                ->method('create'),
        ];
    }

    public function layout(): iterable
    {
        return [
            Layout::rows([
                Input::make('topup.member_code')
                    ->title('Member code')
                    ->placeholder('เช่น TH0000001')
                    ->required()
                    ->help('ระบบจะหา member จาก member code ก่อน ถ้าไม่เจอจะลองจาก referral code ให้'),
                Input::make('topup.amount')
                    ->title('Amount')
                    ->type('number')
                    ->step('0.01')
                    ->min(0.01)
                    ->required(),
                Select::make('topup.payment_method')
                    ->title('Payment method')
                    ->options([
                        'manual_bank' => 'Manual bank',
                        'promptpay_qr' => 'PromptPay QR',
                        'cash' => 'Cash',
                    ])
                    ->required(),
                TextArea::make('topup.note')
                    ->title('Note')
                    ->rows(4)
                    ->placeholder('บันทึกเหตุผลหรือ reference ภายใน'),
            ])->title('Manual wallet top-up'),
        ];
    }

    public function create(Request $request)
    {
        $validated = $request->validate([
            'topup.member_code' => ['required', 'string', 'max:50'],
            'topup.amount' => ['required', 'numeric', 'gt:0'],
            'topup.payment_method' => ['required', 'string', 'max:100'],
            'topup.note' => ['nullable', 'string'],
        ]);

        $memberCode = trim((string) $validated['topup']['member_code']);
        $member = MemberUserRecord::query()
            ->where('memberCode', $memberCode)
            ->orWhere('referralCode', $memberCode)
            ->first();

        if (! $member) {
            return back()
                ->withErrors(['topup.member_code' => 'Member code not found.'])
                ->withInput();
        }

        try {
            $this->apiClient->request('POST', '/wallets/'.$member->id.'/topups', [
                'amount' => number_format((float) $validated['topup']['amount'], 2, '.', ''),
                'paymentMethod' => trim((string) $validated['topup']['payment_method']),
                'note' => trim((string) ($validated['topup']['note'] ?? '')) ?: null,
            ]);
        } catch (\Throwable $exception) {
            return back()
                ->withErrors(['topup.member_code' => $exception->getMessage()])
                ->withInput();
        }

        Alert::info('Wallet top-up completed successfully.');

        return redirect()->route('platform.wallet.topup.manual');
    }
}
