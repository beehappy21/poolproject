<?php

namespace App\Http\Controllers\Platform;

use App\Models\WithdrawRequest;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WithdrawReportController extends Controller
{
    private const PDF_EXPORT_ROW_LIMIT = 500;

    public function export(Request $request): StreamedResponse
    {
        $format = strtolower((string) $request->input('format', 'csv'));
        $template = strtolower((string) $request->input('template', 'report'));
        $headers = $this->headersForTemplate($template);

        return match ($format) {
            'xlsx', 'excel' => $this->exportExcel($request, $template, $headers),
            'pdf' => $this->exportPdf($request, $template, $headers),
            default => $this->exportCsv($request, $template, $headers),
        };
    }

    private function exportCsv(Request $request, string $template, array $headers): StreamedResponse
    {
        $filename = $this->filename($template, 'csv');

        return response()->streamDownload(function () use ($request, $template, $headers) {
            $handle = fopen('php://output', 'w');
            if ($handle === false) {
                return;
            }

            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, $headers);

            $this->exportQuery($request)
                ->chunk(200, function ($requests) use ($handle, $template) {
                    foreach ($requests as $withdrawRequest) {
                        fputcsv($handle, $this->formatExportRow($withdrawRequest, $template));
                    }
                });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function exportExcel(Request $request, string $template, array $headers): StreamedResponse
    {
        $filename = $this->filename($template, 'xlsx');

        return response()->streamDownload(function () use ($request, $template, $headers) {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $spreadsheet->getDefaultStyle()->getFont()
                ->setName('Prompt')
                ->setSize(11);
            $sheet->fromArray($headers, null, 'A1');

            $rowNumber = 2;
            $bodyRowCount = 0;
            $this->exportQuery($request)->chunk(200, function ($requests) use ($sheet, $template, &$rowNumber, &$bodyRowCount) {
                foreach ($requests as $withdrawRequest) {
                    $sheet->fromArray([$this->formatExportRow($withdrawRequest, $template)], null, 'A' . $rowNumber);
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

    private function exportPdf(Request $request, string $template, array $headers): StreamedResponse
    {
        $rows = $this->exportQuery($request)->get();
        $this->assertPdfRowLimit($rows->count());

        $pdf = Pdf::loadView('withdraw.report-export-pdf', [
            'title' => $template === 'bank' ? 'เอกสารโอนเงิน' : 'รายงานแจ้งถอนเงิน',
            'headers' => $headers,
            'rows' => $rows->map(fn (WithdrawRequest $withdrawRequest) => $this->formatExportRow($withdrawRequest, $template))->all(),
            'generatedAt' => now()->format('Y-m-d H:i:s'),
        ])->setPaper('a4', 'landscape');

        return response()->streamDownload(function () use ($pdf) {
            echo $pdf->output();
        }, $this->filename($template, 'pdf'), [
            'Content-Type' => 'application/pdf',
        ]);
    }

    private function exportQuery(Request $request)
    {
        $query = WithdrawRequest::query()
            ->with('member')
            ->orderByDesc('requestedAt')
            ->orderByDesc('id');

        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('bankName', 'ilike', '%' . $search . '%')
                    ->orWhere('accountName', 'ilike', '%' . $search . '%')
                    ->orWhere('accountNumber', 'ilike', '%' . $search . '%')
                    ->orWhereHas('member', function ($memberQuery) use ($search) {
                        $memberQuery
                            ->where('memberCode', 'ilike', '%' . $search . '%')
                            ->orWhere('name', 'ilike', '%' . $search . '%');
                    });
            });
        }

        $status = strtolower(trim((string) $request->input('status', '')));
        if ($status !== '') {
            $query->where('status', strtoupper($status));
        }

        $cycleEnd = trim((string) $request->input('cycle_end', ''));
        if ($cycleEnd !== '') {
            $query->whereRaw(
                'DATE((date_trunc(\'week\', "requestedAt") + interval \'6 days\')) = ?',
                [$cycleEnd],
            );
        }

        return $query;
    }

    private function headersForTemplate(string $template): array
    {
        if ($template === 'bank') {
            return [
                'ลำดับที่',
                'รหัสสมาชิก',
                'ชื่อบัญชี',
                'เลขที่บัญชี',
                'จำนวน',
            ];
        }

        return [
            'ID',
            'วันที่',
            'รหัสสมาชิก',
            'ชื่อ',
            'สถานะ',
            'ธนาคาร',
            'สาขา',
            'เลขบัญชี',
            'ชื่อบัญชี',
            'ประเภทบัญชี',
            'จำนวน',
            'ภาษี',
            'ออโต้ซิฟ',
            'ค่าธรรมเนียม',
            'ยอดเข้าธนาคาร',
            'หมายเหตุ',
        ];
    }

    private function formatExportRow(WithdrawRequest $withdrawRequest, string $template): array
    {
        $sequence = (string) $withdrawRequest->id;
        $requestedDate = optional($withdrawRequest->requestedAt)->format('d/m/Y') ?: '';
        $memberCode = (string) optional($withdrawRequest->member)->memberCode;
        $memberName = (string) optional($withdrawRequest->member)->name;
        $bankName = (string) $withdrawRequest->bankName;
        $bankBranch = (string) ($withdrawRequest->bankBranch ?? '');
        $accountNumber = (string) $withdrawRequest->accountNumber;
        $accountName = (string) $withdrawRequest->accountName;
        $accountType = (string) ($withdrawRequest->accountType ?? '');
        $amount = number_format((float) $withdrawRequest->amount, 2, '.', '');
        $taxAmount = number_format((float) $withdrawRequest->taxAmount, 2, '.', '');
        $autoSweepAmount = number_format((float) $withdrawRequest->autoSweepAmount, 2, '.', '');
        $feeAmount = number_format((float) $withdrawRequest->feeAmount, 2, '.', '');
        $netBankAmount = number_format((float) $withdrawRequest->netBankAmount, 2, '.', '');
        $reportAmount = number_format(
            max((float) $withdrawRequest->amount - (float) $withdrawRequest->taxAmount, 0),
            2,
            '.',
            '',
        );

        if ($template === 'bank') {
            return [
                $sequence,
                $memberCode,
                $accountName,
                $accountNumber,
                $reportAmount,
            ];
        }

        return [
            $sequence,
            $requestedDate,
            $memberCode,
            $memberName,
            strtolower((string) $withdrawRequest->status),
            $bankName,
            $bankBranch,
            $accountNumber,
            $accountName,
            $accountType,
            $amount,
            $taxAmount,
            $autoSweepAmount,
            $feeAmount,
            $netBankAmount,
            (string) ($withdrawRequest->note ?? ''),
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

    private function filename(string $template, string $extension): string
    {
        $prefix = $template === 'bank' ? 'withdraw-bank-sheet' : 'withdraw-requests';
        return $prefix . '-' . now()->format('Ymd-His') . '.' . $extension;
    }
}
