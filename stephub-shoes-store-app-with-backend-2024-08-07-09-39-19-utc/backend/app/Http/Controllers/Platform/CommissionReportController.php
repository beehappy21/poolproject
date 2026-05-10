<?php

namespace App\Http\Controllers\Platform;

use App\Support\BaoAdminApiClient;
use App\Support\CommissionBaselineDayRunner;
use App\Support\CommissionBaselineRuntimeResetter;
use App\Support\CommissionReportBuilder;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\File;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Orchid\Support\Facades\Alert;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CommissionReportController extends Controller
{
    private const PDF_EXPORT_ROW_LIMIT = 500;

    public function processNextMember(Request $request, BaoAdminApiClient $apiClient): RedirectResponse
    {
        $validated = $this->validateActionRequest($request);
        $mode = CommissionReportBuilder::normalizeMode((string) ($validated['report_mode'] ?? 'overview'));
        $status = CommissionBaselineDayRunner::currentDayStatus();

        if ($status === null) {
            Alert::warning('ไม่พบสมาชิกที่รอสร้าง order baseline แล้ว');

            return $this->redirectToReport($mode, $validated);
        }

        if (empty($status['canSeedNextMember'])) {
            Alert::warning('สมาชิกของวันที่ ' . $status['workingDate'] . ' ครบแล้ว กรุณากดคำนวณเมื่อหมดวัน');

            return $this->redirectToReport($mode, $validated);
        }

        try {
            $result = CommissionBaselineDayRunner::processNextMember($apiClient);
        } catch (\Throwable $exception) {
            Alert::error($exception->getMessage());

            return $this->redirectToReport($mode, $validated);
        }

        $message = 'สั่งสินค้าและประมวลผลตามระบบให้สมาชิก ' . $result['memberCode'] . ' ของวันที่ ' . $result['settlementDate'] . ' เรียบร้อยแล้ว';
        if (!empty($result['orderNo'])) {
            $message .= ' (' . $result['orderNo'] . ')';
        }

        Alert::info($message);

        return $this->redirectToReport($mode, $validated);
    }

    public function finalizeCurrentDay(Request $request, BaoAdminApiClient $apiClient): RedirectResponse
    {
        $validated = $this->validateActionRequest($request);
        $mode = CommissionReportBuilder::normalizeMode((string) ($validated['report_mode'] ?? 'overview'));
        $status = CommissionBaselineDayRunner::currentDayStatus();

        if ($status === null) {
            Alert::warning('ไม่พบวันที่รอคำนวณ end-of-day แล้ว');

            return $this->redirectToReport($mode, $validated);
        }

        if (empty($status['canFinalizeDay'])) {
            Alert::warning(
                !empty($status['canSeedNextMember'])
                    ? 'วันที่ ' . $status['workingDate'] . ' ยังมีสมาชิกค้างสร้างรายการอีก ' . $status['remainingMemberCount'] . ' รายการ'
                    : 'วันที่ ' . $status['workingDate'] . ' ยังไม่พร้อมคำนวณ end-of-day'
            );

            return $this->redirectToReport($mode, $validated);
        }

        try {
            $result = CommissionBaselineDayRunner::finalizeCurrentDay($apiClient);
        } catch (\Throwable $exception) {
            Alert::error($exception->getMessage());

            return $this->redirectToReport($mode, $validated);
        }

        Alert::info('คำนวณเมื่อหมดวันสำหรับวันที่ ' . $result['settlementDate'] . ' เรียบร้อยแล้ว');

        return $this->redirectToReport($mode, $validated);
    }

    public function resetBaselineRuntime(Request $request): RedirectResponse
    {
        $validated = $this->validateActionRequest($request);
        $mode = CommissionReportBuilder::normalizeMode((string) ($validated['report_mode'] ?? 'overview'));

        try {
            $result = CommissionBaselineRuntimeResetter::reset();
        } catch (\Throwable $exception) {
            Alert::error($exception->getMessage());

            return $this->redirectToReport($mode, $validated);
        }

        Alert::info(
            'รีเซ็ตข้อมูล baseline test เรียบร้อยแล้ว'
            . ' ลบ order ' . $result['deletedBaselineOrderCount'] . ' รายการ'
            . ' และรีเซ็ตสมาชิกที่เกี่ยวข้อง ' . $result['affectedUserCount'] . ' ราย'
            . ' พร้อมล้างไฟล์สรุป baseline ' . (int) ($result['deletedRuntimeArtifactCount'] ?? 0) . ' ไฟล์'
        );

        return $this->redirectToReport($mode, $validated);
    }

    public function processSingleDay(Request $request, BaoAdminApiClient $apiClient): RedirectResponse
    {
        $validated = $this->validateActionRequest($request);

        if (CommissionBaselineDayRunner::nextActionDate() === null) {
            Alert::warning('ไม่พบวันที่รอคำนวณเพิ่มเติมแล้ว');

            return $this->redirectToReport(
                CommissionReportBuilder::normalizeMode((string) ($validated['report_mode'] ?? 'overview')),
                $validated
            );
        }

        try {
            $run = CommissionBaselineDayRunner::runNextDay($apiClient);
        } catch (\Throwable $exception) {
            Alert::error($exception->getMessage());

            return $this->redirectToReport(
                CommissionReportBuilder::normalizeMode((string) ($validated['report_mode'] ?? 'overview')),
                $validated
            );
        }

        $message = 'คำนวณคอมมิชชั่นรายวันสำหรับวันที่ ' . $run['settlementDate'] . ' เรียบร้อยแล้ว';
        if (!empty($run['seeded'])) {
            $message .= sprintf(
                ' พร้อมสร้าง order baseline %d รายการ',
                (int) ($run['createdOrderCount'] ?? 0)
            );
        }
        if (!empty($run['processedExistingOrderCount'])) {
            $message .= sprintf(
                ' และประมวลผล order ค้างเดิมต่อ %d รายการ',
                (int) ($run['processedExistingOrderCount'] ?? 0)
            );
        }
        if (!empty($run['reusedOrderCount'])) {
            $message .= sprintf(
                ' (reuse order เดิม %d รายการ)',
                (int) ($run['reusedOrderCount'] ?? 0)
            );
        }
        Alert::info($message);

        return $this->redirectToReport(
            CommissionReportBuilder::normalizeMode((string) ($validated['report_mode'] ?? 'overview')),
            $validated
        );
    }

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
            'overview' => ['วันที่', 'รหัสสมาชิก', 'ชื่อสมาชิก', 'โบนัสแนะนำ', 'โบนัสทีม', 'โบนัส Matching', 'พูลโบนัส', 'จำนวนรวม'],
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
                number_format((float) $row['teamAmount'], 2, '.', ''),
                number_format((float) $row['matchingAmount'], 2, '.', ''),
                number_format((float) $row['poolAmount'], 2, '.', ''),
                number_format((float) $row['totalAmount'], 2, '.', ''),
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

    private function routeNameForMode(string $mode): string
    {
        return match ($mode) {
            'direct' => 'platform.commission.report.direct',
            'team' => 'platform.commission.report.team',
            'matching' => 'platform.commission.report.matching',
            'pool' => 'platform.commission.report.pool',
            default => 'platform.commission.report',
        };
    }

    private function validateActionRequest(Request $request): array
    {
        return $request->validate([
            'settlement_date' => ['nullable', 'date_format:Y-m-d'],
            'report_mode' => ['nullable', 'string'],
            'member_from' => ['nullable', 'string'],
            'member_to' => ['nullable', 'string'],
            'date_from' => ['nullable', 'string'],
            'date_to' => ['nullable', 'string'],
            'page_size' => ['nullable', 'string'],
            'format' => ['nullable', 'string'],
        ]);
    }

    private function redirectToReport(string $mode, array $validated): RedirectResponse
    {
        return redirect()
            ->route($this->routeNameForMode($mode), $this->queryParamsForRedirect($validated));
    }

    private function queryParamsForRedirect(array $validated): array
    {
        return array_filter([
            'member_from' => $validated['member_from'] ?? null,
            'member_to' => $validated['member_to'] ?? null,
            'date_from' => $validated['date_from'] ?? null,
            'date_to' => $validated['date_to'] ?? null,
            'page_size' => $validated['page_size'] ?? null,
            'format' => $validated['format'] ?? null,
        ], static fn ($value) => $value !== null && $value !== '');
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
                $this->formatDecimal((float) ($totals['teamAmount'] ?? 0)),
                $this->formatDecimal((float) ($totals['matchingAmount'] ?? 0)),
                $this->formatDecimal((float) ($totals['poolAmount'] ?? 0)),
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
