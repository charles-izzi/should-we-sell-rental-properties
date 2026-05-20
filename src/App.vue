<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { PropertyInputs, GlobalInputs } from "./types";
import { computeProjection, createDefaultProperty } from "./calculator";
import PropertyCard from "./components/PropertyCard.vue";
import GlobalInputsForm from "./components/GlobalInputs.vue";
import ProjectionChart from "./components/ProjectionChart.vue";
import ProjectionTable from "./components/ProjectionTable.vue";
import SummaryCard from "./components/SummaryCard.vue";

const STORAGE_KEY = "rental-calc-state";

interface SavedState {
  properties: PropertyInputs[];
  globalInputs: GlobalInputs;
  nextId: number;
}

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as SavedState;
      // Migrate properties from old schema — fill missing fields, coerce all numbers
      const defaults = createDefaultProperty(0);
      state.properties = state.properties.map((p) => {
        const migrated = { ...defaults, ...p };
        // Ensure all numeric fields are actually numbers
        for (const key of Object.keys(defaults) as (keyof PropertyInputs)[]) {
          if (typeof defaults[key] === "number") {
            migrated[key] = (Number(migrated[key]) || 0) as never;
          }
        }
        return migrated;
      });
      return state;
    }
  } catch {
    /* ignore corrupt data */
  }
  return null;
}

const saved = loadState();

let nextId = saved?.nextId ?? 2;

const properties = ref<PropertyInputs[]>(
  saved?.properties ?? [createDefaultProperty(1)],
);

const defaultGlobal: GlobalInputs = {
  marginalTaxRate: 24,
  capitalGainsTaxRate: 15,
  sellingCostPercent: 8,
  investmentReturnRate: 7,
  annualInflationRate: 3,
  projectionYears: 10,
  applyNIIT: false,
};

const globalInputs = ref<GlobalInputs>({
  ...defaultGlobal,
  ...(saved?.globalInputs ?? {}),
});

function saveState() {
  const state: SavedState = {
    properties: properties.value,
    globalInputs: globalInputs.value,
    nextId,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

watch([properties, globalInputs], saveState, { deep: true });

// --- File System Access API ---
let fileHandle: FileSystemFileHandle | null = null;

function getStateJson(): string {
  const state: SavedState = {
    properties: properties.value,
    globalInputs: globalInputs.value,
    nextId,
  };
  return JSON.stringify(state, null, 2);
}

function applyState(state: SavedState) {
  const defaults = createDefaultProperty(0);
  state.properties = state.properties.map((p) => {
    const migrated = { ...defaults, ...p };
    for (const key of Object.keys(defaults) as (keyof PropertyInputs)[]) {
      if (typeof defaults[key] === "number") {
        migrated[key] = (Number(migrated[key]) || 0) as never;
      }
    }
    return migrated;
  });
  properties.value = state.properties;
  globalInputs.value = { ...defaultGlobal, ...state.globalInputs };
  nextId = state.nextId;
}

async function saveToFile() {
  try {
    if (!fileHandle) {
      fileHandle = await window.showSaveFilePicker({
        suggestedName: "rental-properties.json",
        types: [
          {
            description: "JSON file",
            accept: { "application/json": [".json"] },
          },
        ],
      });
    }
    const writable = await fileHandle.createWritable();
    await writable.write(getStateJson());
    await writable.close();
  } catch (e: unknown) {
    if ((e as Error).name !== "AbortError") throw e;
  }
}

async function saveAsToFile() {
  try {
    fileHandle = await window.showSaveFilePicker({
      suggestedName: "rental-properties.json",
      types: [
        {
          description: "JSON file",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    const writable = await fileHandle.createWritable();
    await writable.write(getStateJson());
    await writable.close();
  } catch (e: unknown) {
    if ((e as Error).name !== "AbortError") throw e;
  }
}

async function loadFromFile() {
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [
        {
          description: "JSON file",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    fileHandle = handle;
    const file = await handle.getFile();
    const text = await file.text();
    const state = JSON.parse(text) as SavedState;
    applyState(state);
  } catch (e: unknown) {
    if ((e as Error).name !== "AbortError") throw e;
  }
}

const projection = computed(() =>
  computeProjection(properties.value, globalInputs.value),
);

function addProperty() {
  properties.value.push(createDefaultProperty(nextId++));
}

function removeProperty(index: number) {
  properties.value.splice(index, 1);
}

function updateProperty(index: number, value: PropertyInputs) {
  properties.value[index] = value;
}
</script>

<template>
  <div class="app">
    <h1>Should We Sell Our Rental Properties?</h1>
    <p class="subtitle">
      Compare keeping rentals vs. selling and investing the capital
    </p>

    <div class="file-actions">
      <button class="btn-file" @click="loadFromFile">Open</button>
      <button class="btn-file" @click="saveToFile">Save</button>
      <button class="btn-file" @click="saveAsToFile">Save As</button>
    </div>

    <section class="section">
      <h2>Global Settings</h2>
      <GlobalInputsForm v-model="globalInputs" />
    </section>

    <section class="section">
      <div class="section-header">
        <h2>Properties</h2>
        <button class="btn-add" @click="addProperty">+ Add Property</button>
      </div>
      <PropertyCard
        v-for="(prop, i) in properties"
        :key="prop.id"
        :modelValue="prop"
        @update:modelValue="updateProperty(i, $event)"
        @remove="removeProperty(i)"
      />
    </section>

    <section class="section" v-if="projection.length > 0">
      <h2>Results</h2>
      <SummaryCard :projections="projection" />
      <ProjectionChart :projections="projection" />
      <ProjectionTable :projections="projection" />
    </section>
  </div>
</template>
