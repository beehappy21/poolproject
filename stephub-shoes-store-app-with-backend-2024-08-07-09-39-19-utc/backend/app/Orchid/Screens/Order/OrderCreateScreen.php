<?php

namespace App\Orchid\Screens\Order;

use App\Models\Member;
use App\Models\MemberShippingAddressRecord;
use App\Models\ProductDetailRecord;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Fields\CheckBox;
use Orchid\Screen\Fields\Group;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Fields\Matrix;
use Orchid\Screen\Fields\RadioButtons;
use Orchid\Screen\Fields\Select;
use Orchid\Screen\Fields\TextArea;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Alert;
use Orchid\Support\Facades\Layout;

class OrderCreateScreen extends Screen
{
    /**
     * @var array<int, string>
     */
    private array $memberOptions = [];

    /**
     * @var array<int, string>
     */
    private array $productOptions = [];

    private ?string $adminApiAccessToken = null;

    public function query(Request $request): iterable
    {
        $members = Member::member003()
            ->orderBy('memberCode')
            ->get(['id', 'memberCode', 'name', 'email', 'phone']);

        $productDetails = ProductDetailRecord::query()
            ->where('status', 'ACTIVE')
            ->orderBy('name')
            ->get([
                'id',
                'code',
                'name',
                'memberPriceUsdt',
                'pv',
            ]);

        $this->memberOptions = $members
            ->mapWithKeys(fn (Member $member) => [
                $member->id => sprintf(
                    '%s • %s',
                    (string) $member->memberCode,
                    (string) $member->full_name
                ),
            ])
            ->all();

        $this->productOptions = $productDetails
            ->mapWithKeys(fn (ProductDetailRecord $detail) => [
                $detail->id => sprintf(
                    '%s • %s ($%s / PV %s)',
                    (string) $detail->code,
                    (string) $detail->name,
                    number_format((float) $detail->memberPriceUsdt, 2),
                    number_format((float) $detail->pv, 2),
                ),
            ])
            ->all();

        $sale = old('sale', [
            'workflow_mode' => 'approve_and_process',
            'member_id' => '',
            'fulfillment_method' => 'delivery',
            'recipient_name' => '',
            'phone' => '',
            'email' => '',
            'label' => 'Admin sale address',
            'country_name' => 'Thailand',
            'country_code' => 'TH',
            'province_name' => '',
            'district_name' => '',
            'subdistrict_name' => '',
            'postal_code' => '',
            'address_line' => '',
            'note' => '',
            'save_as_default' => false,
            'pickup_branch_name' => '',
            'pickup_branch_note' => '',
            'pickup_recipient_name' => '',
            'pickup_phone' => '',
            'pickup_email' => '',
            'discount_wallet_amount' => '0',
            'shopping_wallet_amount' => '0',
            'firm_wallet_amount' => '0',
            'cash_payment_method' => 'cash',
            'items' => [
                ['product_detail_id' => '', 'quantity' => '1'],
            ],
            'batch_lines' => [
                ['member_id' => '', 'product_detail_id' => '', 'quantity' => '1'],
            ],
        ]);

        return [
            'sale' => $sale,
        ];
    }

    public function name(): ?string
    {
        return 'Create Member Sale';
    }

    public function description(): ?string
    {
        return 'Create one member sale or batch-create one order per member, then optionally approve and process commissions immediately.';
    }

    public function commandBar(): iterable
    {
        return [
            Button::make('Create sale')
                ->icon('bs.cart-plus')
                ->method('createSale'),
        ];
    }

    public function layout(): iterable
    {
        return [
            Layout::rows([
                Group::make([
                    Select::make('sale.member_id')
                        ->title('Single-member mode: member')
                        ->options($this->memberOptions)
                        ->empty('Select member for one order'),
                    Select::make('sale.workflow_mode')
                        ->title('Workflow')
                        ->options([
                            'approve_and_process' => 'Create + approve + process commissions',
                            'create_only' => 'Create only',
                        ])
                        ->required(),
                ]),
                Group::make([
                    RadioButtons::make('sale.fulfillment_method')
                        ->title('Fulfillment')
                        ->options([
                            'delivery' => 'Delivery',
                            'branch_pickup' => 'Branch pickup',
                        ])
                        ->help('Delivery supports one member per submit. Use Branch pickup for multi-member batch runs.')
                        ->required(),
                ]),
            ])->title('Order Mode'),

            Layout::rows([
                Group::make([
                    Input::make('sale.recipient_name')
                        ->title('Recipient name')
                        ->placeholder('Member or customer name'),
                    Input::make('sale.phone')
                        ->title('Recipient phone')
                        ->placeholder('0800000000'),
                    Input::make('sale.email')
                        ->title('Recipient email')
                        ->placeholder('optional@example.com'),
                ]),
                Group::make([
                    Input::make('sale.label')
                        ->title('Address label')
                        ->placeholder('บ้าน / ที่ทำงาน'),
                    Input::make('sale.country_name')
                        ->title('Country')
                        ->placeholder('Thailand'),
                    Input::make('sale.country_code')
                        ->title('Country code')
                        ->placeholder('TH'),
                ]),
                Group::make([
                    Input::make('sale.province_name')
                        ->title('Province'),
                    Input::make('sale.district_name')
                        ->title('District'),
                    Input::make('sale.subdistrict_name')
                        ->title('Subdistrict'),
                    Input::make('sale.postal_code')
                        ->title('Postal code'),
                ]),
                TextArea::make('sale.address_line')
                    ->title('Address line')
                    ->rows(3)
                    ->placeholder('House no., village, road, building')
                    ->help('Used only for delivery mode.'),
                TextArea::make('sale.note')
                    ->title('Delivery note')
                    ->rows(2)
                    ->placeholder('Optional note for this sale'),
                CheckBox::make('sale.save_as_default')
                    ->sendTrueOrFalse()
                    ->title('Save this address as the member default address'),
            ])->title('Delivery Address For Single-member Mode'),

            Layout::rows([
                Group::make([
                    Input::make('sale.pickup_branch_name')
                        ->title('Pickup branch name')
                        ->placeholder('Head Office / Counter A')
                        ->help('Required for all branch pickup runs, including batch mode.'),
                    Input::make('sale.pickup_recipient_name')
                        ->title('Pickup recipient name')
                        ->placeholder('Recipient for branch pickup'),
                ]),
                Group::make([
                    Input::make('sale.pickup_phone')
                        ->title('Pickup phone')
                        ->placeholder('0800000000'),
                    Input::make('sale.pickup_email')
                        ->title('Pickup email')
                        ->placeholder('optional@example.com'),
                ]),
                TextArea::make('sale.pickup_branch_note')
                    ->title('Pickup note')
                    ->rows(2)
                    ->placeholder('Optional note for branch pickup'),
            ])->title('Branch Pickup Details'),

            Layout::rows([
                Matrix::make('sale.items')
                    ->title('Single-member items')
                    ->columns([
                        'product_detail_id' => 'Product detail',
                        'quantity' => 'Quantity',
                    ])
                    ->fields([
                        'product_detail_id' => Select::make()
                            ->options($this->productOptions)
                            ->empty('Select product detail')
                            ->required(),
                        'quantity' => Input::make()
                            ->type('number')
                            ->min(1)
                            ->value('1')
                            ->required(),
                    ])
                    ->help('Use this section when you want one order for one member. Leave Batch orders empty in this mode.'),
            ])->title('Single-member Order'),

            Layout::rows([
                Matrix::make('sale.batch_lines')
                    ->title('Batch rows: one member-product line per row')
                    ->columns([
                        'member_id' => 'Member',
                        'product_detail_id' => 'Product detail',
                        'quantity' => 'Quantity',
                    ])
                    ->fields([
                        'member_id' => Select::make()
                            ->options($this->memberOptions)
                            ->empty('Select member'),
                        'product_detail_id' => Select::make()
                            ->options($this->productOptions)
                            ->empty('Select product detail'),
                        'quantity' => Input::make()
                            ->type('number')
                            ->min(1)
                            ->value('1')
                            ->required(),
                    ])
                    ->help('If you add rows here, batch mode takes priority. The screen groups rows by member and creates one order per member. Single-member item rows above are ignored for this submit.'),
            ])->title('Batch Orders'),

            Layout::rows([
                Group::make([
                    Input::make('sale.discount_wallet_amount')
                        ->title('Discount wallet amount')
                        ->type('number')
                        ->step('0.01')
                        ->value('0'),
                    Input::make('sale.shopping_wallet_amount')
                        ->title('Shopping wallet amount')
                        ->type('number')
                        ->step('0.01')
                        ->value('0'),
                    Input::make('sale.firm_wallet_amount')
                        ->title('Firm wallet amount')
                        ->type('number')
                        ->step('0.01')
                        ->value('0'),
                    Select::make('sale.cash_payment_method')
                        ->title('Cash payment method')
                        ->options([
                            'cash' => 'Cash',
                            'bank_transfer' => 'Bank transfer',
                            'promptpay_qr' => 'PromptPay QR',
                        ])
                        ->empty('Select cash payment method')
                        ->help('Applied to every order created in this submit.'),
                ]),
            ])->title('Payment And Wallets'),
        ];
    }

    public function createSale(Request $request)
    {
        $payload = $request->validate([
            'sale.member_id' => ['nullable', 'integer'],
            'sale.workflow_mode' => ['required', 'in:create_only,approve_and_process'],
            'sale.fulfillment_method' => ['required', 'in:delivery,branch_pickup'],
            'sale.cash_payment_method' => ['nullable', 'string', 'max:100'],
            'sale.recipient_name' => ['nullable', 'string', 'max:255'],
            'sale.phone' => ['nullable', 'string', 'max:50'],
            'sale.email' => ['nullable', 'email', 'max:255'],
            'sale.label' => ['nullable', 'string', 'max:100'],
            'sale.country_name' => ['nullable', 'string', 'max:100'],
            'sale.country_code' => ['nullable', 'string', 'max:10'],
            'sale.province_name' => ['nullable', 'string', 'max:255'],
            'sale.district_name' => ['nullable', 'string', 'max:255'],
            'sale.subdistrict_name' => ['nullable', 'string', 'max:255'],
            'sale.postal_code' => ['nullable', 'string', 'max:20'],
            'sale.address_line' => ['nullable', 'string'],
            'sale.note' => ['nullable', 'string'],
            'sale.save_as_default' => ['nullable', 'boolean'],
            'sale.pickup_branch_name' => ['nullable', 'string', 'max:255'],
            'sale.pickup_branch_note' => ['nullable', 'string'],
            'sale.pickup_recipient_name' => ['nullable', 'string', 'max:255'],
            'sale.pickup_phone' => ['nullable', 'string', 'max:50'],
            'sale.pickup_email' => ['nullable', 'email', 'max:255'],
            'sale.discount_wallet_amount' => ['nullable', 'numeric', 'min:0'],
            'sale.shopping_wallet_amount' => ['nullable', 'numeric', 'min:0'],
            'sale.firm_wallet_amount' => ['nullable', 'numeric', 'min:0'],
            'sale.items' => ['required', 'array', 'min:1'],
            'sale.items.*.product_detail_id' => ['nullable', 'integer'],
            'sale.items.*.quantity' => ['nullable', 'integer', 'min:1'],
            'sale.batch_lines' => ['nullable', 'array'],
            'sale.batch_lines.*.member_id' => ['nullable', 'integer'],
            'sale.batch_lines.*.product_detail_id' => ['nullable', 'integer'],
            'sale.batch_lines.*.quantity' => ['nullable', 'integer', 'min:1'],
        ])['sale'];

        $fulfillmentMethod = (string) $payload['fulfillment_method'];
        try {
            $orderGroups = $this->buildOrderGroups($payload);
        } catch (\RuntimeException $exception) {
            return back()->withErrors([
                'sale.batch_lines' => $exception->getMessage(),
            ])->withInput();
        }

        if ($orderGroups === []) {
            return back()->withErrors([
                'sale.items' => 'Please add at least one product detail row or batch member-product row.',
            ])->withInput();
        }

        if ($fulfillmentMethod === 'delivery' && count($orderGroups) > 1) {
            return back()->withErrors([
                'sale.batch_lines' => 'Delivery mode supports one member per submission. Use branch pickup for multi-member batch runs.',
            ])->withInput();
        }

        if ($fulfillmentMethod === 'delivery') {
            $recipientName = trim((string) ($payload['recipient_name'] ?? ''));
            $phone = trim((string) ($payload['phone'] ?? ''));
            $addressLine = trim((string) ($payload['address_line'] ?? ''));

            if ($recipientName === '' || $phone === '' || $addressLine === '') {
                return back()->withErrors([
                    'sale.address_line' => 'Recipient name, phone, and address line are required for delivery.',
                ])->withInput();
            }
        } else {
            $pickupBranchName = trim((string) ($payload['pickup_branch_name'] ?? ''));

            if ($pickupBranchName === '') {
                return back()->withErrors([
                    'sale.pickup_branch_name' => 'Pickup branch name is required for branch pickup.',
                ])->withInput();
            }
        }

        $createdOrders = [];

        try {
            foreach ($orderGroups as $group) {
                $member = Member::member003()->find($group['member_id']);

                if (!$member instanceof Member) {
                    throw new \RuntimeException(sprintf('Selected member %s was not found.', (string) $group['member_id']));
                }

                $shippingAddressId = null;
                if ($fulfillmentMethod === 'delivery') {
                    $shippingAddressId = $this->createShippingAddressForMember($member, $payload);
                }

                $createPayload = [
                    'userId' => (string) $member->id,
                    'items' => $group['items'],
                    'fulfillmentMethod' => $fulfillmentMethod,
                    'shippingAddressId' => $shippingAddressId ? (string) $shippingAddressId : null,
                    'pickupBranchName' => $fulfillmentMethod === 'branch_pickup'
                        ? $this->nullableString($payload['pickup_branch_name'] ?? null)
                        : null,
                    'pickupBranchNote' => $fulfillmentMethod === 'branch_pickup'
                        ? $this->nullableString($payload['pickup_branch_note'] ?? null)
                        : null,
                    'pickupRecipientName' => $fulfillmentMethod === 'branch_pickup'
                        ? $this->nullableString($payload['pickup_recipient_name'] ?? null)
                        : null,
                    'pickupPhone' => $fulfillmentMethod === 'branch_pickup'
                        ? $this->nullableString($payload['pickup_phone'] ?? null)
                        : null,
                    'pickupEmail' => $fulfillmentMethod === 'branch_pickup'
                        ? $this->nullableString($payload['pickup_email'] ?? null)
                        : null,
                    'discountWalletAmount' => $this->decimalString($payload['discount_wallet_amount'] ?? null),
                    'shoppingWalletAmount' => $this->decimalString($payload['shopping_wallet_amount'] ?? null),
                    'firmWalletAmount' => $this->decimalString($payload['firm_wallet_amount'] ?? null),
                    'cashPaymentMethod' => $this->nullableString($payload['cash_payment_method'] ?? null) ?? 'cash',
                ];

                $createdOrder = $this->apiRequest('POST', '/orders', $createPayload);

                if (($payload['workflow_mode'] ?? 'approve_and_process') === 'approve_and_process') {
                    $orderId = (string) ($createdOrder['orderId'] ?? '');
                    $this->apiRequest('POST', "/orders/{$orderId}/approve");
                    $this->apiRequest('POST', "/orders/{$orderId}/process-approved");
                }

                $createdOrders[] = [
                    'member_name' => (string) $member->full_name,
                    'order_id' => (string) ($createdOrder['orderId'] ?? ''),
                    'order_no' => (string) ($createdOrder['orderNo'] ?? '#'.$createdOrder['orderId']),
                ];
            }
        } catch (\Throwable $exception) {
            $lastCreatedOrder = $createdOrders === [] ? null : $createdOrders[array_key_last($createdOrders)];

            if ($lastCreatedOrder !== null) {
                Alert::warning(sprintf(
                    'Created %d sale(s) before a follow-up step failed: %s',
                    count($createdOrders),
                    $exception->getMessage()
                ));

                return redirect()->route('platform.order.detail', $lastCreatedOrder['order_id']);
            }

            return back()->withErrors([
                    'sale.member_id' => $exception->getMessage(),
                ])->withInput();
        }

        Alert::info(sprintf(
            'Created %d sale(s): %s',
            count($createdOrders),
            collect($createdOrders)
                ->map(fn (array $order) => sprintf('%s for %s', $order['order_no'], $order['member_name']))
                ->implode(', ')
        ));

        if (count($createdOrders) === 1) {
            return redirect()->route('platform.order.detail', $createdOrders[0]['order_id']);
        }

        return redirect()->route('platform.order.list');
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<int, array{member_id:int, items:array<int, array{productDetailId:string, quantity:string}>}>
     */
    private function buildOrderGroups(array $payload): array
    {
        $batchLines = collect($payload['batch_lines'] ?? [])
            ->map(function (array $line): array {
                $memberId = $line['member_id'] ?? null;
                $productDetailId = $line['product_detail_id'] ?? null;
                $quantity = $line['quantity'] ?? 1;

                return [
                    'member_id' => $memberId === null || $memberId === '' ? null : (int) $memberId,
                    'product_detail_id' => $productDetailId === null || $productDetailId === '' ? null : (int) $productDetailId,
                    'quantity' => (int) $quantity,
                ];
            })
            ->filter(fn (array $line) => $line['member_id'] !== null || $line['product_detail_id'] !== null)
            ->values();

        if ($batchLines->isNotEmpty()) {
            $hasIncompleteLine = $batchLines->contains(
                fn (array $line) => $line['member_id'] === null || $line['product_detail_id'] === null
            );

            if ($hasIncompleteLine) {
                throw new \RuntimeException('Each batch row must include both member and product detail.');
            }

            return $batchLines
                ->groupBy('member_id')
                ->map(function ($lines, $memberId): array {
                    return [
                        'member_id' => (int) $memberId,
                        'items' => collect($lines)
                            ->map(fn (array $line) => [
                                'productDetailId' => (string) $line['product_detail_id'],
                                'quantity' => (string) ($line['quantity'] ?? 1),
                            ])
                            ->values()
                            ->all(),
                    ];
                })
                ->values()
                ->all();
        }

        $items = collect($payload['items'] ?? [])
            ->filter(fn (array $item) => !empty($item['product_detail_id']))
            ->map(fn (array $item) => [
                'productDetailId' => (string) $item['product_detail_id'],
                'quantity' => (string) ($item['quantity'] ?? 1),
            ])
            ->values()
            ->all();

        $memberId = $payload['member_id'] ?? null;
        if ($items === [] || $memberId === null || $memberId === '') {
            return [];
        }

        return [[
            'member_id' => (int) $memberId,
            'items' => $items,
        ]];
    }

    private function createShippingAddressForMember(Member $member, array $payload): int
    {
        $isDefault = (bool) ($payload['save_as_default'] ?? false);

        if ($isDefault) {
            MemberShippingAddressRecord::query()
                ->where('userId', $member->id)
                ->update(['isDefault' => false]);
        }

        $address = MemberShippingAddressRecord::query()->create([
            'userId' => $member->id,
            'label' => $this->nullableString($payload['label'] ?? null) ?? 'Admin sale address',
            'recipientName' => trim((string) ($payload['recipient_name'] ?? $member->full_name)),
            'phone' => trim((string) ($payload['phone'] ?? $member->phone)),
            'email' => $this->nullableString($payload['email'] ?? null) ?? $this->nullableString($member->email),
            'countryCode' => $this->nullableString($payload['country_code'] ?? null) ?? 'TH',
            'countryName' => $this->nullableString($payload['country_name'] ?? null) ?? 'Thailand',
            'provinceName' => $this->nullableString($payload['province_name'] ?? null),
            'districtName' => $this->nullableString($payload['district_name'] ?? null),
            'subdistrictName' => $this->nullableString($payload['subdistrict_name'] ?? null),
            'postalCode' => $this->nullableString($payload['postal_code'] ?? null),
            'addressLine' => trim((string) ($payload['address_line'] ?? '')),
            'note' => $this->nullableString($payload['note'] ?? null),
            'isDefault' => $isDefault,
        ]);

        return (int) $address->id;
    }

    /**
     * @param  array<string, mixed>|null  $payload
     * @return array<string, mixed>
     */
    private function apiRequest(string $method, string $path, ?array $payload = null): array
    {
        try {
            $request = Http::acceptJson()
                ->timeout(30)
                ->baseUrl($this->apiBaseUrl())
                ->withHeaders([
                    'X-Requested-By' => 'bao-member-sale',
                ]);

            $token = $this->adminApiAccessToken();

            if ($token !== null) {
                $request = $request->withToken($token);
            }

            $response = $request->send($method, $path, $payload ? ['json' => $payload] : []);
        } catch (ConnectionException $exception) {
            throw new \RuntimeException('Unable to reach order API: '.$exception->getMessage(), previous: $exception);
        }

        try {
            $response->throw();
        } catch (RequestException $exception) {
            $message = $response->json('message')
                ?? $response->json('error')
                ?? $exception->getMessage();

            $status = $response->status();
            $body = trim((string) $response->body());
            if ($body !== '') {
                $message .= sprintf(' [HTTP %s] %s', $status, $body);
            }

            throw new \RuntimeException((string) $message, previous: $exception);
        }

        /** @var array<string, mixed> $data */
        $data = $response->json();

        return $data;
    }

    private function adminApiAccessToken(): ?string
    {
        if ($this->adminApiAccessToken !== null) {
            return $this->adminApiAccessToken;
        }

        $identifier = trim((string) (
            env('BAO_API_ADMIN_IDENTIFIER')
            ?: env('APP_BAO_API_ADMIN_IDENTIFIER')
            ?: 'TH0000013'
        ));
        $password = trim((string) (
            env('BAO_API_ADMIN_PASSWORD')
            ?: env('APP_BAO_API_ADMIN_PASSWORD')
            ?: env('DEV_MEMBER_IMPERSONATION_PASSWORD')
            ?: 'a1a1a1'
        ));

        if ($identifier === '' || $password === '') {
            return null;
        }

        try {
            $response = Http::acceptJson()
                ->timeout(15)
                ->baseUrl($this->apiBaseUrl())
                ->withHeaders([
                    'X-Requested-By' => 'bao-member-sale-login',
                ])
                ->post('/auth/login', [
                    'identifier' => $identifier,
                    'password' => $password,
                ]);
        } catch (ConnectionException $exception) {
            throw new \RuntimeException('Unable to reach order API auth login: '.$exception->getMessage(), previous: $exception);
        }

        try {
            $response->throw();
        } catch (RequestException $exception) {
            $message = $response->json('message')
                ?? $response->json('error')
                ?? $exception->getMessage();

            throw new \RuntimeException('Unable to login BAO admin API session: '.(string) $message, previous: $exception);
        }

        $token = (string) ($response->json('accessToken') ?? '');

        if ($token === '') {
            throw new \RuntimeException('Unable to login BAO admin API session: missing access token.');
        }

        $this->adminApiAccessToken = $token;

        return $this->adminApiAccessToken;
    }

    private function apiBaseUrl(): string
    {
        return rtrim(
            (string) (env('API_BASE_URL')
                ?: env('APP_API_URL')
                ?: 'http://127.0.0.1:3000'),
            '/'
        );
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function decimalString(mixed $value): string
    {
        $trimmed = $this->nullableString($value);

        return $trimmed ?? '0';
    }
}
