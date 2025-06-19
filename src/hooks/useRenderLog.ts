import { useEffect, useRef } from 'react';

export const useRenderLog = (componentName: string, props: any) => {
  const prevPropsRef = useRef(props);

  useEffect(() => {
    const prevProps = prevPropsRef.current;
    const changedProps: Record<string, { previous: any, current: any }> = {};
    const allKeys = Object.keys({ ...prevProps, ...props });

    for (const key of allKeys) {
      if (prevProps[key] !== props[key]) {
        changedProps[key] = {
          previous: prevProps[key],
          current: props[key],
        };
      }
    }

    if (Object.keys(changedProps).length > 0) {
      console.log(`[RenderLog] ${componentName} re-rendered. Changed props:`, changedProps);
    } else {
      console.log(`[RenderLog] ${componentName} re-rendered. No prop changes.`);
    }

    prevPropsRef.current = props;
  });
};
