import { View, Text, TextInput } from 'react-native';
import type { OperationType } from '@/lib/core/types';
import { SIM_NUMERIC_KEYS, mixSum, type SimFormState, type SimNumericKey } from '@/lib/simForm';
import { formStyles as s } from '@/components/formStyles';
import { t } from '@/lib/i18n/uz';

type Props = {
  form: SimFormState;
  errors: Record<string, string>;
  ops: OperationType[];
  disabled: boolean;
  onChange: (key: SimNumericKey, value: string) => void;
  onMixChange: (opId: string, value: string) => void;
};

/** Simulyator parametrlari: har bir SimParams maydoni va ish turi ulushlari. */
export function ParamForm({ form, errors, ops, disabled, onChange, onMixChange }: Props) {
  return (
    <View>
      {SIM_NUMERIC_KEYS.map((k) => (
        <View key={k} style={s.group}>
          <Text style={s.label}>{t.sim.fields[k]}</Text>
          <TextInput
            style={[s.input, errors[k] ? s.inputError : null]}
            value={form[k]}
            onChangeText={(v) => onChange(k, v)}
            keyboardType="decimal-pad"
            editable={!disabled}
          />
          {errors[k] ? <Text style={s.error}>{errors[k]}</Text> : null}
        </View>
      ))}
      <View style={s.group}>
        <Text style={s.label}>{t.sim.mix}</Text>
        {ops.map((op) => (
          <View key={op.id} style={s.partRow}>
            <Text style={s.partName}>{op.name}</Text>
            <TextInput
              style={[s.input, s.partQty, errors.operationMix ? s.inputError : null]}
              value={form.mix[op.id] ?? '0'}
              onChangeText={(v) => onMixChange(op.id, v)}
              keyboardType="decimal-pad"
              editable={!disabled}
            />
          </View>
        ))}
        <Text style={s.cardMeta}>
          {t.sim.mixSum}: {Math.round(mixSum(form.mix) * 1000) / 1000}
        </Text>
        {errors.operationMix ? <Text style={s.error}>{errors.operationMix}</Text> : null}
      </View>
    </View>
  );
}
