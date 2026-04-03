<?php

namespace App\Orchid\Screens\Kyc;

use App\Models\KycRequest;
use App\Support\BaoAdminApiClient;
use Illuminate\Http\Request;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Fields\TextArea;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Alert;
use Orchid\Support\Facades\Layout;

class KycRequestDetailScreen extends Screen
{
    public ?KycRequest $kycRequest = null;

    public function __construct(private readonly BaoAdminApiClient $apiClient)
    {
    }

    public function query(KycRequest $kycRequest): iterable
    {
        $this->kycRequest = KycRequest::query()
            ->with('member')
            ->findOrFail($kycRequest->id);

        return [
            'request' => [
                'member_code' => (string) optional($this->kycRequest->member)->memberCode,
                'member_name' => (string) optional($this->kycRequest->member)->name,
                'status' => strtolower((string) $this->kycRequest->status),
                'submitted_at' => optional($this->kycRequest->submittedAt)->format('Y-m-d H:i:s'),
                'national_id' => $this->kycRequest->nationalId,
                'bank_name' => $this->kycRequest->bankName,
                'bank_branch' => $this->kycRequest->bankBranch,
                'bank_account_number' => $this->kycRequest->bankAccountNumber,
                'bank_account_name' => $this->kycRequest->bankAccountName,
                'bank_account_type' => $this->kycRequest->bankAccountType,
                'note' => $this->kycRequest->note,
                'rejection_reason' => $this->kycRequest->rejectionReason,
            ],
            'images' => [
                'personal_id_image_url' => $this->kycRequest->personalIdImageUrl,
                'bank_book_image_url' => $this->kycRequest->bankBookImageUrl,
                'selfie_image_url' => $this->kycRequest->selfieImageUrl,
            ],
        ];
    }

    public function name(): ?string
    {
        return 'รายละเอียด KYC #' . ($this->kycRequest?->id ?? '-');
    }

    public function commandBar(): iterable
    {
        return [
            Link::make('Back')
                ->icon('bs.arrow-left')
                ->route('platform.kyc.list'),
            Button::make('Approve')
                ->icon('bs.check2-circle')
                ->method('approveRequest')
                ->canSee(in_array((string) $this->kycRequest?->status, ['PENDING', 'REJECTED'], true)),
            Button::make('Reject')
                ->icon('bs.x-circle')
                ->method('rejectRequest'),
        ];
    }

    public function layout(): iterable
    {
        return [
            Layout::rows([
                Input::make('request.member_code')->title('Member code')->readonly(),
                Input::make('request.member_name')->title('Member name')->readonly(),
                Input::make('request.status')->title('Status')->readonly(),
                Input::make('request.submitted_at')->title('Submitted at')->readonly(),
                Input::make('request.national_id')->title('National ID')->readonly(),
                Input::make('request.bank_name')->title('Bank')->readonly(),
                Input::make('request.bank_branch')->title('Branch')->readonly(),
                Input::make('request.bank_account_number')->title('Account number')->readonly(),
                Input::make('request.bank_account_name')->title('Account name')->readonly(),
                Input::make('request.bank_account_type')->title('Account type')->readonly(),
                TextArea::make('request.note')->title('Note')->rows(3)->readonly(),
                TextArea::make('request.rejection_reason')->title('Rejection reason')->rows(3),
            ])->title('KYC request'),
            Layout::view('kyc.detail-images'),
        ];
    }

    public function approveRequest()
    {
        try {
            $this->apiClient->request('POST', '/wallets/kyc-requests/'.$this->kycRequest->id.'/approve');
        } catch (\Throwable $exception) {
            Alert::error($exception->getMessage());

            return redirect()->route('platform.kyc.detail', $this->kycRequest->id);
        }

        Alert::info('KYC request approved.');

        return redirect()->route('platform.kyc.detail', $this->kycRequest->id);
    }

    public function rejectRequest(Request $request)
    {
        $payload = $request->validate([
            'request.rejection_reason' => ['required', 'string'],
        ]);

        try {
            $this->apiClient->request('POST', '/wallets/kyc-requests/'.$this->kycRequest->id.'/reject', [
                'rejectionReason' => trim((string) ($payload['request']['rejection_reason'] ?? 'Rejected by admin')),
            ]);
        } catch (\Throwable $exception) {
            Alert::error($exception->getMessage());

            return redirect()->route('platform.kyc.detail', $this->kycRequest->id);
        }

        Alert::info('KYC request rejected.');

        return redirect()->route('platform.kyc.detail', $this->kycRequest->id);
    }
}
