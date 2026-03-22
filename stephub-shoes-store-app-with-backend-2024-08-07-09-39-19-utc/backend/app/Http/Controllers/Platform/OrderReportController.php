<?php

namespace App\Http\Controllers\Platform;

use App\Models\Order;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrderReportController extends Controller
{
    private const PDF_EXPORT_ROW_LIMIT = 500;

    public function export(Request $request, ?string $bucket = 'all'): StreamedResponse
    {
        $normalizedBucket = $this->normalizeBucket($bucket);
        $format = strtolower((string) $request->input('format', 'csv'));
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

        return match ($format) {
            'xlsx', 'excel' => $this->exportExcel($normalizedBucket, $headers),
            'pdf' => $this->exportPdf($normalizedBucket, $headers),
            default => $this->exportCsv($normalizedBucket, $headers),
        };
    }

    private function exportCsv(string $bucket, array $headers): StreamedResponse
    {
        $filename = 'orders-' . $bucket . '-' . now()->format('Ymd-His') . '.csv';

        return response()->streamDownload(function () use ($bucket, $headers) {
            $handle = fopen('php://output', 'w');

            if ($handle === false) {
                return;
            }

            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, $headers);

            $this->exportQuery($bucket)
                ->chunk(200, function ($orders) use ($handle) {
                    foreach ($orders as $order) {
                        fputcsv($handle, $this->formatExportRow($order));
                    }
                });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function exportExcel(string $bucket, array $headers): StreamedResponse
    {
        $filename = 'orders-' . $bucket . '-' . now()->format('Ymd-His') . '.xlsx';

        return response()->streamDownload(function () use ($bucket, $headers) {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $spreadsheet->getDefaultStyle()->getFont()
                ->setName('Prompt')
                ->setSize(11);
            $sheet->fromArray($headers, null, 'A1');

            $rowNumber = 2;
            $bodyRowCount = 0;
            $this->exportQuery($bucket)->chunk(200, function ($orders) use ($sheet, &$rowNumber, &$bodyRowCount) {
                foreach ($orders as $order) {
                    $sheet->fromArray([$this->formatExportRow($order)], null, 'A' . $rowNumber);
                    $rowNumber++;
                    $bodyRowCount++;
                }
            });

            $this->styleWorksheet($sheet, count($headers), $bodyRowCount);

            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function exportPdf(string $bucket, array $headers): StreamedResponse
    {
        $rows = $this->exportQuery($bucket)->get();
        $this->assertPdfRowLimit($rows->count());

        $pdf = Pdf::loadView('order.report-export-pdf', [
            'title' => Order::bucketLabel($bucket),
            'headers' => $headers,
            'rows' => $rows->map(fn (Order $order) => $this->formatExportRow($order))->all(),
            'generatedAt' => now()->format('Y-m-d H:i:s'),
        ])->setPaper('a4', 'landscape');

        $filename = 'orders-' . $bucket . '-' . now()->format('Ymd-His') . '.pdf';

        return response()->streamDownload(function () use ($pdf) {
            echo $pdf->output();
        }, $filename, [
            'Content-Type' => 'application/pdf',
        ]);
    }

    private function exportQuery(string $bucket)
    {
        return Order::query()
            ->forReportBucket($bucket)
            ->orderByReportPriority($bucket);
    }

    private function formatExportRow(Order $order): array
    {
        return [
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
        ];
    }

    private function styleWorksheet(Worksheet $sheet, int $columnCount, int $bodyRowCount): void
    {
        $lastColumn = $sheet->getHighestDataColumn();
        $lastDataRow = $bodyRowCount + 1;

        $sheet->getStyle('A1:' . $lastColumn . '1')->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1F4E78'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        if ($lastDataRow >= 2) {
            $sheet->getStyle('A2:' . $lastColumn . $lastDataRow)
                ->getAlignment()
                ->setVertical(Alignment::VERTICAL_TOP);
        }

        foreach (range(1, $columnCount) as $columnIndex) {
            $sheet->getColumnDimensionByColumn($columnIndex)->setAutoSize(true);
        }
    }

    private function assertPdfRowLimit(int $totalCount): void
    {
        abort_if(
            $totalCount > self::PDF_EXPORT_ROW_LIMIT,
            422,
            'PDF export รองรับเฉพาะรายงานขนาดเล็ก กรุณากรองข้อมูลเพิ่มหรือใช้ CSV/Excel แทน'
        );
    }

    private function normalizeBucket(?string $bucket): string
    {
        $value = strtolower((string) $bucket);

        return match ($value) {
            Order::REPORT_BUCKET_AWAITING_PAYMENT,
            Order::REPORT_BUCKET_TRANSFER_REVIEW,
            Order::REPORT_BUCKET_AWAITING_SHIPMENT,
            Order::REPORT_BUCKET_SHIPPED => $value,
            Order::REPORT_BUCKET_DELIVERED => $value,
            default => Order::REPORT_BUCKET_ALL,
        };
    }
}
