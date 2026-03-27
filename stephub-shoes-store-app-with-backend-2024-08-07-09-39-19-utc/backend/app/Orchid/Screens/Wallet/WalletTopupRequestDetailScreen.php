<?php

namespace App\Orchid\Screens\Wallet;

use App\Models\WalletTopupRequest;
use App\Support\BaoAdminApiClient;
use Illuminate\Http\Request;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Fields\TextArea;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Alert;
use Orchid\Support\Facades\Layout;

class WalletTopupRequestDetailScreen extends Screen
{
    public WalletTopupRequest $walletTopupRequest;

    public function __construct(private readonly BaoAdminApiClient $apiClient)
    {
    }

    public function query(WalletTopupRequest $walletTopupRequest): iterable
    {
        $this->walletTopupRequest = WalletTopupRequest::query()
            ->with(['member', 'approvedByUser'])
            ->findOrFail($walletTopupRequest->id);

        return [
            'request' => [
                'member_code' => (string) optional($this->walletTopupRequest->member)->memberCode,
                'member_name' => (string) optional($this->walletTopupRequest->member)->name,
                'status' => strtolower((string) $this->walletTopupRequest->status),
                'requested_at' => optional($this->walletTopupRequest->requestedAt)->format('Y-m-d H:i:s'),
                'amount' => number_format((float) $this->walletTopupRequest->amount, 2, '.', ''),
                'payment_method' => $this->walletTopupRequest->paymentMethod,
                'note' => $this->walletTopupRequest->note,
                'approved_at' => optional($this->walletTopupRequest->approvedAt)->format('Y-m-d H:i:s'),
                'approved_by' => (string) optional($this->walletTopupRequest->approvedByUser)->memberCode,
                'rejection_reason' => $this->walletTopupRequest->rejectionReason,
            ],
            'images' => [
                'transfer_slip_url' => $this->walletTopupRequest->transferSlipUrl,
            ],
        ];
    }

    public function name(): ?string
    {
        return 'รายละเอียดคำขอเติม Wallet #'.$this->walletTopupRequest->id;
    }

    public function commandBar(): iterable
    {
        return [
            Link::make('Back')
                ->icon('bs.arrow-left')
                ->route('platform.wallet.topup.list'),
            Button::make('Approve')
                ->icon('bs.check2-circle')
                ->method('approveRequest')
                ->canSee($this->walletTopupRequest->status === 'PENDING'),
            Button::make('Reject')
                ->icon('bs.x-circle')
                ->method('rejectRequest')
                ->canSee($this->walletTopupRequest->status === 'PENDING'),
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
                Input::make('request.amount')->title('Amount')->readonly(),
                Input::make('request.payment_method')->title('Payment method')->readonly(),
                Input::make('request.approved_at')->title('Approved at')->readonly(),
                Input::make('request.approved_by')->title('Approved by')->readonly(),
                TextArea::make('request.note')->title('Note')->rows(3)->readonly(),
                TextArea::make('request.rejection_reason')->title('Rejection reason')->rows(3),
            ])->title('Wallet top-up request'),
            Layout::view('wallet.topup-detail-images'),
        ];
    }

    public function approveRequest()
    {
        try {
            $this->apiClient->request('POST', '/wallets/topup-requests/'.$this->walletTopupRequest->id.'/approve');
        } catch (\Throwable $exception) {
            Alert::error($exception->getMessage());

            return redirect()->route('platform.wallet.topup.detail', $this->walletTopupRequest->id);
        }

        Alert::info('Wallet top-up request approved.');

        return redirect()->route('platform.wallet.topup.detail', $this->walletTopupRequest->id);
    }

    public function rejectRequest(Request $request)
    {
        $payload = $request->validate([
            'request.rejection_reason' => ['required', 'string'],
        ]);

        try {
            $this->apiClient->request('POST', '/wallets/topup-requests/'.$this->walletTopupRequest->id.'/reject', [
                'rejectionReason' => trim((string) ($payload['request']['rejection_reason'] ?? 'Rejected by admin')),
            ]);
        } catch (\Throwable $exception) {
            Alert::error($exception->getMessage());

            return redirect()->route('platform.wallet.topup.detail', $this->walletTopupRequest->id);
        }

        Alert::info('Wallet top-up request rejected.');

        return redirect()->route('platform.wallet.topup.detail', $this->walletTopupRequest->id);
    }
}
