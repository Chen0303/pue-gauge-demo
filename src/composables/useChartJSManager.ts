import { onMounted, onUnmounted } from "vue";
import Chart from "chart.js/auto";
import type { ChartConfiguration } from "chart.js/auto";

class ChartManager {
  private chartInstances: Map<string, Chart> = new Map();
  private initializingCharts: Map<string, boolean> = new Map();
  private resizeHandler: (() => void) | null = null;

  /**
   * Create multiple charts
   * @param configs All chart configurations
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
   * Create a single chart
   * @param id dom element ID
   * @param config Chart configuration(includes type, data, options)
   */
  private async spawnChart(id: string, config: ChartConfiguration): Promise<void> {
    if (this.initializingCharts.get(id)) {
      // Already initializing, skip directly
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

        // Destroy existing chart
        const existingChart = this.chartInstances.get(id);
        if (existingChart) {
          existingChart.destroy();
          this.chartInstances.delete(id);
        }

        // Delay initialization of new chart to ensure cleanup is completed
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
   * Update a single chart
   * @param id dom element ID
   * @param config Update configuration
   */
  public async updateChartConfig(
    id: string,
    config: ChartConfiguration
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      const chart = this.chartInstances.get(id);
      if (chart) {
        // Merge new options into existing options
        Object.assign(chart.options, config.options || {});
        // Update data if provided
        if (config.data) {
          chart.data = config.data;
        }
        chart.update();
      }
      resolve();
    });
  }

  /**
   * Update multiple charts
   * @param id dom element ID
   * @param config Update configuration
   */
  public async updateAllCharts(
    configs:
      | Record<string, ChartConfiguration>
      | { id: string; config: ChartConfiguration }[]
  ): Promise<void> {
    const updatePromises: Promise<void>[] = [];

    // Detect config type and process accordingly
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
   * Resize all charts
   */
  public resizeCharts(): void {
    this.chartInstances.forEach((chart) => chart.update("resize"));
  }

  /**
   * Set window resize listener
   * @param delay Debounce delay time
   */
  public setupResizeListener(delay: number = 300): void {
    this.resizeHandler = () => {
      // Use debounce
      const debounceResize = this.debounce(() => {
        this.resizeCharts();
      }, delay);
      debounceResize();
    };

    window.addEventListener("resize", this.resizeHandler);
  }

  /**
   * Cleanup method
   */
  public dispose(): void {
    // Remove window listener
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
    }

    // Destroy all chart instances
    this.chartInstances.forEach((chart, id) => {
      chart.destroy();
      this.chartInstances.delete(id);
    });
  }

  /**
   * Destroy a single chart
   * @param id DOM element ID
   */
  public disposeChart(id: string): void {
    const chart = this.chartInstances.get(id);
    if (chart) {
      chart.destroy();
      this.chartInstances.delete(id);
    }
  }

  /**
   * Get chart instance by ID
   * @param id dom element ID
   */
  public getChart(id: string): Chart | undefined {
    return this.chartInstances.get(id);
  }

  // Debounce
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
