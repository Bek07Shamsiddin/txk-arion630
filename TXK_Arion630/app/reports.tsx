import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '@/lib/session';
import { Permissions } from '@/lib/permissions';
import { isIsoDate, todayLocal } from '@/lib/core/dates';
import { toCsv } from '@/lib/db/backup';
import { showMessage } from '@/lib/notify';
import { shareCsv } from '@/lib/share';
import { t } from '@/lib/i18n/uz';
import {
  operatorActivity,
  overdueList,
  partsUsage,
  physVsEquiv,
  readinessByTractor,
  type OperatorActivityRow,
  type OverdueRow,
  type PartsUsageRow,
  type PhysVsEquivRow,
  type ReadinessRow,
} from '@/lib/reports';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formStyles as s } from '@/components/formStyles';
import { ReadinessReport } from '@/components/reports/ReadinessReport';
import { PhysVsEquivReport, loadFlag } from '@/components/reports/PhysVsEquivReport';
import { OverdueReport } from '@/components/reports/OverdueReport';
import { PartsUsageReport } from '@/components/reports/PartsUsageReport';
import { OperatorActivityReport } from '@/components/reports/OperatorActivityReport';
import { goBack } from '@/lib/nav';

type Tab = 'readiness' | 'physEquiv' | 'overdue' | 'parts' | 'operators';

const TABS: { key: Tab; label: string }[] = [
  { key: 'readiness', label: t.reports.tabReadiness },
  { key: 'physEquiv', label: t.reports.tabPhysEquiv },
  { key: 'overdue', label: t.reports.tabOverdue },
  { key: 'parts', label: t.reports.tabParts },
  { key: 'operators', label: t.reports.tabOperators },
];

function addDays(date: string, delta: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return todayLocal(new Date(y, m - 1, d + delta));
}

type Data = {
  readiness: ReadinessRow[];
  physEquiv: PhysVsEquivRow[];
  overdue: OverdueRow[];
  parts: PartsUsageRow[];
  operators: OperatorActivityRow[];
};

export default function ReportsScreen() {
  const router = useRouter();
  const { user } = useSession();
  const today = todayLocal();
  const [tab, setTab] = useState<Tab>('readiness');
  const [from, setFrom] = useState(addDays(today, -30));
  const [to, setTo] = useState(today);
  const [data, setData] = useState<Data>({ readiness: [], physEquiv: [], overdue: [], parts: [], operators: [] });
  const [loading, setLoading] = useState(true);

  const fromOk = isIsoDate(from);
  const toOk = isIsoDate(to);
  const rangeOk = fromOk && toOk && from <= to;
  const allowed = Permissions.canViewReports(user);

  const load = useCallback(async () => {
    if (!rangeOk) return;
    try {
      setLoading(true);
      const [readiness, physEquivRows, overdue, parts, operators] = await Promise.all([
        readinessByTractor(from, to),
        physVsEquiv(),
        overdueList(todayLocal()),
        partsUsage(),
        operatorActivity(from, to),
      ]);
      setData({ readiness, physEquiv: physEquivRows, overdue, parts, operators });
    } catch {
      showMessage(t.common.error, t.errors.generic);
    } finally {
      setLoading(false);
    }
  }, [from, to, rangeOk]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const csvRows = (): Record<string, unknown>[] => {
    const r = t.reports;
    switch (tab) {
      case 'readiness':
        return data.readiness.map((x) => ({
          [r.model]: x.model,
          [r.work]: x.work,
          [r.serviceHours]: x.service,
          [r.downtime]: x.downtime,
          [r.kTt]: x.kTt === null ? '' : x.kTt,
        }));
      case 'physEquiv':
        return data.physEquiv.map((x) => ({
          [r.model]: x.model,
          [r.phys]: x.phys,
          [r.equiv]: x.equiv,
          [r.ratio]: x.ratio,
          [r.flag]: loadFlag(x),
        }));
      case 'overdue':
        return data.overdue.map((x) => ({ [r.model]: x.model, [r.level]: x.levelName, [r.overdueHours]: x.overdueHours }));
      case 'parts':
        return data.parts.map((x) => ({ [r.partName]: x.partName, [r.requested]: x.requested, [r.delivered]: x.delivered }));
      case 'operators':
        return data.operators.map((x) => ({ [r.operator]: x.name, [r.model]: x.model, [r.hours]: x.hours, [r.days]: x.days }));
    }
  };

  const onCsv = async () => {
    try {
      await shareCsv(`txk-${tab}-${todayLocal()}.csv`, toCsv(csvRows()));
    } catch {
      showMessage(t.common.error, t.reports.csvFailed);
    }
  };

  if (!allowed) {
    return (
      <View style={s.container}>
        <ScreenHeader title={t.reports.title} onBack={() => goBack(router)} />
        <Text style={s.forbidden}>{t.reports.forbidden}</Text>
      </View>
    );
  }

  const showsRange = tab === 'readiness' || tab === 'operators';

  return (
    <View style={s.container}>
      <ScreenHeader title={t.reports.title} onBack={() => goBack(router)} />
      <View style={styles.tabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map((x) => (
            <TouchableOpacity key={x.key} style={[styles.tab, tab === x.key && styles.tabActive]} onPress={() => setTab(x.key)}>
              <Text style={[styles.tabText, tab === x.key && styles.tabTextActive]}>{x.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        {showsRange && (
          <View style={styles.rangeRow}>
            <View style={styles.rangeCol}>
              <Text style={s.label}>{t.reports.from}</Text>
              <TextInput
                style={[s.input, !fromOk && s.inputError]}
                value={from}
                onChangeText={setFrom}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.rangeCol}>
              <Text style={s.label}>{t.reports.to}</Text>
              <TextInput
                style={[s.input, !toOk && s.inputError]}
                value={to}
                onChangeText={setTo}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />
            </View>
          </View>
        )}
        {showsRange && (!fromOk || !toOk) ? <Text style={s.error}>{t.reports.dateInvalid}</Text> : null}
        {showsRange && fromOk && toOk && !rangeOk ? <Text style={s.error}>{t.reports.rangeInvalid}</Text> : null}

        <View style={styles.csvRow}>
          <TouchableOpacity style={s.action} onPress={onCsv} disabled={loading}>
            <Text style={s.actionText}>{t.reports.csv}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" color="#1f2937" />
        ) : (
          <>
            {tab === 'readiness' && <ReadinessReport data={data.readiness} />}
            {tab === 'physEquiv' && <PhysVsEquivReport data={data.physEquiv} />}
            {tab === 'overdue' && <OverdueReport data={data.overdue} />}
            {tab === 'parts' && <PartsUsageReport data={data.parts} />}
            {tab === 'operators' && <OperatorActivityReport data={data.operators} />}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#3b82f6' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#3b82f6' },
  rangeRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  rangeCol: { flex: 1 },
  csvRow: { flexDirection: 'row', justifyContent: 'flex-end', marginVertical: 8 },
  loader: { marginTop: 24 },
});
