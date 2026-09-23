const COMPACT_CHART_MAX_WIDTH = 420;

export function withResponsiveChartOption(baseOption, compactOption) {
  return {
    baseOption,
    media: [
      {
        query: { maxWidth: COMPACT_CHART_MAX_WIDTH },
        option: compactOption,
      },
    ],
  };
}
