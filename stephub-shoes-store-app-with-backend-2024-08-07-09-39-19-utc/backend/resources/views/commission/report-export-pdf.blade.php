<!doctype html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        @font-face {
            font-family: 'Prompt';
            font-style: normal;
            font-weight: 400;
            src: url('{{ resource_path('fonts/prompt/Prompt-Regular.ttf') }}') format('truetype');
        }
        @font-face {
            font-family: 'Prompt';
            font-style: normal;
            font-weight: 500;
            src: url('{{ resource_path('fonts/prompt/Prompt-Medium.ttf') }}') format('truetype');
        }
        @font-face {
            font-family: 'Prompt';
            font-style: normal;
            font-weight: 600;
            src: url('{{ resource_path('fonts/prompt/Prompt-SemiBold.ttf') }}') format('truetype');
        }
        @font-face {
            font-family: 'Prompt';
            font-style: normal;
            font-weight: 700;
            src: url('{{ resource_path('fonts/prompt/Prompt-Bold.ttf') }}') format('truetype');
        }
        body { font-family: 'Prompt', DejaVu Sans, sans-serif; font-size: 11px; color: #0f172a; }
        h1 { margin: 0 0 8px; font-size: 20px; font-weight: 700; }
        .meta { margin-bottom: 16px; color: #475569; }
        .meta table { width: auto; border-collapse: collapse; }
        .meta td { border: 0; padding: 2px 10px 2px 0; }
        .note { margin: 0 0 16px; padding: 10px 12px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
        th { background: #f8fafc; text-align: left; font-weight: 600; }
        tfoot td { background: #f8fafc; font-weight: bold; }
        .empty { padding: 16px 0; color: #64748b; }
    </style>
</head>
<body>
    <h1>{{ $title }}</h1>
    <div class="meta">
        <table>
            <tr>
                <td>สร้างเมื่อ:</td>
                <td>{{ $generatedAt }}</td>
                <td>สมาชิกจาก:</td>
                <td>{{ $filters['memberFrom'] !== '' ? $filters['memberFrom'] : '-' }}</td>
            </tr>
            <tr>
                <td>สมาชิกถึง:</td>
                <td>{{ $filters['memberTo'] !== '' ? $filters['memberTo'] : '-' }}</td>
                <td>วันที่เริ่ม:</td>
                <td>{{ $filters['dateFrom'] !== '' ? $filters['dateFrom'] : '-' }}</td>
            </tr>
            <tr>
                <td>วันที่สิ้นสุด:</td>
                <td>{{ $filters['dateTo'] !== '' ? $filters['dateTo'] : '-' }}</td>
                <td>จำนวนรายการ:</td>
                <td>{{ number_format(count($rows)) }}</td>
            </tr>
        </table>
    </div>

    @if (($reportMode ?? 'overview') === 'pool')
        <div class="note">
            สูตรของพูลโบนัสคือ PV approved รวมของวัน x % pool แล้วหารด้วยจำนวนสมาชิกที่ eligible โดย eligible ต้อง active และมี direct active อย่างน้อย 2 คน
        </div>
    @endif

    @if (count($rows) > 0)
        <table>
            <thead>
                <tr>
                    @foreach ($headers as $header)
                        <th>{{ $header }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @foreach ($rows as $row)
                    <tr>
                        @foreach ($row as $cell)
                            <td>{{ $cell }}</td>
                        @endforeach
                    </tr>
                @endforeach
            </tbody>
            @if (!empty($totalsRow))
                <tfoot>
                    <tr>
                        @foreach ($totalsRow as $cell)
                            <td>{{ $cell !== '' ? $cell : '-' }}</td>
                        @endforeach
                    </tr>
                </tfoot>
            @endif
        </table>
    @else
        <div class="empty">ไม่มีข้อมูลคอมมิชชั่นสำหรับเงื่อนไขที่เลือก</div>
    @endif
</body>
</html>
