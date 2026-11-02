import type { OverdueRow } from '@/lib/reports';
import { t } from '@/lib/i18n/uz';
import { ReportTable } from './ReportTable';

export function OverdueReport({ data }: { data: OverdueRow[] }) {
  return (
    <ReportTable
      rows={data}
      keyOf={(r, i) => `${r.tractorId}|${r.levelName}|${i}`}
      columns={[
        { header: t.reports.model, flex: 2, cell: (r) => r.model },
        { header: t.reports.level, flex: 2, cell: (r) => r.levelName },
        { header: t.reports.overdueHours, align: 'right', cell: (r) => String(r.overdueHours) },
      ]}
    />
  );
}
