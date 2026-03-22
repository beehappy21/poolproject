<?php

namespace App\Http\Controllers\Platform;

use App\Support\CommissionReportBuilder;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\File;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CommissionReportController extends Controller
{
    private const PDF_EXPORT_ROW_LIMIT = 500;

    public function export(Request $request, ?string $reportMode = 'overview'): StreamedResponse
    {
        $mode = CommissionReportBuilder::normalizeMode($reportMode);
        $filters = CommissionReportBuilder::filtersFromRequest($request);
        $report = CommissionReportBuilder::exportMeta($mode, $filters);
        $format = strtolower((string) $request->input('format', 'csv'));

        return match ($format) {
            'xlsx', 'excel' => $this->exportExcel($mode, $filters, $report),
            'pdf' => $this->exportPdf($mode, $filters, $report),
            default => $this->exportCsv($mode, $filters, $report),
        };
    }

    private function exportCsv(string $mode, array $filters, array $report): StreamedResponse
    {
        $filename = 'commission-' . $mode . '-' . now()->format('Ymd-His') . '.csv';
        $headers = $this->headersForMode($mode);
        $totalsRow = $this->totalsRowFromTotals($mode, $report['totals'] ?? [], (int) ($report['totalCount'] ?? 0));

        return response()->streamDownload(function () use ($mode, $filters, $headers, $totalsRow) {
            $handle = fopen('php://output', 'w');

            if ($handle === false) {
                return;
            }

            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, $headers);
            foreach (CommissionReportBuilder::exportRowCursor($mode, $filters) as $row) {
                fputcsv($handle, $this->formatExportRow($mode, $row));
            }
            if ($totalsRow !== null) {
                fputcsv($handle, $totalsRow);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function exportExcel(string $mode, array $filters, array $report): StreamedResponse
    {
        $filename = 'commission-' . $mode . '-' . now()->format('Ymd-His') . '.xlsx';
        $headers = $this->headersForMode($mode);
        $totalsRow = $this->totalsRowFromTotals($mode, $report['totals'] ?? [], (int) ($report['totalCount'] ?? 0));

        return response()->streamDownload(function () use ($mode, $filters, $headers, $totalsRow) {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $spreadsheet->getDefaultStyle()->getFont()
                ->setName('Prompt')
                ->setSize(11);
            $sheet->fromArray($headers, null, 'A1');

            $bodyRowCount = 0;
            $targetRow = 2;
            foreach (CommissionReportBuilder::exportRowCursor($mode, $filters) as $row) {
                $sheet->fromArray([$this->formatExportRow($mode, $row)], null, 'A' . $targetRow);
                $targetRow++;
                $bodyRowCount++;
            }

            if ($totalsRow !== null) {
                $sheet->fromArray([$totalsRow], null, 'A' . ($bodyRowCount + 2));
            }

            $this->styleWorksheet($sheet, count($headers), $bodyRowCount, $totalsRow !== null);

            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function exportPdf(string $mode, array $filters, array $report): StreamedResponse
    {
        $this->assertPdfRowLimit((int) ($report['totalCount'] ?? 0));

        $rows = CommissionReportBuilder::exportRows($mode, $filters);
        [$headers, $bodyRows] = $this->tabularData($mode, $rows);
        $totalsRow = $this->totalsRowFromTotals($mode, $report['totals'] ?? [], (int) ($report['totalCount'] ?? 0));
        $this->ensurePdfFontDirectory();

        $pdf = Pdf::loadView('commission.report-export-pdf', [
            'title' => $report['title'] ?? 'รายงานคอมมิชชั่น',
            'reportMode' => $mode,
            'headers' => $headers,
            'rows' => $bodyRows,
            'totalsRow' => $totalsRow,
            'filters' => $filters,
            'generatedAt' => now()->format('Y-m-d H:i:s'),
        ])->setPaper('a4', 'landscape');

        $filename = 'commission-' . $mode . '-' . now()->format('Ymd-His') . '.pdf';

        return response()->streamDownload(function () use ($pdf) {
            echo $pdf->output();
        }, $filename, [
            'Content-Type' => 'application/pdf',
        ]);
    }

    private function headersForMode(string $mode): array
    {
        return match ($mode) {
            'overview' => ['วันที่', 'รหัสสมาชิก', 'ชื่อสมาชิก', 'โบนัสแนะนำ', 'พูลโบนัส', 'ยูนิลีเวล', 'เมทริกซ์', 'จำนวนรวม'],
            'matrix' => ['วันที่', 'รหัสสมาชิก', 'ชื่อสมาชิก', 'จาก', 'ชื่อ', 'Board', 'ลำดับชั้น', 'พีวี', 'เปอร์เซ็นต์', 'จำนวน'],
            'pool' => ['วันที่', 'รหัสสมาชิก', 'ชื่อสมาชิก', 'พีวี', 'เปอร์เซ็นต์', 'จำนวน'],
            default => ['วันที่', 'รหัสสมาชิก', 'ชื่อสมาชิก', 'จาก', 'ชื่อ', 'ลำดับชั้น', 'พีวี', 'เปอร์เซ็นต์', 'จำนวน'],
        };
    }

    private function formatExportRow(string $mode, array $row): array
    {
        if ($mode === 'overview') {
            return [
                $row['reportDate'],
                $row['beneficiaryMemberCode'],
                $row['beneficiaryName'],
                number_format((float) $row['directAmount'], 2, '.', ''),
                number_format((float) $row['poolAmount'], 2, '.', ''),
                number_format((float) $row['uniAmount'], 2, '.', ''),
                number_format((float) $row['matrixAmount'], 2, '.', ''),
                number_format((float) $row['totalAmount'], 2, '.', ''),
            ];
        }

        if ($mode === 'matrix') {
            return [
                $row['reportDate'],
                $row['beneficiaryMemberCode'],
                $row['beneficiaryName'],
                $row['sourceMemberCode'],
                $row['sourceName'],
                $row['boardLabel'] ?? ($row['boardNo'] ?? '-'),
                $row['levelNo'],
                number_format((float) $row['basePv'], 2, '.', ''),
                number_format((float) $row['rate'], 2, '.', ''),
                number_format((float) $row['amount'], 2, '.', ''),
            ];
        }

        if ($mode === 'pool') {
            return [
                $row['reportDate'],
                $row['beneficiaryMemberCode'],
                $row['beneficiaryName'],
                number_format((float) $row['basePv'], 2, '.', ''),
                number_format((float) $row['rate'], 2, '.', ''),
                number_format((float) $row['amount'], 2, '.', ''),
            ];
        }

        return [
            $row['reportDate'],
            $row['beneficiaryMemberCode'],
            $row['beneficiaryName'],
            $row['sourceMemberCode'],
            $row['sourceName'],
            $row['levelNo'],
            number_format((float) $row['basePv'], 2, '.', ''),
            number_format((float) $row['rate'], 2, '.', ''),
            number_format((float) $row['amount'], 2, '.', ''),
        ];
    }

    private function tabularData(string $mode, $rows): array
    {
        return [
            $this->headersForMode($mode),
            collect($rows)->map(fn ($row) => $this->formatExportRow($mode, $row))->all(),
        ];
    }

    private function totalsRowFromTotals(string $mode, array $totals, int $totalCount): ?array
    {
        if ($totalCount <= 0) {
            return null;
        }

        if ($mode === 'overview') {
            return [
                'รวมทั้งหมด',
                '',
                '',
                $this->formatDecimal((float) ($totals['directAmount'] ?? 0)),
                $this->formatDecimal((float) ($totals['poolAmount'] ?? 0)),
                $this->formatDecimal((float) ($totals['uniAmount'] ?? 0)),
                $this->formatDecimal((float) ($totals['matrixAmount'] ?? 0)),
                $this->formatDecimal((float) ($totals['totalAmount'] ?? 0)),
            ];
        }

        if ($mode === 'pool') {
            return [
                'รวมทั้งหมด',
                '',
                '',
                $this->formatDecimal((float) ($totals['basePv'] ?? 0)),
                $this->formatDecimal((float) ($totals['avgRate'] ?? 0)),
                $this->formatDecimal((float) ($totals['amount'] ?? 0)),
            ];
        }

        if ($mode === 'matrix') {
            return [
                'รวมทั้งหมด',
                '',
                '',
                '',
                '',
                (string) ((int) ($totals['boardCount'] ?? 0)),
                '',
                $this->formatDecimal((float) ($totals['basePv'] ?? 0)),
                '',
                $this->formatDecimal((float) ($totals['amount'] ?? 0)),
            ];
        }

        return [
            'รวมทั้งหมด',
            '',
            '',
            '',
            '',
            '',
            $this->formatDecimal((float) ($totals['basePv'] ?? 0)),
            '',
            $this->formatDecimal((float) ($totals['amount'] ?? 0)),
        ];
    }

    private function styleWorksheet(Worksheet $sheet, int $columnCount, int $bodyRowCount, bool $hasTotalsRow): void
    {
        $lastColumn = $sheet->getHighestDataColumn();
        $lastDataRow = $bodyRowCount + 1 + ($hasTotalsRow ? 1 : 0);

        $sheet->freezePane('A2');
        $sheet->setAutoFilter('A1:' . $lastColumn . '1');
        $sheet->getStyle('A1:' . $lastColumn . '1')->applyFromArray([
            'font' => ['bold' => true, 'name' => 'Prompt', 'size' => 11],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E2E8F0'],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        if ($hasTotalsRow) {
            $sheet->getStyle('A' . $lastDataRow . ':' . $lastColumn . $lastDataRow)->applyFromArray([
                'font' => ['bold' => true, 'name' => 'Prompt', 'size' => 11],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'F8FAFC'],
                ],
            ]);
        }

        $sheet->getStyle('A1:' . $lastColumn . $lastDataRow)->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

        foreach (range(1, $columnCount) as $columnIndex) {
            $sheet->getColumnDimensionByColumn($columnIndex)->setAutoSize(true);
        }
    }

    private function formatDecimal(float $value): string
    {
        return number_format($value, 2, '.', '');
    }

    private function assertPdfRowLimit(int $totalCount): void
    {
        if ($totalCount <= self::PDF_EXPORT_ROW_LIMIT) {
            return;
        }

        abort(422, 'PDF export รองรับได้ไม่เกิน ' . number_format(self::PDF_EXPORT_ROW_LIMIT) . ' แถวต่อครั้ง กรุณากรองข้อมูลให้แคบลงหรือใช้ CSV/XLSX แทน');
    }

    private function ensurePdfFontDirectory(): void
    {
        $fontDirectory = storage_path('fonts');

        if (!File::exists($fontDirectory)) {
            File::makeDirectory($fontDirectory, 0755, true);
        }
    }
}
