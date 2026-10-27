"use client";

import dynamic from "next/dynamic";

const TruckMap = dynamic(() => import("@/components/maps/TruckMap"), {
  ssr: false,
  loading: () => <div className="h-[340px] animate-pulse rounded-xl bg-lama-cloud sm:h-[420px]" />,
});

export default TruckMap;
