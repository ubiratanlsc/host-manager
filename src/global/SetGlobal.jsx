import { useContext } from "react";
import GlobalContext from "../context/GlobalContext";

export const useGlobalState = () => {
  const { global, setGlobal } = useContext(GlobalContext);

  const getGlobalState = (stateName) => {
    return global.states.find(state => state.name === stateName)?.value;
  };

  const setGlobalState = (stateName, newValue) => {
    setGlobal(prev => ({
      states: prev.states.map(state =>
        state.name === stateName ? { ...state, value: newValue } : state
      )
    }));
  };

  return { getGlobalState, setGlobalState };
};
