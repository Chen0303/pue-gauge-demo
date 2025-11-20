<template>
  <div class="powerUsageGauge">
    <canvas id="powerGauge"></canvas>
    <div class="gaugeText">
      <p>PUE = {{ value.toFixed(2) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useChartManager } from "@/composables/useChartJSManager";
import { Chart, type ArcElement } from "chart.js";

const chartManager = useChartManager();
let chartInstance: Chart | null = null;


// === Gauge設定 ===
const majorTickValues = [1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3];
const subStepCount = 4; // 每個主刻度間分4個小刻度

// 生成完整刻度陣列 (主刻度 + 小刻度)
const fullTickValues: number[] = [];
for (let i = 0; i < majorTickValues.length; i++) {
  fullTickValues.push(majorTickValues[i]);
  if (i === 0) continue;
  const prev = majorTickValues[i - 1];
  const curr = majorTickValues[i];
  for (let s = 1; s < subStepCount; s++) {
    const subVal = prev + ((curr - prev) * s) / subStepCount;
    fullTickValues.push(parseFloat(subVal.toFixed(2)));
  }
}

// 隨機選一個作為假資料
const value = ref(
  fullTickValues[Math.floor(Math.random() * fullTickValues.length)]
);

// --- 刻度 Plugin ---
const gaugeTickPlugin = {
  id: "gaugeTickPlugin",
  afterDraw(chart: Chart) {
    const { ctx } = chart;
    const arc = chart.getDatasetMeta(0).data[0] as ArcElement;
    if (!arc) return;

    // 取得圓心座標
    const { x, y } = arc.getProps(["x", "y"]);
    if (!x || !y) return;

    const innerRadius = arc.innerRadius!; // 圓內半徑
    const minValue = 1;
    const maxValue = 3;
    const majorTickValues = [1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3];
    const subStepCount = 5; // 每個主刻度間的小刻度數量

    // 取得 Doughnut 設定的 rotation 與 circumference
    const dataset = chart.data.datasets[0] as any;
    const rotationRad = ((dataset.rotation ?? 0) * Math.PI) / 88.4; // 起始旋轉角度
    const circumferenceRad = ((dataset.circumference ?? 360) * Math.PI) / 180; // 總圓弧角度

    // 分段顏色
    const segments = [
      { from: 1, to: 1.4 },
      { from: 1.4, to: 1.8 },
      { from: 1.8, to: 3 },
    ];

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff88";
    ctx.fillStyle = "#fff";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let currentStartAngle = rotationRad; // 記錄每段起始角度

    segments.forEach((segment) => {
      const segmentArc =
        ((segment.to - segment.from) / (maxValue - minValue)) *
        circumferenceRad;

      // 主刻度
      majorTickValues.forEach((val) => {
        if (val < segment.from || val > segment.to) return;

        const t = (val - segment.from) / (segment.to - segment.from);
        const angle = currentStartAngle + t * segmentArc;

        // --- 主刻度線 ---
        const rStart = innerRadius - 5;
        const rEnd = innerRadius - 20;
        const xStart = x + rStart * Math.cos(angle);
        const yStart = y + rStart * Math.sin(angle);
        const xEnd = x + rEnd * Math.cos(angle);
        const yEnd = y + rEnd * Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(xStart, yStart);
        ctx.lineTo(xEnd, yEnd);
        ctx.stroke();

        // --- 刻度文字 ---
        const labelRadius = innerRadius - 35;
        const lx = x + labelRadius * Math.cos(angle);
        const ly = y + labelRadius * Math.sin(angle);
        ctx.fillText(val.toFixed(1), lx, ly);

        // --- 小刻度線 ---
        const prevIndex = majorTickValues.indexOf(val) - 1; // 取得前一個主刻度
        if (prevIndex >= 0) {
          const prevVal = majorTickValues[prevIndex];
          for (let s = 1; s < subStepCount; s++) {
            const subVal = prevVal + ((val - prevVal) * s) / subStepCount;
            if (subVal < segment.from || subVal > segment.to) continue;

            const subT = (subVal - segment.from) / (segment.to - segment.from);
            const subAngle = currentStartAngle + subT * segmentArc;

            const subRStart = innerRadius - 5;
            const subREnd = innerRadius - 12;
            const sxStart = x + subRStart * Math.cos(subAngle);
            const syStart = y + subRStart * Math.sin(subAngle);
            const sxEnd = x + subREnd * Math.cos(subAngle);
            const syEnd = y + subREnd * Math.sin(subAngle);

            ctx.beginPath();
            ctx.moveTo(sxStart, syStart);
            ctx.lineTo(sxEnd, syEnd);
            ctx.stroke();
          }
        }
      });

      // 累加下一段起點
      currentStartAngle += segmentArc;
    });

    // --- 指針 Plugin ---
    const pointerT = (value.value - minValue) / (maxValue - minValue);
    const pointerAngle = rotationRad + pointerT * circumferenceRad;
    const pointerLength = innerRadius - 45;
    const px = x + pointerLength * Math.cos(pointerAngle);
    const py = y + pointerLength * Math.sin(pointerAngle);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },
};

function initChart() {
  // 清掉舊的圖
  chartManager.dispose();

  // 分段顏色
  const segments = [
    { from: 1, to: 1.4, color: "#72BD4F" },
    { from: 1.4, to: 1.8, color: "#F2A93B" },
    { from: 1.8, to: 3, color: "#CF5C58" },
  ];

  const dataValues = segments.map((s) => s.to - s.from); // 每段寬度
  const backgroundColors = segments.map((s) => s.color);

  chartManager.spawnCharts([
    {
      id: "powerGauge",
      config: {
        type: "doughnut",
        data: {
          labels: segments.map((s) => `${s.from}-${s.to}`),
          datasets: [
            {
              data: dataValues,
              backgroundColor: backgroundColors,
              borderWidth: 0,
              circumference: 200, //圓弧的總角度
              rotation: 260, // 起始旋轉角度
              cutout: "80%",
            } as any,
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
          },
        },
        plugins: [gaugeTickPlugin],
      },
    },
  ]);

  chartInstance = chartManager.getChart("powerGauge") || null;
}

// Slider 改變時更新圖表
watch(value, () => {
  if (!chartInstance) return;
  const dataset = chartInstance.data.datasets[0] as any;
  dataset.currentValue = value.value; // 更新 dataset
  chartInstance.update();
});

onMounted(() => {
  initChart();
  window.addEventListener("resize", () => {
    chartManager.resizeCharts();
  });
});

</script>

<style scoped lang="scss">
.powerUsageGauge {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 300px;
  height: 300px;
  margin: 0 auto;

  .gaugeText {
    position: absolute;
    bottom: 10px;
    width: 100%;
    text-align: center;
    color: #fff;
  }
}
</style>
