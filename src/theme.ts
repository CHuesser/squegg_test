import { deep } from "@theme-ui/presets";

export default {
  ...deep,
  layout: {
    ...deep.layout,
    container: {
      maxWidth: 400
    }
  },
  alerts: {
    error: {
      bg: "red"
    }
  }
};
