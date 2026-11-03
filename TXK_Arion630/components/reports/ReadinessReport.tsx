import type { ReadinessRow } from '@/lib/reports';
import { t } from '@/lib/i18n/uz';
import { ReportTable } from './ReportTable';

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

export function ReadinessReport({ data }: { data: ReadinessRow[] }) {
  return (
    <ReportTable
      rows={data}
      keyOf={(r) => r.tractorId}
      columns={[
        { header: t.reports.model, flex: 2, cell: (r) => r.model },
        { header: t.reports.work, align: 'right', cell: (r) => f1(r.work) },
        { header: t.reports.serviceHours, align: 'right', cell: (r) => f1(r.service) },
        { header: t.reports.downtime, align: 'right', cell: (r) => f1(r.downtime) },
        { header: t.reports.kTt, align: 'right', cell: (r) => (r.kTt === null ? '—' : r.kTt.toFixed(2)) },
      ]}
    />
  );
}
