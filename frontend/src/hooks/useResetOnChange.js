import { useState } from "react";

// Adjust local form state before rendering changed props, rather than painting stale
// inputs and resetting them in an effect. The callback must only update this component's state.
export default function useResetOnChange(inputs, reset) {
  const [previousInputs, setPreviousInputs] = useState(null);
  if (previousInputs === null || inputs.length !== previousInputs.length || inputs.some((value, index) => !Object.is(value, previousInputs[index]))) {
    setPreviousInputs(inputs);
    reset();
  }
}
