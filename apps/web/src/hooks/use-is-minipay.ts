import { useEffect, useState } from "react";

export function useIsMiniPay() {
  const [isMiniPay, setIsMiniPay] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // @ts-ignore
      const eth = window.ethereum;
      setIsMiniPay(!!(eth && eth.isMiniPay));
    }
  }, []);

  return isMiniPay;
}
