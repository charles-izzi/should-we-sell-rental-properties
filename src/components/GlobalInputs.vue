<script setup lang="ts">
import type { GlobalInputs } from "../types";

const props = defineProps<{ modelValue: GlobalInputs }>();
const emit = defineEmits<{ "update:modelValue": [value: GlobalInputs] }>();

function update(field: keyof GlobalInputs, value: string) {
  emit("update:modelValue", { ...props.modelValue, [field]: Number(value) });
}

function updateBool(field: keyof GlobalInputs, checked: boolean) {
  emit("update:modelValue", { ...props.modelValue, [field]: checked });
}
</script>

<template>
  <div class="global-inputs">
    <fieldset>
      <legend>Tax Rates</legend>
      <label>
        Marginal Tax Rate %
        <input
          type="number"
          step="1"
          :value="modelValue.marginalTaxRate"
          @input="
            update('marginalTaxRate', ($event.target as HTMLInputElement).value)
          "
        />
      </label>
      <label>
        Capital Gains Tax Rate %
        <input
          type="number"
          step="1"
          :value="modelValue.capitalGainsTaxRate"
          @input="
            update(
              'capitalGainsTaxRate',
              ($event.target as HTMLInputElement).value,
            )
          "
        />
      </label>
      <label class="checkbox-label">
        <input
          type="checkbox"
          :checked="modelValue.applyNIIT"
          @change="
            updateBool(
              'applyNIIT',
              ($event.target as HTMLInputElement).checked,
            )
          "
        />
        Subject to NIIT (+3.8%)
        <span class="input-hint"
          >Net Investment Income Tax. Applies to AGI above $200K (single) /
          $250K (married).</span
        >
      </label>
    </fieldset>

    <fieldset>
      <legend>Selling</legend>
      <label>
        Selling Costs %
        <input
          type="number"
          step="0.5"
          :value="modelValue.sellingCostPercent"
          @input="
            update(
              'sellingCostPercent',
              ($event.target as HTMLInputElement).value,
            )
          "
        />
      </label>
    </fieldset>

    <fieldset>
      <legend>Alternative Investment</legend>
      <label>
        Annual Return %
        <input
          type="number"
          step="0.5"
          :value="modelValue.investmentReturnRate"
          @input="
            update(
              'investmentReturnRate',
              ($event.target as HTMLInputElement).value,
            )
          "
        />
      </label>
    </fieldset>

    <fieldset>
      <legend>Projection</legend>
      <label>
        Annual Inflation Rate %
        <span class="input-hint">Scales annual other expenses over time.</span>
        <input
          type="number"
          step="0.5"
          :value="modelValue.annualInflationRate"
          @input="
            update(
              'annualInflationRate',
              ($event.target as HTMLInputElement).value,
            )
          "
        />
      </label>
      <label>
        Years to Project
        <input
          type="number"
          min="1"
          max="30"
          :value="modelValue.projectionYears"
          @input="
            update('projectionYears', ($event.target as HTMLInputElement).value)
          "
        />
      </label>
    </fieldset>
  </div>
</template>
