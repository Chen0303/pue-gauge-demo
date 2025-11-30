# Gauge Chart.js Demo

It provides a simple and flexible API that allows developers to easily integrate a dynamic, animated gauge into any project.

📦 Requirements

Make sure you have the following installed:

1. [Node.js](https://nodejs.org/zh-tw/download)

2. Either npm, pnpm, or yarn

3. [Chart.js](https://www.chartjs.org/docs/latest/)

🚀 Features

．Built with Vue 3 Composition API

．Custom gauge visualization powered by Chart.js

．Easy to use — just pass a value

．Supports dynamic value updates with smooth animation

．Comes with a composable `useChartJSManager` for managing multiple Chart.js instances

．Clean, readable, and extensible code structure

🧩 How to Use the Gauge Component
```
<script setup lang="ts">
import PueGauge from "@/components/PueGauge.vue";
const pueValue = ref(1.40);
</script>

<template>
  <PueGauge :value="pueValue" />
</template>
```
🧰 Optional: Use ChartJS Manager for multiple charts
```
import { useChartJSManager } from "@/composables/useChartJSManager";

const { createChart, updateChart, destroyChart } = useChartJSManager();
```

📦 Build for Production
```
npm run build
```
