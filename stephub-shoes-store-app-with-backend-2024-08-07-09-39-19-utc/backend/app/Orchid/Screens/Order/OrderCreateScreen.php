<?php

namespace App\Orchid\Screens\Order;

use App\Models\Member;
use App\Models\MemberShippingAddressRecord;
use App\Models\OrderLine;
use App\Models\ProductDetailRecord;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Orchid\Screen\Actions\Button;
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

        $defaultAddresses = MemberShippingAddressRecord::query()
            ->whereIn('userId', $members->pluck('id'))
            ->where('isDefault', true)
            ->orderByDesc('id')
            ->get();

        $productDetails = ProductDetailRecord::query()
            ->where('status', 'ACTIVE')
            ->where('salesChannelMode', 'BAO_ONLY')
            ->whereDoesntHave('product.category', function ($query) {
                $query->where('code', 'FIRM');
            })
            ->orderBy('name')
            ->get([
                'id',
                'code',
                'name',
                'primaryImageUrl',
                'memberPriceUsdt',
                'pv',
                'promotionId',
                'promotionName',
                'promotionStatus',
                'promotionMinQuantity',
                'promotionPriceUsdt',
                'promotionPv',
            ]);

        $topSellingQty = OrderLine::query()
            ->selectRaw('product_id, SUM(quantity) as sold_qty')
            ->whereNotNull('product_id')
            ->groupBy('product_id')
            ->pluck('sold_qty', 'product_id');

        $this->memberOptions = $members
            ->mapWithKeys(fn (Member $member) => [
                $member->id => sprintf(
                    '%s • %s',
                    (string) $member->memberCode,
                    (string) $member->full_name
                ),
            ])
            ->all();

        $memberDirectory = $members
            ->map(function (Member $member) use ($defaultAddresses): array {
                $defaultAddress = $defaultAddresses->firstWhere('userId', (int) $member->id);

                return [
                    'id' => (int) $member->id,
                    'memberCode' => (string) $member->memberCode,
                    'name' => (string) $member->full_name,
                    'email' => (string) ($member->email ?? ''),
                    'phone' => (string) ($member->phone ?? ''),
                    'defaultAddress' => $defaultAddress ? [
                        'id' => (int) $defaultAddress->id,
                        'label' => (string) ($defaultAddress->label ?? ''),
                        'recipientName' => (string) ($defaultAddress->recipientName ?? ''),
                        'phone' => (string) ($defaultAddress->phone ?? ''),
                        'email' => (string) ($defaultAddress->email ?? ''),
                        'countryName' => (string) ($defaultAddress->countryName ?? ''),
                        'countryCode' => (string) ($defaultAddress->countryCode ?? ''),
                        'provinceName' => (string) ($defaultAddress->provinceName ?? ''),
                        'districtName' => (string) ($defaultAddress->districtName ?? ''),
                        'subdistrictName' => (string) ($defaultAddress->subdistrictName ?? ''),
                        'postalCode' => (string) ($defaultAddress->postalCode ?? ''),
                        'addressLine' => (string) ($defaultAddress->addressLine ?? ''),
                        'note' => (string) ($defaultAddress->note ?? ''),
                    ] : null,
                ];
            })
            ->values();

        $productCatalog = $productDetails
            ->map(function (ProductDetailRecord $detail) use ($topSellingQty): array {
                return [
                    'id' => (int) $detail->id,
                    'code' => (string) $detail->code,
                    'name' => (string) $detail->name,
                    'memberPrice' => number_format((float) $detail->memberPriceUsdt, 2),
                    'pv' => number_format((float) $detail->pv, 2),
                    'promotionId' => $detail->promotionId,
                    'promotionName' => $detail->promotionName,
                    'promotionStatus' => $detail->promotionStatus,
                    'promotionMinQuantity' => $detail->promotionMinQuantity,
                    'promotionPrice' => $detail->promotionPriceUsdt !== null
                        ? number_format((float) $detail->promotionPriceUsdt, 2)
                        : null,
                    'promotionPv' => $detail->promotionPv !== null
                        ? number_format((float) $detail->promotionPv, 2)
                        : null,
                    'imageUrl' => $this->publicImageUrl($detail->primaryImageUrl),
                    'soldQty' => (int) ($topSellingQty[(string) $detail->id] ?? 0),
                ];
            })
            ->sortByDesc('soldQty')
            ->values();

        $topProducts = $productCatalog->take(5)->values();

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
            'payment_channel' => 'cash',
            'fulfillment_method' => 'branch_pickup',
            'existing_shipping_address_id' => '',
            'change_shipping_address' => false,
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
            'memberDirectory' => $memberDirectory,
            'productCatalog' => $productCatalog,
            'topProducts' => $topProducts,
            'todayLabel' => now()->format('d/m/Y H:i'),
            'orderPreviewNo' => 'AUTO-' . now()->format('Ymd-His'),
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
            Layout::view('order.create-member-sale'),
        ];
    }

    public function createSale(Request $request)
    {
        $payload = $request->validate([
            'sale.member_id' => ['nullable', 'integer'],
            'sale.workflow_mode' => ['required', 'in:create_only,approve_and_process'],
            'sale.payment_channel' => ['required', 'in:cash,bank_transfer,shopping_wallet,other'],
            'sale.fulfillment_method' => ['required', 'in:delivery,branch_pickup'],
            'sale.existing_shipping_address_id' => ['nullable', 'integer'],
            'sale.change_shipping_address' => ['nullable', 'boolean'],
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
            $existingShippingAddressId = (int) ($payload['existing_shipping_address_id'] ?? 0);
            $changeShippingAddress = (bool) ($payload['change_shipping_address'] ?? false);

            if (!$changeShippingAddress && $existingShippingAddressId > 0) {
                $selectedMemberId = (int) ($payload['member_id'] ?? 0);
                $existingAddress = MemberShippingAddressRecord::query()
                    ->whereKey($existingShippingAddressId)
                    ->where('userId', $selectedMemberId)
                    ->first();

                if (!$existingAddress instanceof MemberShippingAddressRecord) {
                    return back()->withErrors([
                        'sale.existing_shipping_address_id' => 'Selected default shipping address was not found for this member.',
                    ])->withInput();
                }
            } else {
                $recipientName = trim((string) ($payload['recipient_name'] ?? ''));
                $phone = trim((string) ($payload['phone'] ?? ''));
                $addressLine = trim((string) ($payload['address_line'] ?? ''));

                if ($recipientName === '' || $phone === '' || $addressLine === '') {
                    return back()->withErrors([
                        'sale.address_line' => 'Recipient name, phone, and address line are required for delivery.',
                    ])->withInput();
                }
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
                    $existingShippingAddressId = (int) ($payload['existing_shipping_address_id'] ?? 0);
                    $changeShippingAddress = (bool) ($payload['change_shipping_address'] ?? false);

                    if (!$changeShippingAddress && $existingShippingAddressId > 0) {
                        $shippingAddressId = $existingShippingAddressId;
                    } else {
                        $shippingAddressId = $this->createShippingAddressForMember($member, $payload);
                    }
                }

                $paymentSelection = $this->buildPaymentSelection(
                    (string) ($payload['payment_channel'] ?? 'cash'),
                    $group['items']
                );

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
                    'discountWalletAmount' => $paymentSelection['discountWalletAmount'],
                    'shoppingWalletAmount' => $paymentSelection['shoppingWalletAmount'],
                    'firmWalletAmount' => $paymentSelection['firmWalletAmount'],
                    'cashPaymentMethod' => $paymentSelection['cashPaymentMethod'],
                ];

                $createdOrder = $this->apiRequest('POST', '/orders', $createPayload);

                if (($payload['workflow_mode'] ?? 'approve_and_process') === 'approve_and_process') {
                    $orderId = (string) ($createdOrder['orderId'] ?? '');
                    $this->apiRequest('POST', "/orders/{$orderId}/approve");
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
     * @param  array<int, array{productDetailId:string, quantity:string}>  $items
     * @return array{
     *     discountWalletAmount:string,
     *     shoppingWalletAmount:string,
     *     firmWalletAmount:string,
     *     cashPaymentMethod:string
     * }
     */
    private function buildPaymentSelection(string $paymentChannel, array $items): array
    {
        $subtotal = $this->groupSubtotal($items);

        return match ($paymentChannel) {
            'shopping_wallet' => [
                'discountWalletAmount' => '0',
                'shoppingWalletAmount' => $subtotal,
                'firmWalletAmount' => '0',
                'cashPaymentMethod' => 'cash',
            ],
            'firm_wallet' => [
                'discountWalletAmount' => '0',
                'shoppingWalletAmount' => '0',
                'firmWalletAmount' => $subtotal,
                'cashPaymentMethod' => 'cash',
            ],
            'bank_transfer' => [
                'discountWalletAmount' => '0',
                'shoppingWalletAmount' => '0',
                'firmWalletAmount' => '0',
                'cashPaymentMethod' => 'bank_transfer',
            ],
            'other' => [
                'discountWalletAmount' => '0',
                'shoppingWalletAmount' => '0',
                'firmWalletAmount' => '0',
                'cashPaymentMethod' => 'promptpay_qr',
            ],
            default => [
                'discountWalletAmount' => '0',
                'shoppingWalletAmount' => '0',
                'firmWalletAmount' => '0',
                'cashPaymentMethod' => 'cash',
            ],
        };
    }

    /**
     * @param  array<int, array{productDetailId:string, quantity:string}>  $items
     */
    private function groupSubtotal(array $items): string
    {
        $detailIds = collect($items)
            ->pluck('productDetailId')
            ->filter()
            ->map(fn ($id): int => (int) $id)
            ->unique()
            ->values();

        if ($detailIds->isEmpty()) {
            return '0';
        }

        $priceMap = ProductDetailRecord::query()
            ->whereIn('id', $detailIds)
            ->get([
                'id',
                'memberPriceUsdt',
                'promotionStatus',
                'promotionMinQuantity',
                'promotionPriceUsdt',
            ])
            ->keyBy('id');

        $subtotal = 0.0;
        $requestedByDetail = [];

        foreach ($items as $item) {
            $detailId = (int) ($item['productDetailId'] ?? 0);
            $quantity = max(1, (int) ($item['quantity'] ?? 1));

            if ($detailId <= 0) {
                continue;
            }

            $requestedByDetail[$detailId] = ($requestedByDetail[$detailId] ?? 0) + $quantity;
        }

        foreach ($items as $item) {
            $detailId = (int) ($item['productDetailId'] ?? 0);
            $quantity = max(1, (int) ($item['quantity'] ?? 1));
            /** @var ProductDetailRecord|null $detail */
            $detail = $priceMap->get($detailId);
            $price = $this->promoAwareUnitPrice($detail, $requestedByDetail[$detailId] ?? $quantity);
            $subtotal += $price * $quantity;
        }

        return number_format($subtotal, 2, '.', '');
    }

    private function promoAwareUnitPrice(?ProductDetailRecord $detail, int $quantity): float
    {
        if (!$detail instanceof ProductDetailRecord) {
            return 0.0;
        }

        $promotionStatus = strtoupper(trim((string) ($detail->promotionStatus ?? '')));
        $promotionMinQuantity = (int) ($detail->promotionMinQuantity ?? 0);
        $promotionPrice = $detail->promotionPriceUsdt !== null
            ? (float) $detail->promotionPriceUsdt
            : null;

        if (
            $promotionStatus === 'ACTIVE'
            && $promotionMinQuantity >= 2
            && $promotionPrice !== null
            && $quantity >= $promotionMinQuantity
        ) {
            return $promotionPrice;
        }

        return (float) ($detail->memberPriceUsdt ?? 0);
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
            ?: ''
        ));
        $password = trim((string) (
            env('BAO_API_ADMIN_PASSWORD')
            ?: env('APP_BAO_API_ADMIN_PASSWORD')
            ?: env('DEV_MEMBER_IMPERSONATION_PASSWORD')
            ?: ''
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

    private function publicImageUrl(?string $path): ?string
    {
        if ($path === null || trim($path) === '') {
            return null;
        }

        if (Str::startsWith($path, ['http://', 'https://', 'data:image/'])) {
            return $path;
        }

        return Storage::disk('public')->url($path);
    }
}
