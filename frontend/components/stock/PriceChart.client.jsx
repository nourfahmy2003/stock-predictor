"use client";

import dynamic from "next/dynamic";

const PriceChart = dynamic(() => import("./PriceChart"), { ssr: false });

export default PriceChart;
