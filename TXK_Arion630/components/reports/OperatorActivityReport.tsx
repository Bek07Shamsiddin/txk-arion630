import type { OperatorActivityRow } from '@/lib/reports';
import { t } from '@/lib/i18n/uz';
import { ReportTable } from './ReportTable';

export function OperatorActivityReport({ data }: { data: OperatorActivityRow[] }) {
  return (
    <ReportTable
      rows={data}
      keyOf={(r) => `${r.userId}|${r.tractorId}`}
      columns={[
        { header: t.reports.operator, flex: 2, cell: (r) => r.name },
        { header: t.reports.model, flex: 2, cell: (r) => r.model },
        { header: t.reports.hours, align: 'right', cell: (r) => (Math.round(r.hours * 10) / 10).toString() },
        { header: t.reports.days, align: 'right', cell: (r) => String(r.days) },
      ]}
    />
  );
}
