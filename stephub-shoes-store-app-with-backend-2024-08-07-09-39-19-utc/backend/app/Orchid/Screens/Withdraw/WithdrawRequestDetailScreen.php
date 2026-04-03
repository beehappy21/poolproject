<?php

namespace App\Orchid\Screens\Withdraw;

use App\Models\WithdrawRequest;
use App\Support\BaoAdminApiClient;
use Illuminate\Http\Request;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Fields\TextArea;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Alert;
use Orchid\Support\Facades\Layout;

class WithdrawRequestDetailScreen extends Screen
{
    public ?WithdrawRequest $withdrawRequest = null;

    public function __construct(private readonly BaoAdminApiClient $apiClient)
    {
    }

    public function query(WithdrawRequest $withdrawRequest): iterable
    {
        $this->withdrawRequest = WithdrawRequest::query()
            ->with('member')
            ->findOrFail($withdrawRequest->id);

        return [
            'request' => [
                'id' => $this->withdrawRequest->id,
                'member_code' => (string) optional($this->withdrawRequest->member)->memberCode,
                'member_name' => (string) optional($this->withdrawRequest->member)->name,
                'status' => strtolower((string) $this->withdrawRequest->status),
                'requested_at' => optional($this->withdrawRequest->requestedAt)->format('Y-m-d H:i:s'),
                'amount' => number_format((float) $this->withdrawRequest->amount, 2, '.', ''),
                'tax_amount' => number_format((float) $this->withdrawRequest->taxAmount, 2, '.', ''),
                'auto_sweep_amount' => number_format((float) $this->withdrawRequest->autoSweepAmount, 2, '.', ''),
                'fee_amount' => number_format((float) $this->withdrawRequest->feeAmount, 2, '.', ''),
                'net_bank_amount' => number_format((float) $this->withdrawRequest->netBankAmount, 2, '.', ''),
                'bank_name' => $this->withdrawRequest->bankName,
                'bank_branch' => $this->withdrawRequest->bankBranch,
                'account_number' => $this->withdrawRequest->accountNumber,
                'account_name' => $this->withdrawRequest->accountName,
                'account_type' => $this->withdrawRequest->accountType,
                'note' => $this->withdrawRequest->note,
                'rejection_reason' => $this->withdrawRequest->rejectionReason,
            ],
        ];
    }

    public function name(): ?string
    {
        return 'รายละเอียดการแจ้งถอน #' . ($this->withdrawRequest?->id ?? '-');
    }

    public function commandBar(): iterable
    {
        return [
            Link::make('Back')
                ->icon('bs.arrow-left')
                ->route('platform.withdraw.list'),
            Button::make('Approve')
                ->icon('bs.check2-circle')
                ->method('approveRequest')
                ->canSee(in_array((string) $this->withdrawRequest?->status, ['PENDING', 'REJECTED'], true)),
            Button::make('Reject')
                ->icon('bs.x-circle')
                ->method('rejectRequest')
                ->canSee(in_array((string) $this->withdrawRequest?->status, ['PENDING', 'APPROVED'], true)),
            Button::make('Mark Paid')
                ->icon('bs.bank')
                ->method('markPaid')
                ->canSee(in_array((string) $this->withdrawRequest?->status, ['APPROVED', 'EXPORTED'], true)),
        ];
    }

    public function layout(): iterable
    {
        return [
            Layout::rows([
                Input::make('request.member_code')->title('Member code')->readonly(),
                Input::make('request.member_name')->title('Member name')->readonly(),
                Input::make('request.status')->title('Status')->readonly(),
                Input::make('request.requested_at')->title('Requested at')->readonly(),
                Input::make('request.amount')->title('Amount (บาท)')->readonly(),
                Input::make('request.tax_amount')->title('Tax (บาท)')->readonly(),
                Input::make('request.auto_sweep_amount')->title('Auto sweep (บาท)')->readonly(),
                Input::make('request.fee_amount')->title('Fee (บาท)')->readonly(),
                Input::make('request.net_bank_amount')->title('Net bank amount (บาท)')->readonly(),
                Input::make('request.bank_name')->title('Bank')->readonly(),
                Input::make('request.bank_branch')->title('Branch')->readonly(),
                Input::make('request.account_number')->title('Account number')->readonly(),
                Input::make('request.account_name')->title('Account name')->readonly(),
                Input::make('request.account_type')->title('Account type')->readonly(),
                TextArea::make('request.note')->title('Note')->rows(3)->readonly(),
                TextArea::make('request.rejection_reason')
                    ->title('Rejection reason')
                    ->rows(3),
            ])->title('Withdraw request'),
        ];
    }

    public function approveRequest()
    {
        try {
            $this->apiClient->request('POST', '/wallets/withdraw-requests/'.$this->withdrawRequest->id.'/approve');
        } catch (\Throwable $exception) {
            Alert::error($exception->getMessage());

            return redirect()->route('platform.withdraw.detail', $this->withdrawRequest->id);
        }

        Alert::info('Withdraw request approved.');

        return redirect()->route('platform.withdraw.detail', $this->withdrawRequest->id);
    }

    public function rejectRequest(Request $request)
    {
        $payload = $request->validate([
            'request.rejection_reason' => ['required', 'string'],
        ]);

        try {
            $this->apiClient->request('POST', '/wallets/withdraw-requests/'.$this->withdrawRequest->id.'/reject', [
                'rejectionReason' => trim((string) ($payload['request']['rejection_reason'] ?? 'Rejected by admin')),
            ]);
        } catch (\Throwable $exception) {
            Alert::error($exception->getMessage());

            return redirect()->route('platform.withdraw.detail', $this->withdrawRequest->id);
        }

        Alert::info('Withdraw request rejected.');

        return redirect()->route('platform.withdraw.detail', $this->withdrawRequest->id);
    }

    public function markPaid()
    {
        try {
            $this->apiClient->request('POST', '/wallets/withdraw-requests/'.$this->withdrawRequest->id.'/paid');
        } catch (\Throwable $exception) {
            Alert::error($exception->getMessage());

            return redirect()->route('platform.withdraw.detail', $this->withdrawRequest->id);
        }

        Alert::info('Withdraw request marked as paid.');

        return redirect()->route('platform.withdraw.detail', $this->withdrawRequest->id);
    }
}
