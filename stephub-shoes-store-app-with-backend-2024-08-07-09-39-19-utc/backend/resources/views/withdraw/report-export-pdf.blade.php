<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>{{ $title }}</title>
  <style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #1f2937; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .meta { margin-bottom: 12px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d1d5db; padding: 5px 6px; vertical-align: top; }
    th { background: #e5eef7; font-weight: bold; }
  </style>
</head>
<body>
  <h1>{{ $title }}</h1>
  <div class="meta">Generated at {{ $generatedAt }}</div>

  <table>
    <thead>
      <tr>
        @foreach ($headers as $header)
          <th>{{ $header }}</th>
        @endforeach
      </tr>
    </thead>
    <tbody>
      @forelse ($rows as $row)
        <tr>
          @foreach ($row as $cell)
            <td>{{ $cell }}</td>
          @endforeach
        </tr>
      @empty
        <tr>
          <td colspan="{{ count($headers) }}">No data</td>
        </tr>
      @endforelse
    </tbody>
  </table>
</body>
</html>
