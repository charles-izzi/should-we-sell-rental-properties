<script setup lang="ts">
import type { PropertyInputs } from "../types";

const props = defineProps<{ modelValue: PropertyInputs }>();
const emit = defineEmits<{
  "update:modelValue": [value: PropertyInputs];
  remove: [];
}>();

function update(field: keyof PropertyInputs, value: string | number) {
  emit("update:modelValue", {
    ...props.modelValue,
    [field]:
      typeof props.modelValue[field] === "number" ? Number(value) : value,
  });
}
</script>

<template>
  <div class="property-card">
    <div class="property-header">
      <input
        class="property-name"
        :value="modelValue.name"
        @input="update('name', ($event.target as HTMLInputElement).value)"
      />
      <button
        class="btn-remove"
        @click="$emit('remove')"
        title="Remove property"
      >
        &times;
      </button>
    </div>

    <div class="input-grid">
      <fieldset>
        <legend>Property</legend>
        <label>
          Current Market Value
          <input
            type="number"
            :value="modelValue.currentValue"
            @input="
              update('currentValue', ($event.target as HTMLInputElement).value)
            "
          />
        </label>
        <label>
          Purchase Price
          <input
            type="number"
            :value="modelValue.purchasePrice"
            @input="
              update('purchasePrice', ($event.target as HTMLInputElement).value)
            "
          />
        </label>
        <label>
          Annual Appreciation %
          <input
            type="number"
            step="0.1"
            :value="modelValue.appreciationRate"
            @input="
              update(
                'appreciationRate',
                ($event.target as HTMLInputElement).value,
              )
            "
          />
        </label>
        <label>
          Rental Start Year
          <span class="input-hint"
            >Year the property was first rented. Depreciation expires after 27.5
            years.</span
          >
          <input
            type="number"
            step="1"
            min="1980"
            :value="modelValue.rentalStartYear"
            @input="
              update(
                'rentalStartYear',
                ($event.target as HTMLInputElement).value,
              )
            "
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Mortgage</legend>
        <label>
          Remaining Balance
          <input
            type="number"
            :value="modelValue.mortgageBalance"
            @input="
              update(
                'mortgageBalance',
                ($event.target as HTMLInputElement).value,
              )
            "
          />
        </label>
        <label>
          Monthly Payment
          <span class="input-hint"
            >Total payment including escrow (insurance &amp; tax). P&amp;I is
            calculated from balance/rate/years; the remainder is treated as
            escrow.</span
          >
          <input
            type="number"
            :value="modelValue.monthlyPayment"
            @input="
              update(
                'monthlyPayment',
                ($event.target as HTMLInputElement).value,
              )
            "
          />
        </label>
        <label>
          Interest Rate %
          <input
            type="number"
            step="0.1"
            :value="modelValue.mortgageInterestRate"
            @input="
              update(
                'mortgageInterestRate',
                ($event.target as HTMLInputElement).value,
              )
            "
          />
        </label>
        <label>
          Remaining Years
          <input
            type="number"
            :value="modelValue.remainingYears"
            @input="
              update(
                'remainingYears',
                ($event.target as HTMLInputElement).value,
              )
            "
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Rental Income</legend>
        <label>
          Monthly Rent
          <input
            type="number"
            :value="modelValue.monthlyRent"
            @input="
              update('monthlyRent', ($event.target as HTMLInputElement).value)
            "
          />
        </label>
        <label>
          Annual Rent Growth %
          <input
            type="number"
            step="0.1"
            :value="modelValue.rentGrowthRate"
            @input="
              update(
                'rentGrowthRate',
                ($event.target as HTMLInputElement).value,
              )
            "
          />
        </label>
        <label>
          Average Annual Vacancy Cost
          <span class="input-hint">Rental income loss due to vacancy.</span>
          <input
            type="number"
            :value="modelValue.annualTurnoverCost"
            @input="
              update(
                'annualTurnoverCost',
                ($event.target as HTMLInputElement).value,
              )
            "
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Expenses</legend>
        <label>
          Annual Other Expenses
          <span class="input-hint"
            >Repairs, cleanings, management fees, etc. Not included in mortgage
            payment. Tax-deductible.</span
          >
          <input
            type="number"
            :value="modelValue.annualOtherExpenses"
            @input="
              update(
                'annualOtherExpenses',
                ($event.target as HTMLInputElement).value,
              )
            "
          />
        </label>
        <p class="fieldset-note">
          Note: Depreciation, mortgage interest, and escrow (derived from
          payment minus P&amp;I) deductions are calculated separately.
        </p>
      </fieldset>
    </div>
  </div>
</template>
