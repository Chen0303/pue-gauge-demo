<template>
  <div class="main">
      <PowerUsageGauge />
  </div>

</template>

<script setup lang="ts">
import PowerUsageGauge from "@/components/PowerUsageGauge.vue";
</script>


<style scoped lang="scss">
.main {
  display: flex;
  justify-content: center; /* 水平置中 */
  align-items: center;     /* 垂直置中 */
  width: 100%;
  height: 100vh;           /* 佔滿整個視窗高度 */
}

</style>
