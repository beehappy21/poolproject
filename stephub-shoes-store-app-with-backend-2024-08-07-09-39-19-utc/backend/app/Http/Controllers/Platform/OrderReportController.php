<?php

namespace App\Http\Controllers\Platform;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrderReportController extends Controller
{
    public function export(Request $request, ?string $bucket = 'all'): StreamedResponse
    {
        $normalizedBucket = $this->normalizeBucket($bucket);
        $filename = 'orders-' . $normalizedBucket . '-' . now()->format('Ymd-His') . '.csv';
        $headers = [
            'ID',
            'Order No',
            'Name',
            'Phone',
            'Order Status',
            'Approval Status',
            'Shipment Status',
            'Tracking No',
            'Total',
            'PV',
            'Items',
            'Created',
            'Approved',
            'Shipped',
        ];

        return response()->streamDownload(function () use ($normalizedBucket, $headers) {
            $handle = fopen('php://output', 'w');

            if ($handle === false) {
                return;
            }

            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, $headers);

            Order::query()
                ->forReportBucket($normalizedBucket)
                ->orderByReportPriority($normalizedBucket)
                ->chunk(200, function ($orders) use ($handle) {
                    foreach ($orders as $order) {
                        fputcsv($handle, [
                            $order->id,
                            $order->order_no,
                            $order->name,
                            $order->phone_number ?: '',
                            $order->order_status,
                            $order->approval_status,
                            $order->shipment_status,
                            $order->shipment_tracking_no ?: '',
                            number_format((float) $order->total, 2, '.', ''),
                            number_format((float) $order->total_pv, 2, '.', ''),
                            $order->item_count,
                            optional($order->created_at)->format('Y-m-d H:i:s'),
                            optional($order->approved_at)->format('Y-m-d H:i:s'),
                            optional($order->shipped_at)->format('Y-m-d H:i:s'),
                        ]);
                    }
                });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function normalizeBucket(?string $bucket): string
    {
        $value = strtolower((string) $bucket);

        return match ($value) {
            Order::REPORT_BUCKET_AWAITING_PAYMENT,
            Order::REPORT_BUCKET_TRANSFER_REVIEW,
            Order::REPORT_BUCKET_AWAITING_SHIPMENT,
            Order::REPORT_BUCKET_SHIPPED => $value,
            default => Order::REPORT_BUCKET_ALL,
        };
    }
}
