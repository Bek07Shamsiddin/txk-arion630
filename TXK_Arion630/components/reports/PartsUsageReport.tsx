import type { PartsUsageRow } from '@/lib/reports';
import { t } from '@/lib/i18n/uz';
import { ReportTable } from './ReportTable';

export function PartsUsageReport({ data }: { data: PartsUsageRow[] }) {
  return (
    <ReportTable
      rows={data}
      keyOf={(r) => r.partName}
      columns={[
        { header: t.reports.partName, flex: 3, cell: (r) => r.partName },
        { header: t.reports.requested, align: 'right', cell: (r) => String(r.requested) },
        { header: t.reports.delivered, align: 'right', cell: (r) => String(r.delivered) },
      ]}
    />
  );
}
