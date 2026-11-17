@php use App\Services\Reports\Scheduled\Export\PdfRenderer; @endphp
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:16px 0">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden">
        <tr><td style="background:#1e3a8a;color:#ffffff;padding:14px 20px">
          <div style="font-size:13px;opacity:.85">{{ $storeName }}</div>
          <div style="font-size:18px;font-weight:bold;margin-top:2px">{{ $report->title }}</div>
          <div style="font-size:12px;opacity:.85;margin-top:2px">{{ $report->period }}</div>
        </td></tr>
        <tr><td style="padding:16px 20px;font-size:13px;line-height:1.5">
          @if($messageText)<p style="margin:0 0 12px;white-space:pre-line">{{ $messageText }}</p>@endif
          @if($report->summary)
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:12px">
              @foreach($report->summary as $label => $value)
                <tr><td style="padding:2px 16px 2px 0;color:#6b7280">{{ $label }}</td><td style="padding:2px 0;font-weight:bold">{{ $value }}</td></tr>
              @endforeach
            </table>
          @endif
          @foreach($report->sections as $section)
            @if($section['title'])<div style="font-weight:bold;color:#1e3a8a;margin:12px 0 4px">{{ $section['title'] }}</div>@endif
            @if($section['rows'])
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px">
                <tr>@foreach(array_slice($section['columns'], 0, 6) as $column)<th style="text-align:{{ in_array($column['type'], ['money', 'qty', 'count', 'percent']) ? 'right' : 'left' }};background:#e8eef7;padding:5px 6px;border-bottom:1px solid #c7d2e3">{{ $column['label'] }}</th>@endforeach</tr>
                @foreach(array_slice($section['rows'], 0, $previewRows) as $row)
                  <tr>@foreach(array_slice($section['columns'], 0, 6) as $column)<td style="text-align:{{ in_array($column['type'], ['money', 'qty', 'count', 'percent']) ? 'right' : 'left' }};padding:4px 6px;border-bottom:1px solid #eef0f3">{{ PdfRenderer::cell($row[$column['key']] ?? null, $column['type']) }}</td>@endforeach</tr>
                @endforeach
              </table>
              @if(count($section['rows']) > $previewRows || count($section['columns']) > 6)
                <div style="font-size:11px;color:#6b7280;margin-top:4px">First {{ min($previewRows, count($section['rows'])) }} of {{ count($section['rows']) }} rows shown; the full report is attached.</div>
              @endif
            @else
              <div style="font-size:12px;color:#6b7280">Nothing to show for this period.</div>
            @endif
          @endforeach
          @if($attachments)<p style="margin:14px 0 0;font-size:12px;color:#6b7280">Attached: {{ implode(', ', $attachments) }}</p>@endif
        </td></tr>
        <tr><td style="padding:10px 20px;font-size:11px;color:#9ca3af;border-top:1px solid #eef0f3">
          Sent by the {{ $storeName }} report scheduler ({{ $scheduleName }}). Ask your administrator to change who receives it.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
