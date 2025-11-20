import { onMounted, onUnmounted } from "vue";
import Chart from "chart.js/auto";
import type { ChartConfiguration } from "chart.js/auto";

class ChartManager {
  private chartInstances: Map<string, Chart> = new Map();
  private initializingCharts: Map<string, boolean> = new Map();
  private resizeHandler: (() => void) | null = null;

  /**
   * 生成多表單
   * @param configs 全部圖表參數
   */
  public async spawnCharts(
    configs: { id: string; config: ChartConfiguration }[]
  ): Promise<void> {
    const promises = configs.map(({ id, config }) =>
      this.spawnChart(id, config)
    );
    await Promise.all(promises);
  }

  /**
   * 生成單一表單
   * @param id dom元素
   * @param config 圖表參數(包含type, data, options)
   */
  private async spawnChart(id: string, config: ChartConfiguration): Promise<void> {
    if (this.initializingCharts.get(id)) {
      // 已經在初始化，直接略過
      return;
    }
    this.initializingCharts.set(id, true);

    return new Promise<void>((resolve) => {
      const tryCreateChart = (retryCount = 0) => {
        const canvas = document.getElementById(id) as HTMLCanvasElement | null;
        if (!canvas) {
          if (retryCount < 10) {
            setTimeout(() => tryCreateChart(retryCount + 1), 50);
          } else {
            console.warn(`[ChartManager] Canvas not found after retries: ${id}`);
            this.initializingCharts.delete(id);
            resolve();
          }
          return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          if (retryCount < 20) {
            setTimeout(() => tryCreateChart(retryCount + 1), 100);
          } else {
            console.warn(`[ChartManager] Cannot acquire context: ${id}`);
            this.initializingCharts.delete(id);
            resolve();
          }
          return;
        }

        // 銷毀舊 chart
        const existingChart = this.chartInstances.get(id);
        if (existingChart) {
          existingChart.destroy();
          this.chartInstances.delete(id);
        }

        // 延遲初始化新圖表，確保內部釋放完成
        setTimeout(() => {
          try {
            const chart = new Chart(ctx, config);
            this.chartInstances.set(id, chart);
          } catch (err) {
            console.error(`[ChartManager] Failed to create chart (${id}):`, err);
          } finally {
            this.initializingCharts.delete(id);
            resolve();
          }
        }, 0);
      };

      tryCreateChart();
    });
  }

  /**
   * 更新單一圖表
   * @param id dom元素id
   * @param config 更新參數
   */
  public async updateChartConfig(
    id: string,
    config: ChartConfiguration
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      const chart = this.chartInstances.get(id);
      if (chart) {
        // 把新options合進原本的
        Object.assign(chart.options, config.options || {});
        // 如果有data也更新
        if (config.data) {
          chart.data = config.data;
        }
        chart.update();
      }
      resolve();
    });
  }

  /**
   * 更新單一圖表
   * @param id dom元素id
   * @param config 更新參數
   */
  public async updateAllCharts(
    configs:
      | Record<string, ChartConfiguration>
      | { id: string; config: ChartConfiguration }[]
  ): Promise<void> {
    const updatePromises: Promise<void>[] = [];

    // 判斷參數類型並處理
    if (Array.isArray(configs)) {
      configs.forEach(({ id, config }) => {
        const updatePromise = this.updateChartConfig(id, config);
        updatePromises.push(updatePromise);
      });
    } else {
      Object.entries(configs).forEach(([id, config]) => {
        const updatePromise = this.updateChartConfig(id, config);
        updatePromises.push(updatePromise);
      });
    }
    await Promise.all(updatePromises);
  }

  /**
   * 調整圖表大小
   */
  public resizeCharts(): void {
    this.chartInstances.forEach((chart) => chart.update("resize"));
  }

  /**
   * 設置窗口大小監聽
   * @param delay 延遲觸發時間
   */
  public setupResizeListener(delay: number = 300): void {
    this.resizeHandler = () => {
      // 使用防抖
      const debounceResize = this.debounce(() => {
        this.resizeCharts();
      }, delay);
      debounceResize();
    };

    window.addEventListener("resize", this.resizeHandler);
  }

  /**
   * 清理方法
   */
  public dispose(): void {
    // 移除窗口監聽
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
    }

    // 銷毀所有圖表實例
    this.chartInstances.forEach((chart, id) => {
      chart.destroy();
      this.chartInstances.delete(id);
    });
  }

  /**
   * 銷毀單一圖表
   * @param id dom元素id
   */
  public disposeChart(id: string): void {
    const chart = this.chartInstances.get(id);
    if (chart) {
      chart.destroy();
      this.chartInstances.delete(id);
    }
  }

  /**
   * 取得指定圖表實例
   * @param id dom元素id
   */
  public getChart(id: string): Chart | undefined {
    return this.chartInstances.get(id);
  }

  // 防抖
  private debounce(func: () => void, delay: number): () => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func();
        timeoutId = null;
      }, delay);
    };
  }
}

export function useChartManager() {
  const chartMag = new ChartManager();

  onMounted(() => {
    chartMag.setupResizeListener();
  });

  onUnmounted(() => {
    chartMag.dispose();
  });

  return chartMag;
}
