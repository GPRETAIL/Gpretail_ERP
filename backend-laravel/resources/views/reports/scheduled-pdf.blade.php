@php use App\Services\Reports\Scheduled\Export\PdfRenderer; @endphp
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { margin: 28px 28px 36px; }
  body { font-family: 'DejaVu Sans', sans-serif; font-size: 8.5px; color: #1f2937; }
  .head { border-bottom: 2px solid #1e3a8a; padding-bottom: 6px; margin-bottom: 8px; }
  .store { font-size: 14px; font-weight: bold; color: #1e3a8a; }
  .muted { color: #6b7280; }
  h1 { font-size: 13px; margin: 6px 0 2px; }
  .summary td { padding: 2px 10px 2px 0; font-size: 9px; }
  h2 { font-size: 10px; margin: 10px 0 4px; color: #1e3a8a; }
  table.data { width: 100%; border-collapse: collapse; }
  table.data th { background: #e8eef7; text-align: left; padding: 3px 4px; border: 0.5px solid #c7d2e3; }
  table.data td { padding: 2px 4px; border: 0.5px solid #e5e7eb; }
  table.data tr.total td { font-weight: bold; background: #f3f4f6; }
  .num { text-align: right; white-space: nowrap; }
</style>
</head>
<body>
  <div class="head">
    <div class="store">{{ $store->name }}</div>
    <div class="muted">{{ collect([$store->address, $store->city, $store->state, $store->pincode])->filter()->join(', ') }}@if($store->gstin) · GSTIN {{ $store->gstin }}@endif</div>
  </div>
  <h1>{{ $report->title }}</h1>
  <div class="muted">{{ $report->period }} · generated {{ now(config('app.business_timezone'))->format('d M Y, h:i A') }}</div>
  @if($report->summary)
    <table class="summary" style="margin-top:6px">
      <tr>@foreach($report->summary as $label => $value)<td><span class="muted">{{ $label }}</span> <b>{{ $value }}</b></td>@endforeach</tr>
    </table>
  @endif
  @foreach($report->sections as $section)
    @if($section['title'])<h2>{{ $section['title'] }}</h2>@endif
    <table class="data" style="margin-top:6px">
      <thead><tr>@foreach($section['columns'] as $column)<th class="{{ in_array($column['type'], ['money', 'qty', 'count', 'percent']) ? 'num' : '' }}">{{ $column['label'] }}</th>@endforeach</tr></thead>
      <tbody>
        @foreach(array_slice($section['rows'], 0, $maxRows) as $row)
          <tr>@foreach($section['columns'] as $column)<td class="{{ in_array($column['type'], ['money', 'qty', 'count', 'percent']) ? 'num' : '' }}">{{ PdfRenderer::cell($row[$column['key']] ?? null, $column['type']) }}</td>@endforeach</tr>
        @endforeach
        @php $totals = array_filter($section['totals'] ?? [], fn ($v) => $v !== null); @endphp
        @if($totals && $section['rows'])
          <tr class="total">@foreach($section['columns'] as $i => $column)<td class="num">{{ $i === 0 ? 'Total' : (array_key_exists($column['key'], $totals) ? PdfRenderer::cell($totals[$column['key']], $column['type']) : '') }}</td>@endforeach</tr>
        @endif
      </tbody>
    </table>
    @if(count($section['rows']) > $maxRows)<div class="muted">Showing the first {{ $maxRows }} of {{ count($section['rows']) }} rows; the Excel file has them all.</div>@endif
    @if(! $section['rows'])<div class="muted">Nothing to show for this period.</div>@endif
  @endforeach
</body>
</html>
