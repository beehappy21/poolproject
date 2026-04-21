<?php

namespace App\Http\Controllers\Platform;

use App\Models\Order;
use App\Models\OrderLine;
use App\Models\OrderSource;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Symfony\Component\HttpFoundation\Response;

class OrderDocumentController extends Controller
{
    private const COMPANY_NAME = 'บริษัท บีไลฟ์ แฮลตี้ จำกัด';
    private const COMPANY_NAME_EN = 'B LIFE HEALTHY CO., LTD.';
    private const COMPANY_ADDRESS = '63/5 หมู่ที่ 7 ถนนบางกรวย-ไทรน้อย ตำบลไทรน้อย อำเภอไทรน้อย จ.นนทบุรี 11150';
    private const COMPANY_PHONE = '-';
    private const COMPANY_TAX_ID = '0105556153794';

    public function receipt(Order $order): View
    {
        return view('order.documents.receipt', $this->documentPayload($order, 'receipt'));
    }

    public function internalReceiptPdf(Request $request, string $sourceOrderId): Response
    {
        $expectedToken = trim((string) env('INTERNAL_RECEIPT_TOKEN', ''));
        $providedToken = trim((string) $request->header('x-internal-receipt-token', ''));

        abort_unless($expectedToken !== '' && hash_equals($expectedToken, $providedToken), 403);

        $order = Order::query()
            ->where('source_order_id', (int) $sourceOrderId)
            ->firstOrFail();

        $pdf = Pdf::loadView('order.documents.receipt', $this->documentPayload($order, 'receipt'))
            ->setPaper('a4', 'portrait');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="receipt-' . ($order->order_no ?: $order->id) . '.pdf"',
        ]);
    }

    public function deliveryNote(Order $order): View
    {
        return view('order.documents.delivery-note', $this->documentPayload($order, 'delivery-note'));
    }

    /**
     * @return array<string, mixed>
     */
    private function documentPayload(Order $order, string $documentType): array
    {
        $sourceOrder = null;

        if (!empty($order->source_order_id)) {
            $sourceOrder = OrderSource::query()->find($order->source_order_id);
        }

        $lines = OrderLine::query()
            ->where('source_order_id', $order->id)
            ->orderBy('id')
            ->get();

        $recipient = $this->recipientPayload($order, $sourceOrder);
        $totals = $this->totalsPayload($order, $lines);

        return [
            'documentType' => $documentType,
            'documentTitle' => $documentType === 'receipt' ? 'ใบเสร็จรับเงิน' : 'ใบส่งของ',
            'company' => [
                'name' => self::COMPANY_NAME,
                'nameEn' => self::COMPANY_NAME_EN,
                'address' => self::COMPANY_ADDRESS,
                'phone' => self::COMPANY_PHONE,
                'taxId' => self::COMPANY_TAX_ID,
                'logoUrl' => asset('/16.png'),
            ],
            'order' => $order,
            'sourceOrder' => $sourceOrder,
            'lines' => $lines,
            'recipient' => $recipient,
            'totals' => $totals,
            'documentNumber' => $this->documentNumber($order, $documentType),
            'generatedAt' => now(),
        ];
    }

    /**
     * @return array<string, string>
     */
    private function recipientPayload(Order $order, ?OrderSource $sourceOrder): array
    {
        $name = trim((string) (
            $sourceOrder?->recipientName
            ?? $order->name
            ?? ''
        ));

        $phone = trim((string) (
            $sourceOrder?->phone
            ?? $order->phone_number
            ?? ''
        ));

        $email = trim((string) (
            $sourceOrder?->email
            ?? $order->email
            ?? ''
        ));

        $addressParts = array_filter([
            trim((string) ($sourceOrder?->addressLine ?? $sourceOrder?->shippingAddressLine ?? '')),
            trim((string) ($sourceOrder?->subdistrictName ?? '')),
            trim((string) ($sourceOrder?->districtName ?? '')),
            trim((string) ($sourceOrder?->provinceName ?? '')),
            trim((string) ($sourceOrder?->postalCode ?? '')),
        ], static fn ($value) => $value !== '');

        $address = implode(' ', $addressParts);

        if ($address === '') {
            $address = trim((string) ($sourceOrder?->shippingAddressLine ?? ''));
        }

        return [
            'name' => $name !== '' ? $name : '-',
            'phone' => $phone !== '' ? $phone : '-',
            'email' => $email !== '' ? $email : '-',
            'address' => $address !== '' ? $address : '-',
            'methodLabel' => strtolower((string) ($sourceOrder?->shippingLabel ?? '')) === 'branch_pickup'
                ? 'รับที่สาขา'
                : 'จัดส่งถึงที่',
            'note' => trim((string) ($sourceOrder?->shippingAddressNote ?? $sourceOrder?->shipmentNote ?? '')) ?: '-',
        ];
    }

    /**
     * @param \Illuminate\Support\Collection<int, OrderLine> $lines
     * @return array<string, float|int>
     */
    private function totalsPayload(Order $order, $lines): array
    {
        $subtotal = (float) ($order->subtotal ?? 0);
        $total = (float) ($order->total ?? $subtotal);
        $lineQty = (int) $lines->sum(fn (OrderLine $line) => (int) ($line->quantity ?? 0));

        return [
            'subtotal' => $subtotal,
            'total' => $total,
            'totalPv' => (float) ($order->total_pv ?? 0),
            'itemCount' => (int) ($order->item_count ?? $lineQty),
            'lineQty' => $lineQty,
        ];
    }

    private function documentNumber(Order $order, string $documentType): string
    {
        $prefix = $documentType === 'receipt' ? 'RC' : 'DN';

        return sprintf('%s-%s-%s', $prefix, $order->id, $order->order_no ?: 'NA');
    }
}
